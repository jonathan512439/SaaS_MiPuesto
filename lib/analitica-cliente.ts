"use client";

import type { TipoEventoAnalitica } from "./analitica";

const CLAVE_SESION = "mipuesto:sesion-analitica";

function obtenerSesion() {
  try {
    const existente = window.sessionStorage.getItem(CLAVE_SESION);
    if (existente) return existente;
    const creada = crypto.randomUUID();
    window.sessionStorage.setItem(CLAVE_SESION, creada);
    return creada;
  } catch {
    return crypto.randomUUID();
  }
}
export function registrarEventoAnalitica(
  negocioId: string,
  tipo: TipoEventoAnalitica,
  productoId: string | null = null,
) {
  if (!negocioId) return;
  void fetch("/api/analitica", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ negocioId, tipo, productoId, sesionId: obtenerSesion() }),
    keepalive: true,
  }).catch(() => undefined);
}
