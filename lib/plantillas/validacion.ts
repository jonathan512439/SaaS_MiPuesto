import { PLANTILLAS, type PlantillaId } from "./tipos";

export function esPlantillaId(valor: unknown): valor is PlantillaId {
  return typeof valor === "string" && (PLANTILLAS as readonly string[]).includes(valor);
}
