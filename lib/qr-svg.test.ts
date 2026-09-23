import { describe, expect, it } from "vitest";

import { qrComoSvg } from "./qr-svg";

describe("qrComoSvg", () => {
  it("dibuja un código con su margen y un solo trazo", () => {
    const svg = qrComoSvg("https://mipuesto.com/directorio", "Código QR");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.match(/<path /g)).toHaveLength(1);
    /* Una dirección corta entra en la versión 2 o 3: 25 o 29 módulos, más ocho
       de margen. Un número fuera de eso es un código roto. */
    const lado = Number(svg.match(/viewBox="0 0 (\d+) /)?.[1]);
    expect([33, 37]).toContain(lado);
  });

  /* Las tres esquinas de búsqueda son lo que una cámara reconoce primero: sin
     la de arriba a la izquierda no hay código. */
  it("tiene la esquina de búsqueda donde va", () => {
    const svg = qrComoSvg("https://mipuesto.com/directorio", "Código QR");
    expect(svg).toContain("M4 4h1v1h-1z");
    expect(svg).toContain("M10 4h1v1h-1z");
  });

  it("el título no puede abrir una etiqueta", () => {
    expect(qrComoSvg("x", '<script>"')).not.toContain("<script>");
  });
});
