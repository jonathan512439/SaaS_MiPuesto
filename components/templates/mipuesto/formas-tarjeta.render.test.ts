import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FORMAS_TARJETA, type FormaTarjeta } from "../../../lib/apariencia";
import type { TipoNegocio } from "../../../lib/negocios/validacion";
import { crearDatosDemoPlantilla } from "../../../lib/plantillas/datos-demo";
import { PlantillaMipuesto } from "./plantilla-mipuesto";

/* Las tres formas de tarjeta, por las tres modalidades.
 *
 * Son nueve combinaciones que nadie va a abrir a mano, y la regla que las
 * sostiene es una sola: **la forma cambia el aspecto, nunca lo que se puede
 * hacer**. Un negocio con carrito que elige la vitrina tiene que seguir pudiendo
 * agregar al carrito, aunque el botón quede encima de la foto. Si una forma se come un botón, el dueño no lo ve
 * —mira su catálogo con la forma que eligió y no sabe que faltaba algo— y quien
 * lo nota es el cliente que no puede pedir.
 *
 * Por eso la prueba no mira cómo se ve: compara **las acciones** que dibuja cada
 * forma dentro de la misma modalidad, y exige que sean las mismas. */

const MODALIDADES: readonly TipoNegocio[] = ["catalogo_estatico", "catalogo_cta", "tienda_virtual"];

function dibujar(forma: FormaTarjeta, tipoNegocio: TipoNegocio) {
  const datos = crearDatosDemoPlantilla({
    nombre: "Negocio de prueba",
    descripcion: null,
    telefonoWhatsapp: "70000000",
    tipoNegocio,
    formaTarjeta: forma,
  });
  /* `demostracion: false` para que las tarjetas enlacen: en solo lectura, la
     acción de la tarjeta es justamente el enlace al producto. */
  const html = renderToString(jsx(PlantillaMipuesto, { datos, demostracion: false }));
  const productos = html.slice(html.indexOf('id="productos"'));
  return { html, productos };
}

/* Las acciones de cada tarjeta: los `aria-label` que aparecen en su cuerpo. Se
   corta en el cuerpo porque la foto también lleva un «Ver …», que no es una
   acción sobre el producto. */
function accionesDe(productos: string): string[] {
  return productos
    .split("<li ")
    .slice(1)
    .flatMap((tarjeta) => {
      const cuerpo = tarjeta.slice(tarjeta.indexOf("_tarjetaCuerpo_"));
      return [...cuerpo.matchAll(/aria-label="([^"]+)"/g)].map(([, etiqueta]) => etiqueta);
    });
}

describe("las formas de la tarjeta", () => {
  for (const tipoNegocio of MODALIDADES) {
    describe(tipoNegocio, () => {
      /* Se dibuja adentro de cada prueba y no acá: un error de dibujo acá
         tumbaría el archivo entero antes de juntar las pruebas, y una falla de
         una forma se leería como «no hay pruebas» en vez de decir cuál falló. */
      const dibujarTodas = () =>
        Object.fromEntries(
          FORMAS_TARJETA.map((forma) => [forma, dibujar(forma, tipoNegocio)]),
        ) as Record<FormaTarjeta, ReturnType<typeof dibujar>>;

      it("las tres se dibujan, con su forma marcada en cada tarjeta", () => {
        const dibujos = dibujarTodas();
        for (const forma of FORMAS_TARJETA) {
          expect(dibujos[forma].productos).toContain(`data-forma="${forma}"`);
          expect(dibujos[forma].productos.match(/<li /g)?.length ?? 0).toBeGreaterThan(0);
        }
      });

      it("ninguna forma esconde una acción", () => {
        const dibujos = dibujarTodas();
        const referencia = accionesDe(dibujos.cuadricula.productos);
        for (const forma of FORMAS_TARJETA) {
          expect(accionesDe(dibujos[forma].productos), `${forma} en ${tipoNegocio}`).toEqual(
            referencia,
          );
        }
      });

      /* Las tres llevan la foto del producto: lo que cambia es dónde. */
      it("las tres dibujan la foto", () => {
        const dibujos = dibujarTodas();
        for (const forma of FORMAS_TARJETA) {
          expect(dibujos[forma].productos, forma).toContain("<img");
        }
      });
    });
  }

  /* La fila pide la miniatura y no la foto de la cuadrícula: si no, cada visita
     bajaría la imagen grande para mostrarla chica. */
  it("la fila pide la foto del tamaño que muestra", () => {
    expect(dibujar("fila", "tienda_virtual").productos).toContain('sizes="96px"');
  });

  /* La vitrina tiene el ancho de una tarjeta de la cuadrícula: si pidiera la
     foto «a pantalla completa», cada visita bajaría una imagen el doble de
     grande para mostrarla en media pantalla. */
  it("la vitrina no pide fotos más grandes que la tarjeta", () => {
    const productos = dibujar("vitrina", "tienda_virtual").productos;
    expect(productos).toContain('sizes="(min-width: 64rem) 240px, (min-width: 48rem) 33vw, 50vw"');
  });
});

/* La lista de formas vive en dos lugares: `FORMAS_TARJETA` y la restricción de
   la columna en la base. Si se agrega una forma acá y no allá, el panel la
   ofrece y la base rechaza el guardado sin que nada lo anticipe. */
describe("las formas de la tarjeta, contra la base", () => {
  it("son las mismas que acepta la restricción de la columna", () => {
    const carpeta = join(import.meta.dirname, "../../../supabase/migrations");
    const ultima = readdirSync(carpeta)
      .sort()
      .map((archivo) => readFileSync(join(carpeta, archivo), "utf8"))
      .filter((sql) => sql.includes("forma_tarjeta in ("))
      .at(-1);
    const lista = ultima?.match(/forma_tarjeta in \(([^)]+)\)/)?.[1] ?? "";
    const enLaBase = [...lista.matchAll(/'([a-z_]+)'/g)].map(([, forma]) => forma);
    expect(enLaBase).toEqual([...FORMAS_TARJETA]);
  });
});
