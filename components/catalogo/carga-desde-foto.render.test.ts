import { readFileSync } from "node:fs";
import { join } from "node:path";

import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AYUDA_LISTA } from "../../lib/ia/ayuda";
import { ProveedorAvisos, ProveedorConfirmacion } from "../ui";
import { CargaDesdeFoto } from "./carga-desde-foto";

/* «Cargar desde una foto» se dibuja, con sus tres pasos y la lectura de ejemplo.
 *
 * La pantalla se rearmó entera el 2026-11-19 —la ayuda pasó a ser un camino de
 * pasos con los botones adentro, y el ejemplo, una animación— y un error de orden
 * entre constantes la dejaría en blanco sin que TypeScript ni el lint lo vean
 * (AGENTS.md, «Pruebas de dibujo»). El aspecto y el movimiento se revisan a mano. */
function dibujar() {
  const pantalla = jsx(CargaDesdeFoto, {
    categorias: [],
    enlaceCatalogo: "/negocio-de-prueba",
    fotosUsadas: 1,
    negocioLlevaStock: false,
    planId: "catalogo",
    productosActuales: 0,
  });
  return renderToString(
    jsx(ProveedorAvisos, { children: jsx(ProveedorConfirmacion, { children: pantalla }) }),
  ).replaceAll("<!-- -->", "");
}

describe("la pantalla de cargar desde una foto", () => {
  const html = dibujar();

  it("dibuja los tres pasos en orden, con los botones en el segundo", () => {
    const prepara = html.indexOf("Prepara tu lista");
    const manda = html.indexOf("Mándala a leer");
    const elegir = html.indexOf("Elegir la foto o el PDF de la lista");
    const revisa = html.indexOf("Revisa y confirma");
    expect(prepara).toBeGreaterThan(-1);
    expect(manda).toBeGreaterThan(prepara);
    expect(elegir).toBeGreaterThan(manda);
    expect(revisa).toBeGreaterThan(elegir);
  });

  it("no da por hecho ningún paso antes de empezar", () => {
    expect(html).not.toContain("Hecho");
    expect(html).not.toContain("Tu turno");
    expect(html.match(/data-estado="espera"/g)).toHaveLength(3);
  });

  it("dibuja la lista de ejemplo y lo que sale de ella", () => {
    expect(html).toContain("Tu lista");
    expect(html).toContain("Tu catálogo");
    for (const renglon of AYUDA_LISTA.ejemplo.entrada) expect(html).toContain(renglon);
    for (const { nombre } of AYUDA_LISTA.ejemplo.salida) expect(html).toContain(nombre);
    expect(html).toContain("Ver de nuevo");
  });

  it("dice qué funciona y qué no, y avisa quién lee las fotos", () => {
    expect(html).toContain("Funciona con");
    expect(html).toContain("No funciona con");
    expect(html).toContain("Las fotos que elijas las lee Google");
  });
});

/* El orden de cada renglón de la animación va en la hoja, por posición, porque
   el panel no lleva estilos en línea. Si el ejemplo crece más que las reglas, el
   renglón de más se leería junto con el primero y caería antes de tiempo. */
describe("la lectura de ejemplo", () => {
  const hoja = readFileSync(join(process.cwd(), "components/catalogo/lectura-de-ejemplo.module.css"), "utf8");

  it("tiene una regla de orden para cada renglón del ejemplo", () => {
    const reglas = hoja.match(/\.renglones li:nth-child\(\d+\)/g) ?? [];
    expect(reglas.length).toBeGreaterThanOrEqual(AYUDA_LISTA.ejemplo.entrada.length);
  });

  it("cada producto sale del renglón siguiente al título", () => {
    /* Lo que la animación supone: un solo título arriba, y después un producto
       por renglón. */
    expect(AYUDA_LISTA.ejemplo.salida).toHaveLength(AYUDA_LISTA.ejemplo.entrada.length - 1);
  });
});
