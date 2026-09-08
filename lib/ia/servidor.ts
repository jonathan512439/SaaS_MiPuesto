import { crearClienteSupabaseAdmin } from "../supabase/admin";
import { obtenerContextoAdminCatalogo } from "../catalogo/servidor";
import { hayGemini } from "./gemini";
import { TOPE_FOTOS_POR_DIA, TOPE_FOTOS_POR_MES } from "./limites";
import { describirReinicio } from "./reinicio";

/* Los dos topes se calculan en `limites.ts` a partir de la cuota real de Google
   y de cuántos negocios pueden tener la herramienta encendida. Se reexportan
   porque las rutas ya los importaban de acá. */
export { TOPE_FOTOS_POR_DIA, TOPE_FOTOS_POR_MES } from "./limites";

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
