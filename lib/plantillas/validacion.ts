import { PALETAS, type PaletaId } from "../apariencia";

export function esPaletaId(valor: unknown): valor is PaletaId {
  return typeof valor === "string" && (PALETAS as readonly string[]).includes(valor);
}
