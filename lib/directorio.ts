import { evaluarHorario } from "./horario";
import { esCiudadId, type CiudadId } from "./negocios/lugares";
import { obtenerUrlPublicaImagenNegocio } from "./negocios/imagenes-publicas";
import { crearClienteSupabasePublico } from "./supabase/public";
import { obtenerVariablesPublicasSupabase } from "./supabase/variables";

export const NEGOCIOS_POR_PAGINA = 12;

export type NegocioDirectorio = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  logoUrl: string | null;
  portadaUrl: string | null;
  estadoAtencion: ReturnType<typeof evaluarHorario>;
  ciudad: CiudadId | null;
  zona: string | null;
};

/* El filtro por ciudad es lo que convierte una lista larga en un directorio:
   nadie en Cochabamba quiere recorrer los negocios de Trinidad. Se filtra en la
   consulta y no en el navegador porque la lista está paginada, y filtrar
   después de paginar deja páginas medio vacías. */
export async function obtenerDirectorio(
  pagina: number,
  fecha = new Date(),
  ciudad?: string,
) {
  const paginaSegura = Number.isInteger(pagina) && pagina > 0 ? pagina : 1;
  const desde = (paginaSegura - 1) * NEGOCIOS_POR_PAGINA;
  const hasta = desde + NEGOCIOS_POR_PAGINA - 1;
  const supabase = crearClienteSupabasePublico();
  let consulta = supabase
    .from("negocios")
    .select(
      "id,slug,nombre,descripcion,tipo_negocio,logo_url,portada_url,horario,ciudad,zona",
      { count: "exact" },
    )
    .eq("activo", true);

  if (esCiudadId(ciudad)) consulta = consulta.eq("ciudad", ciudad);

  const { data, error, count } = await consulta.order("nombre").range(desde, hasta);

  if (error) throw new Error("No se pudo cargar el directorio público.");
  const { url } = obtenerVariablesPublicasSupabase();
  const total = count ?? 0;

  return {
    negocios: (data ?? []).map((negocio): NegocioDirectorio => ({
      id: negocio.id,
      slug: negocio.slug,
      nombre: negocio.nombre,
      descripcion: negocio.descripcion?.trim() || "Catálogo local disponible en MiPuesto.",
      tipo: negocio.tipo_negocio,
      logoUrl: obtenerUrlPublicaImagenNegocio(url, negocio.logo_url, "logo"),
      portadaUrl: obtenerUrlPublicaImagenNegocio(url, negocio.portada_url, "portada"),
      estadoAtencion: evaluarHorario(negocio.horario, fecha),
      ciudad: esCiudadId(negocio.ciudad) ? negocio.ciudad : null,
      zona: negocio.zona?.trim() || null,
    })),
    ciudad: esCiudadId(ciudad) ? ciudad : null,
    pagina: paginaSegura,
    total,
    totalPaginas: Math.max(1, Math.ceil(total / NEGOCIOS_POR_PAGINA)),
  };
}
