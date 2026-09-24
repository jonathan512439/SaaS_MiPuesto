import { describe, expect, it } from "vitest";

import type { Atributo } from "../catalogo/atributos";
import { validarValores } from "../catalogo/valores";
import { validarVariantes } from "../catalogo/variantes";
import { SIEMBRAS, type AtributoSembrado } from "../rubros/siembra";
import { analizarPlanilla } from "./columnas";
import { valoresDesdePlanilla } from "./datos-de-planilla";
import { productosDeLaPlanilla } from "./planilla";
import {
  PREFIJO_EJEMPLO,
  armarPlantilla,
  filasDeInstrucciones,
  filasDeProductos,
  nombreDeArchivoDePlantilla,
  plantillasDelNegocio,
  rubrosConPlantilla,
  titulosDePlantilla,
} from "./plantillas";
import { leerXlsx } from "./xlsx";

function comoAtributo(sembrado: AtributoSembrado): Atributo {
  return {
    clave: sembrado.clave,
    nombre: sembrado.nombre,
    tipo: sembrado.tipo,
    unidad: sembrado.unidad ?? null,
    opciones: sembrado.opciones ?? [],
    obligatorio: false,
    enTarjeta: sembrado.enTarjeta ?? false,
    enResumen: true,
  };
}

/* Lo que hace el dueño: abre la plantilla, escribe encima de los ejemplos
   (acá, les saca el «Ejemplo:») y la sube. */
async function importarPlantilla(rubro: (typeof SIEMBRAS)[number]["rubro"], sinPrefijo: boolean) {
  const bytes = armarPlantilla(rubro);
  const { filas } = await leerXlsx(bytes.slice().buffer);
  const escritas = sinPrefijo
    ? filas.map((fila, indice) =>
        indice === 0 ? fila : [fila[0].replace(PREFIJO_EJEMPLO, ""), ...fila.slice(1)],
      )
    : filas;
  const planilla = analizarPlanilla(escritas);
  return {
    planilla,
    ...productosDeLaPlanilla(planilla.filas, planilla.mapeo, planilla.cabeceras),
  };
}

describe("hay plantilla para cada rubro establecido, y solo para esos", () => {
  it("una por siembra", () => {
    expect([...rubrosConPlantilla()].sort()).toEqual(SIEMBRAS.map(({ rubro }) => rubro).sort());
  });

  it("el nombre del archivo dice el rubro", () => {
    expect(nombreDeArchivoDePlantilla("ropa_y_calzado")).toBe("plantilla-ropa-y-calzado-mipuesto.xlsx");
  });
});

describe.each(SIEMBRAS.map(({ rubro }) => rubro))("la plantilla de %s", (rubro) => {
  const siembra = SIEMBRAS.find((una) => una.rubro === rubro)!;

  it("la reconoce el importador: cada columna fija cae en su lugar", async () => {
    const { planilla } = await importarPlantilla(rubro, true);
    const titulos = titulosDePlantilla(rubro);
    expect(planilla.cabeceras).toEqual(titulos);
    expect(planilla.mapeo.nombre).toBe(titulos.indexOf("Producto"));
    expect(planilla.mapeo.precio).toBe(titulos.indexOf("Precio"));
    expect(planilla.mapeo.categoria).toBe(titulos.indexOf("Categoría"));
    expect(planilla.mapeo.cantidad).toBe(titulos.indexOf("Cantidad"));
    expect(planilla.mapeo.descripcion).toBe(titulos.indexOf("Descripción"));
    if (titulos.includes("Se elige por")) {
      expect(planilla.mapeo.tipoPresentacion).toBe(titulos.indexOf("Se elige por"));
      expect(planilla.mapeo.presentacion).toBe(titulos.indexOf("Talla, número o tamaño"));
    } else {
      expect(planilla.mapeo.presentacion).toBeNull();
    }
  });

  it("los ejemplos quedan afuera si el dueño no los borra", async () => {
    const { productos, ejemplos, descartadas } = await importarPlantilla(rubro, false);
    expect(productos).toHaveLength(0);
    expect(descartadas).toBe(0);
    expect(ejemplos).toBe(filasDeProductos(rubro).length - 1);
  });

  it("cada ejemplo entra entero: su categoría, sus datos y sus presentaciones", async () => {
    const { productos, descartadas } = await importarPlantilla(rubro, true);
    expect(descartadas).toBe(0);
    expect(productos.length).toBeGreaterThanOrEqual(3);

    for (const producto of productos) {
      const categoria = siembra.categorias.find(({ nombre }) => nombre === producto.categoria);
      expect(categoria, `${producto.nombre}: la categoría «${producto.categoria}» no existe`).toBeTruthy();
      expect(producto.avisos, producto.nombre).toEqual([]);

      /* Todos sus datos son campos de su categoría y se leen sin problemas. */
      const atributos = (categoria!.atributos ?? []).map(comoAtributo);
      const { valores, problemas } = valoresDesdePlanilla(atributos, producto.campos);
      expect(problemas, producto.nombre).toEqual([]);
      const escritos = Object.values(producto.campos).length;
      expect(Object.keys(valores), `${producto.nombre}: un dato no es de su categoría`).toHaveLength(escritos);
      expect(validarValores(atributos, valores), producto.nombre).toMatchObject({ correcto: true });

      /* Las presentaciones las acepta la misma validación que el editor. */
      if (producto.presentaciones.length > 0) {
        expect(categoria!.vende, producto.nombre).toBe("cosas");
        const validadas = validarVariantes(
          producto.presentaciones.map(({ nombre, precio, cantidad }) => ({
            nombre,
            precio,
            cantidadStock: cantidad,
          })),
          { controlaStock: producto.cantidad !== null, vendeTiempo: false, tipo: producto.tipoPresentacion ?? undefined },
        );
        expect(validadas, producto.nombre).toMatchObject({ correcto: true });
      }
    }
  });

  it("la hoja de instrucciones nombra cada categoría y cada dato", () => {
    const texto = filasDeInstrucciones(rubro).flat().join("\n");
    for (const categoria of siembra.categorias) {
      expect(texto).toContain(categoria.nombre);
      for (const atributo of categoria.atributos ?? []) {
        expect(texto).toContain(atributo.nombre);
        for (const opcion of atributo.opciones ?? []) expect(texto).toContain(opcion);
      }
    }
  });
});

describe("lo que la plantilla enseña en cada rubro", () => {
  it("ropa y calzado: una fila por talla o por número, que se juntan en un producto", async () => {
    const { productos } = await importarPlantilla("ropa_y_calzado", true);
    const polera = productos.find(({ nombre }) => nombre === "Polera básica blanca")!;
    expect(polera.tipoPresentacion).toBe("talla");
    expect(polera.presentaciones.map(({ nombre, cantidad }) => [nombre, cantidad])).toEqual([
      ["S", 4],
      ["M", 6],
      ["L", 3],
    ]);
    expect(polera.cantidad).toBe(13);
    expect(polera.campos).toMatchObject({ Color: "Blanco", Temporada: "Todo el año" });

    const zapatilla = productos.find(({ nombre }) => nombre === "Zapatilla urbana negra")!;
    expect(zapatilla.tipoPresentacion).toBe("numero");
    expect(zapatilla.presentaciones.map(({ nombre }) => nombre)).toContain("40,5");

    const chamarra = productos.find(({ nombre }) => nombre === "Chamarra de jean")!;
    expect(chamarra.presentaciones.map(({ precio }) => precio)).toEqual([null, null, 240]);
  });

  it("ferretería: los datos de la categoría, con unidad en el título", async () => {
    expect(titulosDePlantilla("ferreteria")).toContain("Potencia (W)");
    expect(titulosDePlantilla("ferreteria")).not.toContain("Se elige por");
    const { productos } = await importarPlantilla("ferreteria", true);
    const foco = productos.find(({ nombre }) => nombre.startsWith("Foco LED"))!;
    expect(foco.campos).toMatchObject({ "Potencia (W)": "9", Casquillo: "E27" });
  });

  it("restaurante: los datos del plato y un tamaño con precio propio", async () => {
    const { productos } = await importarPlantilla("restaurante", true);
    const pique = productos.find(({ nombre }) => nombre === "Pique macho")!;
    expect(pique.tipoPresentacion).toBe("tamano");
    /* El primero cuesta lo del producto y no lleva precio propio. */
    expect(pique.precio).toBe(70);
    expect(pique.presentaciones.map(({ nombre, precio }) => [nombre, precio])).toEqual([
      ["Para dos", null],
      ["Familiar", 120],
    ]);
    /* Sin cantidad en sus filas: no se llevan existencias. */
    expect(pique.cantidad).toBeNull();
  });
});

describe("qué plantillas le sirven a un negocio", () => {
  it("la de su rubro público y las de sus secundarios, sin repetir", () => {
    expect(
      plantillasDelNegocio({ rubro_publico: "polleria", rubros_secundarios: ["cafeteria", "mascotas"] }),
    ).toEqual(["restaurante", "veterinaria"]);
  });

  it("solo las de rubros establecidos", () => {
    expect(plantillasDelNegocio({ rubro_publico: "barberia" })).toEqual([]);
    expect(plantillasDelNegocio({ rubro_publico: "barberia", rubros_secundarios: ["accesorios"] })).toEqual([
      "ropa_y_calzado",
    ]);
  });

  it("sin rubro público, la de su siembra", () => {
    expect(plantillasDelNegocio({ rubro: "repuestos" })).toEqual(["repuestos"]);
    expect(plantillasDelNegocio({ rubro: "belleza" })).toEqual([]);
    expect(plantillasDelNegocio({})).toEqual([]);
  });
});

describe("español neutro, sin voseo", () => {
  const VOSEO =
    /(?<!\p{L})(vos|podés|tenés|querés|sabés|escribís|elegí|cargá|agregá|usá|poné|borralas|completalos|guardá|subí|dejá|fijate|mirá|decí)(?!\p{L})/iu;

  it.each(rubrosConPlantilla())("%s", (rubro) => {
    const texto = [...filasDeInstrucciones(rubro), ...filasDeProductos(rubro)].flat().join("\n");
    expect(texto).not.toMatch(VOSEO);
  });
});
