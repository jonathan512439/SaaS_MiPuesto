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

export type HorarioNormalizado = {
  modo: ModoHorario;
  dias: Record<DiaSemana, IntervaloHorario[]>;
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

const MINUTOS_SEMANA = 7 * 24 * 60;
const INDICE_DIA_INGLES: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};
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

export function validarHorario(valor: unknown): ResultadoValidacionHorario {
  if (!esRegistro(valor) || Object.keys(valor).length === 0) {
    return { correcto: true, horario: { modo: "sin_horario", dias: diasVacios() } };
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
  if (modo !== "programado") {
    return { correcto: true, horario: { modo, dias: diasVacios() } };
  }

  const fuenteDias = modoExplicito === "programado" ? valor.dias : valor;
  if (!esRegistro(fuenteDias)) {
    return { correcto: false, error: "Los días del horario programado no son válidos." };
  }

  const horario: HorarioNormalizado = { modo, dias: diasVacios() };
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

function minutoSemanalEnLaPaz(fecha: Date) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA_HORARIA_NEGOCIO,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const obtener = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  const indiceDia = INDICE_DIA_INGLES[obtener("weekday")];
  const hora = Number(obtener("hour"));
  const minuto = Number(obtener("minute"));

  if (indiceDia === undefined || !Number.isInteger(hora) || !Number.isInteger(minuto)) {
    return null;
  }
  return indiceDia * 24 * 60 + hora * 60 + minuto;
}

function resumirIntervalos(intervalos: IntervaloHorario[]) {
  return intervalos
    .map(({ abre, cierra }) => `${abre}–${cierra}`)
    .join(" y ");
}

function resumirProximaAtencion(
  horario: HorarioNormalizado,
  minutoActual: number | null,
) {
  if (minutoActual === null) return null;
  const indiceActual = Math.floor(minutoActual / (24 * 60));
  const diaActual = DIAS_SEMANA[indiceActual];
  const intervalosHoy = horario.dias[diaActual];

  if (intervalosHoy.length > 0) {
    return `Hoy: ${resumirIntervalos(intervalosHoy)}.`;
  }

  for (let distancia = 1; distancia < DIAS_SEMANA.length; distancia += 1) {
    const dia = DIAS_SEMANA[(indiceActual + distancia) % DIAS_SEMANA.length];
    const intervalos = horario.dias[dia];
    if (intervalos.length > 0) {
      return `Próxima atención: ${ETIQUETAS_DIAS[dia]} ${resumirIntervalos(intervalos)}.`;
    }
  }

  return "No hay horarios de atención publicados.";
}

function formatearHoraSemanal(minutoSemanal: number) {
  const minutoDia = ((minutoSemanal % (24 * 60)) + 24 * 60) % (24 * 60);
  const hora = Math.floor(minutoDia / 60).toString().padStart(2, "0");
  const minuto = (minutoDia % 60).toString().padStart(2, "0");
  return `${hora}:${minuto}`;
}

function textoEstadoProgramado(
  horario: HorarioNormalizado,
  minutoActual: number | null,
  abierto: boolean,
) {
  if (minutoActual === null) return abierto ? "Abierto ahora" : "Cerrado por ahora";
  const segmentos = segmentosSemanales(horario);

  if (abierto) {
    const intervaloActual = segmentos.find(
      (segmento) => minutoActual >= segmento.inicio && minutoActual < segmento.fin,
    );
    return intervaloActual
      ? `Abierto ahora · Cierra a las ${formatearHoraSemanal(intervaloActual.fin)}`
      : "Abierto ahora";
  }

  const siguiente =
    segmentos.find((segmento) => segmento.inicio > minutoActual) ??
    (segmentos[0]
      ? { ...segmentos[0], inicio: segmentos[0].inicio + MINUTOS_SEMANA }
      : null);
  if (!siguiente) return "Cerrado por ahora";

  const indiceDiaActual = Math.floor(minutoActual / (24 * 60));
  const indiceDiaApertura = Math.floor(
    (siguiente.inicio % MINUTOS_SEMANA) / (24 * 60),
  );
  const hora = formatearHoraSemanal(siguiente.inicio);
  if (indiceDiaApertura === indiceDiaActual && siguiente.inicio < MINUTOS_SEMANA) {
    return `Cerrado · Abre hoy a las ${hora}`;
  }
  return `Cerrado · Abre el ${ETIQUETAS_DIAS[DIAS_SEMANA[indiceDiaApertura]]} a las ${hora}`;
}

export function evaluarHorario(valor: unknown, fecha: Date = new Date()): EstadoAtencion {
  const validacion = validarHorario(valor);
  if (!validacion.correcto) {
    return {
      modo: "programado",
      abierto: false,
      permiteAcciones: false,
      texto: "Horario no disponible",
      aviso: "Puedes seguir navegando; los pedidos están pausados.",
      horarioBreve: null,
    };
  }

  if (validacion.horario.modo === "sin_horario") {
    return {
      modo: "sin_horario",
      abierto: null,
      permiteAcciones: true,
      texto: null,
      aviso: null,
      horarioBreve: null,
    };
  }

  if (validacion.horario.modo === "siempre_abierto") {
    return {
      modo: "siempre_abierto",
      abierto: true,
      permiteAcciones: true,
      texto: "Siempre abierto",
      aviso: null,
      horarioBreve: null,
    };
  }

  const minutoActual = minutoSemanalEnLaPaz(fecha);
  const abierto =
    minutoActual !== null &&
    segmentosSemanales(validacion.horario).some(
      (segmento) => minutoActual >= segmento.inicio && minutoActual < segmento.fin,
    );

  return abierto
    ? {
        modo: "programado",
        abierto: true,
        permiteAcciones: true,
        texto: textoEstadoProgramado(validacion.horario, minutoActual, true),
        aviso: null,
        horarioBreve: null,
      }
    : {
        modo: "programado",
        abierto: false,
        permiteAcciones: false,
        texto: textoEstadoProgramado(validacion.horario, minutoActual, false),
        aviso: "Puedes seguir navegando; los pedidos están pausados.",
        horarioBreve: resumirProximaAtencion(validacion.horario, minutoActual),
      };
}
