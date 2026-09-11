import { describe, expect, it } from "vitest";

import { PALETAS, PLANTILLAS } from "../apariencia";
import {
  categoriasParaNavegar,
  construirCatalogoPublico,
  obtenerTextoHorario,
} from "./publico";

const NEGOCIO = {
  nombre: "Mercado Uno",
  descripcion: null,
  telefono_whatsapp: "59170000000",
  tipo_negocio: "catalogo_estatico",
  horario: {},
  plantilla_id: "desconocida",
  paleta_id: "desconocida",
};

describe("construirCatalogoPublico", () => {
  it("excluye productos ocultos y agrupa los que no tienen categoría", () => {
    const resultado = construirCatalogoPublico(
      NEGOCIO,
      [{ id: "cat-1", nombre: "Comida", orden: 1 }],
      [],
      [
        { id: "p-1", categoria_id: "cat-1", subcategoria_id: null, nombre: "Visible", descripcion: null, precio: 20, fotos: [], estado: "disponible", visible: true, orden: 2 },
        { id: "p-2", categoria_id: "cat-1", subcategoria_id: null, nombre: "Oculto", descripcion: null, precio: 10, fotos: [], estado: "disponible", visible: false, orden: 1 },
        { id: "p-3", categoria_id: null, subcategoria_id: null, nombre: "Otro", descripcion: null, precio: 5, fotos: [], estado: "agotado", visible: true, orden: 3 },
      ],
      "https://proyecto.supabase.co",
    );

    expect(resultado.plantilla).toBe("clasica");
    expect(resultado.paleta).toBe("mercado");
    expect(resultado.datos.categorias.map(({ nombre }) => nombre)).toEqual(["Comida", "Otros"]);
    expect(resultado.datos.categorias.flatMap(({ productos }) => productos)).toHaveLength(2);
  });

  it("usa la primera fotografía y respeta una apariencia válida", () => {
    const resultado = construirCatalogoPublico(
      { ...NEGOCIO, plantilla_id: "moderna", paleta_id: "oceano" },
      [{ id: "cat-1", nombre: "Comida", orden: 1 }],
      [],
      [{ id: "p-1", categoria_id: "cat-1", subcategoria_id: null, nombre: "Producto", descripcion: "Detalle", precio: 20, fotos: ["n/p/foto.webp", "n/p/dos.webp"], estado: "disponible", visible: true, orden: 1 }],
      "https://proyecto.supabase.co",
    );

    expect(resultado.plantilla).toBe("moderna");
    expect(resultado.paleta).toBe("oceano");
    expect(resultado.datos.categorias[0].productos[0].imagen?.src).toContain("foto.webp");
  });

  it("aplica una promoción vigente y conserva el precio original", () => {
    const resultado = construirCatalogoPublico(
      NEGOCIO,
      [{ id: "cat-1", nombre: "Comida", orden: 1 }],
      [],
      [{ id: "p-1", categoria_id: "cat-1", subcategoria_id: null, nombre: "Producto", descripcion: null, precio: 80, fotos: [], estado: "disponible", visible: true, orden: 1 }],
      "https://proyecto.supabase.co",
      new Date("2026-09-03T12:00:00.000Z"),
      [{ id: "promo-1", activo: true, categoria_id: "cat-1", producto_id: null, tipo: "porcentaje", valor: 25, fecha_inicio: null, fecha_fin: "2026-09-03T13:00:00.000Z" }],
    );

    expect(resultado.datos.categorias[0].productos[0]).toMatchObject({
      precio: 60,
      precioOriginal: 80,
      tienePromocion: true,
    });
  });

  it("deja de aplicar una promoción al llegar su vencimiento", () => {
    const resultado = construirCatalogoPublico(
      NEGOCIO,
      [{ id: "cat-1", nombre: "Comida", orden: 1 }],
      [],
      [{ id: "p-1", categoria_id: "cat-1", subcategoria_id: null, nombre: "Producto", descripcion: null, precio: 80, fotos: [], estado: "disponible", visible: true, orden: 1 }],
      "https://proyecto.supabase.co",
      new Date("2026-09-03T13:00:00.000Z"),
      [{ id: "promo-1", activo: true, categoria_id: "cat-1", producto_id: null, tipo: "porcentaje", valor: 25, fecha_inicio: null, fecha_fin: "2026-09-03T13:00:00.000Z" }],
    );

    expect(resultado.datos.categorias[0].productos[0]).toMatchObject({
      precio: 80,
      precioOriginal: 80,
      tienePromocion: false,
    });
  });

  it("expone solamente las unidades no reservadas", () => {
    const resultado = construirCatalogoPublico(
      { ...NEGOCIO, slug: "mercado-uno", tipo_negocio: "tienda_virtual" },
      [{ id: "cat-1", nombre: "Comida", orden: 1 }],
      [],
      [{
        id: "p-1",
        codigo: "PRD-STOCK1",
        categoria_id: "cat-1",
        subcategoria_id: null,
        nombre: "Producto",
        descripcion: null,
        precio: 20,
        fotos: [],
        estado: "disponible",
        controla_stock: true,
        cantidad_stock: 8,
        cantidad_reservada: 3,
        visible: true,
        orden: 1,
      }],
      "https://proyecto.supabase.co",
    );

    expect(resultado.datos.negocio.slug).toBe("mercado-uno");
    expect(resultado.datos.categorias[0].productos[0]).toMatchObject({
      codigo: "PRD-STOCK1",
      controlaStock: true,
      cantidadDisponible: 5,
      maximoCantidad: 5,
    });
  });

  it("agrupa los productos dentro de sus subcategorías", () => {
    const resultado = construirCatalogoPublico(
      NEGOCIO,
      [{ id: "cat-1", nombre: "Bebidas", orden: 1 }],
      [{ id: "sub-1", categoria_id: "cat-1", nombre: "Frías", orden: 1 }],
      [{ id: "p-1", categoria_id: "cat-1", subcategoria_id: "sub-1", nombre: "Limonada", descripcion: null, precio: 12, fotos: [], estado: "disponible", visible: true, orden: 1 }],
      "https://proyecto.supabase.co",
    );

    expect(resultado.datos.categorias[0].productos).toHaveLength(0);
    expect(resultado.datos.categorias[0].subcategorias?.[0].nombre).toBe("Frías");
    expect(resultado.datos.categorias[0].subcategorias?.[0].productos[0].nombre).toBe("Limonada");
  });
});

describe("obtenerTextoHorario", () => {
  it("reconoce la opción siempre abierto", () => {
    expect(obtenerTextoHorario({ siempre_abierto: true })).toBe("Siempre abierto");
  });
});

describe("modalidad y horario del catálogo público", () => {
  const PRODUCTO = {
    id: "p-1",
    categoria_id: "cat-1",
    subcategoria_id: null,
    nombre: "Producto",
    descripcion: null,
    precio: 20,
    fotos: [],
    estado: "disponible",
    visible: true,
    orden: 1,
  };

  it.each([
    ["catalogo_estatico", "solo_lectura"],
    ["catalogo_cta", "accion_individual"],
    ["tienda_virtual", "carrito"],
  ] as const)("expone %s como %s", (tipo, accion) => {
    const resultado = construirCatalogoPublico(
      { ...NEGOCIO, tipo_negocio: tipo },
      [{ id: "cat-1", nombre: "Categoría", orden: 1 }],
      [],
      [PRODUCTO],
      "https://proyecto.supabase.co",
    );

    expect(resultado.datos.negocio.modalidad).toBe(accion);
    expect(Boolean(resultado.datos.categorias[0].productos[0].accionWhatsapp)).toBe(
      tipo === "catalogo_cta",
    );
  });

  it("bloquea acciones cuando el horario programado está cerrado", () => {
    const resultado = construirCatalogoPublico(
      {
        ...NEGOCIO,
        tipo_negocio: "catalogo_cta",
        horario: {
          modo: "programado",
          dias: { lunes: [{ abre: "09:00", cierra: "10:00" }] },
        },
      },
      [{ id: "cat-1", nombre: "Categoría", orden: 1 }],
      [],
      [PRODUCTO],
      "https://proyecto.supabase.co",
      new Date("2026-09-07T15:00:00Z"),
    );

    expect(resultado.datos.negocio.atencion).toMatchObject({
      abierto: false,
      permiteAcciones: false,
      horarioBreve: "Hoy: 09:00–10:00.",
    });
    expect(resultado.datos.negocio.atencion.texto).toBe("Cerrado · Abre el lunes a las 09:00");
    expect(resultado.datos.negocio.atencion.aviso).toContain("seguir navegando");
  });
});

describe("apariencia publicada", () => {
  /* Regresión: la resolución estaba escrita a mano con tres plantillas y cuatro
     paletas, así que un negocio que elegía Feria recibía Clásica en silencio. */
  it("respeta cada plantilla y cada paleta del registro", () => {
    for (const plantilla of PLANTILLAS) {
      for (const paleta of PALETAS) {
        const catalogo = construirCatalogoPublico(
          { ...NEGOCIO, plantilla_id: plantilla, paleta_id: paleta },
          [],
          [],
          [],
          "https://ejemplo.supabase.co",
          new Date("2026-09-07T12:00:00-04:00"),
          [],
        );
        expect(catalogo.plantilla).toBe(plantilla);
        expect(catalogo.paleta).toBe(paleta);
      }
    }
  });

  it("cae en la plantilla y la paleta base si el valor no existe", () => {
    const catalogo = construirCatalogoPublico(
      { ...NEGOCIO, plantilla_id: "inventada", paleta_id: "inventada" },
      [],
      [],
      [],
      "https://ejemplo.supabase.co",
      new Date("2026-09-07T12:00:00-04:00"),
      [],
    );
    expect(catalogo.plantilla).toBe("clasica");
    expect(catalogo.paleta).toBe("mercado");
  });
});

describe("carta del día", () => {
  const negocio = {
    nombre: "Almuerzos Doña Rosa",
    descripcion: null,
    telefono_whatsapp: "59170000000",
    tipo_negocio: "tienda_virtual",
    horario: { modo: "siempre_abierto", dias: {} },
    plantilla_id: "clasica",
    paleta_id: "mercado",
  };
  const categorias = [{ id: "cat-1", nombre: "Platos", orden: 1 }];
  const base = {
    categoria_id: "cat-1",
    subcategoria_id: null,
    descripcion: null,
    precio: 30,
    fotos: [] as string[],
    estado: "disponible",
    visible: true,
  };
  const HOY_EN_BOLIVIA = new Date("2026-03-10T15:00:00.000Z");

  function construir(enCartaHasta: string | null) {
    return construirCatalogoPublico(
      negocio,
      categorias,
      [],
      [
        { ...base, id: "p-1", nombre: "Silpancho", orden: 1, en_carta_hasta: enCartaHasta },
        { ...base, id: "p-2", nombre: "Milanesa", orden: 2, en_carta_hasta: null },
      ],
      "https://ejemplo.supabase.co",
      HOY_EN_BOLIVIA,
    );
  }

  it("pone lo de hoy delante de todo", () => {
    const { datos } = construir("2026-03-10");
    expect(datos.categorias[0].nombre).toBe("Hoy");
    expect(datos.categorias[0].productos.map(({ nombre }) => nombre)).toEqual(["Silpancho"]);
  });

  /* Repetir el plato del día más abajo alarga el catálogo en vez de acortarlo,
     que es lo contrario de para qué existe la carta del día. */
  it("no repite el plato en su categoría", () => {
    const { datos } = construir("2026-03-10");
    const platos = datos.categorias.find(({ nombre }) => nombre === "Platos");
    expect(platos?.productos.map(({ nombre }) => nombre)).toEqual(["Milanesa"]);
  });

  it("no arma la sección cuando la marca venció", () => {
    const { datos } = construir("2026-03-09");
    expect(datos.categorias.map(({ nombre }) => nombre)).toEqual(["Platos"]);
    const platos = datos.categorias[0];
    expect(platos.productos.map(({ nombre }) => nombre)).toEqual(["Silpancho", "Milanesa"]);
  });
});

describe("categoriasParaNavegar", () => {
  const comida = { id: "cat-1", nombre: "Comida", orden: 1, icono: "cubiertos", visible: true };
  const bebidas = { id: "cat-2", nombre: "Bebidas", orden: 2, icono: "vaso", visible: false };

  it("deja fuera las apagadas y conserva el orden de las demás", () => {
    expect(categoriasParaNavegar([comida, bebidas])).toEqual([
      { id: "cat-1", nombre: "Comida", icono: "cubiertos" },
    ]);
  });

  /* La regla que define qué significa apagar una esfera: saca el acceso rápido
     de arriba, **no** la mercadería. Si esta prueba falla, un negocio va a
     esconder productos sin querer. */
  it("apagar una categoría no toca sus productos", () => {
    const resultado = construirCatalogoPublico(
      NEGOCIO,
      [comida, bebidas],
      [],
      [
        {
          id: "p-1",
          categoria_id: "cat-2",
          subcategoria_id: null,
          nombre: "Limonada",
          descripcion: null,
          precio: 10,
          fotos: [],
          estado: "disponible",
          controla_stock: false,
          visible: true,
          orden: 1,
        },
      ],
      "https://proyecto.supabase.co",
    );
    const bebidasEnCatalogo = resultado.datos.categorias.find(({ id }) => id === "cat-2");
    expect(bebidasEnCatalogo?.productos).toHaveLength(1);
    expect(categoriasParaNavegar([comida, bebidas]).map(({ id }) => id)).not.toContain("cat-2");
  });

  /* Las consultas viejas no piden las columnas nuevas. Sin este valor por
     omisión, un despliegue a medias dejaría el catálogo sin ninguna esfera. */
  it("sin las columnas nuevas, la categoría se muestra igual", () => {
    expect(categoriasParaNavegar([{ id: "cat-1", nombre: "Comida", orden: 1 }])).toEqual([
      { id: "cat-1", nombre: "Comida", icono: "caja" },
    ]);
  });

  /* El ícono se resuelve acá y no en la plantilla: es lo que permite que la
     plantilla lo dibuje sin comprobarlo, y lo que impide que algo escrito en esa
     columna llegue al `dangerouslySetInnerHTML`. */
  it("un ícono que ya no existe cae al predeterminado", () => {
    const resultado = categoriasParaNavegar([
      { id: "cat-1", nombre: "Comida", orden: 1, icono: "<script>", visible: true },
    ]);
    expect(resultado[0].icono).toBe("caja");
  });
});

describe("los datos propios del producto en el catálogo público", () => {
  const definiciones = [
    {
      categoria_id: "cat-1",
      clave: "potencia",
      nombre: "Potencia",
      tipo: "numero",
      unidad: "W",
      opciones: [],
      en_tarjeta: true,
      en_resumen: true,
      orden: 0,
    },
    {
      categoria_id: "cat-1",
      clave: "material",
      nombre: "Material",
      tipo: "texto",
      unidad: null,
      opciones: [],
      en_tarjeta: false,
      en_resumen: false,
      orden: 1,
    },
  ];

  function construir(atributos: unknown) {
    return construirCatalogoPublico(
      NEGOCIO,
      [{ id: "cat-1", nombre: "Luces", orden: 1, icono: "foco", visible: true }],
      [],
      [
        {
          id: "p-1",
          categoria_id: "cat-1",
          subcategoria_id: null,
          nombre: "Foco LED",
          descripcion: null,
          precio: 45,
          fotos: [],
          estado: "disponible",
          controla_stock: false,
          visible: true,
          orden: 1,
          atributos,
        },
      ],
      "https://proyecto.supabase.co",
      new Date(),
      [],
      definiciones,
    ).datos.categorias[0].productos[0];
  }

  it("la tarjeta lleva solo los marcados, con su unidad", () => {
    expect(construir({ potencia: 9, material: "Aluminio" }).lineaAtributos).toBe("9 W");
  });

  /* La ficha lleva todos, con su nombre: es adonde se viene a mirar el detalle,
     y «Aluminio» sin decir «Material» no le sirve a quien no conoce el rubro. */
  it("la ficha lleva todos, con su nombre", () => {
    expect(construir({ potencia: 9, material: "Aluminio" }).especificaciones).toEqual([
      { clave: "potencia", nombre: "Potencia", texto: "9 W" },
      { clave: "material", nombre: "Material", texto: "Aluminio" },
    ]);
  });

  it("un producto sin valores no arrastra nada", () => {
    expect(construir({}).lineaAtributos).toBeNull();
    expect(construir({}).especificaciones).toEqual([]);
  });

  /* El caso del negocio que todavía no definió campos: el catálogo tiene que
     dibujarse igual, con los productos como estaban antes de esta fase. */
  it("sin definiciones, el producto se dibuja igual que siempre", () => {
    const producto = construirCatalogoPublico(
      NEGOCIO,
      [{ id: "cat-1", nombre: "Luces", orden: 1 }],
      [],
      [
        {
          id: "p-1",
          categoria_id: "cat-1",
          subcategoria_id: null,
          nombre: "Foco LED",
          descripcion: null,
          precio: 45,
          fotos: [],
          estado: "disponible",
          controla_stock: false,
          visible: true,
          orden: 1,
          atributos: { potencia: 9 },
        },
      ],
      "https://proyecto.supabase.co",
    ).datos.categorias[0].productos[0];
    expect(producto.lineaAtributos).toBeNull();
    expect(producto.nombre).toBe("Foco LED");
  });
});

describe("las presentaciones en el catálogo público", () => {
  function construir(variantes: unknown[], tipoNegocio = "catalogo_cta") {
    return construirCatalogoPublico(
      { ...NEGOCIO, tipo_negocio: tipoNegocio },
      [{ id: "cat-1", nombre: "Ropa", orden: 1 }],
      [],
      [
        {
          id: "p-1",
          categoria_id: "cat-1",
          subcategoria_id: null,
          nombre: "Remera lisa",
          descripcion: null,
          precio: 80,
          fotos: [],
          estado: "disponible",
          controla_stock: false,
          visible: true,
          orden: 1,
        },
      ],
      "https://proyecto.supabase.co",
      new Date(),
      [],
      [],
      variantes as never,
    ).datos.categorias[0].productos[0];
  }

  const talla = (nombre: string, precio: number | null, orden: number, visible = true) => ({
    id: `v-${nombre}`,
    producto_id: "p-1",
    nombre,
    precio,
    cantidad_stock: null,
    visible,
    orden,
  });

  /* El caso común: tres tallas al mismo precio. Cada una tiene que salir con el
     precio del producto sin que nadie lo repita al cargarlas. */
  it("sin precio propio heredan el del producto", () => {
    const producto = construir([talla("S", null, 0), talla("M", null, 1)]);
    expect(producto.variantes.map(({ precio }) => precio)).toEqual([80, 80]);
  });

  it("con precio propio lo conservan", () => {
    expect(construir([talla("7,5 kg", 190, 0)]).variantes[0].precio).toBe(190);
  });

  it("respetan el orden y dejan fuera las ocultas", () => {
    const producto = construir([talla("L", null, 2), talla("S", null, 0), talla("M", null, 1, false)]);
    expect(producto.variantes.map(({ nombre }) => nombre)).toEqual(["S", "L"]);
  });

  /* El nombre lleva la presentación pegada: quien recibe el mensaje tiene que
     leer «Remera lisa (M)» y no adivinar cuál de las tres le pidieron. */
  it("cada una arma su propio mensaje de WhatsApp", () => {
    const producto = construir([talla("M", null, 0)]);
    const enlace = producto.variantes[0].accionWhatsapp;
    /* `URLSearchParams` codifica el espacio como «+» y los paréntesis como
       «%28» y «%29». Se compara sobre el texto ya decodificado en vez de
       escribir esa codificación a mano: así la prueba sigue valiendo el día que
       cambie la forma de armar el enlace. */
    const texto = new URL(enlace ?? "").searchParams.get("text") ?? "";
    expect(texto).toContain("Remera lisa (M)");
  });

  /* Sin acción individual no hay enlace que armar, y devolver uno igual haría
     que la hoja dibujara un botón que la modalidad no ofrece. */
  it("sin modalidad de WhatsApp no traen enlace", () => {
    expect(construir([talla("M", null, 0)], "catalogo_estatico").variantes[0].accionWhatsapp)
      .toBeNull();
  });

  it("un producto sin presentaciones no arrastra nada", () => {
    expect(construir([]).variantes).toEqual([]);
  });
});
