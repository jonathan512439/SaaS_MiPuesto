/* Ciudad de lista cerrada y zona en texto libre. Al revés no funciona: un
   directorio agrupa por ciudad, y si cada dueño escribe «Sta Cruz», «santa
   cruz» o «SCZ» no hay agrupación posible. La zona es el barrio, y los barrios
   bolivianos no entran en ninguna lista que podamos escribir. */
export const CIUDADES = [
  "la_paz",
  "el_alto",
  "santa_cruz",
  "cochabamba",
  "sucre",
  "oruro",
  "potosi",
  "tarija",
  "trinidad",
  "cobija",
  "otra",
] as const;

export type CiudadId = (typeof CIUDADES)[number];

export const NOMBRES_CIUDADES: Record<CiudadId, string> = {
  la_paz: "La Paz",
  el_alto: "El Alto",
  santa_cruz: "Santa Cruz de la Sierra",
  cochabamba: "Cochabamba",
  sucre: "Sucre",
  oruro: "Oruro",
  potosi: "Potosí",
  tarija: "Tarija",
  trinidad: "Trinidad",
  cobija: "Cobija",
  otra: "Otra ciudad",
};

export const LARGO_MAXIMO_ZONA = 60;

export function esCiudadId(valor: unknown): valor is CiudadId {
  return typeof valor === "string" && (CIUDADES as readonly string[]).includes(valor);
}

export function nombreDeCiudad(valor: unknown): string {
  return esCiudadId(valor) ? NOMBRES_CIUDADES[valor] : "Sin ciudad";
}

/* «Otra ciudad» va al final aunque el orden sea alfabético: es un cajón de
   sastre, no un lugar, y encabezar el directorio con él sería raro. */
export function ordenarCiudades(ciudades: CiudadId[]): CiudadId[] {
  return [...ciudades].sort((a, b) => {
    if (a === "otra") return 1;
    if (b === "otra") return -1;
    return NOMBRES_CIUDADES[a].localeCompare(NOMBRES_CIUDADES[b], "es");
  });
}
