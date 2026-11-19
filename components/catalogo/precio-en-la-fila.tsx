import { useState } from "react";

import type { ProductoCatalogo } from "../../lib/catalogo/tipos";
import { leerPrecioProducto } from "../../lib/catalogo/validacion";
import { formatearPrecioBolivianos } from "../../lib/precios";
import { Campo, useAvisos } from "../ui";

/* Ponerle precio a un producto desde su fila, sin abrir el formulario (fase 14).
 *
 * Una importación de 181 productos sin precio es 181 formularios si cada uno se
 * abre, se baja hasta el precio y se guarda. Acá se escribe y se sigue: se
 * guarda al salir del campo o con Enter, como una planilla.
 *
 * Solo aparece en los productos sin precio. Cambiar un precio que ya existe va
 * por el formulario, donde se ve todo lo demás del producto. */
export function PrecioEnLaFila({
  producto,
  alGuardar,
}: {
  producto: ProductoCatalogo;
  alGuardar: (producto: ProductoCatalogo) => void;
}) {
  const { mostrarAviso } = useAvisos();
  const [valor, setValor] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (guardando || valor.trim() === "") return;
    /* Se valida acá con la misma regla que la ruta, para decir el error sin ir
       al servidor; la ruta lo vuelve a validar igual. */
    const leido = leerPrecioProducto(valor);
    if (!leido.correcto) {
      setError(leido.error);
      return;
    }
    if (leido.precio === null) {
      setError("Escribe un precio mayor a cero, o déjalo vacío.");
      return;
    }

    setGuardando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/catalogo/productos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: producto.id, precio: leido.precio }),
      });
      const cuerpo = (await respuesta.json().catch(() => ({}))) as {
        producto?: ProductoCatalogo;
        error?: string;
      };
      if (!respuesta.ok || !cuerpo.producto) {
        setError(cuerpo.error ?? "No se pudo guardar el precio. Intenta otra vez.");
        return;
      }
      alGuardar(cuerpo.producto);
      mostrarAviso({
        titulo: "Precio guardado",
        mensaje: `${producto.nombre} ya se ve a ${formatearPrecioBolivianos(leido.precio)} en tu catálogo.`,
        variante: "exito",
      });
    } catch {
      setError("No se pudo guardar el precio. Revisa tu conexión e intenta otra vez.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Campo
      aria-busy={guardando || undefined}
      autoComplete="off"
      disabled={guardando}
      error={error}
      etiqueta="Ponle precio"
      id={`precio-fila-${producto.id}`}
      inputMode="decimal"
      onBlur={() => void guardar()}
      onChange={(evento) => {
        setValor(evento.target.value);
        if (error) setError("");
      }}
      onKeyDown={(evento) => {
        if (evento.key === "Enter") {
          evento.preventDefault();
          void guardar();
        }
      }}
      placeholder="Bs"
      type="text"
      value={valor}
    />
  );
}
