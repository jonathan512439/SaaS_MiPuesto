import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  COMBINACIONES_DE_FORMA,
  DEFINICIONES_PALETAS,
  DEFINICIONES_PLANTILLAS,
  DEFINICIONES_TARJETAS,
  PALETAS,
  PLANTILLAS,
  TARJETAS,
  TARJETAS_POR_PLANTILLA,
  esTarjetaId,
  tarjetaPredeterminada,
  tarjetaValidaPara,
} from "./apariencia";

describe("registro de apariencia", () => {
  it("define una descripción por cada plantilla, tarjeta y paleta", () => {
    expect(DEFINICIONES_PLANTILLAS.map(({ id }) => id)).toEqual([...PLANTILLAS]);
    expect(DEFINICIONES_TARJETAS.map(({ id }) => id)).toEqual([...TARJETAS]);
    expect(DEFINICIONES_PALETAS.map(({ id }) => id)).toEqual([...PALETAS]);
  });

  it("no repite identificadores entre plantillas ni entre tarjetas", () => {
    expect(new Set(PLANTILLAS).size).toBe(PLANTILLAS.length);
    expect(new Set(TARJETAS).size).toBe(TARJETAS.length);
  });
});

describe("tarjetas por plantilla", () => {
  it("cada plantilla admite al menos una tarjeta", () => {
    for (const plantilla of PLANTILLAS) {
      expect(TARJETAS_POR_PLANTILLA[plantilla].length).toBeGreaterThan(0);
    }
  });

  it("solo admite tarjetas que existen", () => {
    for (const plantilla of PLANTILLAS) {
      for (const tarjeta of TARJETAS_POR_PLANTILLA[plantilla]) {
        expect(TARJETAS).toContain(tarjeta);
      }
    }
  });

  it("no repite una tarjeta dentro de la misma plantilla", () => {
    for (const plantilla of PLANTILLAS) {
      const admitidas = TARJETAS_POR_PLANTILLA[plantilla];
      expect(new Set(admitidas).size).toBe(admitidas.length);
    }
  });

  /* Una tarjeta que ninguna plantilla sabe dibujar es código muerto que igual
     hay que mantener, y peor: el dueño podría elegirla desde la base. */
  it("toda tarjeta la dibuja alguna plantilla", () => {
    const dibujadas = new Set(Object.values(TARJETAS_POR_PLANTILLA).flat());
    for (const tarjeta of TARJETAS) {
      expect(dibujadas).toContain(tarjeta);
    }
  });

  it("la predeterminada es la primera de la lista", () => {
    for (const plantilla of PLANTILLAS) {
      expect(tarjetaPredeterminada(plantilla)).toBe(TARJETAS_POR_PLANTILLA[plantilla][0]);
    }
  });

  /* El criterio de aceptación de la fase, escrito como prueba: un negocio que
     ya existe tiene que verse igual después de la migración. Estas cuatro
     equivalencias son las que la migración escribe en la base, y si alguien las
     cambia acá sin cambiarlas allá, los catálogos existentes cambian de forma
     sin que nadie lo haya pedido. */
  it("conserva el aspecto de las cuatro plantillas que ya existían", () => {
    expect(tarjetaPredeterminada("clasica")).toBe("lista");
    expect(tarjetaPredeterminada("moderna")).toBe("cuadricula");
    expect(tarjetaPredeterminada("minimal")).toBe("servicio");
    expect(tarjetaPredeterminada("feria")).toBe("ficha");
  });
});

describe("tarjetaValidaPara", () => {
  it("deja pasar una tarjeta que la plantilla admite", () => {
    expect(tarjetaValidaPara("moderna", "retrato")).toBe("retrato");
  });

  /* Pasa de verdad: el dueño tenía «retrato» en Moderna y se cambia a Feria,
     que no la dibuja. Corregirlo a la predeterminada es preferible a mostrarle
     una pantalla rota o a guardarle un valor que la plantilla ignora. */
  it("corrige a la predeterminada cuando la plantilla no la dibuja", () => {
    expect(tarjetaValidaPara("feria", "retrato")).toBe("ficha");
  });

  it("corrige un valor inventado, nulo o de otro tipo", () => {
    expect(tarjetaValidaPara("clasica", "tarjeta-que-no-existe")).toBe("lista");
    expect(tarjetaValidaPara("clasica", null)).toBe("lista");
    expect(tarjetaValidaPara("clasica", 7)).toBe("lista");
  });
});

describe("esTarjetaId", () => {
  it("reconoce las que existen y rechaza el resto", () => {
    expect(esTarjetaId("ficha")).toBe(true);
    expect(esTarjetaId("Ficha")).toBe(false);
    expect(esTarjetaId("")).toBe(false);
    expect(esTarjetaId(undefined)).toBe(false);
  });
});

describe("combinaciones de forma", () => {
  it("son las declaradas, sin inventar ni perder ninguna", () => {
    const total = PLANTILLAS.reduce(
      (suma, plantilla) => suma + TARJETAS_POR_PLANTILLA[plantilla].length,
      0,
    );
    expect(COMBINACIONES_DE_FORMA).toHaveLength(total);
    expect(new Set(COMBINACIONES_DE_FORMA.map((c) => `${c.plantilla}/${c.tarjeta}`)).size).toBe(
      total,
    );
  });

  /* El número está escrito en `docs/plan/03-FRONTEND.md`. Que una prueba lo fije
     obliga a corregir el texto el día que cambie, en vez de dejar la
     documentación mintiendo. Crecen cuando llegue `reserva` con la agenda, en
     la fase 6. */
  it("son trece con las cinco plantillas de hoy", () => {
    expect(COMBINACIONES_DE_FORMA).toHaveLength(13);
  });
});

describe("sincronización con la base", () => {
  /* El control de contraste ya compara plantillas y paletas contra la
     restricción de la base. Las tarjetas se suman acá porque son el eje nuevo y
     porque el error que evita es el mismo: que el panel ofrezca algo que la base
     rechaza, o al revés. */
  it("la restricción de tarjeta_id admite exactamente las tarjetas declaradas", () => {
    const sql = readFileSync(
      "supabase/migrations/20260919090000_fase1_tarjeta_de_producto.sql",
      "utf8",
    );
    const restriccion = /tarjeta_id in \(([^)]*)\)/.exec(sql);
    expect(restriccion, "no se encontró la restricción de tarjeta_id").not.toBeNull();

    const enLaBase = [...restriccion![1].matchAll(/'([a-z_]+)'/g)].map((c) => c[1]);
    expect(enLaBase.sort()).toEqual([...TARJETAS].sort());
  });

});
