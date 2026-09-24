/* Del rango de Postgres —«["2026-09-14 14:00:00+00","2026-09-14 15:00:00+00")»—
   a dos instantes. Se parte acá para que nadie más tenga que conocer cómo la
   base escribe un rango: la agenda del dueño y la ruta pública de citas leen
   con esto. */
export function partirRango(rango: unknown): { inicio: string; fin: string } {
  const texto = String(rango).replace(/^[[(]/, "").replace(/[\])]$/, "");
  const [inicio, fin] = texto.split(",").map((parte) => parte.replace(/"/g, "").trim());
  return { inicio: new Date(inicio).toISOString(), fin: new Date(fin).toISOString() };
}
