import { describe, expect, it } from "vitest";

import { construirCatalogoPublico, obtenerTextoHorario } from "./publico";

const NEGOCIO = {
  nombre: "Mercado Uno",
  descripcion: null,
  telefono_whatsapp: "59170000000",
  horario: {},
  plantilla_id: "desconocida",
  paleta_id: "desconocida",
};

describe("construirCatalogoPublico", () => {
  it("excluye productos ocultos y agrupa los que no tienen categoría", () => {
    const resultado = construirCatalogoPublico(
      NEGOCIO,
      [{ id: "cat-1", nombre: "Comida", orden: 1 }],
      [
        { id: "p-1", categoria_id: "cat-1", nombre: "Visible", descripcion: null, precio: 20, fotos: [], estado: "disponible", visible: true, orden: 2 },
        { id: "p-2", categoria_id: "cat-1", nombre: "Oculto", descripcion: null, precio: 10, fotos: [], estado: "disponible", visible: false, orden: 1 },
        { id: "p-3", categoria_id: null, nombre: "Otro", descripcion: null, precio: 5, fotos: [], estado: "agotado", visible: true, orden: 3 },
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
      [{ id: "p-1", categoria_id: "cat-1", nombre: "Producto", descripcion: "Detalle", precio: 20, fotos: ["n/p/foto.webp", "n/p/dos.webp"], estado: "disponible", visible: true, orden: 1 }],
      "https://proyecto.supabase.co",
    );

    expect(resultado.plantilla).toBe("moderna");
    expect(resultado.paleta).toBe("oceano");
    expect(resultado.datos.categorias[0].productos[0].imagen?.src).toContain("foto.webp");
  });
});

describe("obtenerTextoHorario", () => {
  it("reconoce la opción siempre abierto", () => {
    expect(obtenerTextoHorario({ siempre_abierto: true })).toBe("Siempre abierto");
  });
});
