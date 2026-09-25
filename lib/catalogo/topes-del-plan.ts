import { PLANES, planDe } from "../planes";

/* Lo que se le dice al dueño cuando llega al tope de su plan.
 *
 * Los números salen de `lib/planes.ts` y la base los hace cumplir con
 * `LIMITE_PRODUCTOS` y `LIMITE_FOTOS`. Las rutas comprueban antes para contestar
 * con estas palabras; si algo se les escapa —dos cargas a la vez—, la base
 * rechaza con el código y la ruta lo traduce con las mismas. */

function hayPlanMayor(planId: string | null | undefined): boolean {
  const actual = planDe(planId).topes;
  return PLANES.some(
    (plan) =>
      plan.topes.productos > actual.productos ||
      plan.topes.fotosPorProducto > actual.fotosPorProducto,
  );
}

export function mensajeLimiteProductos(planId: string | null | undefined): string {
  const plan = planDe(planId);
  return (
    `Tu plan ${plan.nombre} incluye hasta ${plan.topes.productos} productos. ` +
    (hayPlanMayor(planId)
      ? "Para agregar otro, manda alguno a la papelera o pásate a un plan mayor."
      : "Para agregar otro, manda alguno a la papelera.")
  );
}

export function mensajeLimiteFotos(planId: string | null | undefined): string {
  const plan = planDe(planId);
  return (
    `Tu plan ${plan.nombre} incluye hasta ${plan.topes.fotosPorProducto} fotos por producto.` +
    (hayPlanMayor(planId) ? " Con un plan mayor puedes subir más." : "")
  );
}

/* El rechazo de la base llega como el mensaje del error. */
export function esRechazoDeTope(
  mensaje: string | null | undefined,
  codigo: "LIMITE_PRODUCTOS" | "LIMITE_FOTOS",
): boolean {
  return typeof mensaje === "string" && mensaje.includes(codigo);
}
