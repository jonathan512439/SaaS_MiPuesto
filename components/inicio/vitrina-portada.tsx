"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

import { crearDatosDemoPlantilla } from "../../lib/plantillas/datos-demo";
import type { PropiedadesPlantilla } from "../../lib/plantillas/tipos";
import { Esqueleto } from "../ui";
import styles from "./vitrina-portada.module.css";

function PantallaCargando() {
  return (
    <div aria-hidden="true" className={styles.cargando}>
      <Esqueleto variante="imagen" />
      <Esqueleto variante="titulo" />
      <Esqueleto />
      <Esqueleto />
    </div>
  );
}

const Feria: ComponentType<PropiedadesPlantilla> = dynamic(
  () => import("../templates/feria/plantilla-feria").then((m) => m.PlantillaFeria),
  { loading: PantallaCargando },
);

const Moderna: ComponentType<PropiedadesPlantilla> = dynamic(
  () => import("../templates/moderna/plantilla-moderna").then((m) => m.PlantillaModerna),
  { loading: PantallaCargando },
);

const PUESTO = crearDatosDemoPlantilla({
  nombre: "Frutas Doña Rosa",
  descripcion: "Puesto 42 del mercado, fruta de temporada al peso.",
  telefonoWhatsapp: "70000000",
  tipoNegocio: "tienda_virtual",
});

const TIENDA = crearDatosDemoPlantilla({
  nombre: "Tienda Kantuta",
  descripcion: "Ropa y accesorios elegidos uno por uno en la feria.",
  telefonoWhatsapp: "70000000",
  tipoNegocio: "tienda_virtual",
});

/* Dos catálogos de verdad, no una ilustración: son las mismas plantillas que
   recibe el cliente que paga. El segundo aparece solo en pantallas anchas, y
   está ahí para decir sin texto lo que la página tardaría un párrafo en
   explicar — que el catálogo no sale igual para todos.
   Uno claro y otro oscuro, y comparte tipografía con la demostración de más
   abajo: así la portada no arrastra una familia extra solo para el adorno. */
export function VitrinaPortada() {
  return (
    <div className={styles.vitrina}>
      <div className={styles.telefono}>
        <div aria-hidden="true" className={styles.barraTelefono}>
          <span>9:41</span>
          <span className={styles.muesca} />
          <span className={styles.bateria} />
        </div>
        <div className={styles.pantalla}>
          <Feria datos={PUESTO} paleta="mercado" />
        </div>
      </div>
      <div className={`${styles.telefono} ${styles.telefonoAtras}`} aria-hidden="true">
        <div className={styles.barraTelefono}>
          <span>9:41</span>
          <span className={styles.muesca} />
          <span className={styles.bateria} />
        </div>
        <div className={styles.pantalla}>
          <Moderna datos={TIENDA} paleta="noche" />
        </div>
      </div>
    </div>
  );
}
