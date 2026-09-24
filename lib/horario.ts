export const ZONA_HORARIA_NEGOCIO = "America/La_Paz";

export const DIAS_SEMANA = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number];
export type ModoHorario = "sin_horario" | "siempre_abierto" | "programado";

export type IntervaloHorario = {
  abre: string;
  cierra: string;
};

/* Una excepción manda sobre el día de la semana que le toque: un feriado, un
   inventario, una fiesta patronal. Se guarda por fecha y no por día porque es
   justamente lo que el horario semanal no puede expresar. */
export type ExcepcionHorario = {
  fecha: string;
  cerrado: boolean;
  intervalos: IntervaloHorario[];
  motivo: string;
};

export type HorarioNormalizado = {
  modo: ModoHorario;
  dias: Record<DiaSemana, IntervaloHorario[]>;
  excepciones: ExcepcionHorario[];
};

export type EstadoAtencion = {
  modo: ModoHorario;
  abierto: boolean | null;
  permiteAcciones: boolean;
  texto: string | null;
  aviso: string | null;
  horarioBreve: string | null;
};

export type ResultadoValidacionHorario =
  | { correcto: true; horario: HorarioNormalizado }
  | { correcto: false; error: string };

const MINUTOS_DIA = 24 * 60;
const MINUTOS_SEMANA = 7 * MINUTOS_DIA;
export const MAXIMO_EXCEPCIONES = 20;
export const MAXIMO_MOTIVO = 60;
/* La ventana arranca el día anterior para que un intervalo que cruzó la
   medianoche siga contando, y llega a ocho días para poder anunciar la próxima
   atención aunque el negocio abra una sola vez por semana. */
const DIAS_ANTES = 1;
const DIAS_ADELANTE = 8;
const ETIQUETAS_DIAS: Record<DiaSemana, string> = {
  lunes: "lunes",
  martes: "martes",
  miercoles: "miércoles",
  jueves: "jueves",
  viernes: "viernes",
  sabado: "sábado",
  domingo: "domingo",
};

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function diasVacios(): Record<DiaSemana, IntervaloHorario[]> {
  return {
    lunes: [],
    martes: [],
    miercoles: [],
    jueves: [],
    viernes: [],
    sabado: [],
    domingo: [],
  };
}

function horarioVacio(modo: ModoHorario): HorarioNormalizado {
  return { modo, dias: diasVacios(), excepciones: [] };
}

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFechaReal(fecha: string) {
  if (!PATRON_FECHA.test(fecha)) return false;
  const instante = new Date(`${fecha}T00:00:00Z`);
  return (
    !Number.isNaN(instante.getTime()) && instante.toISOString().slice(0, 10) === fecha
  );
}

function sumarDias(fecha: string, dias: number) {
  const instante = new Date(`${fecha}T00:00:00Z`);
  instante.setUTCDate(instante.getUTCDate() + dias);
  return instante.toISOString().slice(0, 10);
}

/* Bolivia no cambia de hora, así que el día de la semana de una fecha se puede
   calcular en UTC sin arrastrar la zona. */
function indiceDiaDeFecha(fecha: string) {
  return (new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function minutosHora(valor: unknown) {
  if (typeof valor !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(valor)) {
    return null;
  }

  const [horas, minutos] = valor.split(":").map(Number);
  return horas * 60 + minutos;
}

function normalizarIntervalo(valor: unknown): IntervaloHorario | null {
  if (!esRegistro(valor)) return null;
  const abre = typeof valor.abre === "string" ? valor.abre : "";
  const cierra = typeof valor.cierra === "string" ? valor.cierra : "";
  const inicio = minutosHora(abre);
  const fin = minutosHora(cierra);

  if (inicio === null || fin === null || inicio === fin) return null;
  return { abre, cierra };
}

function segmentosSemanales(horario: HorarioNormalizado) {
  const segmentos: Array<{ inicio: number; fin: number }> = [];

  DIAS_SEMANA.forEach((dia, indiceDia) => {
    horario.dias[dia].forEach((intervalo) => {
      const inicioDia = indiceDia * 24 * 60;
      const inicio = inicioDia + (minutosHora(intervalo.abre) ?? 0);
      let fin = inicioDia + (minutosHora(intervalo.cierra) ?? 0);
      if (fin < inicio) fin += 24 * 60;

      if (fin <= MINUTOS_SEMANA) {
        segmentos.push({ inicio, fin });
      } else {
        segmentos.push({ inicio, fin: MINUTOS_SEMANA });
        segmentos.push({ inicio: 0, fin: fin - MINUTOS_SEMANA });
      }
    });
  });

  return segmentos.sort((a, b) => a.inicio - b.inicio || a.fin - b.fin);
}

function tieneSolapamientos(horario: HorarioNormalizado) {
  const segmentos = segmentosSemanales(horario);
  return segmentos.some(
    (segmento, indice) => indice > 0 && segmento.inicio < segmentos[indice - 1].fin,
  );
}

function validarExcepciones(valor: unknown):
  | { correcto: true; excepciones: ExcepcionHorario[] }
  | { correcto: false; error: string } {
  if (valor === undefined || valor === null) return { correcto: true, excepciones: [] };
  if (!Array.isArray(valor)) {
    return { correcto: false, error: "Las excepciones del horario no son válidas." };
  }
  if (valor.length > MAXIMO_EXCEPCIONES) {
    return {
      correcto: false,
      error: `Puedes guardar hasta ${MAXIMO_EXCEPCIONES} fechas especiales.`,
    };
  }

  const excepciones: ExcepcionHorario[] = [];
  const vistas = new Set<string>();

  for (const cruda of valor) {
    if (!esRegistro(cruda)) {
      return { correcto: false, error: "Hay una fecha especial mal formada." };
    }
    const fecha = typeof cruda.fecha === "string" ? cruda.fecha : "";
    if (!esFechaReal(fecha)) {
      return { correcto: false, error: `La fecha “${fecha}” no es válida.` };
    }
    if (vistas.has(fecha)) {
      return { correcto: false, error: `La fecha ${fecha} está repetida.` };
    }
    vistas.add(fecha);

    const motivo = typeof cruda.motivo === "string" ? cruda.motivo.trim() : "";
    if (motivo.length > MAXIMO_MOTIVO) {
      return {
        correcto: false,
        error: `El motivo del ${fecha} no puede pasar de ${MAXIMO_MOTIVO} caracteres.`,
      };
    }

    const cerrado = cruda.cerrado !== false;
    if (cerrado) {
      excepciones.push({ fecha, cerrado: true, intervalos: [], motivo });
      continue;
    }

    const lista = Array.isArray(cruda.intervalos) ? cruda.intervalos : [];
    if (lista.length === 0 || lista.length > 3) {
      return {
        correcto: false,
        error: `El ${fecha} necesita entre uno y tres intervalos, o marcarse como cerrado.`,
      };
    }
    const intervalos = lista.map(normalizarIntervalo);
    if (intervalos.some((intervalo) => intervalo === null)) {
      return { correcto: false, error: `Hay un intervalo inválido en el ${fecha}.` };
    }

    const franjas = (intervalos as IntervaloHorario[])
      .map(({ abre, cierra }) => {
        const inicio = minutosHora(abre) ?? 0;
        let fin = minutosHora(cierra) ?? 0;
        if (fin <= inicio) fin += MINUTOS_DIA;
        return { inicio, fin };
      })
      .sort((a, b) => a.inicio - b.inicio);
    if (franjas.some((franja, indice) => indice > 0 && franja.inicio < franjas[indice - 1].fin)) {
      return { correcto: false, error: `Los intervalos del ${fecha} no pueden solaparse.` };
    }

    excepciones.push({
      fecha,
      cerrado: false,
      intervalos: intervalos as IntervaloHorario[],
      motivo,
    });
  }

  return { correcto: true, excepciones: excepciones.sort((a, b) => a.fecha.localeCompare(b.fecha)) };
}

export function validarHorario(valor: unknown): ResultadoValidacionHorario {
  if (!esRegistro(valor) || Object.keys(valor).length === 0) {
    return { correcto: true, horario: horarioVacio("sin_horario") };
  }

  const modoExplicito = valor.modo;
  const siempreAbierto = valor.siempre_abierto === true || valor.siempreAbierto === true;
  const clavesDeDias = Object.keys(valor).filter((clave) =>
    DIAS_SEMANA.includes(clave as DiaSemana),
  );
  const modo: ModoHorario | null =
    modoExplicito === "sin_horario" ||
    modoExplicito === "siempre_abierto" ||
    modoExplicito === "programado"
      ? modoExplicito
      : siempreAbierto
        ? "siempre_abierto"
        : clavesDeDias.length > 0
          ? "programado"
          : null;

  if (!modo) return { correcto: false, error: "El modo de horario no es válido." };

  const validacionExcepciones = validarExcepciones(valor.excepciones);
  if (!validacionExcepciones.correcto) {
    return { correcto: false, error: validacionExcepciones.error };
  }

  if (modo !== "programado") {
    return {
      correcto: true,
      horario: {
        modo,
        dias: diasVacios(),
        excepciones: validacionExcepciones.excepciones,
      },
    };
  }

  const fuenteDias = modoExplicito === "programado" ? valor.dias : valor;
  if (!esRegistro(fuenteDias)) {
    return { correcto: false, error: "Los días del horario programado no son válidos." };
  }

  const horario: HorarioNormalizado = {
    modo,
    dias: diasVacios(),
    excepciones: validacionExcepciones.excepciones,
  };
  for (const [clave, intervalosSinValidar] of Object.entries(fuenteDias)) {
    if (!DIAS_SEMANA.includes(clave as DiaSemana)) {
      if (modoExplicito === "programado") {
        return { correcto: false, error: `El día ${clave} no es válido.` };
      }
      continue;
    }

    const lista = Array.isArray(intervalosSinValidar)
      ? intervalosSinValidar
      : intervalosSinValidar === null
        ? []
        : [intervalosSinValidar];
    if (lista.length > 3) {
      return { correcto: false, error: `Puedes configurar hasta tres intervalos en ${clave}.` };
    }
    const intervalos = lista.map(normalizarIntervalo);
    if (intervalos.some((intervalo) => intervalo === null)) {
      return { correcto: false, error: `Hay un intervalo inválido en ${clave}.` };
    }
    horario.dias[clave as DiaSemana] = intervalos as IntervaloHorario[];
  }

  if (tieneSolapamientos(horario)) {
    return { correcto: false, error: "Los intervalos del horario no pueden solaparse." };
  }

  return { correcto: true, horario };
}

/* La evaluacion trabaja sobre fechas reales y no sobre una semana abstracta:
   una excepcion es una fecha, y el modelo anterior no tenia donde ponerla. La
   ventana resuelve ademas el intervalo que cruza la medianoche, porque el dia
   anterior sigue dentro. */
function momentoEnLaPaz(fecha: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA_NEGOCIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const obtener = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  const anio = obtener("year");
  const mes = obtener("month");
  const dia = obtener("day");
  const hora = Number(obtener("hour"));
  const minuto = Number(obtener("minute"));

  if (!anio || !mes || !dia || !Number.isInteger(hora) || !Number.isInteger(minuto)) {
    return null;
  }

  return { fecha: anio + "-" + mes + "-" + dia, minutoDia: hora * 60 + minuto };
}

/* La fecha de hoy en Bolivia, para que el panel no ofrezca guardar un feriado
   que ya pasó ni lo cuente como próximo. */
export function fechaHoyEnLaPaz(fecha: Date = new Date()) {
  return momentoEnLaPaz(fecha)?.fecha ?? "";
}

function excepcionDe(horario: HorarioNormalizado, fecha: string) {
  return horario.excepciones.find((excepcion) => excepcion.fecha === fecha) ?? null;
}

function intervalosDeFecha(horario: HorarioNormalizado, fecha: string) {
  const excepcion = excepcionDe(horario, fecha);
  if (excepcion) return excepcion.cerrado ? [] : excepcion.intervalos;
  return horario.dias[DIAS_SEMANA[indiceDiaDeFecha(fecha)]];
}

type FranjaFechada = { inicio: number; fin: number; fecha: string };

function franjasDeLaVentana(horario: HorarioNormalizado, hoy: string): FranjaFechada[] {
  const franjas: FranjaFechada[] = [];

  for (
    let desplazamiento = -DIAS_ANTES;
    desplazamiento <= DIAS_ADELANTE;
    desplazamiento += 1
  ) {
    const fecha = sumarDias(hoy, desplazamiento);
    const base = desplazamiento * MINUTOS_DIA;

    for (const intervalo of intervalosDeFecha(horario, fecha)) {
      const inicio = base + (minutosHora(intervalo.abre) ?? 0);
      let fin = base + (minutosHora(intervalo.cierra) ?? 0);
      if (fin <= inicio) fin += MINUTOS_DIA;
      franjas.push({ inicio, fin, fecha });
    }
  }

  return franjas.sort((a, b) => a.inicio - b.inicio || a.fin - b.fin);
}

function formatearMinuto(minuto: number) {
  const minutoDia = ((minuto % MINUTOS_DIA) + MINUTOS_DIA) % MINUTOS_DIA;
  const hora = Math.floor(minutoDia / 60).toString().padStart(2, "0");
  return hora + ":" + (minutoDia % 60).toString().padStart(2, "0");
}

function resumirIntervalos(intervalos: IntervaloHorario[]) {
  return intervalos.map((intervalo) => intervalo.abre + "–" + intervalo.cierra).join(" y ");
}

function describirApertura(franja: FranjaFechada, hoy: string) {
  const hora = formatearMinuto(franja.inicio);
  if (franja.inicio < MINUTOS_DIA && franja.fecha === hoy) return "Abre hoy a las " + hora;
  if (franja.fecha === sumarDias(hoy, 1)) return "Abre mañana a las " + hora;
  const dia = ETIQUETAS_DIAS[DIAS_SEMANA[indiceDiaDeFecha(franja.fecha)]];
  return "Abre el " + dia + " a las " + hora;
}

function resumirProxima(horario: HorarioNormalizado, hoy: string) {
  const intervalosHoy = intervalosDeFecha(horario, hoy);
  if (intervalosHoy.length > 0) return "Hoy: " + resumirIntervalos(intervalosHoy) + ".";

  for (let distancia = 1; distancia <= DIAS_ADELANTE; distancia += 1) {
    const fecha = sumarDias(hoy, distancia);
    const intervalos = intervalosDeFecha(horario, fecha);
    if (intervalos.length > 0) {
      const nombre =
        distancia === 1
          ? "mañana"
          : ETIQUETAS_DIAS[DIAS_SEMANA[indiceDiaDeFecha(fecha)]];
      return "Próxima atención: " + nombre + " " + resumirIntervalos(intervalos) + ".";
    }
  }

  return "No hay horarios de atención publicados.";
}

function cerradoPorExcepcion(excepcion: ExcepcionHorario) {
  return excepcion.motivo ? "Cerrado hoy · " + excepcion.motivo : "Cerrado hoy";
}

const AVISO_PAUSADO = "Puedes seguir navegando; los pedidos están pausados.";

const ESTADO_INVALIDO: EstadoAtencion = {
  modo: "programado",
  abierto: false,
  permiteAcciones: false,
  texto: "Horario no disponible",
  aviso: AVISO_PAUSADO,
  horarioBreve: null,
};

function evaluarSiempreAbierto(
  horario: HorarioNormalizado,
  momento: { fecha: string; minutoDia: number } | null,
): EstadoAtencion {
  const excepcion = momento ? excepcionDe(horario, momento.fecha) : null;

  if (!excepcion) {
    return {
      modo: "siempre_abierto",
      abierto: true,
      permiteAcciones: true,
      texto: "Siempre abierto",
      aviso: null,
      horarioBreve: null,
    };
  }

  if (excepcion.cerrado) {
    return {
      modo: "siempre_abierto",
      abierto: false,
      permiteAcciones: false,
      texto: cerradoPorExcepcion(excepcion),
      aviso: AVISO_PAUSADO,
      horarioBreve: "Mañana volvemos al horario de siempre.",
    };
  }

  const minutoDia = momento ? momento.minutoDia : 0;
  const abierto = excepcion.intervalos.some((intervalo) => {
    const inicio = minutosHora(intervalo.abre) ?? 0;
    let fin = minutosHora(intervalo.cierra) ?? 0;
    if (fin <= inicio) fin += MINUTOS_DIA;
    return minutoDia >= inicio && minutoDia < fin;
  });
  const resumen = "Hoy: " + resumirIntervalos(excepcion.intervalos) + ".";

  return abierto
    ? {
        modo: "siempre_abierto",
        abierto: true,
        permiteAcciones: true,
        texto: excepcion.motivo
          ? "Abierto ahora · " + excepcion.motivo
          : "Abierto ahora",
        aviso: null,
        horarioBreve: resumen,
      }
    : {
        modo: "siempre_abierto",
        abierto: false,
        permiteAcciones: false,
        texto: cerradoPorExcepcion(excepcion),
        aviso: AVISO_PAUSADO,
        horarioBreve: resumen,
      };
}

export function evaluarHorario(valor: unknown, fecha: Date = new Date()): EstadoAtencion {
  const validacion = validarHorario(valor);
  if (!validacion.correcto) return ESTADO_INVALIDO;

  const horario = validacion.horario;

  if (horario.modo === "sin_horario") {
    return {
      modo: "sin_horario",
      abierto: null,
      permiteAcciones: true,
      texto: null,
      aviso: null,
      horarioBreve: null,
    };
  }

  const momento = momentoEnLaPaz(fecha);

  /* Una excepcion tapa tambien el "siempre abierto": es justamente el caso que
     el dueno quiere poder decir sin desarmar su configuracion. */
  if (horario.modo === "siempre_abierto") {
    return evaluarSiempreAbierto(horario, momento);
  }

  if (!momento) return ESTADO_INVALIDO;

  const franjas = franjasDeLaVentana(horario, momento.fecha);
  const actual = franjas.find(
    (franja) => momento.minutoDia >= franja.inicio && momento.minutoDia < franja.fin,
  );

  if (actual) {
    return {
      modo: "programado",
      abierto: true,
      permiteAcciones: true,
      texto: "Abierto ahora · Cierra a las " + formatearMinuto(actual.fin),
      aviso: null,
      horarioBreve: null,
    };
  }

  const excepcionHoy = excepcionDe(horario, momento.fecha);
  const siguiente = franjas.find((franja) => franja.inicio > momento.minutoDia) ?? null;
  const texto =
    excepcionHoy && excepcionHoy.cerrado
      ? cerradoPorExcepcion(excepcionHoy)
      : siguiente
        ? "Cerrado · " + describirApertura(siguiente, momento.fecha)
        : "Cerrado por ahora";

  return {
    modo: "programado",
    abierto: false,
    permiteAcciones: false,
    texto,
    aviso: AVISO_PAUSADO,
    horarioBreve: resumirProxima(horario, momento.fecha),
  };
}
