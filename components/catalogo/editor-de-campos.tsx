"use client";

import { useEffect, useState } from "react";

import {
  DEFINICIONES_TIPOS,
  LARGO_NOMBRE,
  LARGO_UNIDAD,
  MAXIMO_ATRIBUTOS,
  MAXIMO_EN_TARJETA,
  type TipoAtributo,
} from "../../lib/catalogo/atributos";
import { Boton, useAvisos, useConfirmacion } from "../ui";
import styles from "./editor-de-campos.module.css";

/* Un campo mientras se edita.
 *
 * Se separa del tipo guardado por una razón concreta: acá las opciones son **una
 * línea de texto** —una por renglón— y no un arreglo. El dueño escribe una lista;
 * convertirla a arreglo en cada tecla haría que borrar un renglón vacío en el
 * medio reordenara lo que está escribiendo. */
type CampoEnEdicion = {
  clave: string;
  nombre: string;
  tipo: TipoAtributo;
  unidad: string;
  opciones: string;
  obligatorio: boolean;
  enTarjeta: boolean;
  enResumen: boolean;
};

const NUEVO: CampoEnEdicion = {
  /* Vacía a propósito: el servidor la deriva del nombre. Un campo que ya existe
     llega con la suya y la conserva, que es lo que impide que renombrar «Potencia»
     deje huérfano el valor de todos los productos. */
  clave: "",
  nombre: "",
  tipo: "texto",
  unidad: "",
  opciones: "",
  obligatorio: false,
  enTarjeta: false,
  enResumen: true,
};

type FilaGuardada = {
  clave: string;
  nombre: string;
  tipo: TipoAtributo;
  unidad: string | null;
  opciones: string[];
  obligatorio: boolean;
  en_tarjeta: boolean;
  en_resumen: boolean;
};

function desdeFila(fila: FilaGuardada): CampoEnEdicion {
  return {
    clave: fila.clave,
    nombre: fila.nombre,
    tipo: fila.tipo,
    unidad: fila.unidad ?? "",
    opciones: fila.opciones.join("\n"),
    obligatorio: fila.obligatorio,
    enTarjeta: fila.en_tarjeta,
    enResumen: fila.en_resumen,
  };
}

/* Los campos que lleva cada producto de esta categoría.
 *
 * Se carga cuando la categoría se abre y no con el resto del panel: son diez
 * filas por categoría y traerlas todas de entrada haría más lenta una pantalla
 * que la mayoría de las veces no las va a mirar.
 */
export function EditorDeCampos({
  categoriaId,
  categoriaNombre,
}: {
  categoriaId: string;
  categoriaNombre: string;
}) {
  const [campos, setCampos] = useState<CampoEnEdicion[] | null>(null);
  const [usos, setUsos] = useState<Record<string, number>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const respuesta = await fetch(`/api/catalogo/categorias/${categoriaId}/atributos`);
        const datos = (await respuesta.json()) as {
          atributos?: FilaGuardada[];
          usos?: Record<string, number>;
        };
        if (!vigente) return;
        setCampos((datos.atributos ?? []).map(desdeFila));
        setUsos(datos.usos ?? {});
      } catch {
        if (vigente) setCampos([]);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [categoriaId]);

  function cambiar(indice: number, cambio: Partial<CampoEnEdicion>) {
    setCampos((actuales) =>
      (actuales ?? []).map((campo, posicion) =>
        posicion === indice ? { ...campo, ...cambio } : campo,
      ),
    );
    setErrores({});
  }

  function mover(indice: number, direccion: -1 | 1) {
    setCampos((actuales) => {
      if (!actuales) return actuales;
      const destino = indice + direccion;
      if (destino < 0 || destino >= actuales.length) return actuales;
      const siguientes = [...actuales];
      [siguientes[indice], siguientes[destino]] = [siguientes[destino], siguientes[indice]];
      return siguientes;
    });
    setErrores({});
  }

  async function quitar(indice: number) {
    const campo = (campos ?? [])[indice];
    if (!campo) return;
    const cargados = usos[campo.clave] ?? 0;

    /* Un campo que nadie completó se quita sin preguntar: no hay nada que
       perder, y preguntar por todo enseña a contestar que sí sin leer. */
    if (cargados > 0) {
      const seguro = await confirmar({
        titulo: `Borrar «${campo.nombre}»`,
        descripcion: `Este campo tiene valor en ${cargados} ${
          cargados === 1 ? "producto" : "productos"
        }. Si lo borrás, ese dato se pierde.`,
        textoAccion: "Borrar el campo y su dato",
        destructiva: true,
      });
      if (!seguro) return;
    }

    setCampos((actuales) => (actuales ?? []).filter((_, posicion) => posicion !== indice));
    setErrores({});
  }

  async function guardar() {
    setGuardando(true);
    setErrores({});
    try {
      const respuesta = await fetch(`/api/catalogo/categorias/${categoriaId}/atributos`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          atributos: (campos ?? []).map((campo) => ({
            clave: campo.clave || undefined,
            nombre: campo.nombre,
            tipo: campo.tipo,
            unidad: campo.tipo === "numero" ? campo.unidad : "",
            /* Las opciones se parten acá, al mandar, y no en cada tecla: hacerlo
               mientras se escribe reordenaría la lista debajo del cursor. */
            opciones:
              campo.tipo === "opcion"
                ? campo.opciones.split("\n").map((opcion) => opcion.trim())
                : [],
            obligatorio: campo.obligatorio,
            enTarjeta: campo.enTarjeta,
            enResumen: campo.enResumen,
          })),
        }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
        atributos?: FilaGuardada[];
      };
      if (!respuesta.ok || !datos.atributos) {
        setErrores(datos.errores ?? {});
        throw new Error(datos.error || "No se pudieron guardar los campos.");
      }
      setCampos(datos.atributos.map(desdeFila));
      mostrarAviso({ titulo: "Campos guardados", variante: "exito" });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudieron guardar los campos",
        mensaje: error instanceof Error ? error.message : "Intentá nuevamente.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  if (campos === null) {
    return <p className={styles.cargando}>Cargando los campos…</p>;
  }

  const enTarjeta = campos.filter((campo) => campo.enTarjeta).length;

  return (
    <section className={styles.seccion}>
      <header className={styles.cabecera}>
        <h3>Los datos de «{categoriaNombre}»</h3>
        <p>
          Lo que cada producto de esta categoría va a llevar además del nombre y el precio.
          Una ferretería pone potencia y casquillo; una veterinaria, especie y etapa.
        </p>
      </header>

      {campos.length === 0 ? (
        <p className={styles.vacio}>
          Esta categoría no tiene datos propios todavía. Sus productos solo llevan nombre,
          descripción, precio y fotos.
        </p>
      ) : null}

      {campos.map((campo, indice) => (
        <fieldset className={styles.campo} disabled={guardando} key={`${campo.clave}-${indice}`}>
          <legend>
            {campo.nombre || "Campo nuevo"}
            {usos[campo.clave] ? <span> · cargado en {usos[campo.clave]}</span> : null}
          </legend>

          <div className={styles.fila}>
            <label className={styles.control}>
              <span>Cómo se llama</span>
              <input
                maxLength={LARGO_NOMBRE}
                onChange={(evento) => cambiar(indice, { nombre: evento.target.value })}
                placeholder="Potencia"
                type="text"
                value={campo.nombre}
              />
              {errores[`atributos.${indice}.nombre`] ? (
                <strong className={styles.error}>{errores[`atributos.${indice}.nombre`]}</strong>
              ) : null}
            </label>

            <label className={styles.control}>
              <span>Qué clase de dato es</span>
              <select
                onChange={(evento) =>
                  cambiar(indice, { tipo: evento.target.value as TipoAtributo })
                }
                value={campo.tipo}
              >
                {DEFINICIONES_TIPOS.map((definicion) => (
                  <option key={definicion.id} value={definicion.id}>
                    {definicion.nombre}
                  </option>
                ))}
              </select>
              {/* El ejemplo en vez de la explicación: se ve cómo va a quedar en
                  lugar de leer qué significa el tipo. */}
              <small>
                {DEFINICIONES_TIPOS.find((definicion) => definicion.id === campo.tipo)?.ejemplo}
              </small>
            </label>
          </div>

          {campo.tipo === "numero" ? (
            <label className={styles.control}>
              <span>Unidad</span>
              <input
                maxLength={LARGO_UNIDAD}
                onChange={(evento) => cambiar(indice, { unidad: evento.target.value })}
                placeholder="W"
                type="text"
                value={campo.unidad}
              />
              <small>La escribís una vez acá, no en cada producto. Podés dejarla vacía.</small>
              {errores[`atributos.${indice}.unidad`] ? (
                <strong className={styles.error}>{errores[`atributos.${indice}.unidad`]}</strong>
              ) : null}
            </label>
          ) : null}

          {campo.tipo === "opcion" ? (
            <label className={styles.control}>
              <span>Las opciones</span>
              <textarea
                onChange={(evento) => cambiar(indice, { opciones: evento.target.value })}
                placeholder={"E27\nE14\nGU10"}
                rows={4}
                value={campo.opciones}
              />
              <small>Una por renglón. Entre 2 y 24.</small>
              {errores[`atributos.${indice}.opciones`] ? (
                <strong className={styles.error}>{errores[`atributos.${indice}.opciones`]}</strong>
              ) : null}
            </label>
          ) : null}

          <div className={styles.interruptores}>
            <label>
              <input
                checked={campo.enTarjeta}
                onChange={(evento) => cambiar(indice, { enTarjeta: evento.target.checked })}
                type="checkbox"
              />
              <span>Mostrarlo en la tarjeta</span>
            </label>
            <label>
              <input
                checked={campo.enResumen}
                onChange={(evento) => cambiar(indice, { enResumen: evento.target.checked })}
                type="checkbox"
              />
              <span>Que viaje en el pedido de WhatsApp</span>
            </label>
            <label>
              <input
                checked={campo.obligatorio}
                onChange={(evento) => cambiar(indice, { obligatorio: evento.target.checked })}
                type="checkbox"
              />
              <span>Pedirlo siempre</span>
            </label>
          </div>

          <div className={styles.acciones}>
            <button
              aria-label={`Subir ${campo.nombre}`}
              disabled={indice === 0}
              onClick={() => mover(indice, -1)}
              type="button"
            >
              ↑
            </button>
            <button
              aria-label={`Bajar ${campo.nombre}`}
              disabled={indice === campos.length - 1}
              onClick={() => mover(indice, 1)}
              type="button"
            >
              ↓
            </button>
            <button onClick={() => void quitar(indice)} type="button">
              Quitar
            </button>
          </div>
        </fieldset>
      ))}

      {errores.atributos ? <strong className={styles.error}>{errores.atributos}</strong> : null}

      <p className={styles.cuenta}>
        {campos.length} de {MAXIMO_ATRIBUTOS} campos · {enTarjeta} de {MAXIMO_EN_TARJETA} en la
        tarjeta
      </p>

      <div className={styles.pie}>
        <Boton
          disabled={campos.length >= MAXIMO_ATRIBUTOS}
          onClick={() => setCampos([...campos, { ...NUEVO }])}
          type="button"
          variante="secundario"
        >
          Agregar un campo
        </Boton>
        <Boton cargando={guardando} onClick={() => void guardar()} type="button">
          Guardar los campos
        </Boton>
      </div>
    </section>
  );
}
