import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PLANTILLAS, TARJETAS, TARJETAS_POR_PLANTILLA } from "../../../lib/apariencia";

const RAIZ = join(import.meta.dirname, "..");

/* Qué plantillas ya delegan el dibujo del producto en una tarjeta. Se descubre
   leyendo el código en vez de mantenerse en una lista: una lista se olvida, y
   olvidarse acá haría que la prueba de abajo deje de mirar justo la plantilla
   que se acaba de conectar. */
function plantillasConectadas(): string[] {
  return PLANTILLAS.filter((plantilla) => {
    const fuente = readFileSync(join(RAIZ, plantilla, `plantilla-${plantilla}.tsx`), "utf8");
    return fuente.includes("<TarjetaProducto");
  });
}

function tarjetasDelDespachador(): string[] {
  const fuente = readFileSync(join(import.meta.dirname, "index.tsx"), "utf8");
  const bloque = fuente.slice(fuente.indexOf("TARJETAS_DISPONIBLES"), fuente.indexOf("};"));
  return [...bloque.matchAll(/^\s{2}([a-z]+):/gm)].map((c) => c[1]);
}

describe("el despachador de tarjetas", () => {
  it("solo declara formas que existen en el registro", () => {
    for (const tarjeta of tarjetasDelDespachador()) {
      expect(TARJETAS, `«${tarjeta}» no está en el registro`).toContain(tarjeta);
    }
  });

  /* La prueba que importa. Una plantilla conectada delega **todas** sus formas
     en el despachador, así que si declara una que él no sabe dibujar, el negocio
     que la elija recibe una excepción en vez de su catálogo.
     Mientras la plantilla dibuja sus productos adentro no pasa por acá y no hay
     nada que comprobar; por eso se miran solo las conectadas. */
  it("sabe dibujar todas las formas de las plantillas ya conectadas", () => {
    const disponibles = tarjetasDelDespachador();
    const conectadas = plantillasConectadas();
    expect(conectadas.length, "ninguna plantilla usa todavía el despachador").toBeGreaterThan(0);

    for (const plantilla of conectadas) {
      for (const tarjeta of TARJETAS_POR_PLANTILLA[plantilla as (typeof PLANTILLAS)[number]]) {
        expect(
          disponibles,
          `«${plantilla}» ofrece «${tarjeta}» y el despachador no la tiene`,
        ).toContain(tarjeta);
      }
    }
  });

  /* Repliegue silencioso no: un negocio viendo una forma que no eligió, sin que
     nada lo diga, es la clase de error que este proyecto viene pagando caro. */
  it("falla ruidosamente ante una forma que no tiene, en vez de dibujar otra", () => {
    const fuente = readFileSync(join(import.meta.dirname, "index.tsx"), "utf8");
    expect(fuente).toContain("throw new Error");
  });
});

describe("las plantillas conectadas", () => {
  /* Delegar y además seguir dibujando el producto adentro sería tener dos
     caminos para lo mismo, y el segundo se olvida al cambiar el primero. */
  it("no siguen dibujando el producto por su cuenta", () => {
    for (const plantilla of plantillasConectadas()) {
      const fuente = readFileSync(join(RAIZ, plantilla, `plantilla-${plantilla}.tsx`), "utf8");
      expect(fuente, `${plantilla} todavía importa AccionProducto`).not.toContain(
        'from "../accion-producto"',
      );
      expect(fuente, `${plantilla} todavía importa FotoProducto`).not.toContain(
        'from "../foto-producto"',
      );
    }
  });

  it("le pasan a la tarjeta la forma que eligió el negocio", () => {
    for (const plantilla of plantillasConectadas()) {
      const fuente = readFileSync(join(RAIZ, plantilla, `plantilla-${plantilla}.tsx`), "utf8");
      expect(fuente).toContain("tarjeta={datos.negocio.tarjeta}");
    }
  });
});

/* La invariante que el sistema de tipos no puede expresar.
 *
 * No todas las tarjetas devuelven el mismo elemento: cinco devuelven `li`, para
 * plantillas que listan con `ul`, y `servicio` devuelve un `div` con `dt` y `dd`
 * porque Mínima lista con `dl`. Meter una en el contenedor de la otra da HTML
 * inválido, y TypeScript no tiene forma de notarlo: los dos son
 * `React.ReactElement`.
 *
 * Se descubren los dos lados leyendo el código, no manteniendo listas. */
describe("el contenedor y la tarjeta tienen que ser compatibles", () => {
  const CONTENEDOR = { ul: "li", dl: "div" } as const;

  function elementoDeLaTarjeta(tarjeta: string): string | null {
    const archivos = ["cuadricula", "ficha", "lista", "servicio"].includes(tarjeta)
      ? [`${tarjeta}.tsx`]
      : ["formas-nuevas.tsx"];
    for (const archivo of archivos) {
      const fuente = readFileSync(join(import.meta.dirname, archivo), "utf8");
      const raiz = /return \(\s*<(li|div)[\s>]/.exec(fuente);
      if (raiz) return raiz[1];
    }
    return null;
  }

  function contenedorDeLaPlantilla(plantilla: string): "ul" | "dl" | null {
    const fuente = readFileSync(join(RAIZ, plantilla, `plantilla-${plantilla}.tsx`), "utf8");
    const antes = fuente.slice(0, fuente.indexOf("<TarjetaProducto"));
    const abiertos = [...antes.matchAll(/<(ul|dl)[\s>]/g)].map((c) => c[1]);
    const ultimo = abiertos.at(-1);
    return ultimo === "ul" || ultimo === "dl" ? ultimo : null;
  }

  it("cada plantilla conectada solo ofrece tarjetas que su contenedor admite", () => {
    for (const plantilla of plantillasConectadas()) {
      const contenedor = contenedorDeLaPlantilla(plantilla);
      expect(contenedor, `no se pudo leer el contenedor de ${plantilla}`).not.toBeNull();
      const admitido = CONTENEDOR[contenedor as keyof typeof CONTENEDOR];

      for (const tarjeta of TARJETAS_POR_PLANTILLA[plantilla as (typeof PLANTILLAS)[number]]) {
        expect(
          elementoDeLaTarjeta(tarjeta),
          `${plantilla} lista con <${contenedor}> y ofrece «${tarjeta}», que no devuelve <${admitido}>`,
        ).toBe(admitido);
      }
    }
  });
});
