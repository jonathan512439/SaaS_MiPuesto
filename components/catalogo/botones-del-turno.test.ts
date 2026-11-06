import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/* Los botones de la hoja del turno, frente a `.tema button`.
 *
 * Esa regla pinta todo botón del catálogo y pesa más que una clase sola: un
 * botón escrito con `.confirmar { background: … }` compila, pasa los tipos y sale
 * sin relleno. Ninguna prueba de dibujo lo ve, porque el componente se dibuja
 * bien; lo que falla es quién gana en la hoja.
 *
 * El 6 de noviembre de 2026, medido en producción: «Apartar este turno» con el
 * fondo de la hoja, peso 400 y sin borde, y la hora elegida igual a las demás
 * salvo por un borde de 0,8 px. */

const hoja = readFileSync(
  join(process.cwd(), "components/catalogo/selector-de-turno.module.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

const regla = (selector: string) => {
  /* La última: `.seccion .dia, .seccion .diaActivo` también termina así. */
  const inicio = hoja.lastIndexOf(`${selector} {`);
  return inicio < 0 ? "" : hoja.slice(inicio, hoja.indexOf("}", inicio));
};

describe("los botones del turno le ganan al tema", () => {
  it("ninguno se pinta con una clase sola", () => {
    const clases = ["dia", "diaActivo", "hora", "horaActiva", "confirmar"];
    const solas = clases.filter((clase) =>
      new RegExp(`^\\.${clase}\\s*[,{:]`, "m").test(hoja),
    );
    expect(solas).toEqual([]);
  });

  it("«Apartar este turno» va del color de acción, en grande y con relieve", () => {
    const boton = regla(".seccion .confirmar");
    expect(boton).toContain("background: var(--catalogo-accion)");
    expect(boton).toContain("color: var(--catalogo-sobre-accion)");
    expect(boton).toContain("min-height: var(--spacing-14)");
    expect(boton).toContain("font-size: var(--text-lg)");
    expect(boton).toContain("box-shadow:");
  });

  it("entra en un renglón a 360 px: letra grande y poco relleno a los lados", () => {
    expect(regla(".seccion .confirmar")).toContain("padding: var(--spacing-2);");
  });

  it("los íconos de la confirmación acompañan a la palabra, no van en su renglón", () => {
    expect(regla(".confirmacion svg")).toContain("display: inline-block");
  });

  it("apagado sigue siendo el botón, no un rótulo gris", () => {
    const apagado = regla(".seccion .confirmar:disabled");
    expect(apagado).toContain("opacity:");
    expect(apagado).not.toContain("background");
  });

  it("el día y la hora elegidos se rellenan con la marca", () => {
    for (const selector of [".seccion .diaActivo", ".seccion .horaActiva"]) {
      expect(regla(selector)).toContain("background: var(--catalogo-marca)");
      expect(regla(selector)).toContain("color: var(--catalogo-sobre-marca)");
    }
  });

  it("«Avisar por WhatsApp» pesa lo mismo que apartar", () => {
    const enlace = regla(".whatsapp");
    expect(enlace).toContain("background: var(--catalogo-accion)");
    expect(enlace).toContain("min-height: var(--spacing-14)");
    expect(enlace).toContain("font-size: var(--text-lg)");
  });
});

/* Acá el peso empata en vez de perder, y gana la hoja que cargue después: por eso
   la tarjeta salía bien y la ficha no, con la misma regla. */
describe("el botón de la ficha le gana al tema", () => {
  it("«Agregar al pedido» no depende del orden de las hojas", () => {
    const ficha = readFileSync(
      join(process.cwd(), "components/catalogo/ficha-producto.module.css"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    /* Otra `.accion button` pone solo `display` y `gap`: esa no compite con el tema. */
    expect(ficha).not.toMatch(/^\.accion button[^{]*\{[^}]*background/m);
    const inicio = ficha.indexOf(".detalle .accion button,");
    const boton = ficha.slice(inicio, ficha.indexOf("}", inicio));
    expect(boton).toContain("background: var(--catalogo-accion)");
    expect(boton).toContain("color: var(--catalogo-sobre-accion)");
  });
});
