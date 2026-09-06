"use client";

import { useMemo, useState, type FormEvent } from "react";

import {
  calcularPrecioProducto,
  formatearPrecioBolivianos,
  promocionEstaVigente,
  type PromocionPrecio,
  type TipoPromocion,
} from "../../lib/precios";
import { validarPromocion } from "../../lib/promociones/validacion";
import { Boton, EstadoVacio, useAvisos, useConfirmacion } from "../ui";
import styles from "./gestor-promociones.module.css";

type Categoria = { id: string; nombre: string };
type Producto = {
  id: string;
  nombre: string;
  precio: number;
  categoria_id: string | null;
  visible: boolean;
};

type PromocionAdmin = PromocionPrecio & {
  id: string;
  negocio_id: string;
};

type Propiedades = {
  negocioNombre: string;
  categorias: Categoria[];
  productos: Producto[];
  promocionesIniciales: PromocionAdmin[];
};

type Destino = "producto" | "categoria";

const FORMATEADOR_FECHA = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  dateStyle: "medium",
  timeStyle: "short",
});

function convertirFechaBolivia(valor: string) {
  return valor ? new Date(`${valor}:00-04:00`).toISOString() : null;
}

/* 0 = domingo, el mismo orden que `extract(dow)` en la base. Si acá se
   empezara por lunes, el día marcado y el día guardado serían distintos. */
const NOMBRES_DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function describirDescuento(promocion: Pick<PromocionAdmin, "tipo" | "valor">) {
  return promocion.tipo === "porcentaje"
    ? `${promocion.valor.toLocaleString("es-BO")} % menos`
    : `${formatearPrecioBolivianos(promocion.valor)} menos`;
}

function describirHorario(promocion: PromocionAdmin) {
  const partes: string[] = [];
  if (promocion.hora_inicio && promocion.hora_fin) {
    partes.push(
      `De ${promocion.hora_inicio.slice(0, 5)} a ${promocion.hora_fin.slice(0, 5)}`,
    );
  }
  if (promocion.dias && promocion.dias.length > 0 && promocion.dias.length < 7) {
    partes.push(promocion.dias.map((dia) => NOMBRES_DIAS[dia]).join(", "));
  }
  return partes.join(" · ");
}

function obtenerEstado(promocion: PromocionAdmin, ahora: Date) {
  if (!promocion.activo) return { texto: "Pausada", clase: styles.pausada };
  if (promocion.fecha_inicio && new Date(promocion.fecha_inicio) > ahora) {
    return { texto: "Programada", clase: styles.programada };
  }
  if (promocion.fecha_fin && new Date(promocion.fecha_fin) <= ahora) {
    return { texto: "Vencida", clase: styles.vencida };
  }
  if (promocionEstaVigente(promocion, ahora)) {
    return { texto: "Vigente", clase: styles.vigente };
  }
  /* Una promoción con horario está dormida casi todo el día, y eso es lo normal.
     Marcarla en rojo como «Revisar» haría que el dueño entrara a arreglar algo
     que no está roto —o peor, que la borrara—. */
  if (promocion.hora_inicio || (promocion.dias?.length ?? 0) > 0) {
    return { texto: "Espera su horario", clase: styles.programada };
  }
  return { texto: "Revisar", clase: styles.vencida };
}

async function solicitarJson<T>(url: string, opciones: RequestInit) {
  const respuesta = await fetch(url, opciones);
  const datos = (await respuesta.json().catch(() => ({}))) as T & {
    error?: string;
    errores?: Record<string, string>;
  };
  if (!respuesta.ok) {
    const error = new Error(datos.error || "No se pudo completar la acción.") as Error & {
      errores?: Record<string, string>;
    };
    error.errores = datos.errores;
    throw error;
  }
  return datos;
}

export function GestorPromociones({
  negocioNombre,
  categorias,
  productos,
  promocionesIniciales,
}: Propiedades) {
  const [promociones, setPromociones] = useState(promocionesIniciales);
  const [tipo, setTipo] = useState<TipoPromocion>("porcentaje");
  const [valor, setValor] = useState("");
  const [destino, setDestino] = useState<Destino>("producto");
  const [destinoId, setDestinoId] = useState(productos[0]?.id ?? "");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [dias, setDias] = useState<number[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();
  const [ocupado, setOcupado] = useState(false);
  const ahora = new Date();
  const nombresCategorias = useMemo(
    () => new Map(categorias.map((categoria) => [categoria.id, categoria.nombre])),
    [categorias],
  );
  const nombresProductos = useMemo(
    () => new Map(productos.map((producto) => [producto.id, producto.nombre])),
    [productos],
  );
  const productoEjemplo =
    destino === "producto"
      ? productos.find((producto) => producto.id === destinoId)
      : productos.find((producto) => producto.categoria_id === destinoId);
  const valorNumerico = Number(valor.replace(",", "."));
  const precioEjemplo =
    productoEjemplo && Number.isFinite(valorNumerico) && valorNumerico > 0
      ? calcularPrecioProducto(
          productoEjemplo.precio,
          { productoId: productoEjemplo.id, categoriaId: productoEjemplo.categoria_id },
          [
            {
              activo: true,
              categoria_id: destino === "categoria" ? destinoId : null,
              fecha_fin: null,
              fecha_inicio: null,
              producto_id: destino === "producto" ? destinoId : null,
              tipo,
              valor: valorNumerico,
            },
          ],
        )
      : null;

  function cambiarDestino(nuevoDestino: Destino) {
    setDestino(nuevoDestino);
    setDestinoId(
      nuevoDestino === "producto" ? (productos[0]?.id ?? "") : (categorias[0]?.id ?? ""),
    );
    setErrores({});
  }

  async function crearPromocion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const entrada = {
      tipo,
      valor,
      destino,
      destino_id: destinoId,
      fecha_inicio: convertirFechaBolivia(fechaInicio),
      fecha_fin: convertirFechaBolivia(fechaFin),
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      dias: dias.length > 0 ? dias : null,
    };
    const validacion = validarPromocion(entrada);
    if (!validacion.correcto) {
      setErrores(validacion.errores);
      return;
    }
    setErrores({});
    setOcupado(true);
    try {
      const datos = await solicitarJson<{ promocion: PromocionAdmin }>("/api/promociones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entrada),
      });
      setPromociones((actuales) => [datos.promocion, ...actuales]);
      setValor("");
      setFechaInicio("");
      setFechaFin("");
      mostrarAviso({ titulo: "Promoción creada", variante: "exito" });
    } catch (error) {
      const motivo = error as Error & { errores?: Record<string, string> };
      setErrores(motivo.errores ?? {});
      mostrarAviso({
        titulo: "No se pudo crear la promoción",
        mensaje: motivo.message,
        variante: "error",
      });
    } finally {
      setOcupado(false);
    }
  }

  async function cambiarEstado(promocion: PromocionAdmin) {
    setOcupado(true);
    try {
      const datos = await solicitarJson<{ promocion: PromocionAdmin }>("/api/promociones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promocion.id, activo: !promocion.activo }),
      });
      setPromociones((actuales) =>
        actuales.map((item) => (item.id === promocion.id ? datos.promocion : item)),
      );
      mostrarAviso({
        titulo: datos.promocion.activo ? "Promoción activada" : "Promoción pausada",
        variante: "exito",
      });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo cambiar la promoción",
        mensaje: error instanceof Error ? error.message : undefined,
        variante: "error",
      });
    } finally {
      setOcupado(false);
    }
  }

  async function borrarPromocion(promocion: PromocionAdmin) {
    const aceptado = await confirmar({
      titulo: "Borrar esta promoción",
      descripcion: "El precio vuelve a su valor normal. No se puede deshacer.",
      destructiva: true,
      textoAccion: "Borrar promoción",
    });
    if (!aceptado) return;
    setOcupado(true);
    try {
      await solicitarJson<{ eliminado: true }>("/api/promociones", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promocion.id }),
      });
      setPromociones((actuales) => actuales.filter((item) => item.id !== promocion.id));
      mostrarAviso({ titulo: "Promoción borrada", variante: "exito" });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo borrar la promoción",
        mensaje: error instanceof Error ? error.message : undefined,
        variante: "error",
      });
    } finally {
      setOcupado(false);
    }
  }

  const opcionesDisponibles = destino === "producto" ? productos : categorias;

  return (
    <div className={styles.gestor}>
      <form className={styles.formulario} onSubmit={crearPromocion}>
        <header>
          <div>
            <p>Nueva oferta</p>
            <h2>Define el descuento</h2>
          </div>
          <p>Puedes pausarlo o borrarlo después sin cambiar el precio normal.</p>
        </header>

        <div className={styles.campos}>
          <label>
            Tipo de descuento
            <select onChange={(evento) => setTipo(evento.target.value as TipoPromocion)} value={tipo}>
              <option value="porcentaje">Porcentaje</option>
              <option value="monto_fijo">Monto fijo en bolivianos</option>
            </select>
            {errores.tipo ? <small className={styles.errorCampo}>{errores.tipo}</small> : null}
          </label>
          <label>
            {tipo === "porcentaje" ? "Porcentaje de descuento" : "Monto que se descontará"}
            <input
              inputMode="decimal"
              max={tipo === "porcentaje" ? "100" : undefined}
              min="0.01"
              onChange={(evento) => setValor(evento.target.value)}
              placeholder={tipo === "porcentaje" ? "Ej.: 15" : "Ej.: 10,00"}
              required
              step="0.01"
              type="number"
              value={valor}
            />
            {errores.valor ? <small className={styles.errorCampo}>{errores.valor}</small> : null}
          </label>
          <label>
            Aplicar sobre
            <select onChange={(evento) => cambiarDestino(evento.target.value as Destino)} value={destino}>
              <option value="producto">Un producto</option>
              <option value="categoria">Toda una categoría</option>
            </select>
          </label>
          <label>
            {destino === "producto" ? "Producto" : "Categoría"}
            <select
              disabled={opcionesDisponibles.length === 0}
              onChange={(evento) => setDestinoId(evento.target.value)}
              required
              value={destinoId}
            >
              {opcionesDisponibles.length === 0 ? (
                <option value="">No hay opciones creadas</option>
              ) : null}
              {opcionesDisponibles.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>
              ))}
            </select>
            {errores.destino_id ? <small className={styles.errorCampo}>{errores.destino_id}</small> : null}
          </label>
          <label>
            Comienza <span>Opcional</span>
            <input onChange={(evento) => setFechaInicio(evento.target.value)} type="datetime-local" value={fechaInicio} />
            <small>Hora de Bolivia. Vacío significa desde ahora.</small>
            {errores.fecha_inicio ? <small className={styles.errorCampo}>{errores.fecha_inicio}</small> : null}
          </label>
          <label>
            Termina <span>Opcional</span>
            <input onChange={(evento) => setFechaFin(evento.target.value)} type="datetime-local" value={fechaFin} />
            <small>Si lo dejas vacío, no vencerá automáticamente.</small>
            {errores.fecha_fin ? <small className={styles.errorCampo}>{errores.fecha_fin}</small> : null}
          </label>
        </div>

        {/* El horario va después de las fechas porque es un recorte dentro de
            ellas: primero desde cuándo hasta cuándo existe la promoción, después
            en qué momentos de ese período se aplica. */}
        <fieldset className={styles.horario}>
          <legend>Solo a ciertas horas <span>Opcional</span></legend>
          <p>
            Dejá todo vacío y el descuento vale siempre. Si el fin es menor que el
            inicio, la ventana cruza la medianoche: de 22:00 a 02:00 es una sola
            noche, y a la 01:00 sigue contando como el día que empezó.
          </p>
          <div className={styles.horas}>
            <label>
              Desde
              <input
                onChange={(evento) => setHoraInicio(evento.target.value)}
                type="time"
                value={horaInicio}
              />
            </label>
            <label>
              Hasta
              <input
                onChange={(evento) => setHoraFin(evento.target.value)}
                type="time"
                value={horaFin}
              />
            </label>
          </div>
          {errores.horario ? <small className={styles.errorCampo}>{errores.horario}</small> : null}
          <div className={styles.dias}>
            {NOMBRES_DIAS.map((nombre, indice) => (
              <label
                className={dias.includes(indice) ? styles.diaElegido : styles.dia}
                key={nombre}
              >
                <input
                  checked={dias.includes(indice)}
                  onChange={(evento) =>
                    setDias((actuales) =>
                      evento.target.checked
                        ? [...actuales, indice].sort((a, b) => a - b)
                        : actuales.filter((dia) => dia !== indice),
                    )
                  }
                  type="checkbox"
                />
                {nombre}
              </label>
            ))}
          </div>
          <small>Sin días marcados, vale todos los días.</small>
          {errores.dias ? <small className={styles.errorCampo}>{errores.dias}</small> : null}
        </fieldset>

        {precioEjemplo && productoEjemplo ? (
          <aside className={styles.ejemplo} aria-label="Ejemplo del precio promocional">
            <span>Ejemplo con {productoEjemplo.nombre}</span>
            <s>{formatearPrecioBolivianos(precioEjemplo.precioOriginal)}</s>
            <strong>{formatearPrecioBolivianos(precioEjemplo.precioFinal)}</strong>
            <small>El precio nunca bajará de Bs 0.</small>
          </aside>
        ) : null}

        <Boton cargando={ocupado} disabled={opcionesDisponibles.length === 0} type="submit">
          Crear promoción
        </Boton>
      </form>

      <section className={styles.listado} aria-labelledby="promociones-creadas">
        <header>
          <div>
            <h2 id="promociones-creadas">Promociones de {negocioNombre}</h2>
            <p>{promociones.length === 1 ? "1 promoción creada" : `${promociones.length} promociones creadas`}</p>
          </div>
        </header>
        {promociones.length === 0 ? (
          <EstadoVacio
            descripcion="Usa el formulario de arriba para destacar tu primera oferta."
            titulo="Todavía no creaste promociones"
          />
        ) : (
          <ul>
            {promociones.map((promocion) => {
              const estado = obtenerEstado(promocion, ahora);
              const destinoNombre = promocion.producto_id
                ? nombresProductos.get(promocion.producto_id)
                : nombresCategorias.get(promocion.categoria_id ?? "");
              return (
                <li key={promocion.id}>
                  <div className={styles.detalle}>
                    <div>
                      <span className={estado.clase}>{estado.texto}</span>
                      <strong>{describirDescuento(promocion)}</strong>
                    </div>
                    <p>
                      {promocion.producto_id ? "Producto" : "Categoría"}: {destinoNombre ?? "Destino eliminado"}
                    </p>
                    <small>
                      {promocion.fecha_inicio
                        ? `Desde ${FORMATEADOR_FECHA.format(new Date(promocion.fecha_inicio))}`
                        : "Disponible desde ahora"}
                      {promocion.fecha_fin
                        ? ` hasta ${FORMATEADOR_FECHA.format(new Date(promocion.fecha_fin))}`
                        : ", sin vencimiento"}
                    </small>
                    {/* Sin esto, «Espera su horario» no dice qué horario, y el
                        dueño tiene que abrir el formulario para recordarlo. */}
                    {describirHorario(promocion) ? (
                      <small>{describirHorario(promocion)}</small>
                    ) : null}
                  </div>
                  <div className={styles.acciones}>
                    <Boton disabled={ocupado} onClick={() => void cambiarEstado(promocion)} variante="discreto">
                      {promocion.activo ? "Pausar promoción" : "Activar promoción"}
                    </Boton>
                    <Boton disabled={ocupado} onClick={() => void borrarPromocion(promocion)} variante="peligro">
                      Borrar promoción
                    </Boton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
