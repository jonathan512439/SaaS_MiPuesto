import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProveedorAvisos, ProveedorConfirmacion } from "../ui";
import { GestorAgenda, NombreDeRecurso, avisoDePausa, type RecursoAdmin } from "./gestor-agenda";

/* «Cronograma», dibujado. Es una de las pantallas grandes del panel: un error
 * que ni los tipos ni el lint ven la deja entera en blanco. Se comprueba que se
 * dibuja y qué aparece; el aspecto se valida a mano. */

const CONSULTAS: RecursoAdmin = {
  id: "7c0b6f2e-3b1a-4c8e-9a51-1f1f1f1f1f1f",
  nombre: "Consultas",
  orden: 0,
  activo: true,
  acepta_reservas: true,
  franjas: [{ dia: 1, desde: "08:30", hasta: "12:00" }],
  duracion_minutos: 30,
  cupo_por_franja: 2,
};

function dibujar(elemento: unknown) {
  return renderToString(
    jsx(ProveedorAvisos, { children: jsx(ProveedorConfirmacion, { children: elemento }) }),
  );
}

describe("GestorAgenda", () => {
  it("se dibuja con quien atiende y su horario", () => {
    const html = dibujar(
      jsx(GestorAgenda, { recursosIniciales: [CONSULTAS], citasIniciales: [], servicios: [] }),
    );
    expect(html).toContain("Quién atiende");
    expect(html).toContain("Consultas");
    expect(html).toContain("Recibe reservas");
  });
});

describe("NombreDeRecurso", () => {
  it("muestra el nombre actual y no ofrece guardar si no cambió", () => {
    const html = dibujar(
      jsx(NombreDeRecurso, { id: CONSULTAS.id, nombre: "Consultas", guardando: false, onGuardar: () => undefined }),
    );
    expect(html).toContain("Cómo se llama");
    expect(html).toContain('value="Consultas"');
    const boton = html.slice(html.lastIndexOf("<button", html.indexOf("Cambiar nombre")), html.indexOf("Cambiar nombre"));
    expect(boton).toContain("disabled");
  });
});

/* El aviso al pausar decía «hasta el 2026-09-28», la fecha como la guarda el
   sistema; la línea de abajo decía «Lun 28/9». Los dos dicen lo mismo. */
describe("avisoDePausa", () => {
  it("dice el día como el resto del cronograma", () => {
    expect(avisoDePausa("2026-09-28", "08:00")).toBe(
      "Sus horarios dejan de ofrecerse hasta el Lun 28/9 a las 08:00.",
    );
  });
});
