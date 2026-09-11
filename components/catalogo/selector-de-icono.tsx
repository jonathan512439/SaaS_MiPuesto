"use client";

import { useMemo, useState } from "react";

import { IconoCatalogo } from "../iconos/icono-catalogo";
import {
  buscarIconos,
  grupoSugeridoPara,
  normalizarIcono,
} from "../../lib/catalogo/categorias";
import { Boton, HojaModal } from "../ui";
import styles from "./selector-de-icono.module.css";

/* El ícono de una categoría, elegido por el dueño.
 *
 * Se abre en una hoja y no en un desplegable: son ciento y pico dibujos y hay
 * que verlos, no leer sus nombres en una lista. Un `select` con «foco», «lampara»
 * y «enchufe» escritos obliga a imaginarse cada uno.
 *
 * Arriba va el grupo del rubro del negocio, y después el resto. No se limita a
 * ese grupo: una ferretería que también vende artículos de limpieza tiene que
 * poder llegar al aerosol, y una lista por rubro siempre le va a faltar algo a
 * alguien.
 */
export function SelectorDeIcono({
  etiqueta = "Ícono",
  rubro,
  valor,
  alElegir,
}: {
  etiqueta?: string;
  rubro: string | null;
  valor: unknown;
  alElegir: (icono: string) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [termino, setTermino] = useState("");
  const elegido = normalizarIcono(valor);

  const grupos = useMemo(() => {
    const encontrados = buscarIconos(termino);
    if (termino.trim() !== "") return encontrados;
    /* El grupo del rubro primero. `toSorted` y no un `sort` sobre el arreglo
       recibido: `buscarIconos` devuelve la constante generada, y ordenarla en
       el lugar la dejaría reordenada para el resto de la aplicación. */
    const sugerido = grupoSugeridoPara(rubro);
    return encontrados.toSorted((a, b) => {
      if (a.id === sugerido) return -1;
      if (b.id === sugerido) return 1;
      return 0;
    });
  }, [rubro, termino]);

  const total = grupos.reduce((suma, grupo) => suma + grupo.iconos.length, 0);

  return (
    <div className={styles.campo}>
      <span className={styles.etiqueta}>{etiqueta}</span>
      <button className={styles.elegido} onClick={() => setAbierta(true)} type="button">
        <IconoCatalogo nombre={elegido} />
        <span>Cambiar</span>
      </button>

      <HojaModal
        acciones={
          <Boton onClick={() => setAbierta(false)} type="button" variante="secundario">
            Cerrar
          </Boton>
        }
        abierta={abierta}
        descripcion="Buscá por lo que vendés: «foco», «tornillo», «pollo»."
        onCerrar={() => setAbierta(false)}
        titulo="Elegí un ícono"
      >
        <div className={styles.contenido}>
          <label className={styles.buscador}>
            <span className={styles.soloLectores}>Buscar un ícono</span>
            <input
              autoComplete="off"
              onChange={(evento) => setTermino(evento.target.value)}
              placeholder="Buscar…"
              type="search"
              value={termino}
            />
          </label>

          {total === 0 ? (
            <p className={styles.vacio}>
              No encontré ninguno con «{termino}». Probá con otra palabra.
            </p>
          ) : null}

          {grupos.map((grupo) => (
            <section className={styles.grupo} key={grupo.id}>
              <h3>{grupo.titulo}</h3>
              <div className={styles.rejilla}>
                {grupo.iconos.map((nombre) => (
                  <button
                    aria-pressed={nombre === elegido}
                    className={nombre === elegido ? styles.activo : undefined}
                    key={nombre}
                    onClick={() => {
                      alElegir(nombre);
                      setAbierta(false);
                      setTermino("");
                    }}
                    type="button"
                    /* El nombre como título del botón, no del dibujo: el dibujo
                       es decorativo y el botón es lo que se anuncia. */
                    title={nombre}
                  >
                    <IconoCatalogo nombre={nombre} />
                    <span className={styles.soloLectores}>{nombre}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </HojaModal>
    </div>
  );
}
