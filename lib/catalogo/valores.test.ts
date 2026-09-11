import { describe, expect, it } from "vitest";

import type { Atributo } from "./atributos";
import { leerValores, lineaDeTarjeta, validarValores, valoresParaMostrar } from "./valores";

function definir(parcial: Partial<Atributo> & { clave: string; nombre: string }): Atributo {
  return {
    tipo: "texto",
    unidad: null,
    opciones: [],
    obligatorio: false,
    enTarjeta: false,
    enResumen: true,
    ...parcial,
  };
}

const potencia = definir({
  clave: "potencia",
  nombre: "Potencia",
  tipo: "numero",
  unidad: "W",
  enTarjeta: true,
});
const casquillo = definir({
  clave: "casquillo",
  nombre: "Casquillo",
  tipo: "opcion",
  opciones: ["E27", "E14", "GU10"],
  enTarjeta: true,
});
const regulable = definir({ clave: "regulable", nombre: "Regulable", tipo: "si_no" });
const material = definir({ clave: "material", nombre: "Material" });

const LUCES = [potencia, casquillo, regulable, material];

describe("validarValores", () => {
  it("acepta un producto completo", () => {
    const resultado = validarValores(LUCES, {
      potencia: 9,
      casquillo: "E27",
      regulable: true,
      material: "Aluminio",
    });
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) {
      expect(resultado.valores).toEqual({
        potencia: 9,
        casquillo: "E27",
        regulable: true,
        material: "Aluminio",
      });
    }
  });

  it("acepta un producto sin ningún valor cargado", () => {
    expect(validarValores(LUCES, {})).toEqual({ correcto: true, valores: {} });
    expect(validarValores(LUCES, null)).toEqual({ correcto: true, valores: {} });
  });

  /* Un campo vacío se omite en vez de guardarse como cadena vacía. Así las
     llaves del objeto dicen qué está cargado de verdad, que es lo que cuenta el
     aviso al borrar un campo y lo que decide si la ficha dibuja una fila. */
  it("omite los vacíos en vez de guardarlos", () => {
    const resultado = validarValores(LUCES, { potencia: "", material: "   ", casquillo: null });
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) expect(resultado.valores).toEqual({});
  });

  it("exige los obligatorios y solo esos", () => {
    const conObligatorio = [definir({ clave: "medida", nombre: "Medida", obligatorio: true })];
    const resultado = validarValores(conObligatorio, {});
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["atributos.medida"]).toContain("Medida");
  });

  it("rechaza un valor que no está entre las opciones", () => {
    const resultado = validarValores(LUCES, { casquillo: "E40" });
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) {
      /* El mensaje enumera las opciones: sin ellas, quien importa una planilla
         con «e27» en minúscula lee «no es válida» y no sabe que el problema es
         la mayúscula. */
      expect(resultado.errores["atributos.casquillo"]).toContain("E27");
    }
  });

  it("rechaza un texto donde va un número", () => {
    const resultado = validarValores(LUCES, { potencia: "mucha" });
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) expect(resultado.errores["atributos.potencia"]).toBeTruthy();
  });

  it("rechaza un número negativo", () => {
    expect(validarValores(LUCES, { potencia: -5 }).correcto).toBe(false);
  });

  /* Un formulario HTML y una planilla de Excel mandan texto. Exigir el booleano
     obligaría a convertir en los cuatro lugares que llaman a esto. */
  it("acepta el sí y el no como texto, además de booleano", () => {
    const resultado = validarValores(LUCES, { regulable: "true" });
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) expect(resultado.valores.regulable).toBe(true);
    expect(validarValores(LUCES, { regulable: "false" }).correcto).toBe(true);
  });

  it("rechaza cualquier otra cosa en un sí o no", () => {
    expect(validarValores(LUCES, { regulable: "quizás" }).correcto).toBe(false);
    expect(validarValores(LUCES, { regulable: 1 }).correcto).toBe(false);
  });

  it("acepta un número que llega como texto, que es como lo manda el formulario", () => {
    const resultado = validarValores(LUCES, { potencia: " 9 " });
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) expect(resultado.valores.potencia).toBe(9);
  });

  it("rechaza un texto larguísimo", () => {
    expect(validarValores(LUCES, { material: "a".repeat(200) }).correcto).toBe(false);
  });

  /* El caso del producto que cambia de categoría: sus valores viejos no
     corresponden a ningún campo del destino. Se descartan en vez de rechazar,
     porque rechazar dejaría al dueño sin poder guardar un producto que él ve
     bien. */
  it("descarta las llaves que no corresponden a ningún campo", () => {
    const resultado = validarValores(LUCES, { potencia: 9, talla: "M", color: "Rojo" });
    expect(resultado.correcto).toBe(true);
    if (resultado.correcto) expect(resultado.valores).toEqual({ potencia: 9 });
  });

  it("no rompe con lo que no es un objeto", () => {
    expect(validarValores(LUCES, "nueve vatios")).toEqual({ correcto: true, valores: {} });
    expect(validarValores(LUCES, [1, 2])).toEqual({ correcto: true, valores: {} });
  });
});

describe("leerValores", () => {
  /* Lo contrario del validador: acá no hay a quién avisarle. Un casquillo mal
     escrito no puede borrar la potencia de la pantalla. */
  it("rescata lo bueno cuando algo está mal", () => {
    expect(leerValores(LUCES, { potencia: 9, casquillo: "E40" })).toEqual({ potencia: 9 });
  });

  it("no esconde lo cargado por un campo que se volvió obligatorio después", () => {
    const conObligatorio = LUCES.map((atributo) => ({ ...atributo, obligatorio: true }));
    expect(leerValores(conObligatorio, { potencia: 9 })).toEqual({ potencia: 9 });
  });

  it("devuelve vacío con lo que no se puede leer", () => {
    expect(leerValores(LUCES, undefined)).toEqual({});
  });
});

describe("valoresParaMostrar", () => {
  const cargado = { potencia: 9, casquillo: "E27", regulable: false, material: "Aluminio" };

  it("en la ficha muestra todos, en el orden de la categoría", () => {
    expect(valoresParaMostrar(LUCES, cargado, "ficha").map(({ texto }) => texto)).toEqual([
      "9 W",
      "E27",
      "No",
      "Aluminio",
    ]);
  });

  it("en la tarjeta solo los marcados", () => {
    expect(valoresParaMostrar(LUCES, cargado, "tarjeta").map(({ texto }) => texto)).toEqual([
      "9 W",
      "E27",
    ]);
  });

  /* En la tarjeta un «no» ocupa el lugar de un dato útil para informar una
     ausencia. En la ficha sí se muestra, porque ahí es una respuesta. */
  it("en la tarjeta esconde los «no», en la ficha no", () => {
    const enTarjeta = [{ ...regulable, enTarjeta: true }];
    expect(valoresParaMostrar(enTarjeta, { regulable: false }, "tarjeta")).toHaveLength(0);
    expect(valoresParaMostrar(enTarjeta, { regulable: true }, "tarjeta")).toHaveLength(1);
    expect(valoresParaMostrar(enTarjeta, { regulable: false }, "ficha")).toHaveLength(1);
  });

  it("en el resumen respeta lo que el dueño marcó", () => {
    const mezcla = [potencia, { ...casquillo, enResumen: false }];
    expect(valoresParaMostrar(mezcla, cargado, "resumen").map(({ clave }) => clave)).toEqual([
      "potencia",
    ]);
  });

  it("salta los que no tienen valor cargado", () => {
    expect(valoresParaMostrar(LUCES, { potencia: 9 }, "ficha")).toHaveLength(1);
  });
});

describe("lineaDeTarjeta", () => {
  it("junta los valores con puntos medios", () => {
    expect(lineaDeTarjeta(LUCES, { potencia: 9, casquillo: "E27" })).toBe("9 W · E27");
  });

  /* Nulo y no cadena vacía: quien dibuja pregunta si hay línea, y una cadena
     vacía dejaría un renglón en blanco dentro de la tarjeta. */
  it("devuelve nulo cuando no hay nada que mostrar", () => {
    expect(lineaDeTarjeta(LUCES, {})).toBeNull();
    expect(lineaDeTarjeta([], { potencia: 9 })).toBeNull();
  });
});
