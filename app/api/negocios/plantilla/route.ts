import { NextResponse, type NextRequest } from "next/server";


import { tarjetaValidaPara } from "../../../../lib/apariencia";
import { esPaletaId, esPlantillaId } from "../../../../lib/plantillas/validacion";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

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

  const plantillaId =
    typeof entrada === "object" && entrada !== null && "plantilla_id" in entrada
      ? entrada.plantilla_id
      : undefined;
  const paletaId =
    typeof entrada === "object" && entrada !== null && "paleta_id" in entrada
      ? entrada.paleta_id
      : undefined;

  const patronFondo =
    typeof entrada === "object" && entrada !== null && "patron_fondo" in entrada
      ? entrada.patron_fondo
      : undefined;

  const patronOpacidad =
    typeof entrada === "object" && entrada !== null && "patron_opacidad" in entrada
      ? entrada.patron_opacidad
      : undefined;

  /* Se rechaza en vez de acotarse, al revés que en el catalogo público: allá el
     dato ya está guardado y no se puede dejar de dibujar la página por un número
     raro; acá hay alguien mandando algo que el panel nunca ofrece, y guardarle
     otra cosa sin avisar es peor que decirle que no. */
  if (
    typeof patronOpacidad !== "number" ||
    !Number.isInteger(patronOpacidad) ||
    patronOpacidad < 0 ||
    patronOpacidad > 30
  ) {
    return NextResponse.json(
      { error: "La intensidad del fondo no es válida." },
      { status: 400 },
    );
  }

  if (typeof patronFondo !== "boolean") {
    return NextResponse.json(
      { error: "La preferencia de fondo no es válida." },
      { status: 400 },
    );
  }

  if (!esPlantillaId(plantillaId) || !esPaletaId(paletaId)) {
    return NextResponse.json(
      { error: "La plantilla o la paleta seleccionada no es válida." },
      { status: 400 },
    );
  }

  /* La tarjeta se corrige en vez de rechazarse.
   *
   * No toda plantilla dibuja toda forma, y el caso normal no es un ataque: el
   * dueño tenía «retrato» en Moderna y se cambia a Feria, que no la dibuja. El
   * navegador manda las dos cosas juntas y devolverle un error por algo que no
   * hizo mal sería trabarlo sin motivo. Se le guarda la predeterminada de la
   * plantilla nueva, que es la que habría elegido.
   *
   * La corrección es la misma función que usa el catálogo público, así que las
   * dos puntas no pueden discrepar. */
  const tarjetaId = tarjetaValidaPara(
    plantillaId,
    typeof entrada === "object" && entrada !== null && "tarjeta_id" in entrada
      ? entrada.tarjeta_id
      : undefined,
  );

  const { data: negocio, error } = await supabase
    .from("negocios")
    .update({
      plantilla_id: plantillaId,
      tarjeta_id: tarjetaId,
      paleta_id: paletaId,
      patron_fondo: patronFondo,
      patron_opacidad: patronOpacidad,
    })
    .eq("admin_user_id", idUsuario)
    .select("slug,plantilla_id,tarjeta_id,paleta_id,patron_fondo,patron_opacidad")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo guardar la apariencia. Intenta nuevamente." },
      { status: 500 },
    );
  }

  if (!negocio) {
    return NextResponse.json({ error: "Primero debes registrar tu negocio." }, { status: 404 });
  }


  return NextResponse.json({
    plantilla_id: negocio.plantilla_id,
    /* Se devuelve la que quedó guardada y no la que llegó: si se corrigió, el
       panel tiene que enterarse y mostrar la que de verdad tiene el negocio. */
    tarjeta_id: negocio.tarjeta_id,
    paleta_id: negocio.paleta_id,
    patron_fondo: negocio.patron_fondo,
  });
}
