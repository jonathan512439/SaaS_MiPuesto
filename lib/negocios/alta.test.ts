import { describe, expect, it } from "vitest";

import {
  PASOS_ALTA,
  esIdPasoAlta,
  estadoDeAlta,
  faltantesParaPublicar,
  type SituacionDelNegocio,
} from "./alta";

/* Un negocio recién registrado: tiene nombre y dirección porque eso se pide al
   crear la cuenta, y nada más. */
const RECIEN_LLEGADO: SituacionDelNegocio = {
  nombreAdmin: null,
  nombre: "Ferretería El Sol",
  slug: "ferreteria-el-sol",
  rubro: null,
  apareceEnDirectorio: null,
  telefonoWhatsapp: null,
  logoUrl: null,
  productos: 0,
  categorias: 0,
  altaPaso: 1,
  altaCompletadaEn: null,
};

const LISTO: SituacionDelNegocio = {
  nombreAdmin: "Jonathan",
  nombre: "Ferretería El Sol",
  slug: "ferreteria-el-sol",
  rubro: "ferreteria",
  apareceEnDirectorio: true,
  telefonoWhatsapp: "59170000000",
  logoUrl: "negocio/logo/sol.webp",
  productos: 12,
  categorias: 3,
  altaPaso: 4,
  altaCompletadaEn: "2026-09-15T12:00:00Z",
};

describe("en qué paso del alta está", () => {
  it("el recién llegado arranca por decir quién es", () => {
    expect(estadoDeAlta(RECIEN_LLEGADO).paso.id).toBe("quien-sos");
    expect(estadoDeAlta(RECIEN_LLEGADO).cumplidos).toBe(0);
  });

  it("con su nombre puesto, pasa a elegir el rubro", () => {
    const estado = estadoDeAlta({ ...RECIEN_LLEGADO, nombreAdmin: "Jonathan" });
    expect(estado.paso.id).toBe("que-vendes");
    expect(estado.cumplidos).toBe(1);
  });

  /* Es la razón de que `alta_paso` exista como columna. El paso 3 son logo,
     subnombre y paleta: todos opcionales. Sin recordar el paso, quien lo
     abandona ahí no deja rastro y el sistema lo mandaría al 4, que es lo
     contrario de lo que el plan pide. */
  it("vuelve al paso 3 aunque no haya cargado nada suyo ahí", () => {
    const estado = estadoDeAlta({
      ...RECIEN_LLEGADO,
      nombreAdmin: "Jonathan",
      rubro: "ferreteria",
      apareceEnDirectorio: false,
      altaPaso: 3,
    });
    expect(estado.paso.id).toBe("tu-marca");
  });

  /* El paso 2 pregunta dos cosas —qué vende y si quiere que lo encuentren— y
     no queda cumplido con una sola. Sin esto, un negocio que eligió el rubro
     antes de la fase 11 saltaría la pregunta del buscador para siempre. */
  it("con el rubro pero sin responder lo del buscador, sigue en el paso 2", () => {
    const estado = estadoDeAlta({
      ...RECIEN_LLEGADO,
      nombreAdmin: "Jonathan",
      rubro: "ferreteria",
      apareceEnDirectorio: null,
      altaPaso: 3,
    });
    expect(estado.paso.id).toBe("que-vendes");
  });

  it("con la marca hecha, pasa a cargar productos", () => {
    const estado = estadoDeAlta({
      ...RECIEN_LLEGADO,
      nombreAdmin: "Jonathan",
      rubro: "ferreteria",
      apareceEnDirectorio: true,
      altaPaso: 4,
    });
    expect(estado.paso.id).toBe("tus-productos");
    expect(estado.cumplidos).toBe(3);
  });

  /* Terminar es una acción del dueño —el botón del último paso—, no algo que
     pase solo porque guardó un producto. Si se diera por terminada sola, el
     dueño perdería el paso donde se le explica qué sigue. */
  it("con todo cumplido pero sin cerrar, sigue sin estar completada", () => {
    const casiListo = { ...LISTO, altaCompletadaEn: null };
    const estado = estadoDeAlta(casiListo);
    expect(estado.cumplidos).toBe(4);
    expect(estado.completada).toBe(false);
    expect(estado.paso.id).toBe("tus-productos");
  });

  it("completada cuando tiene su fecha", () => {
    expect(estadoDeAlta(LISTO).completada).toBe(true);
  });

  /* Un nombre en blancos no es un nombre. Sin esto, un espacio dejaba pasar el
     paso 1 y el sistema saludaba a nadie. */
  it("no da por puesto un nombre que son espacios", () => {
    expect(estadoDeAlta({ ...RECIEN_LLEGADO, nombreAdmin: "   " }).paso.id).toBe("quien-sos");
  });
});

describe("lo que falta para publicar", () => {
  it("el recién llegado tiene todo por hacer", () => {
    const claves = faltantesParaPublicar(RECIEN_LLEGADO).map(({ clave }) => clave);
    expect(claves).toEqual(["telefono", "rubro", "categorias", "productos", "directorio", "logo"]);
  });

  it("el que está listo no tiene nada pendiente", () => {
    expect(faltantesParaPublicar(LISTO)).toEqual([]);
  });

  /* Un catálogo sin teléfono no recibe un solo pedido; uno sin logo, sí. La
     diferencia decide si la pantalla de inicio lo muestra como un freno o como
     una sugerencia, así que no puede quedar librada al orden de la lista. */
  it("distingue lo que impide publicar de lo que solo lo mejora", () => {
    const faltantes = faltantesParaPublicar(RECIEN_LLEGADO);
    const impiden = faltantes.filter(({ impide }) => impide).map(({ clave }) => clave);
    const sugerencias = faltantes.filter(({ impide }) => !impide).map(({ clave }) => clave);

    expect(impiden).toEqual(["telefono", "rubro", "categorias", "productos"]);
    /* Aparecer en el buscador es una decisión, no un requisito: el catálogo
       funciona igual. Se recuerda, pero no frena. */
    expect(sugerencias).toEqual(["directorio", "logo"]);
  });

  /* Es lo que separa una tarea de una queja: cada faltante sabe a dónde ir. */
  it("cada faltante lleva a una pantalla del panel", () => {
    for (const faltante of faltantesParaPublicar(RECIEN_LLEGADO)) {
      expect(faltante.ruta, `«${faltante.clave}» no lleva a ninguna parte`).toMatch(
        /^\/dashboard\//,
      );
    }
  });

  /* La lista vive para siempre en la pantalla de inicio, no solo durante el
     alta: quien termina y después borra su teléfono tiene que volver a verlo. */
  it("sigue avisando aunque el alta ya haya terminado", () => {
    const sinTelefono = { ...LISTO, telefonoWhatsapp: null };
    expect(estadoDeAlta(sinTelefono).completada).toBe(true);
    expect(faltantesParaPublicar(sinTelefono).map(({ clave }) => clave)).toEqual(["telefono"]);
  });
});

describe("los pasos, como registro", () => {
  it("están numerados de 1 a 4, sin saltos ni repetidos", () => {
    expect(PASOS_ALTA.map(({ numero }) => numero)).toEqual([1, 2, 3, 4]);
    expect(new Set(PASOS_ALTA.map(({ id }) => id)).size).toBe(PASOS_ALTA.length);
  });

  /* El número de paso viaja a la base, donde hay un `check (between 1 and 4)`.
     Si acá se agregara un quinto, la base lo rechazaría al guardarlo y el dueño
     vería un error que no puede entender. */
  it("no son más de los que la base admite", () => {
    expect(PASOS_ALTA).toHaveLength(4);
  });

  it("reconoce un identificador de paso y rechaza cualquier otro", () => {
    expect(esIdPasoAlta("tu-marca")).toBe(true);
    expect(esIdPasoAlta("inventado")).toBe(false);
    expect(esIdPasoAlta(3)).toBe(false);
    expect(esIdPasoAlta(null)).toBe(false);
  });
});
