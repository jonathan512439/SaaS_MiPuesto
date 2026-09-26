"use client";

import { useEffect, useState } from "react";

import {
  ATAJOS_DE_PRESENTACIONES,
  LARGO_NOMBRE_VARIANTE,
  MAXIMO_VARIANTES,
  TEXTOS_DE_PRESENTACION,
  TIPOS_PRESENTACION,
  cuerpoDeGuardadoDePresentaciones,
  esTipoPresentacion,
  normalizarNombreDePresentacion,
  ordenarPresentaciones,
  type TipoPresentacion,
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
  /* El de la base, o `null` si todavía no se guardó. Se reenvía al guardar para
     que la presentación conserve su identidad: a ella apuntan las reservas y los
     pedidos (fase 13). */
  id: string | null;
  nombre: string;
  precio: string;
  cantidadStock: string;
  visible: boolean;
  /* Unidades apartadas en pedidos pendientes. Solo se muestra: la escribe el
     motor de compra. */
  reservadas: number;
};

type FilaGuardada = {
  id: string;
  nombre: string;
  precio: number | null;
  cantidad_stock: number | null;
  cantidad_reservada: number;
  visible: boolean;
};

function aEdicion(fila: FilaGuardada): VarianteEnEdicion {
  return {
    id: fila.id,
    nombre: fila.nombre,
    precio: fila.precio === null ? "" : String(fila.precio),
    cantidadStock: fila.cantidad_stock === null ? "" : String(fila.cantidad_stock),
    visible: fila.visible !== false,
    reservadas: fila.cantidad_reservada ?? 0,
  };
}

function nueva(nombre = ""): VarianteEnEdicion {
  return { id: null, nombre, precio: "", cantidadStock: "", visible: true, reservadas: 0 };
}

/* Las presentaciones de un producto: tallas, números de calzado, tamaños.
 *
 * Solo aparece cuando el producto ya existe: necesita su identificador para
 * guardarlas, y pedírselas antes de crearlo obligaría a mantener dos caminos de
 * guardado para la misma cosa.
 *
 * Desde la fase 13 son de verdad: el carrito las exige, reserva sobre cada una
 * y las descuenta al confirmar. Por eso las existencias de cada una son
 * obligatorias si el producto las controla, y una con unidades apartadas no se
 * puede quitar —se oculta—.
 */
export function EditorDeVariantes({
  productoId,
  precioProducto,
  controlaStock,
  vendeTiempo,
  alGuardar,
}: {
  productoId: string;
  precioProducto: number;
  controlaStock: boolean;
  vendeTiempo: boolean;
  /* Para que el formulario del producto sepa si ahora las existencias van por
     presentación y deje de pedir las suyas, y si quedó llevando la cuenta. */
  alGuardar?: (cantidad: number, controlaStock: boolean) => void;
}) {
  /* «Llevar la cuenta» se decide acá, con las tallas: antes había que encender
     «Controlar existencias» en el producto con una cantidad para el producto
     entero, que se descartaba al guardar las tallas. */
  const [llevaCuenta, setLlevaCuenta] = useState(controlaStock);
  /* Si el formulario del producto cambia «Controlar existencias», la casilla lo
     sigue. Se ajusta al dibujar y no en un efecto: así no hay un dibujo de más
     con el valor viejo. */
  const [controlaStockVisto, setControlaStockVisto] = useState(controlaStock);
  if (controlaStockVisto !== controlaStock) {
    setControlaStockVisto(controlaStock);
    setLlevaCuenta(controlaStock);
  }
  const [tipo, setTipo] = useState<TipoPresentacion>("presentacion");
  const [variantes, setVariantes] = useState<VarianteEnEdicion[] | null>(null);
  const [cantidadGuardada, setCantidadGuardada] = useState(0);
  const [existenciasProducto, setExistenciasProducto] = useState("");
  const [conMedios, setConMedios] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  /* Si el tipo lo sugirió la categoría: se dice, para que no parezca una
     elección que el dueño no hizo. */
  const [sugeridoPorCategoria, setSugeridoPorCategoria] = useState(false);
  const { mostrarAviso } = useAvisos();

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const respuesta = await fetch(`/api/catalogo/productos/${productoId}/variantes`);
        const datos = (await respuesta.json()) as {
          variantes?: FilaGuardada[];
          tipo?: string;
          sugerido?: string | null;
        };
        if (!vigente) return;
        const filas = (datos.variantes ?? []).map(aEdicion);
        /* Sin presentaciones todavía, abre en lo que sugiere la categoría: la
           polera nueva, en «Talla» con sus atajos a la vista. */
        const sugerido = filas.length === 0 && esTipoPresentacion(datos.sugerido) ? datos.sugerido : null;
        const tipoGuardado = sugerido ?? (esTipoPresentacion(datos.tipo) ? datos.tipo : "presentacion");
        setTipo(tipoGuardado);
        setSugeridoPorCategoria(sugerido !== null);
        setVariantes(ordenarPresentaciones(tipoGuardado, filas));
        setCantidadGuardada(filas.length);
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
        Esta categoría vende tiempo. Sus horarios se configuran en la agenda, no aquí.
      </p>
    );
  }

  if (variantes === null) {
    return <p className={styles.noAplica}>Cargando las presentaciones…</p>;
  }

  const textos = TEXTOS_DE_PRESENTACION[tipo];
  const atajos = ATAJOS_DE_PRESENTACIONES.filter((atajo) => atajo.tipo === tipo);
  const algunoAdmiteMedios = atajos.some((atajo) => atajo.admiteMedios);
  /* Sacar todas las presentaciones de un producto que controla existencias le
     devuelve las suyas, y hay que decir cuántas. */
  const pideExistenciasDelProducto = llevaCuenta && cantidadGuardada > 0 && variantes.length === 0;

  function cambiar(indice: number, cambio: Partial<VarianteEnEdicion>) {
    setVariantes((actuales) =>
      (actuales ?? []).map((variante, posicion) =>
        posicion === indice ? { ...variante, ...cambio } : variante,
      ),
    );
    setErrores({});
  }

  /* Un atajo agrega lo que falta y no toca lo que ya está: el dueño puede haber
     cargado precios o existencias en algunas. */
  function aplicarAtajo(nombres: string[]) {
    const existentes = variantes ?? [];
    const yaEstan = new Set(
      existentes.map((variante) => normalizarNombreDePresentacion(variante.nombre, tipo) ?? variante.nombre),
    );
    const faltan = nombres.filter((nombre) => !yaEstan.has(nombre));
    const lugar = Math.max(0, MAXIMO_VARIANTES - existentes.length);
    if (faltan.length > lugar) {
      mostrarAviso({
        titulo: "No entran todas",
        mensaje: `Un producto admite hasta ${MAXIMO_VARIANTES} presentaciones. Agregamos las primeras ${lugar}.`,
        variante: "advertencia",
      });
    }
    setVariantes(
      ordenarPresentaciones(tipo, [...existentes, ...faltan.slice(0, lugar).map((nombre) => nueva(nombre))]),
    );
    setErrores({});
  }

  async function guardar() {
    /* Se ordena antes de mandar, y en pantalla también: los errores vuelven
       numerados según el orden enviado y tienen que caer en el renglón que se
       ve. */
    const ordenadas = ordenarPresentaciones(tipo, variantes ?? []);
    setVariantes(ordenadas);
    setGuardando(true);
    setErrores({});
    try {
      const respuesta = await fetch(`/api/catalogo/productos/${productoId}/variantes`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          cuerpoDeGuardadoDePresentaciones(
            tipo,
            ordenadas,
            llevaCuenta,
            pideExistenciasDelProducto ? Number.parseInt(existenciasProducto, 10) : undefined,
          ),
        ),
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
      /* Lo que quedó guardado, con los identificadores de las nuevas: el
         próximo guardado tiene que actualizarlas, no crearlas de nuevo. */
      const filas = datos.variantes.map(aEdicion);
      setVariantes(ordenarPresentaciones(tipo, filas));
      setCantidadGuardada(filas.length);
      setExistenciasProducto("");
      alGuardar?.(filas.length, llevaCuenta);
      mostrarAviso({ titulo: "Presentaciones guardadas", variante: "exito" });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudieron guardar",
        mensaje: error instanceof Error ? error.message : "Intenta nuevamente.",
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
          Tallas, números de calzado o tamaños. Deja el precio vacío si cuesta lo mismo que el
          producto ({formatearPrecioBolivianos(precioProducto)}).
        </p>
      </header>

      {/* Qué son: decide cómo se pregunta en el catálogo («Elige tu número»),
          cómo se ordenan y qué se acepta. */}
      <fieldset className={styles.tipos} disabled={guardando}>
        <legend>¿Qué son?</legend>
        <div className={styles.opciones}>
          {TIPOS_PRESENTACION.map((opcion) => (
            <label className={opcion === tipo ? styles.opcionElegida : styles.opcion} key={opcion}>
              <input
                checked={opcion === tipo}
                name={`tipo-presentacion-${productoId}`}
                onChange={() => {
                  setTipo(opcion);
                  setSugeridoPorCategoria(false);
                  setVariantes((actuales) => ordenarPresentaciones(opcion, actuales ?? []));
                  setErrores({});
                }}
                type="radio"
                value={opcion}
              />
              {TEXTOS_DE_PRESENTACION[opcion].nombre}
            </label>
          ))}
        </div>
      </fieldset>

      {sugeridoPorCategoria ? (
        <p className={styles.nota}>Sugerido por su categoría. Puedes elegir otro.</p>
      ) : null}

      {atajos.length > 0 ? (
        <div className={styles.atajos}>
          <span>Cargar de una vez:</span>
          {atajos.map((atajo) => (
            <Boton
              disabled={guardando}
              key={atajo.id}
              onClick={() => aplicarAtajo(atajo.generar(conMedios && atajo.admiteMedios))}
              type="button"
              variante="secundario"
            >
              {atajo.etiqueta}
            </Boton>
          ))}
          {algunoAdmiteMedios ? (
            <label className={styles.casilla}>
              <input
                checked={conMedios}
                disabled={guardando}
                onChange={(evento) => setConMedios(evento.target.checked)}
                type="checkbox"
              />
              Con medios números (38,5)
            </label>
          ) : null}
        </div>
      ) : null}

      {variantes.length === 0 ? (
        <p className={styles.noAplica}>
          Este producto se vende de una sola forma. Agrega presentaciones si viene en varias.
        </p>
      ) : null}

      {variantes.map((variante, indice) => {
        const clave = variante.id ?? `nueva-${indice}`;
        return (
          <div className={variante.visible ? styles.fila : styles.filaOculta} key={clave}>
            <label className={styles.control}>
              <span>{textos.nombre}</span>
              <input
                disabled={guardando}
                maxLength={LARGO_NOMBRE_VARIANTE}
                onChange={(evento) => cambiar(indice, { nombre: evento.target.value })}
                placeholder={tipo === "numero" ? "40,5" : tipo === "talla" ? "M" : tipo === "tamano" ? "7,5 kg" : "Grande"}
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

            {llevaCuenta ? (
              <label className={styles.control}>
                <span>Existencias</span>
                <input
                  disabled={guardando}
                  inputMode="numeric"
                  onChange={(evento) => cambiar(indice, { cantidadStock: evento.target.value })}
                  placeholder="0"
                  type="text"
                  value={variante.cantidadStock}
                />
                {errores[`variantes.${indice}.cantidadStock`] ? (
                  <strong className={styles.error}>
                    {errores[`variantes.${indice}.cantidadStock`]}
                  </strong>
                ) : variante.reservadas > 0 ? (
                  <small className={styles.apartadas}>{variante.reservadas} apartada(s) en pedidos</small>
                ) : null}
              </label>
            ) : null}

            <label className={styles.casilla}>
              <input
                checked={variante.visible}
                disabled={guardando}
                onChange={(evento) => cambiar(indice, { visible: evento.target.checked })}
                type="checkbox"
              />
              A la vista
            </label>

            {/* Con unidades apartadas no se quita: hay un comprador esperando que
                se le confirme. Se dice por qué, en vez de un botón gris mudo. */}
            {variante.reservadas > 0 ? (
              <small className={styles.nota}>
                Tiene pedidos pendientes: ocúltala si ya no la vendes.
              </small>
            ) : (
              <Boton
                disabled={guardando}
                onClick={() =>
                  setVariantes((actuales) => (actuales ?? []).filter((_, posicion) => posicion !== indice))
                }
                type="button"
                variante="secundario"
              >
                Quitar
              </Boton>
            )}
          </div>
        );
      })}

      {errores.variantes ? <strong className={styles.error}>{errores.variantes}</strong> : null}

      {/* Con tallas a la vista, la cuenta se enciende acá mismo: la columna de
          existencias aparece al marcarla y se guarda con las tallas. */}
      {variantes.length > 0 ? (
        <label className={styles.casilla}>
          <input
            checked={llevaCuenta}
            disabled={guardando}
            onChange={(evento) => {
              setLlevaCuenta(evento.target.checked);
              setErrores({});
            }}
            type="checkbox"
          />
          Llevar la cuenta de cuántas quedan
        </label>
      ) : null}

      {pideExistenciasDelProducto ? (
        <label className={styles.control}>
          <span>Existencias del producto</span>
          <input
            disabled={guardando}
            inputMode="numeric"
            onChange={(evento) => setExistenciasProducto(evento.target.value)}
            placeholder="0"
            type="text"
            value={existenciasProducto}
          />
          <small className={styles.nota}>
            Sin presentaciones, el producto vuelve a llevar sus propias existencias.
          </small>
        </label>
      ) : null}

      {llevaCuenta && variantes.length > 0 ? (
        <p className={styles.aviso}>
          Cada presentación lleva sus existencias. El carrito aparta y descuenta de la que eligió
          el cliente.
        </p>
      ) : null}

      <div className={styles.pie}>
        <Boton
          disabled={variantes.length >= MAXIMO_VARIANTES || guardando}
          onClick={() => setVariantes([...variantes, nueva()])}
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
