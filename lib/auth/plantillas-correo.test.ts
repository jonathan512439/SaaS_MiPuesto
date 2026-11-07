import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { leerTokensDeUrl, limpiarUrl } from "./sesion-desde-url";

/* Las plantillas de correo no las compila nadie.
 *
 * Se pegan a mano en la consola de Supabase, y un error de sintaxis hace que el
 * envío falle **después** de que el pedido se aceptó: la persona ve «revisa tu
 * correo» y el correo nunca sale (`docs/CONFIGURACION-MANUAL.md`). Esta prueba es
 * lo único que las lee antes de que lleguen a un cliente. */

const RAIZ = process.cwd();
const PLANTILLAS = [
  { archivo: "invite.html", tipo: "invite" },
  { archivo: "recovery.html", tipo: "recovery" },
] as const;

const leer = (archivo: string) =>
  readFileSync(join(RAIZ, "supabase/templates", archivo), "utf8");

/* Lo que hace Supabase al enviar, y lo que hace el cliente de correo con `&amp;`. */
const armar = (html: string) =>
  html
    .replaceAll("{{ .TokenHash }}", "hash-de-prueba")
    .replaceAll("{{ .Email }}", "alguien@ejemplo.com")
    .replaceAll("&amp;", "&");

describe.each(PLANTILLAS)("la plantilla $archivo", ({ archivo, tipo }) => {
  const html = leer(archivo);

  it("usa solo variables que Supabase conoce, bien escritas", () => {
    const variables = [...html.matchAll(/\{\{(.*?)\}\}/g)].map((m) => m[1].trim());
    expect(variables.length).toBeGreaterThan(0);
    expect(new Set(variables)).toEqual(new Set([".Email", ".TokenHash"]));
    expect(html.replace(/\{\{ \.\w+ \}\}/g, "")).not.toMatch(/\{\{|\}\}/);
  });

  it("el enlace va al dominio propio, nunca a supabase.co", () => {
    /* Un remitente de un dominio con un enlace de otro es lo que un filtro de spam
       lee como suplantación. Y `.ConfirmationURL` además se consume al abrirse:
       Safe Links de Microsoft lo visita antes que la persona y lo quema. */
    expect(html).not.toContain("ConfirmationURL");
    expect(html).not.toMatch(/supabase\.co/);
    const dominios = new Set(
      [...armar(html).matchAll(/https:\/\/([^/"?<\s]+)/g)].map((m) => m[1]),
    );
    expect(dominios).toEqual(new Set(["mi-puesto.com", "wa.me"]));
  });

  it("el enlace del botón lo entiende la pantalla que lo recibe", () => {
    const enlaces = [...armar(html).matchAll(/href="([^"]*actualizar-clave[^"]*)"/g)].map(
      (m) => m[1],
    );
    expect(enlaces.length).toBeGreaterThan(0);
    for (const enlace of enlaces) {
      expect(leerTokensDeUrl(enlace)).toEqual({
        tipo: "hash",
        tokenHash: "hash-de-prueba",
        verificacion: tipo,
      });
      expect(limpiarUrl(enlace)).toBe("/actualizar-clave");
    }
  });

  it("la cabecera existe y se entiende aunque bloqueen las imágenes", () => {
    const imagen = html.match(/<img[^>]*src="https:\/\/mi-puesto\.com\/([^"]+)"[^>]*>/);
    expect(imagen).not.toBeNull();
    expect(existsSync(join(RAIZ, "public", imagen![1]))).toBe(true);
    expect(imagen![0]).toContain('alt="MiPuesto"');
  });

  it("deja una salida si el enlace venció y dice por qué llegó", () => {
    expect(html).toContain('href="https://mi-puesto.com/recuperar-clave"');
    expect(html).toContain("Recibes este correo porque");
    expect(html).toContain('lang="es"');
  });

  it("habla como el producto: tú en los verbos, sin voseo ni usted", () => {
    const texto = armar(html).replace(/<[^>]+>/g, " ");
    expect(texto).not.toMatch(/\b(tenés|podés|hacé|tocá|pedí|escribí|usted)\b/i);
  });
});
