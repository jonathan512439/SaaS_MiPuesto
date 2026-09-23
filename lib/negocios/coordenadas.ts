/* Dónde está un negocio, como un punto, y en qué zona cae. Fase 11.
 *
 * Todo acá es cálculo puro, sin red: se usa igual en el navegador —para que el
 * pin arranque en el lugar correcto— y en el servidor —para validar lo que llega—.
 * Lo único que necesita red, resolver un enlace corto de Google Maps, vive en su
 * ruta y usa `esEnlaceDeMaps` de acá para decidir si lo sigue o no.
 */

export type Punto = { lat: number; lng: number };

/* Bolivia con margen. Es la misma caja que la restricción de la base: un pin
   fuera de ella es un dedo que resbaló, no un negocio. */
export const LIMITES_BOLIVIA = { latMin: -23.0, latMax: -9.5, lngMin: -69.8, lngMax: -57.3 } as const;

export function estaEnBolivia({ lat, lng }: Punto): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= LIMITES_BOLIVIA.latMin &&
    lat <= LIMITES_BOLIVIA.latMax &&
    lng >= LIMITES_BOLIVIA.lngMin &&
    lng <= LIMITES_BOLIVIA.lngMax
  );
}

/* Seis decimales: unos 10 cm, que es lo que guarda la columna. Más no sirve y
   menos correría el pin. */
export function redondearPunto({ lat, lng }: Punto): Punto {
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

/* Los centros de cada ciudad, para que el mapa arranque en la ciudad del dueño
   cuando no hay nada mejor: ni enlace de Maps ni GPS. Son los centros de cada
   ciudad, no de una zona. */
export const CENTRO_DE_CIUDAD: Record<string, Punto> = {
  la_paz: { lat: -16.4955, lng: -68.1336 },
  el_alto: { lat: -16.5048, lng: -68.1631 },
  santa_cruz: { lat: -17.7833, lng: -63.1821 },
  cochabamba: { lat: -17.3895, lng: -66.1568 },
  sucre: { lat: -19.0476, lng: -65.26 },
  oruro: { lat: -17.9647, lng: -67.1064 },
  potosi: { lat: -19.5836, lng: -65.7531 },
  tarija: { lat: -21.5355, lng: -64.7296 },
  trinidad: { lat: -14.8333, lng: -64.9 },
  cobija: { lat: -11.0267, lng: -68.7692 },
};

/* El centro de Bolivia, para quien todavía no eligió ciudad. */
export const CENTRO_DE_BOLIVIA: Punto = { lat: -16.29, lng: -63.59 };

function punto(lat: string | undefined, lng: string | undefined): Punto | null {
  if (lat === undefined || lng === undefined) return null;
  const candidato = { lat: Number(lat), lng: Number(lng) };
  return estaEnBolivia(candidato) ? redondearPunto(candidato) : null;
}

const NUMERO = "(-?\\d{1,2}\\.\\d+)";

/* Las coordenadas que trae un enlace de Google Maps, si las trae.
 *
 * Se prueban los formatos en orden de precisión. `!3d…!4d…` es el lugar marcado
 * —el pin rojo—; `@lat,lng` es el centro de la pantalla que se estaba mirando al
 * copiar el enlace, que puede estar corrido unas cuadras. Por eso el primero
 * gana cuando están los dos.
 *
 * Un enlace corto (`maps.app.goo.gl/…`) no trae coordenadas: hay que seguirlo, y
 * eso lo hace el servidor. Acá devuelve nulo. */
export function coordenadasDeEnlace(enlace: string | null | undefined): Punto | null {
  if (!enlace) return null;
  let texto: string;
  try {
    texto = decodeURIComponent(enlace);
  } catch {
    texto = enlace;
  }

  const lugar = texto.match(new RegExp(`!3d${NUMERO}!4d${NUMERO}`));
  if (lugar) return punto(lugar[1], lugar[2]);

  const consulta = texto.match(new RegExp(`[?&](?:q|query|ll|destination)=${NUMERO},\\s*${NUMERO}`));
  if (consulta) return punto(consulta[1], consulta[2]);

  const pantalla = texto.match(new RegExp(`@${NUMERO},${NUMERO}`));
  if (pantalla) return punto(pantalla[1], pantalla[2]);

  return null;
}

/* Los dominios de Google Maps que el servidor acepta seguir.
 *
 * Es una lista cerrada y es lo que impide que la ruta que resuelve enlaces sea
 * una puerta para que el servidor pida cualquier dirección que alguien le pase.
 * `google.com` entra solo con la ruta `/maps`. */
export function esEnlaceDeMaps(enlace: string): boolean {
  let url: URL;
  try {
    url = new URL(enlace);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "maps.app.goo.gl" || host === "goo.gl" || host === "maps.google.com") return true;
  if ((host === "www.google.com" || host === "google.com") && url.pathname.startsWith("/maps")) {
    return true;
  }
  if (host === "www.google.com.bo" || host === "google.com.bo") {
    return url.pathname.startsWith("/maps");
  }
  return false;
}

/* Distancia en kilómetros entre dos puntos, sobre la esfera. Con distancias de
   ciudad, la diferencia contra un cálculo más fino es de metros. */
export function distanciaKm(a: Punto, b: Punto): number {
  const radio = 6371;
  const rad = (grados: number) => (grados * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radio * Math.asin(Math.sqrt(h));
}

export type ZonaConCentro = {
  id: string;
  ciudad: string;
  nombre: string;
  latitud: number;
  longitud: number;
};

/* Hasta cuánto se considera que un punto «cae» en una zona. Más allá, se le
   pregunta al dueño en vez de asignarle una zona que no es la suya. */
export const RADIO_DE_ZONA_KM = 3;

/* La zona de la ciudad del negocio cuyo centro está más cerca del pin, si está a
   menos de 3 km. Solo de su ciudad: un negocio en el borde de El Alto no puede
   caer en una zona de La Paz aunque quede más cerca. */
export function zonaMasCercana(
  ubicacion: Punto,
  ciudad: string | null,
  zonas: readonly ZonaConCentro[],
): ZonaConCentro | null {
  if (!ciudad) return null;
  let mejor: { zona: ZonaConCentro; distancia: number } | null = null;
  for (const zona of zonas) {
    if (zona.ciudad !== ciudad) continue;
    const distancia = distanciaKm(ubicacion, { lat: Number(zona.latitud), lng: Number(zona.longitud) });
    if (distancia <= RADIO_DE_ZONA_KM && (!mejor || distancia < mejor.distancia)) {
      mejor = { zona, distancia };
    }
  }
  return mejor?.zona ?? null;
}
