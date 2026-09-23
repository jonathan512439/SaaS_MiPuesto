import { obtenerUrlPublicaImagenProducto } from "./catalogo/imagenes-publicas";
import { redondearCerca } from "./directorio-cerca";
import { esUuid } from "./catalogo/validacion";
import { evaluarHorario } from "./horario";
import { obtenerUrlPublicaImagenNegocio } from "./negocios/imagenes-publicas";
import { esCiudadId, nombreDeCiudad, ordenarCiudades, type CiudadId } from "./negocios/lugares";
import {
  RUBROS_PUBLICOS,
  esRubroPublicoId,
  nombreDeRubroPublico,
  type RubroPublicoId,
} from "./negocios/rubros-publicos";
import { crearClienteSupabasePublico } from "./supabase/public";
import { obtenerVariablesPublicasSupabase } from "./supabase/variables";
import { normalizarBusqueda } from "./texto";

/* El directorio buscable. Fase 12.
 *
 * Dos recorridos, que son los del plan:
 *
 * - «Quiero ver los restaurantes de mi zona»: ciudad → zona → rubro.
 * - «Quiero comprar juguetes en Oruro»: escribo «juguetes», elijo la ciudad, y
 *   veo los negocios que los venden, con los productos que coinciden.
 *
 * La búsqueda la hace una sola función de la base, `buscar_en_directorio`, que
 * es la que sostiene las reglas: solo negocios activos que eligieron aparecer,
 * solo lo visible, y **nunca coordenadas**. Acá se prepara lo que se le manda y
 * se arma lo que se dibuja.
 */

export const NEGOCIOS_POR_PAGINA = 12;
export const LARGO_MAXIMO_BUSQUEDA_DIRECTORIO = 60;
const MAXIMO_PALABRAS = 6;

export type FiltrosDirectorio = {
  texto: string;
  ciudad: CiudadId | null;
  zonaId: string | null;
  rubro: RubroPublicoId | null;
  /* «Cerca de mí», ya redondeado a dos decimales (~1 km) en el navegador. */
  cerca: { lat: number; lng: number } | null;
  pagina: number;
};

function primero(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

function leerCerca(valor: string): FiltrosDirectorio["cerca"] {
  const [lat, lng] = valor.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -23 || lat > -9.5 || lng < -69.8 || lng > -57.3) return null;
  return redondearCerca(lat, lng);
}

/* Lo que venga en la dirección puede ser cualquier cosa: un enlace viejo,
   alguien escribiendo a mano. Nada de eso puede dejar la página en blanco; lo
   que no se entiende, se ignora. */
export function leerFiltrosDirectorio(
  parametros: Record<string, string | string[] | undefined>,
  fijos: { ciudad?: CiudadId; rubro?: RubroPublicoId } = {},
): FiltrosDirectorio {
  const ciudad = fijos.ciudad ?? primero(parametros.ciudad);
  const rubro = fijos.rubro ?? primero(parametros.rubro);
  const zona = primero(parametros.zona);
  const pagina = Number(primero(parametros.pagina) || 1);
  return {
    texto: primero(parametros.q).slice(0, LARGO_MAXIMO_BUSQUEDA_DIRECTORIO).trim(),
    ciudad: esCiudadId(ciudad) ? ciudad : null,
    zonaId: esUuid(zona) ? zona : null,
    rubro: esRubroPublicoId(rubro) ? rubro : null,
    cerca: leerCerca(primero(parametros.cerca)),
    pagina: Number.isInteger(pagina) && pagina > 0 && pagina < 1000 ? pagina : 1,
  };
}

/* De lo que escribió el cliente a las palabras que se buscan: sin tildes, sin
   signos, en minúscula, y no más de seis. */
export function palabrasDeBusqueda(texto: string): string[] {
  return [
    ...new Set(
      normalizarBusqueda(texto)
        .replace(/[^a-z0-9ñ ]/g, " ")
        .replace(/ñ/g, "n")
        .split(/\s+/)
        .filter((palabra) => palabra.length >= 2),
    ),
  ].slice(0, MAXIMO_PALABRAS);
}

/* La raíz de una palabra: sin la -s final y después sin la -e final, en las de
   más de cuatro letras. «juguetes» y «juguete» dan «juguet»; «flores» y «flor»,
   «flor». Es la misma regla que `public.raiz_de_palabra` en la base, y una
   prueba las compara: si se separaran, un rubro y un producto se reconocerían
   con reglas distintas. */
export function raizDePalabra(palabra: string): string {
  return palabra.length > 4 ? palabra.replace(/s$/, "").replace(/e$/, "") : palabra;
}

/* Los rubros públicos cuyo nombre contiene lo que se buscó: «restaurantes»
   encuentra «Restaurante», «juguetes» encuentra «Juguetería». Así un negocio
   aparece por lo que es, aunque ninguno de sus productos diga la palabra. */
export function rubrosQueCoinciden(palabras: readonly string[]): RubroPublicoId[] {
  const raices = palabras.filter((palabra) => palabra.length >= 3).map(raizDePalabra);
  if (raices.length === 0) return [];
  return RUBROS_PUBLICOS.filter(({ nombre }) => {
    const nombreNormalizado = normalizarBusqueda(nombre);
    return raices.some((raiz) => nombreNormalizado.includes(raiz));
  }).map(({ id }) => id);
}

export type ProductoQueCoincide = {
  nombre: string;
  codigo: string;
  fotoUrl: string | null;
};

export type ResultadoDirectorio = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  logoUrl: string | null;
  portadaUrl: string | null;
  estadoAtencion: ReturnType<typeof evaluarHorario>;
  ciudad: string;
  zona: string | null;
  rubro: string | null;
  coincidencias: number;
  productos: ProductoQueCoincide[];
  distanciaKm: number | null;
  /* La palabra con la que el catálogo del negocio encuentra lo que coincidió,
     para abrirlo ya filtrado. Nula si coincidió por el negocio y no por sus
     productos, o solo por parecido. */
  palabra: string | null;
};

type FilaDeLaBase = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  logo_url: string | null;
  portada_url: string | null;
  horario: unknown;
  ciudad: string;
  zona: string | null;
  rubro_publico: string | null;
  puntaje: number;
  coincidencias: number;
  productos: unknown;
  distancia_km: number | null;
  palabra: string | null;
  total: number;
};

export async function buscarEnDirectorio(filtros: FiltrosDirectorio, ahora = new Date()) {
  const supabase = crearClienteSupabasePublico();
  const palabras = palabrasDeBusqueda(filtros.texto);
  const { data, error } = await supabase.rpc("buscar_en_directorio", {
    p_palabras: palabras,
    p_rubros_que_coinciden: rubrosQueCoinciden(palabras),
    p_ciudad: filtros.ciudad ?? undefined,
    p_zona_id: filtros.zonaId ?? undefined,
    p_rubro: filtros.rubro ?? undefined,
    p_lat: filtros.cerca?.lat,
    p_lng: filtros.cerca?.lng,
    p_pagina: filtros.pagina,
  });
  if (error) throw new Error("No se pudo buscar en el directorio.");

  const { url } = obtenerVariablesPublicasSupabase();
  const filas = (data ?? []) as unknown as FilaDeLaBase[];
  const total = Number(filas[0]?.total ?? 0);

  const conPuntaje = filas.map((fila) => ({
    puntaje: Number(fila.puntaje) || 0,
    resultado: {
    id: fila.id,
    slug: fila.slug,
    nombre: fila.nombre,
    descripcion: fila.descripcion?.trim() || null,
    logoUrl: obtenerUrlPublicaImagenNegocio(url, fila.logo_url, "logo"),
    portadaUrl: obtenerUrlPublicaImagenNegocio(url, fila.portada_url, "portada"),
    estadoAtencion: evaluarHorario(fila.horario, ahora),
    ciudad: fila.ciudad,
    zona: fila.zona,
    rubro: nombreDeRubroPublico(fila.rubro_publico),
    coincidencias: Number(fila.coincidencias) || 0,
    productos: (Array.isArray(fila.productos) ? fila.productos : []).map(
      (producto: { nombre: string; codigo: string; foto: string | null }) => ({
        nombre: producto.nombre,
        codigo: producto.codigo,
        fotoUrl: producto.foto ? obtenerUrlPublicaImagenProducto(url, producto.foto) : null,
      }),
    ),
    distanciaKm: fila.distancia_km === null ? null : Number(fila.distancia_km),
    palabra: fila.palabra,
    } satisfies ResultadoDirectorio,
  }));

  /* A igual puntaje, el que está abierto ahora primero. La base no puede
     decidirlo —el horario se evalúa acá— así que se ordena dentro de la página,
     sin romper el orden que ya trajo: `sort` es estable. */
  conPuntaje.sort((a, b) => {
    if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
    return (
      Number(b.resultado.estadoAtencion.abierto === true) -
      Number(a.resultado.estadoAtencion.abierto === true)
    );
  });

  return {
    resultados: conPuntaje.map(({ resultado }) => resultado),
    total,
    palabras,
    totalPaginas: Math.max(1, Math.ceil(total / NEGOCIOS_POR_PAGINA)),
  };
}

/* Qué ciudades, zonas y rubros tienen al menos un negocio que aparece.
 *
 * Solo esos se ofrecen: un filtro que lleva a cero resultados es una trampa, y
 * con pocos negocios la mayoría de las combinaciones darían cero. */
export async function facetasDelDirectorio(ciudadElegida: CiudadId | null) {
  const supabase = crearClienteSupabasePublico();
  const [{ data: negocios }, { data: zonas }] = await Promise.all([
    supabase
      .from("negocios")
      .select("ciudad,zona_id,rubro_publico,rubros_secundarios")
      .eq("activo", true)
      .eq("aparece_en_directorio", true),
    supabase.from("zonas").select("id,ciudad,nombre").eq("activa", true).order("nombre"),
  ]);

  const filas = negocios ?? [];
  const ciudades = ordenarCiudades(
    [...new Set(filas.map(({ ciudad }) => ciudad).filter(esCiudadId))],
  ).map((id) => ({ id, nombre: nombreDeCiudad(id) }));

  const enLaCiudad = ciudadElegida ? filas.filter(({ ciudad }) => ciudad === ciudadElegida) : filas;
  const zonasConNegocios = new Set(enLaCiudad.map(({ zona_id }) => zona_id).filter(Boolean));
  const rubrosConNegocios = new Set(
    enLaCiudad.flatMap(({ rubro_publico, rubros_secundarios }) => [
      rubro_publico,
      ...(rubros_secundarios ?? []),
    ]),
  );

  return {
    ciudades,
    zonas: ciudadElegida
      ? (zonas ?? []).filter(({ id, ciudad }) => ciudad === ciudadElegida && zonasConNegocios.has(id))
      : [],
    rubros: RUBROS_PUBLICOS.filter(({ id }) => rubrosConNegocios.has(id)).map(({ id, nombre }) => ({
      id,
      nombre,
    })),
  };
}

/* La dirección de una búsqueda, para enlaces y paginación. Las páginas por
   ciudad y rubro tienen su propia dirección —la que encuentra Google—, y la
   búsqueda libre va en `/directorio` con sus parámetros. */
export function direccionDeBusqueda(filtros: Partial<FiltrosDirectorio>): string {
  const parametros = new URLSearchParams();
  if (filtros.texto) parametros.set("q", filtros.texto);
  if (filtros.ciudad) parametros.set("ciudad", filtros.ciudad);
  if (filtros.zonaId) parametros.set("zona", filtros.zonaId);
  if (filtros.rubro) parametros.set("rubro", filtros.rubro);
  if (filtros.cerca) parametros.set("cerca", `${filtros.cerca.lat},${filtros.cerca.lng}`);
  if (filtros.pagina && filtros.pagina > 1) parametros.set("pagina", String(filtros.pagina));
  const cadena = parametros.toString();
  return cadena ? `/directorio?${cadena}` : "/directorio";
}
