import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PLANES, cupoDelPlan, planDe } from "../planes";
import { LIMITES_GEMINI, NEGOCIOS_CON_HERRAMIENTA, TOPE_FOTOS_POR_DIA } from "./limites";

const servidor = readFileSync(join(import.meta.dirname, "servidor.ts"), "utf8");

/* Lo que se vende es lo que se aplica.
 *
 * Esta prueba existe porque durante semanas **no fue así**. La portada vendía
 * dos planes, de diez y de sesenta lecturas al mes, y el servidor autorizaba
 * doscientas a todo el mundo: el tope salía de repartir la cuota de Google entre
 * diez negocios, sin mirar quién pagó qué. El sistema ni siquiera guardaba el
 * plan de cada uno.
 *
 * No lo atrapó nada, y no podía: había una guardia que comprobaba que la promesa
 * **no superara** el techo técnico —diez es menos que doscientas, así que
 * pasaba— y ninguna que comprobara que la promesa se cumpliera.
 *
 * Es el error más caro de los que no se ven: no rompe nada, no da error, y el
 * día que se quiere cobrar el plan de arriba resulta que el de abajo ya lo tenía
 * todo.
 */
describe("el cupo de lectura de fotos", () => {
  it("el servidor autoriza el cupo del plan y no un número suyo", () => {
    /* Que el servidor lea el plan del negocio antes de autorizar. Sin esto,
       cualquier número que pase es el mismo para todos. */
    expect(servidor).toContain('.select("plan_id")');
    expect(servidor).toContain("cupoDelPlan(");

    /* Y que lo que le pasa a la base salga de ese cupo, no de una constante. */
    expect(servidor).toContain("p_tope: Math.min(cupo.mensual");
    expect(servidor).toContain("p_tope_diario: cupo.diario");
  });

  it("cada plan autoriza exactamente lo que publica", () => {
    for (const plan of PLANES) {
      const cupo = cupoDelPlan(plan.id, TOPE_FOTOS_POR_DIA);
      expect(cupo.mensual, `${plan.nombre} autoriza distinto de lo que publica`).toBe(
        plan.lecturasPorMes,
      );
    }
  });

  /* Un plan desconocido —una fila vieja, un valor a mano en la base— no puede
     terminar dando el cupo del plan caro. Cae en el de entrada. */
  it("lo que no se reconoce cae en el plan de entrada", () => {
    const entrada = PLANES.find(({ id }) => id === "catalogo")!;
    for (const valor of [null, undefined, "", "premium", "activo_plus"]) {
      expect(planDe(valor).id, `«${valor}» no cae en el plan de entrada`).toBe(entrada.id);
    }
  });

  /* El cupo diario deja gastar de golpe pero no el mes entero: cargar un
     catálogo es un día de trabajo, no treinta. */
  it("el día alcanza para trabajar y no para vaciar el mes", () => {
    for (const plan of PLANES) {
      const cupo = cupoDelPlan(plan.id, TOPE_FOTOS_POR_DIA);
      expect(cupo.diario, `${plan.nombre} se vacía en un día`).toBeLessThan(cupo.mensual);
      expect(cupo.diario, `${plan.nombre} no deja trabajar`).toBeGreaterThan(0);
      expect(cupo.diario, `${plan.nombre} pasa el techo técnico`).toBeLessThanOrEqual(
        TOPE_FOTOS_POR_DIA,
      );
    }
  });

  /* El peor día imaginable: todos los negocios con la herramienta encendida,
     todos en el plan más caro, todos gastando su día entero. Tiene que caber en
     lo que Google regala, o la herramienta falla para el que llegue último. */
  it("el peor día de todos juntos cabe en la cuota de Google", () => {
    const masCaro = Math.max(
      ...PLANES.map((plan) => cupoDelPlan(plan.id, TOPE_FOTOS_POR_DIA).diario),
    );
    const peorDia = masCaro * NEGOCIOS_CON_HERRAMIENTA;

    expect(peorDia, "el peor día se pasa de la cuota diaria de Google").toBeLessThanOrEqual(
      LIMITES_GEMINI.porDia,
    );
  });
});
