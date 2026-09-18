import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../supabase/database.types";
import type { SituacionDelNegocio } from "./alta";

/* Leer en qué estado está un negocio, una sola vez y de una sola forma.
 *
 * Lo necesitan dos lugares que no se hablan: `GET /api/alta/estado`, que le dice
 * al alta por dónde seguir, y la pantalla de inicio, que dibuja «lo que te
 * falta». Los dos parten de las mismas ocho columnas y las mismas dos cuentas.
 *
 * Armarlo dos veces sería armarlo distinto: alcanza con que uno de los dos se
 * olvide de una columna nueva para que el alta y el inicio no coincidan sobre el
 * mismo negocio, y el dueño vea «te falta el logo» en una pantalla y no en la
 * otra. Esa clase de desacuerdo no se ve en las pruebas de ninguno de los dos.
 */
const COLUMNAS =
  "id,nombre,slug,activo,foto_ia_habilitada,plan_id,nombre_admin,rubro,telefono_whatsapp,logo_url,alta_paso,alta_completada_en";

export type NegocioEnSituacion = {
  id: string;
  nombre: string;
  slug: string;
  activo: boolean;
  /* Si la plataforma le encendio la lectura con IA. Obligatorio y no opcional:
     la pantalla de resumen lo necesita para decidir si dibuja sus topes, y un
     campo opcional que una consulta deja de pedir compila igual y desaparece en
     silencio, que es como se perdio una vez el bloque de la foto. */
  foto_ia_habilitada: boolean;
  /* Qué plan paga. Obligatorio por el mismo motivo que el de arriba: de él sale
     el cupo que el resumen le muestra al dueño, y si una consulta deja de
     pedirlo el número que se ve deja de ser el suyo sin que nada avise. */
  plan_id: string;
};

export async function leerSituacionDelNegocio(
  supabase: SupabaseClient<Database>,
  idUsuario: string,
): Promise<{ negocio: NegocioEnSituacion; situacion: SituacionDelNegocio } | null> {
  const { data: negocio } = await supabase
    .from("negocios")
    .select(COLUMNAS)
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (!negocio) return null;

  /* Con `head` y `count`: lo que hace falta saber es **si hay**, no cuáles son.
     Traerse trescientas filas para después contarlas sería pagar una consulta
     grande en el camino que más se recorre del panel. */
  const [{ count: productos }, { count: categorias }] = await Promise.all([
    supabase
      .from("productos")
      .select("id", { count: "exact", head: true })
      .eq("negocio_id", negocio.id)
      /* Sin los de la papelera. Un negocio que borró todos sus productos tiene
         el catálogo vacío para quien lo abre, y contarlos igual le decía que ya
         estaba listo justo cuando había dejado de estarlo. */
      .is("eliminado_en", null),
    supabase
      .from("categorias")
      .select("id", { count: "exact", head: true })
      .eq("negocio_id", negocio.id),
  ]);

  return {
    negocio: {
      id: negocio.id,
      nombre: negocio.nombre,
      slug: negocio.slug,
      activo: negocio.activo,
      foto_ia_habilitada: negocio.foto_ia_habilitada === true,
      plan_id: negocio.plan_id,
    },
    situacion: {
      nombreAdmin: negocio.nombre_admin,
      nombre: negocio.nombre,
      slug: negocio.slug,
      rubro: negocio.rubro,
      telefonoWhatsapp: negocio.telefono_whatsapp,
      logoUrl: negocio.logo_url,
      productos: productos ?? 0,
      categorias: categorias ?? 0,
      altaPaso: negocio.alta_paso,
      altaCompletadaEn: negocio.alta_completada_en,
    },
  };
}
