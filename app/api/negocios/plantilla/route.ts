import { NextResponse, type NextRequest } from "next/server";


import { esFormaTarjeta } from "../../../../lib/apariencia";
import { esPaletaId } from "../../../../lib/plantillas/validacion";
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

  const formaTarjeta =
    typeof entrada === "object" && entrada !== null && "forma_tarjeta" in entrada
      ? entrada.forma_tarjeta
      : undefined;

  /* Opcional: quien no la manda no la toca. Si la manda, tiene que ser una de
     las tres; una forma desconocida la rechazaría la base con un error que el
     dueño no entendería. */
  if (formaTarjeta !== undefined && !esFormaTarjeta(formaTarjeta)) {
    return NextResponse.json({ error: "La forma de las tarjetas no es válida." }, { status: 400 });
  }

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

  if (!esPaletaId(paletaId)) {
    return NextResponse.json(
      { error: "La paleta seleccionada no es válida." },
      { status: 400 },
    );
  }

  const { data: negocio, error } = await supabase
    .from("negocios")
    .update({
      paleta_id: paletaId,
      patron_fondo: patronFondo,
      patron_opacidad: patronOpacidad,
      ...(formaTarjeta !== undefined ? { forma_tarjeta: formaTarjeta } : {}),
    })
    .eq("admin_user_id", idUsuario)
    .select("slug,paleta_id,patron_fondo,patron_opacidad,forma_tarjeta")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo guardar la apariencia. Intentá nuevamente." },
      { status: 500 },
    );
  }

  if (!negocio) {
    return NextResponse.json({ error: "Primero debes registrar tu negocio." }, { status: 404 });
  }


  /* Se devuelve lo que quedó guardado y no lo que llegó: si el servidor
     corrigiera algo, el panel tiene que mostrar lo que de verdad tiene el
     negocio y no lo que creyó mandar. */
  return NextResponse.json({
    paleta_id: negocio.paleta_id,
    patron_fondo: negocio.patron_fondo,
    patron_opacidad: negocio.patron_opacidad,
    forma_tarjeta: negocio.forma_tarjeta,
  });
}
