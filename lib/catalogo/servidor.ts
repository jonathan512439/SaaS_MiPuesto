import { crearClienteSupabaseServidor } from "../supabase/server";

export async function obtenerContextoAdminCatalogo() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;

  if (!idUsuario) {
    return {
      correcto: false as const,
      estado: 401,
      error: "Sesión no válida.",
    };
  }

  const { data: negocio, error } = await supabase
    .from("negocios")
    .select("id,nombre,slug")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (error) {
    return {
      correcto: false as const,
      estado: 500,
      error: "No se pudo comprobar el negocio.",
    };
  }

  if (!negocio) {
    return {
      correcto: false as const,
      estado: 404,
      error: "Primero debes registrar tu negocio.",
    };
  }

  return { correcto: true as const, supabase, idUsuario, negocio };
}

export async function leerJson(solicitud: Request) {
  try {
    return { correcto: true as const, datos: (await solicitud.json()) as unknown };
  } catch {
    return {
      correcto: false as const,
      error: "Los datos enviados no son válidos.",
    };
  }
}

type ClienteCatalogo = Awaited<ReturnType<typeof crearClienteSupabaseServidor>>;

export async function validarJerarquiaProducto(
  supabase: ClienteCatalogo,
  negocioId: string,
  categoriaId: string | null,
  subcategoriaId: string | null,
) {
  if (categoriaId) {
    const { data: categoria, error } = await supabase
      .from("categorias")
      .select("id")
      .eq("id", categoriaId)
      .eq("negocio_id", negocioId)
      .maybeSingle();
    if (error || !categoria) return "La categoría seleccionada no pertenece a tu negocio.";
  }

  if (subcategoriaId) {
    const { data: subcategoria, error } = await supabase
      .from("subcategorias")
      .select("id,categoria_id,categorias!inner(negocio_id)")
      .eq("id", subcategoriaId)
      .eq("categoria_id", categoriaId as string)
      .eq("categorias.negocio_id", negocioId)
      .maybeSingle();
    if (error || !subcategoria) {
      return "La subcategoría seleccionada no pertenece a la categoría indicada.";
    }
  }

  return "";
}
