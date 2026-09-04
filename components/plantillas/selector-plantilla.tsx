"use client";

import { useState, type ComponentType, type FormEvent } from "react";

import type {
  DatosPlantilla,
  PlantillaId,
  PropiedadesPlantilla,
} from "../../lib/plantillas/tipos";
import { Boton, useAvisos } from "../ui";
import { PlantillaClasica, PlantillaMinimal, PlantillaModerna } from "../templates";
import styles from "./selector-plantilla.module.css";

type PropiedadesSelector = {
  datos: DatosPlantilla;
  plantillaInicial: PlantillaId;
};

type DefinicionPlantilla = {
  id: PlantillaId;
  nombre: string;
  recomendacion: string;
  VistaPrevia: ComponentType<PropiedadesPlantilla>;
};

const DEFINICIONES: DefinicionPlantilla[] = [
  {
    id: "clasica",
    nombre: "Clásica",
    recomendacion: "Ideal para restaurantes y negocios con categorías claras.",
    VistaPrevia: PlantillaClasica,
  },
  {
    id: "moderna",
    nombre: "Moderna",
    recomendacion: "Ideal para tiendas donde las imágenes ayudan a decidir.",
    VistaPrevia: PlantillaModerna,
  },
  {
    id: "minimal",
    nombre: "Mínima",
    recomendacion: "Ideal para servicios, reservas y contacto directo.",
    VistaPrevia: PlantillaMinimal,
  },
];

export function SelectorPlantilla({ datos, plantillaInicial }: PropiedadesSelector) {
  const [plantillaElegida, setPlantillaElegida] = useState(plantillaInicial);
  const [plantillaGuardada, setPlantillaGuardada] = useState(plantillaInicial);
  const [guardando, setGuardando] = useState(false);
  const { mostrarAviso } = useAvisos();

  async function guardarPlantilla(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);

    try {
      const respuesta = await fetch("/api/negocios/plantilla", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantilla_id: plantillaElegida }),
      });
      const resultado = (await respuesta.json()) as {
        error?: string;
        plantilla_id?: PlantillaId;
      };

      if (!respuesta.ok || !resultado.plantilla_id) {
        throw new Error(resultado.error || "No se pudo guardar la plantilla.");
      }

      setPlantillaGuardada(resultado.plantilla_id);
      mostrarAviso({ titulo: "Plantilla guardada", variante: "exito" });
    } catch (causa) {
      mostrarAviso({
        titulo: "No se pudo guardar la plantilla",
        mensaje: causa instanceof Error ? causa.message : "Intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  const hayCambioPendiente = plantillaElegida !== plantillaGuardada;

  return (
    <form className={styles.formulario} onSubmit={guardarPlantilla}>
      <fieldset className={styles.grupo}>
        <legend className={styles.leyenda}>Compara las tres opciones</legend>
        <p className={styles.ayuda}>
          Selecciona una vista previa y guarda el cambio cuando estés conforme.
        </p>

        <div className={styles.opciones}>
          {DEFINICIONES.map(({ id, nombre, recomendacion, VistaPrevia }) => {
            const elegida = plantillaElegida === id;

            return (
              <section className={elegida ? styles.opcionElegida : styles.opcion} key={id}>
                <div className={styles.control}>
                  <input
                    checked={elegida}
                    id={`plantilla-${id}`}
                    name="plantilla"
                    onChange={() => setPlantillaElegida(id)}
                    type="radio"
                    value={id}
                  />
                  <label htmlFor={`plantilla-${id}`}>
                    <strong>{nombre}</strong>
                    <span>{recomendacion}</span>
                  </label>
                  {elegida ? (
                    <span className={styles.estado}>
                      <span aria-hidden="true">✓</span> Seleccionada
                    </span>
                  ) : null}
                </div>
                <div className={styles.vistaPrevia}>
                  <div className={styles.lienzo}>
                    <VistaPrevia datos={datos} />
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </fieldset>

      <div className={styles.barra}>
        <div className={styles.acciones}>
          <p className={hayCambioPendiente ? styles.avisoPendiente : styles.avisoCambio}>
            {hayCambioPendiente
              ? "Tienes un cambio sin guardar."
              : "Esta es la plantilla guardada actualmente."}
          </p>
          <Boton cargando={guardando} disabled={!hayCambioPendiente} type="submit">
            Guardar plantilla
          </Boton>
        </div>
      </div>
    </form>
  );
}
