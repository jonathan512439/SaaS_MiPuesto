import { evaluarHorario } from "./horario";
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
};

export async function obtenerDirectorio(pagina: number, fecha = new Date()) {
  const paginaSegura = Number.isInteger(pagina) && pagina > 0 ? pagina : 1;
  const desde = (paginaSegura - 1) * NEGOCIOS_POR_PAGINA;
  const hasta = desde + NEGOCIOS_POR_PAGINA - 1;
  const supabase = crearClienteSupabasePublico();
  const { data, error, count } = await supabase
    .from("negocios")
    .select(
      "id,slug,nombre,descripcion,tipo_negocio,logo_url,portada_url,horario",
      { count: "exact" },
    )
    .eq("activo", true)
    .order("nombre")
    .range(desde, hasta);

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
      logoUrl: obtenerUrlPublicaImagenNegocio(url, negocio.logo_url),
      portadaUrl: obtenerUrlPublicaImagenNegocio(url, negocio.portada_url),
      estadoAtencion: evaluarHorario(negocio.horario, fecha),
    })),
    pagina: paginaSegura,
    total,
    totalPaginas: Math.max(1, Math.ceil(total / NEGOCIOS_POR_PAGINA)),
  };
}
