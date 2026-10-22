import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TRAZOS_CATALOGO } from "../../components/iconos/catalogo";
import { RUBROS } from "../negocios/rubros";
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
    expect(productos.every((producto) => producto.imagen?.src.endsWith(".webp"))).toBe(true);
    expect(productos.every((producto) => (producto.imagen?.alt.length ?? 0) > 0)).toBe(true);
    expect(new Set(productos.map((producto) => producto.imagen?.src)).size).toBe(3);
    expect(datos.negocio.atencion.texto).toBe("Siempre abierto");
    expect(datos.negocio.modalidad).toBe("carrito");
  });
});

/* La vista previa de «Tu marca» y de Apariencia mostraba hamburguesa, papas y
   limonada en cualquier rubro: una ferretería elegía su color viendo comida. */
describe("la muestra de la vista previa es del rubro del negocio", () => {
  const muestra = (rubro: string | null) =>
    crearDatosDemoPlantilla({ nombre: "Prueba", descripcion: null, telefonoWhatsapp: "70000000", rubro });
  const nombres = (rubro: string | null) =>
    muestra(rubro).categorias.flatMap((c) => c.productos.map((p) => p.nombre));

  it.each(RUBROS.filter((r) => r !== "restaurante"))("«%s» no muestra comida", (rubro) => {
    expect(nombres(rubro).join(" | ")).not.toMatch(/Hamburguesa|Papas con salsa|Limonada/);
    expect(nombres(rubro).length).toBeGreaterThanOrEqual(3);
  });

  it("un restaurante, o un negocio sin rubro todavía, sigue viendo la comida", () => {
    expect(nombres("restaurante")).toContain("Hamburguesa de la casa");
    expect(nombres(null)).toContain("Hamburguesa de la casa");
  });

  /* Lo decidido en demos-rubro.ts: no se inventan fotografías. Desde el
     2026-10-22 la ropa y la veterinaria llevan fotos de dominio público, y cada
     una tiene que estar en el registro de créditos y existir de verdad. */
  it.each(RUBROS.filter((r) => r !== "restaurante"))("«%s» no inventa fotografías", (rubro) => {
    const raiz = join(import.meta.dirname, "..", "..");
    const creditos = readFileSync(join(raiz, "docs", "creditos-fotos-demo.md"), "utf8");
    const fotos = muestra(rubro)
      .categorias.flatMap((c) => c.productos)
      .flatMap((p) => p.imagenes);
    for (const foto of fotos) {
      const archivo = foto.src.split("/").at(-1)!;
      expect(creditos, `${rubro}: ${archivo} no está en los créditos`).toContain(`\`${archivo}\``);
      expect(existsSync(join(raiz, "public", foto.src)), `${rubro}: falta ${foto.src}`).toBe(true);
      expect(foto.alt.length, `${rubro}: ${archivo} sin descripción`).toBeGreaterThan(0);
    }
  });

  it.each(RUBROS)("«%s» usa íconos que existen", (rubro) => {
    for (const categoria of muestra(rubro).categorias) {
      expect(Object.keys(TRAZOS_CATALOGO), `${rubro}: ${categoria.icono}`).toContain(categoria.icono);
    }
  });
});
