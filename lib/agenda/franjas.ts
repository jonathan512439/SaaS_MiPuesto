/* La semana de atención de una categoría.
 *
 * Una lista de tramos: «lunes de 8:30 a 12:00». El dueño escribe esto y **nunca
 * una lista de horarios**: los horarios concretos los deriva `horarios.ts` con la
 * duración y el cupo. Es lo que reemplaza al `variants: ['10:00','11:30']` del
 * diseño de referencia, que estaba escrito a mano.
 */

export const DIAS = [
  { id: 0, nombre: "Domingo", corto: "Dom" },
  { id: 1, nombre: "Lunes", corto: "Lun" },
  { id: 2, nombre: "Martes", corto: "Mar" },
  { id: 3, nombre: "Miércoles", corto: "Mié" },
  { id: 4, nombre: "Jueves", corto: "Jue" },
  { id: 5, nombre: "Viernes", corto: "Vie" },
  { id: 6, nombre: "Sábado", corto: "Sáb" },
] as const;

export const MAXIMO_FRANJAS = 30;

export type Franja = {
  dia: number;
  /* «HH:MM», en la hora del negocio. Se guarda como texto y no como minutos
     desde medianoche porque es lo que el dueño escribe y lo que se le muestra;
     convertir en los dos sentidos en cada pantalla es una fuente de errores por
     una ganancia que nadie ve. */
  desde: string;
  hasta: string;
};

const FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function esHoraValida(valor: unknown): valor is string {
  return typeof valor === "string" && FORMATO_HORA.test(valor);
}

/* De «08:30» a 510. Solo para comparar y para calcular: lo guardado sigue siendo
   el texto. */
export function minutosDesdeHora(hora: string): number {
  const [h, m] = hora.split(":");
  return Number(h) * 60 + Number(m);
}

export function horaDesdeMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* Valida la semana entera.
 *
 * Dos de las reglas son sobre el conjunto —el tope, y que dos tramos del mismo
 * día no se pisen— así que no se puede validar un tramo suelto. Que se pisen
 * importa: dos tramos solapados generarían el mismo horario dos veces, y el
 * cliente vería «10:00» repetido en la lista.
 */
export function validarFranjas(
  crudas: unknown,
): { correcto: true; franjas: Franja[] } | { correcto: false; errores: Record<string, string> } {
  const errores: Record<string, string> = {};

  if (crudas === undefined || crudas === null) return { correcto: true, franjas: [] };
  if (!Array.isArray(crudas)) {
    return { correcto: false, errores: { franjas: "No se pudo leer el horario." } };
  }
  if (crudas.length > MAXIMO_FRANJAS) {
    return {
      correcto: false,
      errores: { franjas: `Hasta ${MAXIMO_FRANJAS} tramos en la semana.` },
    };
  }

  const franjas: Franja[] = [];

  crudas.forEach((cruda, indice) => {
    const campo = (llave: string) => `franjas.${indice}.${llave}`;
    if (typeof cruda !== "object" || cruda === null) {
      errores[`franjas.${indice}`] = "No se pudo leer este tramo.";
      return;
    }
    const dato = cruda as Record<string, unknown>;

    const dia = typeof dato.dia === "number" ? dato.dia : Number(dato.dia);
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
      errores[campo("dia")] = "Elegí un día de la semana.";
      return;
    }

    if (!esHoraValida(dato.desde) || !esHoraValida(dato.hasta)) {
      errores[campo("desde")] = "Escribí las horas como HH:MM.";
      return;
    }

    if (minutosDesdeHora(dato.hasta) <= minutosDesdeHora(dato.desde)) {
      errores[campo("hasta")] = "La hora de cierre tiene que ser posterior a la de apertura.";
      return;
    }

    /* Que no se pise con otro tramo del mismo día. Sin esto, un tramo de 8 a 12
       y otro de 10 a 14 generarían las 10:00, 10:30 y 11:30 dos veces cada una. */
    const pisa = franjas.some(
      (otra) =>
        otra.dia === dia &&
        minutosDesdeHora(dato.desde as string) < minutosDesdeHora(otra.hasta) &&
        minutosDesdeHora(otra.desde) < minutosDesdeHora(dato.hasta as string),
    );
    if (pisa) {
      errores[campo("desde")] = "Este tramo se pisa con otro del mismo día.";
      return;
    }

    franjas.push({ dia, desde: dato.desde, hasta: dato.hasta });
  });

  return Object.keys(errores).length > 0
    ? { correcto: false, errores }
    : { correcto: true, franjas: ordenarFranjas(franjas) };
}

export function ordenarFranjas(franjas: ReadonlyArray<Franja>): Franja[] {
  return [...franjas].sort(
    (a, b) => a.dia - b.dia || minutosDesdeHora(a.desde) - minutosDesdeHora(b.desde),
  );
}

/* Lee lo guardado sin quejarse, para dibujar el calendario público. Un tramo mal
   formado no puede dejar la ficha sin cargar. */
export function leerFranjas(crudas: unknown): Franja[] {
  if (!Array.isArray(crudas)) return [];
  const franjas: Franja[] = [];
  for (const cruda of crudas) {
    if (typeof cruda !== "object" || cruda === null) continue;
    const dato = cruda as Record<string, unknown>;
    const dia = typeof dato.dia === "number" ? dato.dia : Number(dato.dia);
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) continue;
    if (!esHoraValida(dato.desde) || !esHoraValida(dato.hasta)) continue;
    if (minutosDesdeHora(dato.hasta) <= minutosDesdeHora(dato.desde)) continue;
    franjas.push({ dia, desde: dato.desde, hasta: dato.hasta });
  }
  return ordenarFranjas(franjas);
}

/* Cómo se lee la semana en una línea: «Lun a Vie 08:30–12:00». Para el panel y
   para el resumen de la ficha, que es donde el dueño confirma que cargó lo que
   quería sin tener que leer una tabla. */
export function resumirFranjas(franjas: ReadonlyArray<Franja>): string {
  if (franjas.length === 0) return "Sin horario configurado";
  return ordenarFranjas(franjas)
    .map((franja) => {
      const dia = DIAS.find(({ id }) => id === franja.dia)?.corto ?? "?";
      return `${dia} ${franja.desde}–${franja.hasta}`;
    })
    .join(" · ");
}
