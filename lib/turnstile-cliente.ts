import { useEffect, useRef } from "react";

import { CLAVE_SITIO_TURNSTILE } from "./turnstile-publico";

/* Pedir el token de Turnstile justo al enviar un pedido o una reserva.
 *
 * **El script de Cloudflare se carga recién al enviar**, no con el catálogo:
 * quien solo mira productos no descarga nada de un tercero, y el catálogo sigue
 * pesando lo mismo en un celular modesto. Cuesta un segundo más en el primer
 * envío, que es cuando la persona ya está esperando una respuesta.
 *
 * Un token sirve una sola vez, así que cada envío pide uno nuevo: por eso el
 * widget se dibuja al pedir el token y se saca después. Para casi todos no se
 * ve nada; si Cloudflare duda, aparece una casilla junto al botón.
 *
 * Si algo falla —el script no carga, Cloudflare no contesta— devuelve `null`,
 * y el servidor responde con un mensaje que dice qué hacer. No se inventa un
 * token ni se saltea la verificación desde acá: eso lo decide el servidor.
 */

type Turnstile = {
  render: (
    contenedor: HTMLElement,
    opciones: {
      sitekey: string;
      appearance: "always" | "execute" | "interaction-only";
      language: string;
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      "timeout-callback": () => void;
    },
  ) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const URL_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const ESPERA_SCRIPT_MS = 10_000;
/* Largo a propósito: si Cloudflare duda, muestra una casilla y la persona
   tiene que verla y marcarla. Para casi todos el token llega en un segundo. */
const ESPERA_TOKEN_MS = 90_000;

let cargando: Promise<Turnstile> | null = null;

function cargarTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (cargando) return cargando;

  cargando = new Promise<Turnstile>((resolver, rechazar) => {
    const script = document.createElement("script");
    script.src = URL_SCRIPT;
    script.async = true;
    const plazo = window.setTimeout(() => rechazar(new Error("tarda")), ESPERA_SCRIPT_MS);
    script.onload = () => {
      window.clearTimeout(plazo);
      if (window.turnstile) resolver(window.turnstile);
      else rechazar(new Error("sin-turnstile"));
    };
    script.onerror = () => {
      window.clearTimeout(plazo);
      rechazar(new Error("no-cargo"));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    /* Si falló, el próximo envío lo vuelve a intentar desde cero: una señal
       que volvió no tiene por qué quedarse sin verificación. */
    cargando = null;
    throw error;
  });

  return cargando;
}

export function useVerificacionHumana() {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
    };
  }, []);

  async function obtenerToken(): Promise<string | null> {
    try {
      const turnstile = await cargarTurnstile();
      const lugar = contenedor.current;
      if (!lugar) return null;
      if (widget.current) {
        turnstile.remove(widget.current);
        widget.current = null;
      }

      return await new Promise<string | null>((resolver) => {
        let terminado = false;
        let plazo = 0;
        const terminar = (token: string | null) => {
          if (terminado) return;
          terminado = true;
          window.clearTimeout(plazo);
          resolver(token);
        };
        plazo = window.setTimeout(() => terminar(null), ESPERA_TOKEN_MS);
        widget.current = turnstile.render(lugar, {
          sitekey: CLAVE_SITIO_TURNSTILE,
          /* Invisible para casi todos; una casilla solo para quien Cloudflare
             duda. En modo invisible puro, una persona confundida con un
             programa quedaba sin poder pedir y sin saber por qué. */
          appearance: "interaction-only",
          language: "es",
          callback: (token) => terminar(token),
          "error-callback": () => terminar(null),
          "expired-callback": () => terminar(null),
          "timeout-callback": () => terminar(null),
        });
      });
    } catch {
      return null;
    }
  }

  return { contenedor, obtenerToken };
}
