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

const Catalogo: ComponentType<PropiedadesPlantilla> = dynamic(
  () =>
    import("../templates/mipuesto/plantilla-mipuesto").then((m) => m.PlantillaMipuesto),
  { loading: PantallaCargando },
);

/* Cada muestra con su rubro: sin él, las dos mostraban hamburguesas —también la
   tienda de ropa—. La primera es de comida a propósito: es la única con fotos
   de verdad, y los avisos que flotan encima hablan de salteñas y api. */
const PUESTO = crearDatosDemoPlantilla({
  nombre: "Doña Rosa",
  descripcion: "Salteñas y comida casera, en el mercado de siempre.",
  telefonoWhatsapp: "70000000",
  tipoNegocio: "tienda_virtual",
  rubro: "restaurante",
});

const TIENDA = crearDatosDemoPlantilla({
  nombre: "Tienda Kantuta",
  descripcion: "Ropa y accesorios elegidos uno por uno en la feria.",
  telefonoWhatsapp: "70000000",
  tipoNegocio: "tienda_virtual",
  rubro: "ropa_y_calzado",
});

/* Dos catálogos de verdad, no una ilustración: es el mismo catálogo que recibe
   el cliente que paga. El segundo aparece solo en pantallas anchas, y está ahí
   para decir sin texto lo que la página tardaría un párrafo en explicar — que
   el catálogo no sale igual para todos.

   Antes eran dos plantillas distintas. Ahora el diseño es uno solo y lo que
   cambia entre los dos teléfonos es lo que de verdad cambia entre dos negocios:
   su color, sus productos y sus categorías. Uno claro y otro oscuro. */
export function VitrinaPortada() {
  return (
    <div className={styles.vitrina}>
      <div className={styles.telefono}>
        <div aria-hidden="true" className={styles.barraTelefono}>
          <span>9:41</span>
          <span className={styles.muesca} />
          <span className={styles.bateria} />
        </div>
        <div className={styles.pantalla} data-marco="telefono">
          <Catalogo datos={PUESTO} paleta="mercado" />
        </div>
      </div>
      <div className={`${styles.telefono} ${styles.telefonoAtras}`} aria-hidden="true">
        <div className={styles.barraTelefono}>
          <span>9:41</span>
          <span className={styles.muesca} />
          <span className={styles.bateria} />
        </div>
        <div className={styles.pantalla} data-marco="telefono">
          <Catalogo datos={TIENDA} paleta="noche" />
        </div>
      </div>
    </div>
  );
}
