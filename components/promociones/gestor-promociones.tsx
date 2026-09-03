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
import { Boton } from "../ui/boton";
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

function describirDescuento(promocion: Pick<PromocionAdmin, "tipo" | "valor">) {
  return promocion.tipo === "porcentaje"
    ? `${promocion.valor.toLocaleString("es-BO")} % menos`
    : `${formatearPrecioBolivianos(promocion.valor)} menos`;
}

function obtenerEstado(promocion: PromocionAdmin, ahora: Date) {
  if (!promocion.activo) return { texto: "Pausada", clase: styles.pausada };
  if (promocion.fecha_inicio && new Date(promocion.fecha_inicio) > ahora) {
    return { texto: "Programada", clase: styles.programada };
  }
  if (promocion.fecha_fin && new Date(promocion.fecha_fin) <= ahora) {
    return { texto: "Vencida", clase: styles.vencida };
  }
  return promocionEstaVigente(promocion, ahora)
    ? { texto: "Vigente", clase: styles.vigente }
    : { texto: "Revisar", clase: styles.vencida };
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
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [errorGeneral, setErrorGeneral] = useState("");
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
    setMensaje("");
    setErrorGeneral("");
    const entrada = {
      tipo,
      valor,
      destino,
      destino_id: destinoId,
      fecha_inicio: convertirFechaBolivia(fechaInicio),
      fecha_fin: convertirFechaBolivia(fechaFin),
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
      setMensaje("Promoción creada y lista para el catálogo.");
    } catch (error) {
      const motivo = error as Error & { errores?: Record<string, string> };
      setErrores(motivo.errores ?? {});
      setErrorGeneral(motivo.message);
    } finally {
      setOcupado(false);
    }
  }

  async function cambiarEstado(promocion: PromocionAdmin) {
    setMensaje("");
    setErrorGeneral("");
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
      setMensaje(datos.promocion.activo ? "Promoción activada." : "Promoción pausada.");
    } catch (error) {
      setErrorGeneral(error instanceof Error ? error.message : "No se pudo cambiar la promoción.");
    } finally {
      setOcupado(false);
    }
  }

  async function borrarPromocion(promocion: PromocionAdmin) {
    if (!window.confirm("¿Borrar esta promoción? Esta acción no se puede deshacer.")) return;
    setMensaje("");
    setErrorGeneral("");
    setOcupado(true);
    try {
      await solicitarJson<{ eliminado: true }>("/api/promociones", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: promocion.id }),
      });
      setPromociones((actuales) => actuales.filter((item) => item.id !== promocion.id));
      setMensaje("Promoción borrada.");
    } catch (error) {
      setErrorGeneral(error instanceof Error ? error.message : "No se pudo borrar la promoción.");
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

      <div aria-live="polite" className={styles.mensajes}>
        {mensaje ? <p className={styles.exito}>{mensaje}</p> : null}
        {errorGeneral ? <p className={styles.error}>{errorGeneral}</p> : null}
      </div>

      <section className={styles.listado} aria-labelledby="promociones-creadas">
        <header>
          <div>
            <h2 id="promociones-creadas">Promociones de {negocioNombre}</h2>
            <p>{promociones.length === 1 ? "1 promoción creada" : `${promociones.length} promociones creadas`}</p>
          </div>
        </header>
        {promociones.length === 0 ? (
          <div className={styles.vacio}>
            <h3>Todavía no creaste promociones</h3>
            <p>Usa el formulario para destacar tu primera oferta.</p>
          </div>
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
