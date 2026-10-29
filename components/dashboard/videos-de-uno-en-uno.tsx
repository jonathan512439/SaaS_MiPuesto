"use client";

import { useEffect, useRef, type ReactNode } from "react";

/* La lista de «Aprende», con un video a la vez.
 *
 * Al reproducir uno, los demás que ya bajaron algo se pausan y **sueltan su
 * descarga** (`load()`, que corta el pedido y deja el `src` y el
 * `preload="none"` como estaban). Sin esto, Chrome tarda unos quince segundos
 * en soltar un video en pausa, y mientras tanto lo que bajó y no leyó ocupa la
 * conexión con el sitio: saltando de video en video, el tercero esperaba esos
 * quince segundos para arrancar (2026-10-28). Antes también sonaban dos a la
 * vez si se tocaba otro sin pausar el primero.
 *
 * Lo que se suelta no se pierde: se guarda dónde quedó y, al volver a
 * reproducirlo, sigue desde ahí, pidiendo esa parte con `Range`.
 *
 * Los videos los dibuja el servidor; este componente solo escucha. `play` no
 * sube por el árbol, así que se escucha en la fase de captura. */
export function VideosDeUnoEnUno({ children, className }: { children: ReactNode; className?: string }) {
  const lista = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const raiz = lista.current;
    if (!raiz) return;
    const posiciones = new WeakMap<HTMLVideoElement, number>();

    function alReproducir(evento: Event) {
      const actual = evento.target;
      if (!(actual instanceof HTMLVideoElement)) return;

      for (const otro of raiz!.querySelectorAll("video")) {
        if (otro === actual) continue;
        /* Uno que no bajó nada no tiene qué soltar. */
        const nadaQueSoltar =
          otro.readyState === HTMLMediaElement.HAVE_NOTHING &&
          otro.networkState !== HTMLMediaElement.NETWORK_LOADING;
        if (nadaQueSoltar) continue;
        /* Uno ya soltado conserva la posición que se guardó al soltarlo. Se
           mira la lista y no `readyState`: después de `load()`, Chrome lo vuelve
           a dar por listo con lo que tenía en su caché, con la posición en cero,
           y guardarla de nuevo lo haría empezar desde el principio. */
        if (!posiciones.has(otro)) posiciones.set(otro, otro.ended ? 0 : otro.currentTime);
        otro.pause();
        otro.load();
      }

      const desde = posiciones.get(actual);
      if (desde) {
        posiciones.delete(actual);
        if (actual.readyState >= HTMLMediaElement.HAVE_METADATA) actual.currentTime = desde;
        else
          actual.addEventListener(
            "loadedmetadata",
            () => {
              actual.currentTime = desde;
            },
            { once: true },
          );
      }
    }

    raiz.addEventListener("play", alReproducir, true);
    return () => raiz.removeEventListener("play", alReproducir, true);
  }, []);

  return (
    <ol className={className} ref={lista}>
      {children}
    </ol>
  );
}
