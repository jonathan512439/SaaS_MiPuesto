import { describe, expect, it } from "vitest";

import { mensajeErrorActualizarClave, mensajeErrorInicioSesion } from "./mensajes";

describe("mensajes al definir la contraseña", () => {
  /* Antes cualquier fallo decía «el enlace no es válido», incluso con el enlace
     perfecto: mandaba a pedir otro, que fallaba igual, y hacía creer que el
     sistema estaba roto. */
  it("distingue la contraseña repetida de un enlace vencido", () => {
    expect(mensajeErrorActualizarClave({ code: "same_password" })).toContain("ya tenías");
    expect(mensajeErrorActualizarClave({ code: "weak_password" })).toContain("adivinar");
  });

  it("solo culpa al enlace cuando de verdad no hay sesión", () => {
    const sinSesion = mensajeErrorActualizarClave({ status: 401 });
    expect(sinSesion).toContain("otro navegador");
    expect(mensajeErrorActualizarClave({})).not.toContain("enlace");
  });

  it("reconoce el exceso de intentos", () => {
    expect(mensajeErrorActualizarClave({ status: 429 })).toContain("demasiados intentos");
    expect(mensajeErrorInicioSesion({ status: 429 })).toContain("demasiados intentos");
  });
});
