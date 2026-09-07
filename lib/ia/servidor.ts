import { crearClienteSupabaseAdmin } from "../supabase/admin";
import { obtenerContextoAdminCatalogo } from "../catalogo/servidor";
import { hayGemini } from "./gemini";
import { describirReinicio } from "./reinicio";

/* Doscientas fotos al mes por negocio. Un catálogo de 300 productos se carga con
   unas diez fotos de lista, y llenar campos producto por producto son 300 en el
   peor caso del primer mes. Doscientas es holgado para el uso normal y acota el
   accidente: un bucle mal escrito cuesta unos centavos, no una factura. */
export const TOPE_FOTOS_POR_MES = 200;

/* Sesenta por día y por negocio. El nivel gratuito da **quinientos pedidos
   diarios en total**, así que sin un tope diario tres negocios cargando fuerte
   el mismo día suman seiscientos y el primero que llega se lleva la cuota. Con
   sesenta, siete negocios a tope dan cuatrocientos veinte.

   En un solo negocio casi nunca se toca: el tope mensual de doscientas llega
   antes. Es un freno contra la concentración, no contra el uso. */
export const TOPE_FOTOS_POR_DIA = 60;

/* Un megabyte y medio en base64 son algo más de un megabyte de imagen. El
   navegador ya comprime a unos 150 KB antes de mandarla, así que este tope solo
   se alcanza si alguien evita la pantalla y manda la foto a mano. */
const LARGO_MAXIMO_BASE64 = 1_500_000;

const TIPOS_ACEPTADOS = new Set(["image/webp", "image/jpeg", "image/png"]);

export type PeticionFoto = { base64: string; tipo: string };


export function leerFotoDeLaPeticion(datos: unknown): PeticionFoto | null {
  if (typeof datos !== "object" || datos === null) return null;
  const { imagen, tipo } = datos as { imagen?: unknown; tipo?: unknown };
  if (typeof imagen !== "string" || typeof tipo !== "string") return null;
  if (imagen.length === 0 || imagen.length > LARGO_MAXIMO_BASE64) return null;
  if (!TIPOS_ACEPTADOS.has(tipo)) return null;
  return { base64: imagen, tipo };
}

type Preparacion =
  | { correcto: true; negocioId: string; admin: ReturnType<typeof crearClienteSupabaseAdmin> }
  | { correcto: false; estado: number; error: string };

/* Tres controles antes de gastar un centavo: que haya sesión y negocio, que la
   clave exista, y que el negocio tenga la función habilitada con cupo. Los tres
   viven acá porque las dos herramientas los necesitan idénticos, y dos copias
   de un control de gasto terminan divergiendo. */
export async function prepararLecturaDeFoto(): Promise<Preparacion> {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return { correcto: false, estado: contexto.estado, error: contexto.error };
  }

  if (!hayGemini()) {
    return {
      correcto: false,
      estado: 503,
      error: "La lectura de fotos no está disponible en este momento.",
    };
  }

  let admin;
  try {
    admin = crearClienteSupabaseAdmin();
  } catch {
    return {
      correcto: false,
      estado: 503,
      error: "La lectura de fotos no está disponible en este momento.",
    };
  }

  const { data } = await admin.rpc("consumir_credito_ia", {
    p_negocio_id: contexto.negocio.id,
    p_tope: TOPE_FOTOS_POR_MES,
    p_tope_diario: TOPE_FOTOS_POR_DIA,
  });
  const credito = (data ?? {}) as {
    autorizado?: boolean;
    motivo?: string;
    usadas?: number;
    tope?: number;
    reinicio?: string;
  };

  if (!credito.autorizado) {
    if (credito.motivo === "tope_alcanzado") {
      return {
        correcto: false,
        estado: 429,
        error: `Llegaste a las ${credito.tope} fotos de este mes. El contador vuelve a cero el día 1.`,
      };
    }
    if (credito.motivo === "tope_diario") {
      /* Se dice la hora de acá y no «mañana»: el contador de Google vuelve a
         cero a la medianoche del Pacífico, que en Bolivia son las cuatro de la
         madrugada. Decir «mañana» mandaría a esperar de más o de menos. */
      return {
        correcto: false,
        estado: 429,
        error: `Llegaste a las ${credito.tope} fotos de hoy. Podés seguir ${describirReinicio(credito.reinicio)}.`,
      };
    }
    return {
      correcto: false,
      estado: 403,
      error: "Tu negocio todavía no tiene habilitada la lectura de fotos.",
    };
  }

  return { correcto: true, negocioId: contexto.negocio.id, admin };
}

export async function devolverCredito(
  admin: ReturnType<typeof crearClienteSupabaseAdmin>,
  negocioId: string,
): Promise<void> {
  await admin.rpc("devolver_credito_ia", { p_negocio_id: negocioId });
}

/* Se registra toda llamada, con o sin éxito. Google descuenta el pedido aunque
   la respuesta no sirva, así que un medidor que solo cuenta los aciertos miente
   justo cuando más importa: cuando se está cerca del límite y las cosas empiezan
   a fallar. */
export async function registrarLlamada(
  admin: ReturnType<typeof crearClienteSupabaseAdmin>,
  negocioId: string,
  herramienta: "producto" | "lista",
  tokens: number,
  exito: boolean,
): Promise<void> {
  try {
    await admin.rpc("registrar_llamada_ia", {
      p_negocio_id: negocioId,
      p_herramienta: herramienta,
      p_tokens: tokens,
      p_exito: exito,
    });
  } catch {
    /* Medir no puede romper la función que mide. */
  }
}
