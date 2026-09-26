import { describe, expect, it } from "vitest";

import { cerrarAlta } from "./cerrar-alta";

/* Cerrar el alta es lo que abre el panel: hasta entonces, el panel manda de
   vuelta al alta. Los tres caminos del último paso —foto, Excel, a mano— van a
   pantallas del panel, así que **tienen que cerrar el alta antes de ir**. Sin
   eso, quien tocaba «Sube un Excel» volvía a caer en el mismo paso. */
describe("cerrarAlta", () => {
  it("pide cerrar el último paso", async () => {
    const llamadas: Array<{ url: string; init?: RequestInit }> = [];
    const pedir = (async (url: string, init?: RequestInit) => {
      llamadas.push({ url, init });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    await cerrarAlta(pedir);
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].url).toBe("/api/alta/paso");
    expect(llamadas[0].init?.method).toBe("PATCH");
    expect(JSON.parse(String(llamadas[0].init?.body))).toEqual({ paso: 4, terminar: true });
  });

  it("si la base no lo cierra, avisa con su mensaje", async () => {
    const pedir = (async () => new Response(JSON.stringify({ error: "Sesión vencida." }), { status: 401 })) as typeof fetch;
    await expect(cerrarAlta(pedir)).rejects.toThrow("Sesión vencida.");
  });
});
