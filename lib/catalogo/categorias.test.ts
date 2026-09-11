import { describe, expect, it } from "vitest";

import { GRUPOS_ICONOS, TRAZOS_CATALOGO } from "../../components/iconos/catalogo";
import {
  ICONO_PREDETERMINADO,
  buscarIconos,
  esFormaDeVender,
  esIconoCatalogo,
  grupoSugeridoPara,
  normalizarFormaDeVender,
  normalizarIcono,
  validarIdentidadCategoria,
} from "./categorias";

describe("el juego de íconos", () => {
  it("trae el predeterminado, que es del que dependen todas las caídas", () => {
    expect(esIconoCatalogo(ICONO_PREDETERMINADO)).toBe(true);
  });

  /* Los grupos son lo que se dibuja en el selector. Si uno nombrara un ícono que
     no existe, el selector mostraría un hueco y no habría forma de elegirlo. */
  it("todos los íconos de los grupos existen", () => {
    for (const grupo of GRUPOS_ICONOS) {
      for (const nombre of grupo.iconos) {
        expect(TRAZOS_CATALOGO[nombre], `${grupo.id}/${nombre}`).toBeTruthy();
      }
    }
  });

  it("todos los íconos están en algún grupo", () => {
    const enGrupos = new Set(GRUPOS_ICONOS.flatMap((grupo) => [...grupo.iconos]));
    for (const nombre of Object.keys(TRAZOS_CATALOGO)) {
      expect(enGrupos.has(nombre as never), nombre).toBe(true);
    }
  });

  /* El mismo formato que exige `categorias_icono_formato` en la base. Sin esta
     prueba, un nombre con mayúscula o con guion bajo pasaría el selector y la
     base lo rechazaría recién al guardar. */
  it("todos los nombres cumplen el formato que exige la base", () => {
    for (const nombre of Object.keys(TRAZOS_CATALOGO)) {
      expect(nombre, nombre).toMatch(/^[a-z][a-z0-9-]{1,39}$/);
    }
  });

  it("ningún trazo trae un color propio ni su propia etiqueta svg", () => {
    for (const [nombre, trazo] of Object.entries(TRAZOS_CATALOGO)) {
      expect(trazo, nombre).not.toContain("<svg");
      const colores = [...trazo.matchAll(/(?:fill|stroke)="([^"]*)"/g)].map(([, valor]) => valor);
      for (const color of colores) {
        expect(["none", "currentColor"], `${nombre}: ${color}`).toContain(color);
      }
    }
  });
});

describe("normalizarIcono", () => {
  it("deja pasar uno del juego", () => {
    expect(normalizarIcono("martillo")).toBe("martillo");
  });

  /* Lo que se guardó alguna vez puede haberse quitado del juego. Cae al
     predeterminado en vez de romper: una categoría sin dibujo es peor que una
     con el dibujo genérico. */
  it("cae al predeterminado con lo que no existe", () => {
    expect(normalizarIcono("martillo-neumatico-gigante")).toBe(ICONO_PREDETERMINADO);
    expect(normalizarIcono("")).toBe(ICONO_PREDETERMINADO);
    expect(normalizarIcono(null)).toBe(ICONO_PREDETERMINADO);
    expect(normalizarIcono(42)).toBe(ICONO_PREDETERMINADO);
  });

  /* Es lo que impide que algo escrito en la columna llegue al dibujo. El
     componente pinta con `dangerouslySetInnerHTML`, así que esta caída es la
     barrera, no un detalle de presentación. */
  it("cae al predeterminado con algo que parece HTML", () => {
    expect(normalizarIcono("<script>alert(1)</script>")).toBe(ICONO_PREDETERMINADO);
  });

  /* `Object.hasOwn` y no `in`: con `in`, «constructor» y «toString» darían
     verdadero por venir del prototipo, y el componente intentaría dibujar una
     función. */
  it("no confunde lo heredado del prototipo con un ícono", () => {
    expect(esIconoCatalogo("constructor")).toBe(false);
    expect(esIconoCatalogo("toString")).toBe(false);
    expect(normalizarIcono("constructor")).toBe(ICONO_PREDETERMINADO);
  });
});

describe("formas de vender", () => {
  it("reconoce las dos", () => {
    expect(esFormaDeVender("cosas")).toBe(true);
    expect(esFormaDeVender("tiempo")).toBe(true);
  });

  it("rechaza cualquier otra", () => {
    expect(esFormaDeVender("servicios")).toBe(false);
    expect(esFormaDeVender(null)).toBe(false);
  });

  it("normaliza a cosas, que es lo que vende la mayoría", () => {
    expect(normalizarFormaDeVender("inventado")).toBe("cosas");
    expect(normalizarFormaDeVender("tiempo")).toBe("tiempo");
  });
});

describe("validarIdentidadCategoria", () => {
  /* Se valida por campo presente: la API manda solo lo que el dueño cambió, y
     exigir los tres obligaría a reenviar el ícono cada vez que se apaga una
     esfera. */
  it("acepta que falten los campos que no se están cambiando", () => {
    expect(validarIdentidadCategoria({})).toEqual({ correcto: true });
    expect(validarIdentidadCategoria({ visible: false })).toEqual({ correcto: true });
  });

  it("acepta los tres bien formados", () => {
    expect(
      validarIdentidadCategoria({ icono: "foco", visible: true, vende: "cosas" }),
    ).toEqual({ correcto: true });
  });

  it("dice cuál campo está mal", () => {
    const resultado = validarIdentidadCategoria({ icono: "no-existe", vende: "otra" });
    expect(resultado.correcto).toBe(false);
    if (!resultado.correcto) {
      expect(resultado.errores.icono).toBeTruthy();
      expect(resultado.errores.vende).toBeTruthy();
      expect(resultado.errores.visible).toBeUndefined();
    }
  });

  /* Un «false» de cadena llega desde un formulario mal armado y no es un
     booleano. Aceptarlo guardaría `true`, que es lo contrario de lo pedido. */
  it("no acepta visible como texto", () => {
    const resultado = validarIdentidadCategoria({ visible: "false" });
    expect(resultado.correcto).toBe(false);
  });
});

describe("buscarIconos", () => {
  it("sin término devuelve los grupos completos", () => {
    expect(buscarIconos("")).toEqual(GRUPOS_ICONOS);
    expect(buscarIconos("   ")).toEqual(GRUPOS_ICONOS);
  });

  function nombresDe(termino: string) {
    return buscarIconos(termino).flatMap((grupo) => [...grupo.iconos]);
  }

  it("encuentra por el nombre", () => {
    expect(nombresDe("martillo")).toContain("martillo");
  });

  /* El punto de tener términos aparte del nombre: el dueño no tiene por qué
     saber que nosotros le decimos «foco». */
  it("encuentra por un sinónimo que no es el nombre", () => {
    expect(nombresDe("bombilla")).toContain("foco");
    expect(nombresDe("zapato")).toContain("calzado");
    expect(nombresDe("vacuna")).toContain("jeringa");
  });

  it("encuentra sin tilde lo que se escribe con tilde", () => {
    expect(nombresDe("lampara")).toContain("lampara");
    expect(nombresDe("camion")).toContain("camion");
    expect(nombresDe("CAMIÓN")).toContain("camion");
  });

  /* Varias palabras achican en vez de ampliar: quien escribe «luz led» busca lo
     que cumple las dos, no la suma de las dos. */
  it("con varias palabras exige todas", () => {
    expect(nombresDe("luz led")).toContain("foco");
    expect(nombresDe("luz elefante")).toHaveLength(0);
  });

  it("devuelve un solo grupo al buscar, para no partir los resultados", () => {
    const grupos = buscarIconos("perro");
    expect(grupos).toHaveLength(1);
    expect(grupos[0].id).toBe("resultados");
  });

  it("no rompe con lo que no encuentra nada", () => {
    expect(buscarIconos("xyzzy")).toEqual([]);
  });
});

describe("grupoSugeridoPara", () => {
  it("ofrece el grupo del oficio", () => {
    expect(grupoSugeridoPara("ferreteria")).toBe("ferreteria");
    expect(grupoSugeridoPara("restaurante")).toBe("comida");
  });

  /* Sin rubro elegido —o con uno que no tiene grupo propio— se ofrece el
     general, que es el único que le sirve a cualquiera. */
  it("cae a general con lo que no conoce", () => {
    expect(grupoSugeridoPara(null)).toBe("general");
    expect(grupoSugeridoPara("otro")).toBe("general");
  });

  it("el grupo sugerido de cada rubro existe de verdad", () => {
    const ids = new Set(GRUPOS_ICONOS.map((grupo) => grupo.id));
    for (const rubro of ["restaurante", "ferreteria", "ropa_y_calzado", "otro", null]) {
      expect(ids.has(grupoSugeridoPara(rubro)), String(rubro)).toBe(true);
    }
  });
});
