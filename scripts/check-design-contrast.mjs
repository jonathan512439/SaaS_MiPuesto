import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const cssPaletas = readFileSync(
  new URL("../components/templates/tema-catalogo.module.css", import.meta.url),
  "utf8",
);

function leerColor(token) {
  const coincidencia = css.match(
    new RegExp(`--color-${token}:\\s*(#[0-9a-fA-F]{6})\\s*;`),
  );

  if (!coincidencia) {
    throw new Error(`No se encontró el token --color-${token}.`);
  }

  return coincidencia[1];
}

function luminancia(hexadecimal) {
  const canales = hexadecimal
    .slice(1)
    .match(/.{2}/g)
    .map((canal) => Number.parseInt(canal, 16) / 255)
    .map((canal) =>
      canal <= 0.04045
        ? canal / 12.92
        : ((canal + 0.055) / 1.055) ** 2.4,
    );

  return canales[0] * 0.2126 + canales[1] * 0.7152 + canales[2] * 0.0722;
}

function contraste(colorA, colorB) {
  const luminanciaA = luminancia(colorA);
  const luminanciaB = luminancia(colorB);
  const clara = Math.max(luminanciaA, luminanciaB);
  const oscura = Math.min(luminanciaA, luminanciaB);
  return (clara + 0.05) / (oscura + 0.05);
}

function leerColoresPaleta(paleta) {
  const bloque = cssPaletas.match(
    new RegExp(`\\.tema\\[data-paleta="${paleta}"\\]\\s*\\{([\\s\\S]*?)\\}`),
  )?.[1];

  if (!bloque) throw new Error(`No se encontró la paleta ${paleta}.`);

  return Object.fromEntries(
    ["superficie", "texto", "marca", "sobre-marca", "accion", "sobre-accion", "exito", "alerta"].map(
      (token) => {
        const valor = bloque.match(
          new RegExp(`--catalogo-${token}:\\s*(#[0-9a-fA-F]{6})\\s*;`),
        )?.[1];

        if (!valor) throw new Error(`No se encontró --catalogo-${token} en ${paleta}.`);
        return [token, valor];
      },
    ),
  );
}

const colores = Object.fromEntries(
  ["marca", "superficie", "texto", "accion", "exito", "alerta"].map(
    (token) => [token, leerColor(token)],
  ),
);

const combinaciones = [
  ["texto", "superficie", 4.5],
  ["marca", "superficie", 4.5],
  ["accion", "superficie", 4.5],
  ["superficie", "marca", 4.5],
  ["superficie", "accion", 4.5],
  ["superficie", "exito", 4.5],
  ["superficie", "alerta", 4.5],
];

const combinacionesFoco = [
  ["texto", "superficie", 3],
  ["superficie", "marca", 3],
  ["superficie", "accion", 3],
  ["superficie", "texto", 3],
];

for (const [frente, fondo, minimo] of combinaciones) {
  const relacion = contraste(colores[frente], colores[fondo]);

  if (relacion < minimo) {
    throw new Error(
      `Contraste insuficiente: ${frente} sobre ${fondo} = ${relacion.toFixed(2)}:1; mínimo ${minimo}:1.`,
    );
  }

  console.log(`${frente} sobre ${fondo}: ${relacion.toFixed(2)}:1`);
}

for (const [frente, fondo, minimo] of combinacionesFoco) {
  const relacion = contraste(colores[frente], colores[fondo]);

  if (relacion < minimo) {
    throw new Error(
      `Foco insuficiente: ${frente} sobre ${fondo} = ${relacion.toFixed(2)}:1; mínimo ${minimo}:1.`,
    );
  }

  console.log(`foco ${frente} sobre ${fondo}: ${relacion.toFixed(2)}:1`);
}

console.log("Control de contraste: correcto.");

for (const paleta of ["mercado", "tierra", "oceano", "noche"]) {
  const coloresPaleta = leerColoresPaleta(paleta);
  const pares = [
    ["texto", "superficie"],
    ["marca", "superficie"],
    ["accion", "superficie"],
    ["sobre-marca", "marca"],
    ["sobre-accion", "accion"],
    ["exito", "superficie"],
    ["alerta", "superficie"],
  ];

  for (const [frente, fondo] of pares) {
    const relacion = contraste(coloresPaleta[frente], coloresPaleta[fondo]);
    if (relacion < 4.5) {
      throw new Error(
        `Contraste insuficiente en ${paleta}: ${frente} sobre ${fondo} = ${relacion.toFixed(2)}:1.`,
      );
    }
  }

  console.log(`Paleta ${paleta}: contraste AA correcto.`);
}
