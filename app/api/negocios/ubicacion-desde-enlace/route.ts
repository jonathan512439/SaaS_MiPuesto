import { NextResponse, type NextRequest } from "next/server";

import { leerJson, obtenerContextoAdminCatalogo } from "../../../../lib/catalogo/servidor";
import { coordenadasDeEnlace, esEnlaceDeMaps } from "../../../../lib/negocios/coordenadas";

/* El punto que marca un enlace de Google Maps. Fase 11.
 *
 * Muchos dueños ya pegaron su enlace de «Cómo llegar», y ese enlace sabe dónde
 * está el local. Con esto el pin del mapa arranca ahí y el dueño solo confirma.
 *
 * Un enlace largo trae las coordenadas adentro y se lee sin salir a la red. Uno
 * corto —`maps.app.goo.gl/…`, que es el que da el botón «Compartir» del
 * teléfono— no: hay que seguir su redirección.
 *
 * **Seguir redirecciones es la parte peligrosa**, y por eso:
 *
 * - Solo la usa un dueño con sesión. No es un servicio abierto.
 * - Solo se sigue un enlace de Google Maps, y **cada salto** vuelve a pasar por
 *   la lista cerrada de dominios. Sin eso, un enlace corto propio podría mandar
 *   al servidor a pedir cualquier dirección.
 * - Tres saltos como máximo y tres segundos por salto.
 * - Nunca se lee el cuerpo de la respuesta: solo el encabezado `Location`.
 */
const SALTOS_MAXIMOS = 3;
const ESPERA_POR_SALTO_MS = 3000;

async function seguir(enlace: string): Promise<{ lat: number; lng: number } | null> {
  let actual = enlace;
  for (let salto = 0; salto < SALTOS_MAXIMOS; salto += 1) {
    if (!esEnlaceDeMaps(actual)) return null;

    let respuesta: Response;
    try {
      respuesta = await fetch(actual, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(ESPERA_POR_SALTO_MS),
      });
    } catch {
      return null;
    }
    /* El cuerpo no se usa; se descarta para no dejar la conexión colgada. */
    await respuesta.body?.cancel().catch(() => undefined);

    const destino = respuesta.headers.get("location");
    if (!destino) return null;

    const absoluto = new URL(destino, actual).toString();
    const punto = coordenadasDeEnlace(absoluto);
    if (punto) return punto;
    actual = absoluto;
  }
  return null;
}

export async function POST(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }

  const entrada = await leerJson(solicitud);
  const enlace =
    entrada.correcto && typeof entrada.datos === "object" && entrada.datos !== null
      ? String((entrada.datos as Record<string, unknown>).enlace ?? "").trim()
      : "";

  if (enlace === "" || enlace.length > 2000) {
    return NextResponse.json({ error: "Pega el enlace de Google Maps de tu local." }, { status: 400 });
  }

  const directo = coordenadasDeEnlace(enlace);
  if (directo) return NextResponse.json({ ubicacion: directo });

  if (!esEnlaceDeMaps(enlace)) {
    return NextResponse.json({ error: "Ese enlace no es de Google Maps." }, { status: 400 });
  }

  const seguido = await seguir(enlace);
  if (!seguido) {
    return NextResponse.json(
      { error: "No encontramos el punto en ese enlace. Márcalo a mano en el mapa." },
      { status: 422 },
    );
  }
  return NextResponse.json({ ubicacion: seguido });
}
