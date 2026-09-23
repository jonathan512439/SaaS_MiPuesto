import { COLUMNAS_CATEGORIA } from "../catalogo/columnas";
import { crearClienteSupabaseAdmin } from "../supabase/admin";
import { crearClienteSupabaseServidor } from "../supabase/server";
import { obtenerContextoAdminCatalogo } from "../catalogo/servidor";
import { hayGemini } from "./gemini";
import { cupoDelPlan } from "../planes";
import { TOPE_FOTOS_POR_DIA, TOPE_FOTOS_POR_MES } from "./limites";
import { describirReinicio } from "./reinicio";

/* Los dos topes de `limites.ts` son el **techo técnico**: lo que la cuota
   compartida de Google aguanta por negocio, pase lo que pase. Se reexportan
   porque las rutas ya los importaban de acá.

   Lo que se autoriza de verdad es el cupo del plan que paga el negocio, que sale
   de `lib/planes.ts` y nunca supera este techo. */
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

  /* El plan se lee con la clave privilegiada y no con la sesión del dueño: es el
     dato que decide cuánto puede gastar, y leerlo por su propia sesión lo pondría
     a un `update` de distancia de ascenderse solo. La columna, además, no está
     concedida para escritura a nadie más que a la plataforma. */
  const { data: negocio } = await admin
    .from("negocios")
    .select("plan_id")
    .eq("id", contexto.negocio.id)
    .maybeSingle();

  const cupo = cupoDelPlan(negocio?.plan_id, TOPE_FOTOS_POR_DIA);

  const { data } = await admin.rpc("consumir_credito_ia", {
    p_negocio_id: contexto.negocio.id,
    p_tope: Math.min(cupo.mensual, TOPE_FOTOS_POR_MES),
    p_tope_diario: cupo.diario,
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

/* Las categorías del negocio de la sesión, para ofrecérselas al modelo como
   lista cerrada. Se leen acá y no se aceptan del navegador: lo que llega en el
   pedido podría nombrar categorías de otro negocio o inventarlas. Si la
   consulta falla, la lectura sigue sin categorías: el nombre, el precio y la
   descripción valen igual. */
export async function leerCategoriasDelNegocio(
  negocioId: string,
): Promise<Array<{ id: string; nombre: string }>> {
  const supabase = await crearClienteSupabaseServidor();
  const { data, error } = await supabase
    .from("categorias")
    .select(COLUMNAS_CATEGORIA)
    .eq("negocio_id", negocioId)
    .order("orden");
  if (error || !data) return [];
  return data.map(({ id, nombre }) => ({ id, nombre }));
}
