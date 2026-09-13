import { crearClienteSupabaseServidor } from "../supabase/server";
import { fechaDeCorte } from "./papelera";

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
  recursoId: string | null = null,
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

  /* Quién atiende tiene que ser de este negocio. Es la misma comprobación que
     las dos de arriba: la base la haría igual por la clave foránea compuesta,
     pero el mensaje de la base no lo entiende nadie. */
  if (recursoId) {
    const { data: recurso, error } = await supabase
      .from("recursos")
      .select("id")
      .eq("id", recursoId)
      .eq("negocio_id", negocioId)
      .maybeSingle();
    if (error || !recurso) return "El recurso elegido no pertenece a tu negocio.";
  }

  return "";
}

/* Borra de verdad lo que pasó el plazo: primero las fotografías, después las
   filas. Corre dentro de una petición del dueño —no hay tarea programada,
   porque `pg_cron` no puede tocar el almacenamiento y hacerlo desde fuera
   exigiría exponer la clave de servicio en un flujo más— y solo sobre su propio
   negocio, así que el trabajo está acotado por definición.

   La consecuencia, escrita para que no sorprenda: un dueño que no entra en dos
   meses conserva su papelera hasta que vuelva. Lo prometido es «recuperable
   treinta días», no «borrado el día treinta y uno». */
export async function purgarPapeleraVencida(
  supabase: ClienteCatalogo,
  negocioId: string,
): Promise<void> {
  const { data: vencidos } = await supabase
    .from("productos")
    .select("id,fotos")
    .eq("negocio_id", negocioId)
    .not("eliminado_en", "is", null)
    .lt("eliminado_en", fechaDeCorte())
    .limit(100);

  if (!vencidos || vencidos.length === 0) return;

  const fotos = vencidos.flatMap(({ fotos: rutas }) => rutas as string[]);
  if (fotos.length > 0) {
    const { error } = await supabase.storage.from("productos").remove(fotos);
    /* Si el almacenamiento falla se dejan las filas: un producto sin fotos es
       peor que un producto de más, porque el dueño lo ve roto y no entiende por
       qué. Se reintenta en la próxima purga. */
    if (error) return;
  }

  await supabase
    .from("productos")
    .delete()
    .in(
      "id",
      vencidos.map(({ id }) => id),
    )
    .eq("negocio_id", negocioId);
}
