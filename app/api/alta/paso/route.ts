import { NextResponse, type NextRequest } from "next/server";

import { PASOS_ALTA } from "../../../../lib/negocios/alta";
import { esRubroId } from "../../../../lib/negocios/rubros";
import { sembrarRubro } from "../../../../lib/rubros/sembrar";
import { siembraDeRubro } from "../../../../lib/rubros/siembra";
import { normalizarSlug, validarSlug } from "../../../../lib/negocios/validacion";
import type { Database } from "../../../../lib/supabase/database.types";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

/* Guardar un paso del alta y pasar al siguiente.
 *
 * Es un endpoint propio y no el de perfil, aunque escriban en la misma tabla.
 * El de perfil valida **el negocio entero** —exige modalidad y teléfono— y en
 * el paso 1 el dueño todavía no los eligió: mandarlo ahí lo obligaría a
 * completar de una vez lo que el alta reparte en cuatro pantallas, que es
 * justamente el menú que se está desarmando.
 *
 * Cada paso escribe **solo lo suyo**. El 3 no escribe nada: logo, subnombre y
 * paleta se guardan desde sus propias pantallas, y acá solo queda registrado
 * que pasó por ahí.
 */

const ULTIMO_PASO = PASOS_ALTA.length;

/* Tipado contra la tabla y no `Record<string, unknown>`: así escribir mal el
   nombre de una columna es un error de compilación y no una escritura que la
   base ignora en silencio. */
type CambiosNegocio = Database["public"]["Tables"]["negocios"]["Update"];

function leerTexto(objeto: Record<string, unknown>, clave: string): string {
  const valor = objeto[clave];
  return typeof valor === "string" ? valor.trim() : "";
}

export async function PATCH(solicitud: NextRequest) {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;

  if (!idUsuario) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  }

  const objeto = typeof entrada === "object" && entrada !== null
    ? (entrada as Record<string, unknown>)
    : {};
  const paso = typeof objeto.paso === "number" ? objeto.paso : 0;

  if (!Number.isInteger(paso) || paso < 1 || paso > ULTIMO_PASO) {
    return NextResponse.json({ error: "Ese paso no existe." }, { status: 400 });
  }

  const { data: negocio, error: errorLectura } = await supabase
    .from("negocios")
    .select("id,slug,rubro,rubro_bloqueado_en,alta_paso")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (errorLectura) {
    return NextResponse.json({ error: "No se pudo leer tu negocio." }, { status: 500 });
  }
  if (!negocio) {
    return NextResponse.json({ error: "Primero debes registrar tu negocio." }, { status: 404 });
  }

  const cambios: CambiosNegocio = {};
  const errores: Record<string, string> = {};

  if (paso === 1) {
    const nombreAdmin = leerTexto(objeto, "nombre_admin");
    const nombre = leerTexto(objeto, "nombre");
    const slug = normalizarSlug(objeto.slug);

    if (nombreAdmin.length < 2 || nombreAdmin.length > 60) {
      errores.nombre_admin = "Escribí tu nombre, de 2 a 60 caracteres.";
    }
    if (nombre.length < 2 || nombre.length > 80) {
      errores.nombre = "Escribí el nombre de tu negocio, de 2 a 80 caracteres.";
    }

    const errorSlug = validarSlug(slug);
    if (errorSlug) {
      errores.slug = errorSlug;
    } else if (slug !== negocio.slug) {
      /* Solo se comprueba si de verdad cambió: preguntar por el propio slug
         devolvería «ocupado», porque lo ocupa este mismo negocio. */
      const { data: libre, error } = await supabase.rpc("slug_disponible", { p_slug: slug });
      if (error) {
        return NextResponse.json(
          { error: "No se pudo verificar la dirección en este momento." },
          { status: 500 },
        );
      }
      if (libre !== true) errores.slug = "Esa dirección ya está tomada. Probá con otra.";
    }

    Object.assign(cambios, { nombre_admin: nombreAdmin, nombre, slug });
  }

  if (paso === 2) {
    const rubro = leerTexto(objeto, "rubro");

    if (!esRubroId(rubro)) {
      errores.rubro = "Elegí a qué se dedica tu negocio.";
    } else if (negocio.rubro_bloqueado_en && negocio.rubro !== rubro) {
      /* El rubro se elige una sola vez, y cambiarlo reinicia el catálogo: se
         borran categorías, productos y fotos. Por eso no lo puede hacer el
         dueño desde acá aunque vuelva atrás en el alta; lo hace el equipo, con
         la exportación previa. */
      return NextResponse.json(
        {
          error:
            "Tu rubro ya quedó fijo. Para cambiarlo, escribinos: el catálogo se reinicia y te lo exportamos antes.",
        },
        { status: 409 },
      );
    } else {
      Object.assign(cambios, { rubro, rubro_bloqueado_en: new Date().toISOString() });

      /* La paleta y la modalidad del rubro se sugieren, no se imponen: se
         escriben solo si el dueño no eligió nada todavía. Pisarle una paleta que
         ya había elegido sería cambiarle el catálogo por haber vuelto atrás a
         releer un aviso. */
      const siembra = siembraDeRubro(rubro);
      if (siembra && !negocio.rubro) {
        Object.assign(cambios, {
          paleta_id: siembra.paletaSugerida,
          tipo_negocio: siembra.modalidadSugerida,
        });
      }
    }
  }

  if (Object.keys(errores).length > 0) {
    return NextResponse.json({ error: "Revisá lo que cargaste.", errores }, { status: 400 });
  }

  /* El paso guardado nunca retrocede.
   *
   * El dueño puede volver a una pantalla anterior para corregir algo, y guardar
   * ahí no tiene por qué mandarlo de nuevo al principio del camino: si ya había
   * llegado al 4, sigue estando en el 4. */
  cambios.alta_paso = Math.max(negocio.alta_paso, Math.min(paso + 1, ULTIMO_PASO));

  /* Terminar es una acción del dueño, en el último paso. */
  if (paso === ULTIMO_PASO && objeto.terminar === true) {
    cambios.alta_completada_en = new Date().toISOString();
  }

  const { error } = await supabase
    .from("negocios")
    .update(cambios)
    .eq("admin_user_id", idUsuario);

  if (error) {
    return NextResponse.json({ error: "No se pudo guardar. Intentá de nuevo." }, { status: 500 });
  }

  /* La siembra va **después** de guardar el rubro y no antes: si fallara, el
     rubro ya quedó elegido y el dueño puede seguir con el catálogo en blanco, que
     es molesto pero no lo deja trabado. Al revés —sembrar primero— un fallo al
     guardar dejaría categorías de un rubro que el negocio no tiene.
     Tampoco tumba el paso: el dueño ya decidió, y volverlo a la pantalla
     anterior por algo que se puede rehacer después sería castigarlo por un
     problema nuestro. */
  let sembrado: Awaited<ReturnType<typeof sembrarRubro>> | null = null;
  if (paso === 2 && typeof cambios.rubro === "string") {
    try {
      sembrado = await sembrarRubro(supabase, negocio.id, cambios.rubro);
    } catch {
      sembrado = null;
    }
  }

  const siguiente = PASOS_ALTA[Math.min(paso, ULTIMO_PASO - 1)];
  return NextResponse.json({
    guardado: true,
    completada: cambios.alta_completada_en !== undefined,
    siguiente: siguiente.id,
    ruta: siguiente.ruta,
    /* Cuántas categorías quedó con el rubro, para poder decírselo en vez de
       mandarlo a la pantalla siguiente sin explicar qué acaba de pasar. */
    sembradas: sembrado?.sembro ? sembrado.categorias : 0,
  });
}
