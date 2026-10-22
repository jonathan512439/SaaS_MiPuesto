import { describe, expect, it } from "vitest";

import { armarMensajeEmpezar, validarEmpezar, type DatosEmpezar } from "./empezar";
import { OPCIONES_ALTA, PLAN_ANUAL, PLAN_PRUEBA, ahorroAnualBs, opcionAlta } from "./planes";

const BASE: DatosEmpezar = {
  opcion: "prueba",
  negocio: "  Pollos Don Lucho ",
  rubro: "polleria",
  ciudad: "oruro",
  tarjeta: "ninguna",
  demostracion: "no",
};

describe("el formulario de empezar", () => {
  it("pide nombre, rubro y ciudad", () => {
    expect(validarEmpezar(BASE)).toEqual({});
    expect(validarEmpezar({ ...BASE, negocio: "   ", rubro: "", ciudad: "lima" })).toEqual({
      negocio: expect.any(String),
      rubro: expect.any(String),
      ciudad: expect.any(String),
    });
  });

  it("no acepta un nombre más largo que el de un negocio", () => {
    expect(validarEmpezar({ ...BASE, negocio: "a".repeat(81) }).negocio).toBeDefined();
  });

  /* El mensaje es lo primero que lee el dueño del sistema: tiene que traer la
     opción con su precio y los datos, cada uno en su renglón. */
  it("arma el mensaje con la opción y los datos", () => {
    const mensaje = armarMensajeEmpezar(BASE);
    expect(mensaje).toContain(`Prueba gratis (${PLAN_PRUEBA.dias} días gratis)`);
    expect(mensaje).toContain("Negocio: Pollos Don Lucho\n");
    expect(mensaje).toContain("Vendo: Pollería y broaster");
    expect(mensaje).toContain("Ciudad: Oruro");
    expect(mensaje).not.toContain("tarjeta");
  });

  it("suma la tarjeta y la demostración solo si se eligen", () => {
    const mensaje = armarMensajeEmpezar({ ...BASE, opcion: "anual", tarjeta: "grande", demostracion: "videollamada" });
    expect(mensaje).toContain(`Bs ${PLAN_ANUAL.precioBs} al año`);
    expect(mensaje).toContain("También quiero la tarjeta grande (Bs 120).");
    expect(mensaje).toContain("videollamada");
  });
});

describe("las opciones para empezar", () => {
  it("son la prueba, los dos planes y el año", () => {
    expect(OPCIONES_ALTA.map(({ id }) => id)).toEqual(["prueba", "catalogo", "activo", "anual"]);
  });

  it("una opción que no existe cae en la prueba", () => {
    expect(opcionAlta("gratis-para-siempre").id).toBe("prueba");
    expect(opcionAlta(undefined).id).toBe("prueba");
  });

  it("el año dice cuánto se ahorra, calculado y no escrito", () => {
    expect(opcionAlta("anual").detalle).toContain(`Ahorras Bs ${ahorroAnualBs()}`);
  });
});
