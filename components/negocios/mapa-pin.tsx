"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef } from "react";

import type { Punto } from "../../lib/negocios/coordenadas";
import styles from "./mapa-pin.module.css";

/* Un mapa con un pin que se arrastra. Fase 11.
 *
 * **Leaflet con mosaicos de OpenStreetMap**, que es la dependencia justificada
 * por escrito en `docs/plan/09-DIRECTORIO-Y-FORMAS.md`: la única forma de poner
 * un pin sin clave ni facturación.
 *
 * Leaflet toca `window` apenas se importa, así que el código se trae **adentro
 * del efecto**, recién en el navegador. Su hoja de estilos sí va arriba: sin
 * ella los mosaicos salen desparramados. Las dos cosas llegan solo a las
 * pantallas que dibujan este componente —el alta y «Mi negocio»—, nunca al
 * catálogo público.
 *
 * El pin es un `divIcon` dibujado con CSS y no la imagen que trae Leaflet: la
 * imagen se pide por una ruta relativa que el empaquetador rompe con
 * facilidad, y un pin que no aparece es un mapa que no sirve.
 *
 * Se mueve de dos formas: arrastrando el pin, o tocando el mapa donde se
 * quiere ponerlo. La segunda es la que funciona bien con un dedo en una
 * pantalla chica.
 */

/* La dirección de los mosaicos, en un solo lugar: si el uso crece, cambiar de
   proveedor es cambiar esta constante y la de la política de contenido. */
export const MOSAICOS_MAPA = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function MapaPin({
  centro,
  valor,
  alCambiar,
  etiqueta,
  zoom = 16,
}: {
  /* Dónde arranca el mapa si todavía no hay pin. */
  centro: Punto;
  /* El pin, si ya hay uno. */
  valor: Punto | null;
  alCambiar: (punto: Punto) => void;
  /* Qué es el mapa, para quien no lo ve: «Ubicación de tu local». */
  etiqueta: string;
  zoom?: number;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  /* El mapa y el pin viven fuera del estado de React: Leaflet los maneja solo,
     y guardarlos en un estado dispararía un dibujo por cada arrastre. */
  const mapa = useRef<import("leaflet").Map | null>(null);
  const pin = useRef<import("leaflet").Marker | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  /* La función del padre puede cambiar en cada dibujo; el mapa se arma una
     sola vez y siempre llama a la última. */
  const avisar = useRef(alCambiar);
  useEffect(() => {
    avisar.current = alCambiar;
  }, [alCambiar]);

  /* Pone el pin donde se le diga, creándolo la primera vez. Un solo lugar para
     crearlo: lo usan el toque en el mapa y los cambios que llegan de afuera. */
  function ponerPin(lat: number, lng: number) {
    const L = leaflet.current;
    if (!L || !mapa.current) return;
    if (pin.current) {
      pin.current.setLatLng([lat, lng]);
      return;
    }
    pin.current = L.marker([lat, lng], {
      draggable: true,
      keyboard: true,
      icon: L.divIcon({
        className: styles.pin,
        html: `<span class="${styles.cabeza}"></span>`,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      }),
    })
      .addTo(mapa.current)
      .on("dragend", () => {
        const punto = pin.current?.getLatLng();
        if (punto) avisar.current({ lat: punto.lat, lng: punto.lng });
      });
  }

  /* Armar el mapa, una vez. */
  useEffect(() => {
    let cancelado = false;
    void import("leaflet").then((L) => {
      if (cancelado || !contenedor.current || mapa.current) return;
      leaflet.current = L;

      const inicio = valor ?? centro;
      mapa.current = L.map(contenedor.current, { zoomControl: true }).setView(
        [inicio.lat, inicio.lng],
        valor ? zoom : Math.min(zoom, 14),
      );
      L.tileLayer(MOSAICOS_MAPA, { attribution: ATRIBUCION, maxZoom: 19 }).addTo(mapa.current);

      if (valor) ponerPin(valor.lat, valor.lng);

      mapa.current.on("click", (evento: import("leaflet").LeafletMouseEvent) => {
        ponerPin(evento.latlng.lat, evento.latlng.lng);
        avisar.current({ lat: evento.latlng.lat, lng: evento.latlng.lng });
      });
    });

    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      pin.current = null;
    };
    // Se arma una vez: los cambios de afuera entran por los dos efectos de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* El pin cambió desde afuera —el GPS, el enlace de Maps—: se mueve y el mapa
     lo sigue. */
  useEffect(() => {
    if (!valor || !mapa.current) return;
    ponerPin(valor.lat, valor.lng);
    mapa.current.setView([valor.lat, valor.lng], Math.max(mapa.current.getZoom(), zoom));
  }, [valor, zoom]);

  /* Cambió la ciudad y todavía no hay pin: el mapa va a la ciudad nueva. */
  useEffect(() => {
    if (valor || !mapa.current) return;
    mapa.current.setView([centro.lat, centro.lng], Math.min(zoom, 14));
  }, [centro, valor, zoom]);

  return <div aria-label={etiqueta} className={styles.mapa} ref={contenedor} role="application" />;
}
