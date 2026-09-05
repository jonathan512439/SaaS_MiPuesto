import { describe, expect, it } from "vitest";

import { PALETAS, PLANTILLAS } from "../apariencia";
import { construirCatalogoPublico, obtenerTextoHorario } from "./publico";

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
