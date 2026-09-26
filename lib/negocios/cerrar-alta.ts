import { PASOS_ALTA } from "./alta";

/* Cierra el alta: marca el último paso como terminado.
 *
 * Es lo que abre el panel —hasta entonces, el panel manda de vuelta al alta—,
 * así que lo usan «Terminar» y también los tres caminos del último paso, que
 * llevan a pantallas del panel. Recibe `fetch` para poder probarla sin red. */
export async function cerrarAlta(pedir: typeof fetch = fetch): Promise<void> {
  const respuesta = await pedir("/api/alta/paso", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ paso: PASOS_ALTA.length, terminar: true }),
  });
  const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
  if (!respuesta.ok) throw new Error(datos.error || "No se pudo terminar.");
}
