/* El alta guiada: cuatro pasos, y qué falta para publicar.
 *
 * El diagnóstico del plan es que el panel es «un menú de pantallas sueltas»: el
 * dueño entra y tiene que adivinar por dónde empezar. Un cliente real ya reportó
 * que no encontraba cómo crear una categoría. Esto es lo que convierte ese menú
 * en un camino.
 *
 * **La verdad vive en los datos, no en una bandera.** Salvo el paso 3 —que no
 * tiene ningún dato obligatorio y por eso se recuerda en `alta_paso`—, cada paso
 * se da por cumplido mirando lo que hay guardado. Una bandera aparte se
 * desincroniza el día que alguien borra sus productos desde otra pantalla y el
 * sistema sigue creyendo que el alta terminó.
 */

import { RUTAS_PANEL } from "../panel/rutas";

export const PASOS_ALTA = [
  {
    numero: 1,
    id: "quien-sos",
    titulo: "Quién eres",
    /* Se pide el nombre de la persona y el del negocio. El slug se calcula y se
       confirma acá: es la dirección que va a repartir, y cambiarla después deja
       muertos los códigos QR ya impresos. */
    ruta: "/alta/quien-sos",
  },
  {
    numero: 2,
    id: "que-vendes",
    titulo: "Qué vendes y dónde",
    ruta: "/alta/que-vendes",
  },
  {
    numero: 3,
    id: "tu-marca",
    titulo: "Tu marca",
    ruta: "/alta/tu-marca",
  },
  {
    numero: 4,
    id: "tus-productos",
    titulo: "Tus primeros productos",
    ruta: "/alta/tus-productos",
  },
] as const;

export type PasoAlta = (typeof PASOS_ALTA)[number];
export type IdPasoAlta = PasoAlta["id"];

/* Lo que el alta necesita saber del negocio. Se recibe desarmado y no como la
   fila entera: así esta función se puede probar sin inventar un negocio
   completo, y no puede leer de contrabando una columna que mañana no esté. */
export type SituacionDelNegocio = {
  nombreAdmin: string | null;
  nombre: string | null;
  slug: string | null;
  rubro: string | null;
  /* Si respondió si quiere aparecer en el buscador. Nulo: no respondió. */
  apareceEnDirectorio: boolean | null;
  telefonoWhatsapp: string | null;
  logoUrl: string | null;
  /* Cuántos productos visibles tiene. Cero significa catálogo vacío: se puede
     publicar, pero no se debería, y por eso aparece en «lo que falta». */
  productos: number;
  categorias: number;
  altaPaso: number;
  altaCompletadaEn: string | null;
};

export type Faltante = {
  clave: string;
  /* Qué le falta, dicho como se lo diría una persona. */
  titulo: string;
  /* A dónde ir a resolverlo. Sin esto, «te falta el WhatsApp» es una queja y no
     una tarea. */
  ruta: string;
  /* `true` cuando sin esto el catálogo **no sirve**, no solo queda pobre. Un
     catálogo sin teléfono no recibe un solo pedido; uno sin logo, sí. */
  impide: boolean;
};

export type EstadoAlta = {
  completada: boolean;
  /* En cuál está parado. Cuando el alta terminó, es el último. */
  paso: PasoAlta;
  /* Cuántos de los cuatro quedaron cumplidos, para la barra de progreso. */
  cumplidos: number;
  faltantes: Faltante[];
};

function vacio(valor: string | null): boolean {
  return valor === null || valor.trim() === "";
}

/* Qué le falta al negocio para que su catálogo sirva.
 *
 * Se separa de los pasos a propósito: los pasos son el camino de la primera vez
 * y se recorren una sola vez, mientras que esta lista **vive para siempre** en
 * la pantalla de inicio. Un negocio que termina el alta y después borra su
 * teléfono tiene que volver a verlo acá.
 */
export function faltantesParaPublicar(situacion: SituacionDelNegocio): Faltante[] {
  const faltantes: Faltante[] = [];

  if (vacio(situacion.telefonoWhatsapp)) {
    faltantes.push({
      clave: "telefono",
      titulo: "Tu WhatsApp, para que te puedan escribir",
      ruta: RUTAS_PANEL.negocio,
      impide: true,
    });
  }

  if (vacio(situacion.rubro)) {
    faltantes.push({
      clave: "rubro",
      titulo: "A qué se dedica tu negocio",
      /* A Configuración y **no al alta**: esta lista se ve sobre todo en negocios
         que ya la terminaron, y el alta rebota a quien la completó. Mandarlo ahí
         sería ofrecerle un enlace que lo devuelve al punto de partida. */
      ruta: RUTAS_PANEL.negocio,
      impide: true,
    });
  }

  if (situacion.categorias === 0) {
    faltantes.push({
      clave: "categorias",
      titulo: "Al menos una categoría",
      ruta: RUTAS_PANEL.catalogo,
      impide: true,
    });
  }

  if (situacion.productos === 0) {
    faltantes.push({
      clave: "productos",
      titulo: "Tu primer producto",
      ruta: RUTAS_PANEL.productos,
      impide: true,
    });
  }

  /* No impide: el catálogo funciona igual sin aparecer en el buscador. Pero es
     una decisión del dueño, y hasta que la tome se la recordamos. */
  if (situacion.apareceEnDirectorio === null) {
    faltantes.push({
      clave: "directorio",
      titulo: "Decide si quieres que te encuentren en el buscador de MiPuesto",
      ruta: RUTAS_PANEL.negocio,
      impide: false,
    });
  }

  /* El logo no impide: un catálogo sin logo se ve peor, pero vende. Ponerlo como
     bloqueante frenaría a quien todavía no lo tiene hecho, que es justamente el
     negocio chico al que esto apunta. */
  if (vacio(situacion.logoUrl)) {
    faltantes.push({
      clave: "logo",
      titulo: "Tu logo, para que te reconozcan",
      ruta: RUTAS_PANEL.apariencia,
      impide: false,
    });
  }

  return faltantes;
}

/* Si cada paso quedó cumplido, mirando los datos.
 *
 * El 3 es la excepción y está explicada en la migración: logo, subnombre y
 * paleta son todos opcionales, así que no hay dato que mirar. Se usa `alta_paso`,
 * que es lo que el paso guarda al pasar al siguiente.
 */
function pasosCumplidos(situacion: SituacionDelNegocio): boolean[] {
  return [
    !vacio(situacion.nombreAdmin) && !vacio(situacion.nombre) && !vacio(situacion.slug),
    /* El paso 2 pregunta las dos cosas, y queda cumplido con las dos. */
    !vacio(situacion.rubro) && situacion.apareceEnDirectorio !== null,
    situacion.altaPaso > 3,
    situacion.productos > 0,
  ];
}

export function estadoDeAlta(situacion: SituacionDelNegocio): EstadoAlta {
  const cumplidos = pasosCumplidos(situacion);
  const faltantes = faltantesParaPublicar(situacion);
  const completada = situacion.altaCompletadaEn !== null;

  /* El primero sin cumplir es dónde tiene que seguir. Si están todos, se queda
     en el último: terminar el alta es una acción del dueño —el botón del paso
     4—, no algo que pase solo porque cargó un producto. */
  const primeroSinCumplir = cumplidos.findIndex((cumplido) => !cumplido);
  const indice = primeroSinCumplir === -1 ? PASOS_ALTA.length - 1 : primeroSinCumplir;

  return {
    completada,
    paso: PASOS_ALTA[indice],
    cumplidos: cumplidos.filter(Boolean).length,
    faltantes,
  };
}

export function esIdPasoAlta(valor: unknown): valor is IdPasoAlta {
  return typeof valor === "string" && PASOS_ALTA.some((paso) => paso.id === valor);
}

/* A dónde sigue el dueño después de guardar el formulario del negocio. Crearlo
   es el paso cero del alta: sigue solo en el primer paso, en vez de quedarse con
   un aviso y ningún camino a la vista. Editarlo no mueve a nadie. */
export function rutaDespuesDeGuardarNegocio({ esNuevo }: { esNuevo: boolean }): string | null {
  return esNuevo ? PASOS_ALTA[0].ruta : null;
}

/* El paso de la pantalla abierta, leído de la dirección. El progreso del alta
   vive en su layout, y un layout no se vuelve a dibujar al pasar de un paso a
   otro con «Seguir»: con el valor del servidor se quedaba en «Paso 1 de 4»
   durante todo el recorrido. Fuera de los cuatro pasos, vale el alcanzado. */
export function pasoActualDeAlta(ruta: string | null, alcanzado: number): number {
  const limpia = (ruta ?? "").replace(/\/+$/, "");
  return PASOS_ALTA.find((paso) => paso.ruta === limpia)?.numero ?? alcanzado;
}
