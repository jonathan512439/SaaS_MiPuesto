import {
  PALETAS,
  PLANTILLAS,
  type PaletaId,
  type PlantillaId,
} from "../apariencia";

export function esPlantillaId(valor: unknown): valor is PlantillaId {
  return typeof valor === "string" && (PLANTILLAS as readonly string[]).includes(valor);
}

export function esPaletaId(valor: unknown): valor is PaletaId {
  return typeof valor === "string" && (PALETAS as readonly string[]).includes(valor);
}
