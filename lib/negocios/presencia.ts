import { esUuid } from "../catalogo/validacion";
import type { Database } from "../supabase/database.types";
import { estaEnBolivia, redondearPunto, type Punto } from "./coordenadas";
import { esCiudadId, type CiudadId } from "./lugares";
import {
  esRubroPublicoId,
  leerRubrosSecundarios,
  type RubroPublicoId,
} from "./rubros-publicos";

/* Qué vende el negocio y si quiere que lo encuentren. Fase 11.
 *
 * Lo mandan dos pantallas —el paso 2 del alta y «Mi negocio»— y se valida en
 * un solo lugar para que no puedan aceptar cosas distintas.
 *
 * **La decisión de aparecer es obligatoria y explícita.** Llega `true` o
 * `false`; cualquier otra cosa es «no respondió» y se rechaza. Es el pedido del
 * dueño del proyecto: cada negocio decide si quiere ser encontrado, y nadie lo
 * decide por él.
 *
 * Con «sí» hacen falta la ciudad y el punto: sin ellos no hay cómo encontrarlo.
 * Con «no» se guarda solo la decisión y el rubro; la ubicación que hubiera
 * cargado antes se conserva, para que volver a decir que sí no obligue a poner
 * el pin de nuevo.
 */

export type Presencia = {
  rubroPublico: RubroPublicoId;
  rubrosSecundarios: RubroPublicoId[];
  aparece: boolean;
  ciudad: CiudadId | null;
  ubicacion: Punto | null;
  zonaId: string | null;
  zonaPropuesta: string | null;
};

export type ResultadoPresencia =
  | { correcto: true; presencia: Presencia }
  | { correcto: false; errores: Record<string, string> };

const LARGO_ZONA_PROPUESTA = { minimo: 2, maximo: 60 } as const;

function leerPunto(valor: unknown): Punto | null {
  if (typeof valor !== "object" || valor === null) return null;
  const { lat, lng } = valor as Record<string, unknown>;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return estaEnBolivia({ lat, lng }) ? redondearPunto({ lat, lng }) : null;
}

export function validarPresencia(entrada: Record<string, unknown>): ResultadoPresencia {
  const errores: Record<string, string> = {};

  const rubroPublico = entrada.rubro_publico;
  if (!esRubroPublicoId(rubroPublico)) {
    errores.rubro_publico = "Elige qué vendes.";
  }

  const secundarios = leerRubrosSecundarios(
    entrada.rubros_secundarios,
    typeof rubroPublico === "string" ? rubroPublico : null,
  );
  if (!secundarios.correcto) errores.rubros_secundarios = secundarios.error;

  const aparece = entrada.aparece_en_directorio;
  if (aparece !== true && aparece !== false) {
    errores.aparece_en_directorio = "Cuéntanos si quieres que te encuentren en el buscador.";
  }

  let ciudad: CiudadId | null = null;
  let ubicacion: Punto | null = null;
  let zonaId: string | null = null;
  let zonaPropuesta: string | null = null;

  if (aparece === true) {
    if (esCiudadId(entrada.ciudad)) {
      ciudad = entrada.ciudad;
    } else {
      errores.ciudad = "Elige tu ciudad.";
    }

    ubicacion = leerPunto(entrada.ubicacion);
    if (!ubicacion) errores.ubicacion = "Marca en el mapa dónde está tu local.";

    if (entrada.zona_id !== undefined && entrada.zona_id !== null && entrada.zona_id !== "") {
      if (esUuid(entrada.zona_id)) {
        zonaId = entrada.zona_id;
      } else {
        errores.zona_id = "Esa zona no existe.";
      }
    }

    const propuesta = typeof entrada.zona_propuesta === "string" ? entrada.zona_propuesta.trim() : "";
    if (!zonaId && propuesta !== "") {
      if (propuesta.length < LARGO_ZONA_PROPUESTA.minimo || propuesta.length > LARGO_ZONA_PROPUESTA.maximo) {
        errores.zona_propuesta = `Escribe tu zona, de ${LARGO_ZONA_PROPUESTA.minimo} a ${LARGO_ZONA_PROPUESTA.maximo} caracteres.`;
      } else {
        zonaPropuesta = propuesta;
      }
    }
  }

  if (Object.keys(errores).length > 0) return { correcto: false, errores };

  return {
    correcto: true,
    presencia: {
      rubroPublico: rubroPublico as RubroPublicoId,
      rubrosSecundarios: secundarios.correcto ? secundarios.secundarios : [],
      aparece: aparece as boolean,
      ciudad,
      ubicacion,
      zonaId,
      zonaPropuesta,
    },
  };
}

/* Las columnas a escribir. Con «no», solo la decisión y los rubros: la
   ubicación guardada se conserva. Tipado contra la tabla: escribir mal el nombre
   de una columna es un error de compilación y no una escritura ignorada. */
export function cambiosDePresencia(
  presencia: Presencia,
): Database["public"]["Tables"]["negocios"]["Update"] {
  const base = {
    rubro_publico: presencia.rubroPublico,
    rubros_secundarios: presencia.rubrosSecundarios,
    aparece_en_directorio: presencia.aparece,
  };
  if (!presencia.aparece) return base;
  return {
    ...base,
    ciudad: presencia.ciudad,
    ubicacion_lat: presencia.ubicacion?.lat ?? null,
    ubicacion_lng: presencia.ubicacion?.lng ?? null,
    zona_id: presencia.zonaId,
    zona_propuesta: presencia.zonaId ? null : presencia.zonaPropuesta,
  };
}
