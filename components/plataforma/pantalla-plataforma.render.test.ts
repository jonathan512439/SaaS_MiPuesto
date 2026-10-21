import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PESTANAS_PLATAFORMA } from "../../lib/plataforma/pestanas";
import { ProveedorSupabaseNavegador } from "../supabase/proveedor-supabase-navegador";
import { ProveedorAvisos, ProveedorConfirmacion } from "../ui";
import { PantallaPlataforma } from "./pantalla-plataforma";
import { datosDeMuestra } from "./pantalla-plataforma.muestra";

/* La plataforma, dibujada con datos inventados.
 *
 * Es una pantalla grande, con seis secciones que nadie abre todos los días: un
 * error que no ve TypeScript la deja en blanco y se descubre el día que hace
 * falta. Se comprueba que cada sección se dibuja y con qué; el aspecto se mira
 * a mano. */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
  usePathname: () => "/plataforma",
  useSearchParams: () => new URLSearchParams(),
}));

const dibujar = (...argumentos: Parameters<typeof datosDeMuestra>) =>
  renderToString(
    /* Los mismos proveedores que monta el layout de la plataforma: «Salir»
       necesita el cliente de Supabase del navegador. */
    jsx(ProveedorSupabaseNavegador, {
      clavePublica: "clave-publica-de-prueba",
      url: "https://prueba.supabase.co",
      children: jsx(ProveedorAvisos, {
        children: jsx(ProveedorConfirmacion, { children: jsx(PantallaPlataforma, datosDeMuestra(...argumentos)) }),
      }),
    }),
  ).replaceAll("<!-- -->", "");

describe("la plataforma", () => {
  it("abre en Negocios, con los números, los filtros y cada negocio con su estado en palabras", () => {
    const html = dibujar();
    for (const { titulo } of PESTANAS_PLATAFORMA) expect(html).toContain(titulo);
    expect(html).toContain("Necesitan atención");
    expect(html).toContain("Bs 400");
    for (const nombre of ["Brasa Urbana", "Kantuta Moda", "Huellitas Veterinaria", "La Esquina del Sabor", "Mundo Mil Cosas"]) {
      expect(html).toContain(nombre);
    }
    for (const estado of ["Al día", "Por vencer", "Vencida", "Fuera de línea", "Bajado a mano"]) {
      expect(html).toContain(estado);
    }
    /* Los controles de cada negocio están, plegados en «Gestionar». */
    expect(html.split("<summary").length - 1).toBe(5);
    expect(html).toContain("Renovar");
    expect(html).toContain("Cambiar de rubro");
  });

  it("el filtro deja solo a los que necesitan atención", () => {
    const html = dibujar("negocios", "atencion");
    for (const nombre of ["Kantuta Moda", "Huellitas Veterinaria", "La Esquina del Sabor"]) {
      expect(html).toContain(`<h2>${nombre}</h2>`);
    }
    expect(html).not.toContain("<h2>Brasa Urbana</h2>");
    expect(html).not.toContain("<h2>Mundo Mil Cosas</h2>");
    expect(html).toMatch(/aria-current="page"[^>]*>Necesitan atención/);
  });

  it.each(["consumo", "herramientas", "zonas", "buscador", "tutoriales"] as const)(
    "dibuja la sección %s",
    (pestana) => {
      const html = dibujar(pestana);
      const titulo = PESTANAS_PLATAFORMA.find(({ id }) => id === pestana)!.titulo;
      expect(html).toContain(`<h1>${titulo}</h1>`);
      /* La lista de negocios es solo de su sección. */
      expect(html).not.toContain("Gestionar");
    },
  );
});
