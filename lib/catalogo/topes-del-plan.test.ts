import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PLANES, PLAN_PRUEBA, describirTopes, planDe, topesDelPlan } from "../planes";
import {
  esRechazoDeTope,
  mensajeLimiteFotos,
  mensajeLimiteProductos,
} from "./topes-del-plan";
import { LIMITE_PRODUCTOS, MAXIMO_FOTOS_POR_PRODUCTO } from "./validacion";

const RAIZ = join(import.meta.dirname, "..", "..");
/* La última versión de `private.topes_del_plan`: la de la prueba gratis. */
const MIGRACION = readFileSync(
  join(RAIZ, "supabase/migrations/20261113090000_la_prueba_de_quince_dias.sql"),
  "utf8",
);
const ESQUEMA_INICIAL = readFileSync(
  join(RAIZ, "supabase/migrations/20260901085203_esquema_inicial.sql"),
  "utf8",
);

/* Lo que la base aplica, leído de la función `private.topes_del_plan`:
   `case p_plan when 'activo' then 300 when 'prueba' then 15 else 150 end` para
   productos y lo mismo para fotos. */
function topesEnLaBase() {
  const casos = [
    ...MIGRACION.matchAll(/case p_plan when 'activo' then (\d+) when 'prueba' then (\d+) else (\d+) end/g),
  ];
  expect(casos, "no se encontraron los dos case de topes_del_plan").toHaveLength(2);
  const [productos, fotos] = casos;
  return {
    activo: { productos: Number(productos[1]), fotosPorProducto: Number(fotos[1]) },
    prueba: { productos: Number(productos[2]), fotosPorProducto: Number(fotos[2]) },
    catalogo: { productos: Number(productos[3]), fotosPorProducto: Number(fotos[3]) },
  };
}

describe("los topes de cada plan", () => {
  /* Si un lado cambia y el otro no, la portada promete una cifra y la base
     aplica otra: el reclamo llega por WhatsApp y con razón. */
  it("son los mismos en lib/planes.ts y en la base", () => {
    const base = topesEnLaBase();
    expect(topesDelPlan("catalogo")).toEqual(base.catalogo);
    expect(topesDelPlan("activo")).toEqual(base.activo);
    expect(topesDelPlan("prueba")).toEqual(base.prueba);
    expect(PLANES.map(({ id }) => id).sort()).toEqual(["activo", "catalogo"]);
  });

  it("la prueba es la que decidió el dueño: 15 productos y 15 días", () => {
    expect(PLAN_PRUEBA.topes.productos).toBe(15);
    expect(PLAN_PRUEBA.dias).toBe(15);
    expect(PLAN_PRUEBA.lecturasPorMes).toBe(5);
  });

  /* La base pone la prueba y su vencimiento por omisión: si el número de días
     cambia en un lado y no en el otro, la portada promete quince y la cuenta
     vence en otro plazo. */
  it("todo negocio nace en la prueba, con su vencimiento a los mismos días", () => {
    expect(MIGRACION).toMatch(/alter column plan_id set default 'prueba'/);
    expect(MIGRACION).toContain(`interval '${PLAN_PRUEBA.dias} days'`);
    expect(MIGRACION).toMatch(/check \(plan_id in \('prueba', 'catalogo', 'activo'\)\)/);
  });

  /* Sin esto, un cliente que pagó seguiría con quince productos hasta que
     alguien se acordara de cambiarle el plan. */
  it("el primer pago saca de la prueba", () => {
    expect(MIGRACION).toMatch(/plan_id = case when v_sale_de_prueba then 'catalogo' else plan_id end/);
  });

  it("son los que decidió el dueño: 150 con 3 fotos y 300 con 4", () => {
    expect(topesDelPlan("catalogo")).toEqual({ productos: 150, fotosPorProducto: 3 });
    expect(topesDelPlan("activo")).toEqual({ productos: 300, fotosPorProducto: 4 });
  });

  it("ningún plan pasa el techo técnico", () => {
    const techoDeFotos = Number(/check \(cardinality\(fotos\) <= (\d+)\)/.exec(ESQUEMA_INICIAL)?.[1]);
    expect(techoDeFotos).toBe(MAXIMO_FOTOS_POR_PRODUCTO);
    for (const plan of [PLAN_PRUEBA, ...PLANES]) {
      expect(plan.topes.productos, plan.nombre).toBeLessThanOrEqual(LIMITE_PRODUCTOS);
      expect(plan.topes.fotosPorProducto, plan.nombre).toBeLessThanOrEqual(MAXIMO_FOTOS_POR_PRODUCTO);
    }
  });

  it("un plan desconocido recibe los del Catálogo, en los dos lados", () => {
    expect(topesDelPlan("inventado")).toEqual(topesDelPlan("catalogo"));
    expect(MIGRACION).toMatch(/else 150 end/);
  });

  /* Lo que dice la tarjeta del plan en la portada sale del mismo número. */
  it("cada plan dice en su lista lo que incluye", () => {
    for (const plan of PLANES) {
      expect(plan.incluye, plan.nombre).toContain(describirTopes(plan.topes));
    }
    expect(describirTopes(topesDelPlan("catalogo"))).toBe("Hasta 150 productos, con 3 fotos cada uno");
  });
});

describe("lo que se le dice al dueño en el tope", () => {
  it("nombra su plan, su número, y le ofrece subir solo si hay a dónde", () => {
    expect(mensajeLimiteProductos("catalogo")).toContain("plan Catálogo incluye hasta 150 productos");
    expect(mensajeLimiteProductos("catalogo")).toContain("plan mayor");
    expect(mensajeLimiteProductos("activo")).toContain(`${planDe("activo").nombre} incluye hasta 300`);
    expect(mensajeLimiteProductos("activo")).not.toContain("plan mayor");
    expect(mensajeLimiteFotos("catalogo")).toContain("hasta 3 fotos por producto");
    expect(mensajeLimiteFotos("activo")).not.toContain("plan mayor");
    expect(mensajeLimiteProductos("prueba")).toContain("Prueba gratis incluye hasta 15 productos");
    expect(mensajeLimiteProductos("prueba")).toContain("plan mayor");
  });

  it("reconoce el rechazo de la base por su código", () => {
    expect(esRechazoDeTope("LIMITE_PRODUCTOS", "LIMITE_PRODUCTOS")).toBe(true);
    expect(esRechazoDeTope("LIMITE_FOTOS", "LIMITE_PRODUCTOS")).toBe(false);
    expect(esRechazoDeTope(undefined, "LIMITE_FOTOS")).toBe(false);
  });
});
