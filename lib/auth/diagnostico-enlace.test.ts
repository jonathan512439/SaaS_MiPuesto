import { describe, expect, it } from "vitest";

import { explicarFalloDeEnlace } from "./diagnostico-enlace";

describe("por qué falló el enlace", () => {
  /* El caso real: alguien abre un enlace recién llegado, en el mismo teléfono,
     y le decíamos que lo había abierto en otro navegador. Las tres
     explicaciones eran falsas y la verdadera no estaba. */
  it("nombra al antivirus del correo cuando el enlace ya fue visitado", () => {
    const diagnostico = explicarFalloDeEnlace({
      tipo: "error",
      codigo: "otp_expired",
      mensaje: "Email link is invalid or has expired",
    });
    expect(diagnostico.detalle).toContain("antivirus");
  });

  it("distingue entrar sin enlace de un enlace vencido", () => {
    const sinEnlace = explicarFalloDeEnlace({ tipo: "ninguno" });
    expect(sinEnlace.titulo).toContain("sin un enlace");
    expect(sinEnlace.detalle).not.toContain("venció");
  });

  it("repite el mensaje de Supabase cuando no lo reconoce", () => {
    const otro = explicarFalloDeEnlace({
      tipo: "error",
      codigo: "raro",
      mensaje: "Algo distinto pasó",
    });
    expect(otro.detalle).toBe("Algo distinto pasó");
  });

  it("no culpa al enlace cuando los datos llegaron bien", () => {
    const conTokens = explicarFalloDeEnlace({
      tipo: "implicito",
      accessToken: "a",
      refreshToken: "b",
    });
    expect(conTokens.titulo).toContain("No pudimos abrir la sesión");
  });
});
