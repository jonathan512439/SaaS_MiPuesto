import { describe, expect, it } from "vitest";

import { RUBROS } from "../negocios/rubros";
import { RUBROS_PUBLICOS } from "../negocios/rubros-publicos";
import { TIPOS_ATRIBUTO, validarAtributos } from "./atributos";
import {
  ayudaCategoria,
  categoriasDeEjemplo,
  ejemploDeCategoria,
  ejemploDeTipo,
  guiaDeRubroPublico,
  guiaDelNegocio,
  introDeCampos,
  marcadorDeValor,
  marcadoresDeCampo,
  textosDeProducto,
  type GuiaDeRubro,
} from "./guias-por-rubro";

const GUIAS: GuiaDeRubro[] = RUBROS_PUBLICOS.map(({ id }) => guiaDeRubroPublico(id));

/* Todo lo que una guía le muestra al dueño, junto. */
function textosDe(guia: GuiaDeRubro): string[] {
  const producto = textosDeProducto(guia);
  return [
    introDeCampos(guia),
    ayudaCategoria({ rubro_publico: guia.id }),
    ...TIPOS_ATRIBUTO.map((tipo) => ejemploDeTipo(tipo, guia)),
    ...Object.values(producto),
    ...guia.categorias,
  ];
}

describe("cada rubro público tiene su guía", () => {
  it.each(RUBROS_PUBLICOS.filter(({ id }) => id !== "otro"))("$nombre", ({ id }) => {
    expect(guiaDeRubroPublico(id).id).toBe(id);
  });

  it("«Otro» y lo desconocido usan la general", () => {
    expect(guiaDeRubroPublico("otro").id).toBe("general");
    expect(guiaDeRubroPublico("inventado").id).toBe("general");
    expect(guiaDeRubroPublico(null).id).toBe("general");
  });

  it("dos rubros distintos no comparten ejemplos de producto", () => {
    const nombres = GUIAS.map((guia) => guia.producto.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
  });
});

describe("lo que sugerimos, el sistema lo acepta", () => {
  /* Si el ejemplo del editor no pasa el validador, el dueño que lo copia tal
     cual recibe un error: peor que no tener ejemplo. */
  it.each(GUIAS.map((guia) => [guia.id, guia] as const))("%s", (_, guia) => {
    const resultado = validarAtributos(
      TIPOS_ATRIBUTO.map((tipo) => ({
        nombre: guia.campos[tipo].nombre,
        tipo,
        unidad: tipo === "numero" ? guia.campos.numero.unidad ?? "" : "",
        opciones: tipo === "opcion" ? guia.campos.opcion.opciones : [],
        obligatorio: false,
        enTarjeta: false,
        enResumen: true,
      })),
    );
    expect(resultado).toMatchObject({ correcto: true });
  });

  it("cada ejemplo de texto y de número trae su muestra; cada ejemplo tiene tres categorías distintas", () => {
    for (const guia of GUIAS) {
      expect(guia.campos.texto.muestra, guia.id).toBeTruthy();
      expect(guia.campos.numero.muestra, guia.id).toMatch(/^\d/);
      expect(new Set(guia.categorias).size, guia.id).toBe(3);
      expect(Number(guia.producto.precio.replace(",", ".")), guia.id).toBeGreaterThan(0);
    }
  });
});

describe("con vos, nunca tuteo", () => {
  /* Decisión del dueño, 2026-09-24: voseo y español neutro. La guardia
     `check-vocabulario.mjs` revisa todo el sistema; esta, las guías en
     particular, porque se escribieron primero con tuteo. Con límites Unicode:
     los de palabra de JavaScript no cuentan la «á» como letra. */
  const TUTEO =
    /(?<!\p{L})(tú|tienes|puedes|quieres|vendes|guardas|cobras|escríbenos|súbela|márcalo|elige|revisa|agrupa)(?!\p{L})/u;

  it.each(GUIAS.map((guia) => [guia.id, guia] as const))("%s", (_, guia) => {
    for (const texto of textosDe(guia)) expect(texto).not.toMatch(TUTEO);
  });

  it("y la ayuda de categorías habla de vos", () => {
    expect(ayudaCategoria({ rubro_publico: "polleria" })).toContain("Agrupá como busca tu cliente");
  });
});

describe("qué guía corresponde", () => {
  it("la del rubro público", () => {
    expect(guiaDelNegocio({ rubro: "restaurante", rubro_publico: "polleria" }).id).toBe("polleria");
  });

  it("sin rubro público, la de su siembra; sin nada, la general", () => {
    expect(guiaDelNegocio({ rubro: "belleza" }).id).toBe("salon_belleza");
    expect(guiaDelNegocio({ rubro: "servicios" }).id).toBe("otros_servicios");
    expect(guiaDelNegocio({}).id).toBe("general");
    for (const rubro of RUBROS) expect(guiaDelNegocio({ rubro }).id).toBeTruthy();
  });

  const polleriaConHeladeria = {
    rubro: "restaurante",
    rubro_publico: "polleria",
    rubros_secundarios: ["cafeteria"],
  };

  it("la del secundario, en la categoría que es de ese rubro", () => {
    expect(guiaDelNegocio(polleriaConHeladeria, "Helados").id).toBe("cafeteria");
    expect(guiaDelNegocio(polleriaConHeladeria, "Cafés y postres").id).toBe("cafeteria");
  });

  it("la del principal en sus categorías, en las que no se reconocen y en el empate", () => {
    expect(guiaDelNegocio(polleriaConHeladeria, "Presas").id).toBe("polleria");
    expect(guiaDelNegocio(polleriaConHeladeria, "Lo nuevo").id).toBe("polleria");
    expect(guiaDelNegocio(polleriaConHeladeria, "Pollo con helado").id).toBe("polleria");
    expect(guiaDelNegocio(polleriaConHeladeria, null).id).toBe("polleria");
  });

  it("reconoce el plural pero no una palabra más larga que empieza igual", () => {
    const panaderiaConRopa = { rubro_publico: "panaderia", rubros_secundarios: ["ropa_y_calzado"] };
    expect(guiaDelNegocio(panaderiaConRopa, "Pantalones").id).toBe("ropa_y_calzado");
    expect(guiaDelNegocio(panaderiaConRopa, "Panes").id).toBe("panaderia");
    const cafeteriaConArtesanias = { rubro_publico: "cafeteria", rubros_secundarios: ["artesanias"] };
    expect(guiaDelNegocio(cafeteriaConArtesanias, "Tejidos").id).toBe("artesanias");
  });

  it("sin tildes ni mayúsculas de por medio", () => {
    const ferreteriaConRepuestos = { rubro_publico: "ferreteria", rubros_secundarios: ["repuestos"] };
    expect(guiaDelNegocio(ferreteriaConRepuestos, "SUSPENSIÓN").id).toBe("repuestos");
  });

  it("un secundario inventado no rompe nada", () => {
    expect(guiaDelNegocio({ rubro_publico: "polleria", rubros_secundarios: ["inventado"] }, "Helados").id).toBe(
      "polleria",
    );
  });
});

describe("los textos que arma cada pantalla", () => {
  it("la categoría: ejemplos del principal y de cada secundario", () => {
    expect(categoriasDeEjemplo({ rubro_publico: "polleria" })).toEqual(["Presas", "Combos", "Bebidas"]);
    expect(
      categoriasDeEjemplo({ rubro_publico: "polleria", rubros_secundarios: ["cafeteria", "polleria"] }),
    ).toEqual(["Presas", "Combos", "Cafés"]);
    expect(ayudaCategoria({ rubro_publico: "polleria" })).toContain("«Presas», «Combos» y «Bebidas»");
    expect(ejemploDeCategoria({ rubro_publico: "repuestos" })).toBe("Ej.: Frenos");
  });

  it("el ejemplo de cada tipo de campo", () => {
    const guia = guiaDeRubroPublico("restaurante");
    expect(ejemploDeTipo("texto", guia)).toBe("Acompañamiento: Arroz, papa y ensalada");
    expect(ejemploDeTipo("numero", guia)).toBe("Porción: 350 g");
    expect(ejemploDeTipo("opcion", guia)).toBe("Picante: Sin picante · Suave · Fuerte");
    expect(ejemploDeTipo("si_no", guia)).toBe("Vegetariano: sí");
    expect(ejemploDeTipo("numero", guiaDeRubroPublico("polleria"))).toBe("Cantidad de presas: 4");
  });

  it("el nombre de ejemplo sigue al tipo elegido; la unidad y las opciones, al rubro", () => {
    const guia = guiaDeRubroPublico("restaurante");
    expect(marcadoresDeCampo("texto", guia).nombre).toBe("Acompañamiento");
    expect(marcadoresDeCampo("numero", guia)).toEqual({
      nombre: "Porción",
      unidad: "g",
      opciones: "Sin picante\nSuave\nFuerte",
    });
    expect(marcadoresDeCampo("numero", guiaDeRubroPublico("polleria")).unidad).toBe("Ninguna");
  });

  it("el producto", () => {
    const textos = textosDeProducto(guiaDeRubroPublico("repuestos"));
    expect(textos.nombre).toBe("Ej.: Pastillas de freno delanteras Corolla 2010-2015");
    expect(textos.ayudaNombre).toContain("antes que «Pastillas»");
    expect(textos.ayudaDescripcion).toContain("para qué marca, modelo y años sirve");
  });

  it("el valor de un dato: la muestra si el campo se llama como el ejemplo", () => {
    const guia = guiaDeRubroPublico("restaurante");
    expect(marcadorDeValor({ nombre: "porcion ", tipo: "numero", unidad: "g" }, guia)).toBe("Ej.: 350");
    expect(marcadorDeValor({ nombre: "Acompañamiento", tipo: "texto", unidad: null }, guia)).toBe(
      "Ej.: Arroz, papa y ensalada",
    );
    expect(marcadorDeValor({ nombre: "Calorías", tipo: "numero", unidad: "kcal" }, guia)).toBe("Solo el número");
    expect(marcadorDeValor({ nombre: "Origen", tipo: "texto", unidad: null }, guia)).toBeUndefined();
  });
});
