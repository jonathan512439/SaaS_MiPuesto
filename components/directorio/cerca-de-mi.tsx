"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { redondearCerca } from "../../lib/directorio-cerca";
import styles from "./cerca-de-mi.module.css";

/* «Cerca de mí»: el único pedazo del directorio que necesita el navegador.
 *
 * El permiso de ubicación se pide **al tocar el botón**, nunca al entrar: nadie
 * abre un directorio esperando que le pregunten dónde está.
 *
 * La ubicación se redondea a dos decimales (~1 km) **antes** de salir del
 * navegador, y viaja en la dirección para que el buscador ordene por distancia.
 * No se guarda en ningún lado. Redondeada así no dice dónde vive nadie, y dos
 * vecinos piden la misma dirección.
 */
export function CercaDeMi({ direccionSinCerca }: { direccionSinCerca: string }) {
  const router = useRouter();
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState("");

  function ubicar() {
    if (!("geolocation" in navigator)) {
      setAviso("Tu navegador no comparte la ubicación. Elige tu ciudad y tu zona.");
      return;
    }
    setBuscando(true);
    setAviso("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { lat, lng } = redondearCerca(coords.latitude, coords.longitude);
        const separador = direccionSinCerca.includes("?") ? "&" : "?";
        router.push(`${direccionSinCerca}${separador}cerca=${lat},${lng}`);
      },
      (problema) => {
        setBuscando(false);
        setAviso(
          problema.code === problema.PERMISSION_DENIED
            ? "No diste permiso de ubicación. Puedes darlo desde el candado junto a la dirección, o elegir tu ciudad y tu zona."
            : "No pudimos saber dónde estás. Elige tu ciudad y tu zona.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <div className={styles.cerca}>
      <button className={styles.boton} disabled={buscando} onClick={ubicar} type="button">
        {buscando ? "Buscando dónde estás…" : "Cerca de mí"}
      </button>
      {aviso ? (
        <p className={styles.aviso} role="status">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
