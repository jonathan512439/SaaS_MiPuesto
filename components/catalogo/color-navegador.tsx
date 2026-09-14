"use client";

import { useEffect } from "react";

import { colorDeNavegador } from "../../lib/apariencia-navegador";

/* Pinta la barra del navegador del teléfono con el color de la paleta.
 *
 * No dibuja nada: solo mantiene el `<meta name="theme-color">` del documento. Va
 * por efecto y no por metadata del servidor a propósito: el color depende de la
 * paleta que el negocio eligió, y así cambia en vivo en la vista previa del
 * panel cuando el dueño prueba otra paleta, sin recargar.
 *
 * Restaura el color anterior al desmontarse: si no, salir del catálogo hacia el
 * panel dejaría la barra teñida con el color del último negocio visto. */
export function ColorNavegador({ paleta }: { paleta: string }) {
  useEffect(() => {
    const existente = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const anterior = existente?.getAttribute("content") ?? null;

    const meta = existente ?? document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", colorDeNavegador(paleta));
    if (!existente) document.head.appendChild(meta);

    return () => {
      if (anterior === null) meta.remove();
      else meta.setAttribute("content", anterior);
    };
  }, [paleta]);

  return null;
}
