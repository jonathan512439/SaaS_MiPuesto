import { describe, expect, it } from "vitest";

import { describirReinicio } from "./reinicio";

/* El contador diario de Google vuelve a cero a la medianoche del Pacífico, que
   en Bolivia son las cuatro de la madrugada. Decir «mañana» mandaría a esperar
   de más o de menos según la hora en que se toque el tope. */
describe("cuándo vuelve el cupo diario", () => {
  it("lo dice en hora de Bolivia", () => {
    /* Medianoche del Pacífico en horario de verano: UTC-7, así que son las 07:00
       UTC y las 03:00 en La Paz. Se comprueba la hora y no la cadena entera: el
       «a. m.» lo pone el idioma y no es lo que esta función decide. */
    expect(describirReinicio("2026-09-08T07:00:00.000Z")).toContain("03:00");

    /* Sin la conversión de zona saldrían las 07:00, que es la trampa que esta
       prueba existe para atrapar. */
    expect(describirReinicio("2026-09-08T07:00:00.000Z")).not.toContain("07:00");
  });

  it("no inventa una hora cuando el dato no llega", () => {
    expect(describirReinicio(undefined)).toBe("cuando vuelva a empezar el día");
    expect(describirReinicio("no es una fecha")).toBe("cuando vuelva a empezar el día");
  });
});
