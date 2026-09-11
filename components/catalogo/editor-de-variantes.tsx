"use client";

import { useEffect, useState } from "react";

import {
  LARGO_NOMBRE_VARIANTE,
  MAXIMO_VARIANTES,
} from "../../lib/catalogo/variantes";
import { formatearPrecioBolivianos } from "../../lib/precios";
import { Boton, useAvisos } from "../ui";
import styles from "./editor-de-variantes.module.css";

/* Una presentación mientras se edita: todo en texto.
 *
 * El precio y las existencias se escriben, y un campo a medio escribir —«1» de
 * «19»— no es un número todavía. Convertirlo en cada tecla haría que borrar el
 * último dígito mostrara otra cosa. Se convierten al guardar. */
type VarianteEnEdicion = {
  nombre: string;
  precio: string;
  cantidadStock: string;
};

type FilaGuardada = {
  nombre: string;
  precio: number | null;
  cantidad_stock: number | null;
};

/* Las presentaciones de un producto: talla, color, tamaño.
 *
 * Solo aparece cuando el producto ya existe: necesita su identificador para
 * guardarlas, y pedírselas antes de crearlo obligaría a mantener dos caminos de
 * guardado para la misma cosa.
 */
export function EditorDeVariantes({
  productoId,
  precioProducto,
  controlaStock,
  vendeTiempo,
}: {
  productoId: string;
  precioProducto: number;
  controlaStock: boolean;
  vendeTiempo: boolean;
}) {
  const [variantes, setVariantes] = useState<VarianteEnEdicion[] | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const { mostrarAviso } = useAvisos();

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const respuesta = await fetch(`/api/catalogo/productos/${productoId}/variantes`);
        const datos = (await respuesta.json()) as { variantes?: FilaGuardada[] };
        if (!vigente) return;
        setVariantes(
          (datos.variantes ?? []).map((fila) => ({
            nombre: fila.nombre,
            precio: fila.precio === null ? "" : String(fila.precio),
            cantidadStock: fila.cantidad_stock === null ? "" : String(fila.cantidad_stock),
          })),
        );
      } catch {
        if (vigente) setVariantes([]);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [productoId]);

  /* Una categoría que vende tiempo no tiene presentaciones: tiene horarios. En
     vez de dibujar un editor que va a rechazar todo lo que se escriba, se dice
     por qué no está. */
  if (vendeTiempo) {
    return (
      <p className={styles.noAplica}>
        Esta categoría vende tiempo. Sus horarios se configuran en la agenda, no acá.
      </p>
    );
  }

  if (variantes === null) {
    return <p className={styles.noAplica}>Cargando las presentaciones…</p>;
  }

  function cambiar(indice: number, cambio: Partial<VarianteEnEdicion>) {
    setVariantes((actuales) =>
      (actuales ?? []).map((variante, posicion) =>
        posicion === indice ? { ...variante, ...cambio } : variante,
      ),
    );
    setErrores({});
  }

  async function guardar() {
    setGuardando(true);
    setErrores({});
    try {
      const respuesta = await fetch(`/api/catalogo/productos/${productoId}/variantes`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          variantes: (variantes ?? []).map((variante) => ({
            nombre: variante.nombre,
            precio: variante.precio,
            cantidadStock: variante.cantidadStock,
          })),
        }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
        variantes?: FilaGuardada[];
      };
      if (!respuesta.ok || !datos.variantes) {
        setErrores(datos.errores ?? {});
        throw new Error(datos.error || "No se pudieron guardar las presentaciones.");
      }
      mostrarAviso({ titulo: "Presentaciones guardadas", variante: "exito" });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudieron guardar",
        mensaje: error instanceof Error ? error.message : "Intentá nuevamente.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className={styles.seccion}>
      <header className={styles.cabecera}>
        <h3>Presentaciones</h3>
        <p>
          Talla, color o tamaño. Dejá el precio vacío si cuestan lo mismo que el producto
          ({formatearPrecioBolivianos(precioProducto)}).
        </p>
      </header>

      {variantes.length === 0 ? (
        <p className={styles.noAplica}>
          Este producto se vende de una sola forma. Agregá presentaciones si viene en varias.
        </p>
      ) : null}

      {variantes.map((variante, indice) => (
        <div className={styles.fila} key={indice}>
          <label className={styles.control}>
            <span>Nombre</span>
            <input
              disabled={guardando}
              maxLength={LARGO_NOMBRE_VARIANTE}
              onChange={(evento) => cambiar(indice, { nombre: evento.target.value })}
              placeholder="M"
              type="text"
              value={variante.nombre}
            />
            {errores[`variantes.${indice}.nombre`] ? (
              <strong className={styles.error}>{errores[`variantes.${indice}.nombre`]}</strong>
            ) : null}
          </label>

          <label className={styles.control}>
            <span>Precio</span>
            <input
              disabled={guardando}
              inputMode="decimal"
              onChange={(evento) => cambiar(indice, { precio: evento.target.value })}
              placeholder="Igual al producto"
              type="text"
              value={variante.precio}
            />
            {errores[`variantes.${indice}.precio`] ? (
              <strong className={styles.error}>{errores[`variantes.${indice}.precio`]}</strong>
            ) : null}
          </label>

          {controlaStock ? (
            <label className={styles.control}>
              <span>Existencias</span>
              <input
                disabled={guardando}
                inputMode="numeric"
                onChange={(evento) => cambiar(indice, { cantidadStock: evento.target.value })}
                placeholder="—"
                type="text"
                value={variante.cantidadStock}
              />
              {errores[`variantes.${indice}.cantidadStock`] ? (
                <strong className={styles.error}>
                  {errores[`variantes.${indice}.cantidadStock`]}
                </strong>
              ) : null}
            </label>
          ) : null}

          <button
            className={styles.quitar}
            disabled={guardando}
            onClick={() =>
              setVariantes((actuales) => (actuales ?? []).filter((_, p) => p !== indice))
            }
            type="button"
          >
            Quitar
          </button>
        </div>
      ))}

      {errores.variantes ? <strong className={styles.error}>{errores.variantes}</strong> : null}

      {/* Lo que todavía no hace, dicho donde se decide. Prometer por omisión que
          el carrito respeta estas existencias sería mentirle al dueño sobre su
          propio inventario. */}
      {controlaStock && variantes.length > 0 ? (
        <p className={styles.aviso}>
          Las existencias por presentación son para tu control. El carrito todavía
          reserva sobre el total del producto.
        </p>
      ) : null}

      <div className={styles.pie}>
        <Boton
          disabled={variantes.length >= MAXIMO_VARIANTES || guardando}
          onClick={() =>
            setVariantes([...variantes, { nombre: "", precio: "", cantidadStock: "" }])
          }
          type="button"
          variante="secundario"
        >
          Agregar presentación
        </Boton>
        <Boton cargando={guardando} onClick={() => void guardar()} type="button">
          Guardar presentaciones
        </Boton>
      </div>
    </section>
  );
}
