import { minutosDesdeHora, type Franja } from "./franjas";

/* De la semana a los horarios concretos.
 *
 * Es la función más importante de la fase y la más fácil de probar: entra una
 * semana, una duración, un cupo y las citas ya tomadas; sale una lista de días
 * con sus horarios y cuántos lugares quedan. **La fecha entra como parámetro**,
 * así que el cambio de horario, el feriado y el turno de las 23:30 se prueban
 * sin montar nada y sin esperar a que el reloj llegue.
 *
 * El dueño nunca escribe una lista de horarios: escribe que atiende de 8:30 a
 * 12:00 con turnos de 30 minutos, y los horarios salen de acá. Eso es lo que
 * reemplaza al `variants: ['10:00','11:30']` del diseño de referencia y al
 * `stock: '5 horarios hoy'`, que estaban los dos escritos a mano.
 */

/* Bolivia no cambia de hora en todo el año, así que el desfase es fijo. Se
   escribe explícito por lo mismo que en `carta-del-dia.ts`: el servidor corre en
   UTC, y sin esto los horarios de la tarde caerían en el día siguiente. */
const HORAS_DETRAS_DE_UTC = 4;

export type Agenda = {
  duracionMinutos: number;
  cupoPorFranja: number;
  anticipacionMinimaHoras: number;
  diasMaximos: number;
  franjas: ReadonlyArray<Franja>;
};

export type Horario = {
  /* El comienzo, en ISO con zona. Es lo que viaja al servidor al reservar: una
     hora suelta como «10:00» obligaría a acordarse de la zona en cada salto. */
  inicio: string;
  /* «10:00», para mostrar. */
  hora: string;
  libres: number;
};

export type DiaConHorarios = {
  /* «2026-09-15», en la fecha del negocio. */
  fecha: string;
  horarios: Horario[];
};

/* Cuántos cupos hay tomados en cada comienzo. La llave es el ISO del comienzo,
   que es lo que devuelve `cupos_tomados` en la base. */
export type CuposTomados = Record<string, number>;

function fechaEnBolivia(instante: Date): string {
  return new Date(instante.getTime() - HORAS_DETRAS_DE_UTC * 3600_000)
    .toISOString()
    .slice(0, 10);
}

/* De «2026-09-15» y 510 minutos al instante real. Bolivia está cuatro horas
   detrás, así que las 08:30 de allá son las 12:30 UTC. */
function instanteDe(fecha: string, minutos: number): Date {
  const base = new Date(`${fecha}T00:00:00Z`).getTime();
  return new Date(base + (minutos + HORAS_DETRAS_DE_UTC * 60) * 60_000);
}

function sumarDias(fecha: string, dias: number): string {
  const instante = new Date(`${fecha}T00:00:00Z`);
  instante.setUTCDate(instante.getUTCDate() + dias);
  return instante.toISOString().slice(0, 10);
}

/* El día de la semana de una fecha, 0 domingo a 6 sábado. Se puede calcular en
   UTC porque Bolivia no cambia de hora. */
function diaDeSemana(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

/* Los horarios de un día, con sus lugares libres.
 *
 * Devuelve también los llenos, con `libres: 0`. Omitirlos haría parecer que el
 * negocio no atiende a esa hora, cuando lo que pasa es que ya la tomaron: son
 * dos cosas distintas y el cliente merece saber cuál es.
 */
export function horariosDelDia(
  agenda: Agenda,
  fecha: string,
  tomados: CuposTomados = {},
  ahora: Date = new Date(),
): Horario[] {
  const { duracionMinutos, cupoPorFranja, anticipacionMinimaHoras } = agenda;
  if (duracionMinutos <= 0) return [];

  const desdeCuando = ahora.getTime() + anticipacionMinimaHoras * 3600_000;
  const delDia = agenda.franjas.filter((franja) => franja.dia === diaDeSemana(fecha));
  const horarios: Horario[] = [];

  for (const franja of delDia) {
    const inicioFranja = minutosDesdeHora(franja.desde);
    const finFranja = minutosDesdeHora(franja.hasta);

    /* Avanza de a una duración y **solo cabe el turno que termina dentro del
       tramo**: con un tramo de 8:00 a 12:00 y turnos de 50 minutos, el último
       arranca 11:10 y no 11:50, porque ese terminaría a las 12:40 con el negocio
       cerrado. */
    for (
      let minuto = inicioFranja;
      minuto + duracionMinutos <= finFranja;
      minuto += duracionMinutos
    ) {
      const inicio = instanteDe(fecha, minuto);

      /* La anticipación mínima esconde lo que ya no se puede pedir. Sin esto,
         alguien reserva a las 9:58 para las 10:00 y el negocio se entera cuando
         la persona está en la puerta. */
      if (inicio.getTime() < desdeCuando) continue;

      const clave = inicio.toISOString();
      const ocupados = tomados[clave] ?? 0;
      horarios.push({
        inicio: clave,
        hora: horaDe(minuto),
        libres: Math.max(0, cupoPorFranja - ocupados),
      });
    }
  }

  return horarios.sort((a, b) => a.inicio.localeCompare(b.inicio));
}

function horaDe(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* Los próximos días con horarios, desde hoy.
 *
 * Solo devuelve los días que **tienen algo**: un calendario con quince días
 * vacíos entre dos con turnos obliga a buscar, y lo que la persona quiere es ver
 * cuándo puede.
 */
export function proximosDias(
  agenda: Agenda,
  tomados: CuposTomados = {},
  ahora: Date = new Date(),
  tope = 14,
): DiaConHorarios[] {
  const hoy = fechaEnBolivia(ahora);
  const dias: DiaConHorarios[] = [];

  for (let salto = 0; salto <= agenda.diasMaximos && dias.length < tope; salto += 1) {
    const fecha = sumarDias(hoy, salto);
    const horarios = horariosDelDia(agenda, fecha, tomados, ahora);
    if (horarios.length > 0) dias.push({ fecha, horarios });
  }

  return dias;
}

/* Si un comienzo cae de verdad en la agenda. Lo usa el servidor antes de
   guardar: sin esto, una petición armada a mano podría reservar las 3 de la
   mañana de un domingo, que la restricción de exclusión aceptaría sin chistar
   porque no choca con nada. */
export function horarioValido(
  agenda: Agenda,
  inicioIso: string,
  ahora: Date = new Date(),
): boolean {
  const inicio = new Date(inicioIso);
  if (Number.isNaN(inicio.getTime())) return false;

  const fecha = fechaEnBolivia(inicio);
  const hoy = fechaEnBolivia(ahora);
  const salto = Math.round(
    (new Date(`${fecha}T00:00:00Z`).getTime() - new Date(`${hoy}T00:00:00Z`).getTime()) / 86_400_000,
  );
  if (salto < 0 || salto > agenda.diasMaximos) return false;

  return horariosDelDia(agenda, fecha, {}, ahora).some(
    (horario) => horario.inicio === inicio.toISOString(),
  );
}

/* El rango que ocupa una cita, para guardarlo. Se arma acá y no en la ruta
   porque el fin depende de la duración de la agenda, y tenerlo en dos lugares
   permitiría que un día no coincidan. */
export function rangoDeCita(agenda: Agenda, inicioIso: string): { inicio: string; fin: string } {
  const inicio = new Date(inicioIso);
  const fin = new Date(inicio.getTime() + agenda.duracionMinutos * 60_000);
  return { inicio: inicio.toISOString(), fin: fin.toISOString() };
}

/* Cómo se lee una cita en pantalla y en el mensaje de WhatsApp:
   «Sábado 15 de septiembre, 10:00». Vive acá porque lo usan la confirmación, el
   panel del dueño y el mensaje, y los tres tienen que decir lo mismo. */
const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const NOMBRES_MES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function describirCita(inicioIso: string): string {
  const inicio = new Date(inicioIso);
  if (Number.isNaN(inicio.getTime())) return "";
  const fecha = fechaEnBolivia(inicio);
  const [, mes, dia] = fecha.split("-");
  const minutosDelDia = Math.round(
    (inicio.getTime() - new Date(`${fecha}T00:00:00Z`).getTime()) / 60_000,
  ) - HORAS_DETRAS_DE_UTC * 60;
  return `${NOMBRES_DIA[diaDeSemana(fecha)]} ${Number(dia)} de ${
    NOMBRES_MES[Number(mes) - 1]
  }, ${horaDe(minutosDelDia)}`;
}
