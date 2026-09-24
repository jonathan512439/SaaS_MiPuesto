import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { DatosCatalogoAdmin } from "../../lib/catalogo/tipos";
import { ProveedorSupabaseNavegador } from "../supabase/proveedor-supabase-navegador";
import { ProveedorAvisos, ProveedorConfirmacion } from "../ui";
import { GestorCatalogo } from "./gestor-catalogo";

/* «Productos» y «Mi catálogo» se dibujan, con datos.
 *
 * Es la primera prueba del proyecto que **dibuja una pantalla del panel**, y
 * existe porque las dos se cayeron enteras con un error que ninguna otra cosa
 * podía ver: un `const` que leía otro `const` declarado más abajo. TypeScript
 * no lo atrapa —el orden de dos constantes en la misma función no es cosa de
 * tipos—, el lint tampoco, y la suite tenía 715 pruebas en verde mientras el
 * dueño veía «algo se cortó de nuestro lado» en sus dos negocios.
 *
 * Dibujar el componente con datos parecidos a los reales lo atrapó en cuarenta
 * milisegundos. Los datos son inventados a propósito: los de un negocio real no
 * van al repositorio.
 *
 * Es el componente más grande del panel —el que atiende las dos pantallas más
 * pesadas—, así que es el que más lugares tiene donde romperse. Por eso va él y
 * no otro. */
const NEGOCIO = "00000000-0000-4000-8000-000000000001";
const CAT_COSAS = "00000000-0000-4000-8000-000000000010";
const CAT_TIEMPO = "00000000-0000-4000-8000-000000000011";
const SUB = "00000000-0000-4000-8000-000000000020";
const RECURSO = "00000000-0000-4000-8000-000000000030";

const datos = {
  negocio: {
    id: NEGOCIO,
    nombre: "Negocio de prueba",
    slug: "negocio-de-prueba",
    rubro: "veterinaria",
    rubro_publico: "veterinaria",
    rubros_secundarios: ["mascotas"],
    foto_ia_habilitada: true,
    plan_id: "catalogo",
  },
  categorias: [
    { id: CAT_COSAS, nombre: "Alimento", orden: 1, icono: "caja", visible: true, vende: "cosas" },
    { id: CAT_TIEMPO, nombre: "Consulta", orden: 2, icono: "calendario", visible: true, vende: "tiempo" },
  ],
  subcategorias: [{ id: SUB, categoria_id: CAT_COSAS, nombre: "Perros", orden: 1 }],
  productos: [
    {
      id: "00000000-0000-4000-8000-000000000100",
      codigo: "PRD-1",
      categoria_id: CAT_COSAS,
      subcategoria_id: SUB,
      nombre: "Alimento adulto 10 kg",
      descripcion: "Bolsa grande.",
      precio: 180,
      precio_anterior: 200,
      precio_actualizado_en: null,
      precio_actualizado_por: null,
      fotos: [`${NEGOCIO}/producto/foto.webp`],
      controla_stock: true,
      cantidad_stock: 5,
      cantidad_reservada: 0,
      visible: true,
      estado: "disponible",
      orden: 1,
      en_carta_hasta: null,
      atributos: { peso: "10" },
      duracion_minutos: null,
      recurso_id: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000101",
      codigo: "PRD-2",
      categoria_id: CAT_TIEMPO,
      subcategoria_id: null,
      nombre: "Consulta general",
      descripcion: "",
      precio: 80,
      precio_anterior: null,
      precio_actualizado_en: null,
      precio_actualizado_por: null,
      fotos: [],
      controla_stock: false,
      cantidad_stock: null,
      cantidad_reservada: 0,
      visible: true,
      estado: "disponible",
      orden: 2,
      en_carta_hasta: null,
      atributos: {},
      duracion_minutos: 45,
      recurso_id: RECURSO,
    },
  ],
  atributos: [
    {
      id: "00000000-0000-4000-8000-000000000200",
      negocio_id: NEGOCIO,
      categoria_id: CAT_COSAS,
      clave: "peso",
      nombre: "Peso",
      tipo: "numero",
      unidad: "kg",
      opciones: [],
      obligatorio: false,
      en_tarjeta: true,
      en_resumen: false,
      orden: 1,
      creado_en: "2026-09-01T00:00:00Z",
    },
  ],
  recursos: [
    { id: RECURSO, nombre: "Dra. Pérez", activo: true, agenda_recurso: [{ duracion_minutos: 60 }] },
  ],
  fotosUsadasMes: 3,
  espacioUsado: 5 * 1024 * 1024,
} as unknown as DatosCatalogoAdmin;

function dibujar(vista: "productos" | "categorias") {
  /* Con `jsx` y no con JSX: la suite solo incluye archivos `.ts`, y un `.ts`
     no puede llevar etiquetas. Es la misma función a la que compila el JSX. */
  const pantalla = jsx(GestorCatalogo, {
    datosIniciales: datos,
    urlSupabase: "https://prueba.supabase.co",
    vista,
  });
  const conConfirmacion = jsx(ProveedorConfirmacion, { children: pantalla });
  const conAvisos = jsx(ProveedorAvisos, { children: conConfirmacion });
  return renderToString(
    jsx(ProveedorSupabaseNavegador, {
      clavePublica: "clave-de-prueba",
      url: "https://prueba.supabase.co",
      children: conAvisos,
    }),
  );
}

describe("las pantallas del catálogo del panel", () => {
  it("«Productos» se dibuja con datos", () => {
    const html = dibujar("productos");
    expect(html).toContain("Alimento adulto 10 kg");
    expect(html).toContain("Consulta general");
  });

  it("«Mi catálogo» se dibuja con datos", () => {
    const html = dibujar("categorias");
    expect(html).toContain("Tus categorías");
    expect(html).toContain("Alimento");
    expect(html).toContain("Consulta");
  });

  /* Las ayudas hablan del rubro: la veterinaria con tienda de mascotas ve
     ejemplos de los dos, y ninguno de ferretería. */
  it("la ayuda para crear una categoría es del rubro del negocio", () => {
    const html = dibujar("categorias");
    expect(html).toContain("«Consultas»");
    expect(html).toContain("«Alimentos»");
    expect(html).toContain('placeholder="Ej.: Consultas"');
  });
});
