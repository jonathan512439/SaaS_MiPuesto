import { describe, expect, it } from "vitest";

import { crearDatosDemoPlantilla } from "./datos-demo";

describe("datos de demostración de plantillas", () => {
  it("asigna una fotografía accesible a cada producto", () => {
    const datos = crearDatosDemoPlantilla({
      nombre: "Negocio de prueba",
      descripcion: "Catálogo de prueba",
      telefonoWhatsapp: "59170000000",
    });
    const productos = datos.categorias.flatMap((categoria) => categoria.productos);

    expect(productos).toHaveLength(3);
    expect(productos.every((producto) => producto.imagen.src.endsWith(".webp"))).toBe(true);
    expect(productos.every((producto) => producto.imagen.alt.length > 0)).toBe(true);
    expect(new Set(productos.map((producto) => producto.imagen.src)).size).toBe(3);
    expect(datos.negocio.horarioTexto).toBe("Abierto hoy hasta las 21:30");
  });
});
