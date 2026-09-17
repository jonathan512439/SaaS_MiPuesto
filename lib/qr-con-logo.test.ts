import { describe, expect, it } from "vitest";

import { COLORES_MIPUESTO } from "./identidad-visual";
import { PARTE_DEL_LADO, VELO } from "./qr-con-logo";

/* La marca de agua del QR se puede subir de opacidad «para que se vea mejor», y
 * es exactamente lo que alguien va a querer hacer mirando la pantalla. El
 * problema es que lo que se rompe no se ve en la pantalla: se ve en el
 * mostrador, cuando un cliente apunta el teléfono y no pasa nada.
 *
 * Un lector de QR no mide colores: compara. Separa los módulos claros de los
 * oscuros buscando la diferencia entre ellos, así que lo que hay que cuidar no
 * es cuánto se ve la marca sino **cuánto se le acerca al negro de los módulos**.
 *
 * Esta prueba calcula el gris que queda debajo del velo y comprueba que siga
 * lejos. No reemplaza escanear uno de verdad —eso hay que hacerlo una vez—, pero
 * impide el cambio de una línea que lo arruina en silencio.
 */
function aCanales(hex: string): number[] {
  return hex.replace("#", "").match(/.{2}/g)!.map((par) => Number.parseInt(par, 16));
}

/* El velo se dibuja con transparencia sobre el papel: el color que queda es la
   mezcla de los dos, en la proporción de la opacidad. */
function bajoElVelo(papel: string, tinta: string, opacidad: number): number[] {
  const [pr, pg, pb] = aCanales(papel);
  const [tr, tg, tb] = aCanales(tinta);
  return [
    pr + (tr - pr) * opacidad,
    pg + (tg - pg) * opacidad,
    pb + (tb - pb) * opacidad,
  ];
}

function luminancia(canales: number[]): number {
  const [r, g, b] = canales
    .map((canal) => canal / 255)
    .map((canal) => (canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4));
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function contraste(a: number[], b: number[]): number {
  const [clara, oscura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (clara + 0.05) / (oscura + 0.05);
}

describe("la marca de agua del QR", () => {
  it("deja el módulo claro lejos del oscuro", () => {
    const claroConVelo = bajoElVelo(
      COLORES_MIPUESTO.superficie,
      COLORES_MIPUESTO.texto,
      VELO,
    );
    const oscuro = aCanales(COLORES_MIPUESTO.texto);

    /* Diez a uno es holgado a propósito. El mínimo que un lector necesita es
       bastante menor, pero entre esta cuenta y el mostrador hay una impresora
       que aclara, un plástico que brilla y una cámara que enfoca mal. El margen
       es para eso, no para el cálculo. */
    expect(contraste(claroConVelo, oscuro)).toBeGreaterThan(10);
  });

  it("el velo es un velo y no una mancha", () => {
    /* Arriba de un quinto de opacidad deja de ser un fondo y empieza a competir
       con los módulos. El número exacto es discutible; que haya un techo, no. */
    expect(VELO).toBeLessThanOrEqual(0.2);
  });

  it("la marca puede ser grande, porque va debajo y no tapa nada", () => {
    /* Con el logo **encima** este número tendría que quedar abajo del 20 %: cada
       punto de más son módulos tapados. Debajo no tapa ninguno, y por eso puede
       ocupar más de la mitad. Se comprueba para que quede dicho que la holgura
       viene del orden en que se dibuja, no de la suerte. */
    expect(PARTE_DEL_LADO).toBeGreaterThan(0.4);
    /* Tampoco se sale del código: más allá del borde queda cortada y se lee como
       un error de impresión. */
    expect(PARTE_DEL_LADO).toBeLessThan(0.8);
  });
});
