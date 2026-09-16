"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DEFINICIONES_RUBROS, nombreDeRubro } from "../../lib/negocios/rubros";
import { Boton, useAvisos, useConfirmacion } from "../ui";
import styles from "./cambio-de-rubro.module.css";

/* Cambiar el rubro de un negocio, que es rehacer su catálogo.
 *
 * El dueño no puede: el rubro se elige al darse de alta y queda bloqueado,
 * porque de él cuelgan las categorías, sus campos y su agenda. Esto existe para
 * el que se equivocó al registrarse o cambió de giro, y cuya única salida sería
 * borrar la cuenta y perder su enlace, su QR y sus pedidos.
 *
 * **La planilla se descarga sola al aceptar.** No es un extra: es el respaldo, y
 * el servidor lo arma antes de borrar nada. Por eso acá no hay un botón de
 * «descargar primero» que se pueda saltear —lo que se puede saltear, se saltea—:
 * la descarga es la respuesta misma de la operación.
 */
type Propiedades = {
  negocioId: string;
  nombre: string;
  rubroActual: string | null;
};

export function CambioDeRubro({ negocioId, nombre, rubroActual }: Propiedades) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();
  const [abierto, setAbierto] = useState(false);
  const [rubro, setRubro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function cambiar() {
    if (rubro === "" || rubro === rubroActual) return;

    /* Se nombra lo que se pierde, con las palabras de lo que se pierde, y antes
       y no después. Un «esta acción no se puede deshacer» genérico no le dice a
       nadie que va a perder las citas que sus clientes ya tienen agendadas. */
    const aceptado = await confirmar({
      titulo: `Cambiar ${nombre} a ${nombreDeRubro(rubro)}`,
      descripcion:
        "Se borra todo su catálogo: productos con sus fotografías, categorías con sus campos, presentaciones, y las citas ya agendadas. Los pedidos se conservan. Al aceptar se descarga una planilla con sus productos, que es lo único que se puede volver a cargar.",
      destructiva: true,
      textoAccion: "Cambiar el rubro y borrar el catálogo",
      textoCancelar: "Dejarlo como está",
    });
    if (!aceptado) return;

    setOcupado(true);
    try {
      const respuesta = await fetch(`/api/plataforma/negocios/${negocioId}/rubro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubro }),
      });

      if (!respuesta.ok) {
        const { error } = (await respuesta.json().catch(() => ({}))) as { error?: string };
        throw new Error(error || "No se pudo cambiar el rubro.");
      }

      /* La planilla llega en el cuerpo. Se guarda antes de tocar la pantalla:
         si algo fallara al refrescar, el archivo ya está en la máquina. */
      const archivo = await respuesta.blob();
      const direccion = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");
      enlace.href = direccion;
      enlace.download =
        /filename="([^"]+)"/.exec(respuesta.headers.get("Content-Disposition") ?? "")?.[1] ??
        "catalogo.xlsx";
      enlace.click();
      URL.revokeObjectURL(direccion);

      const resumen = JSON.parse(respuesta.headers.get("X-Resumen") ?? "{}") as {
        borrado?: { productos?: number; categorias?: number; citas?: number };
        sembrado?: { categorias?: number };
      };

      mostrarAviso({
        titulo: `${nombre} ahora es ${nombreDeRubro(rubro)}`,
        /* En números y no en «listo»: quien hace esto tiene que poder contarle
           al comerciante exactamente qué pasó con sus cosas. */
        mensaje: `Se borraron ${resumen.borrado?.productos ?? 0} producto(s), ${resumen.borrado?.categorias ?? 0} categoría(s) y ${resumen.borrado?.citas ?? 0} cita(s). Se sembraron ${resumen.sembrado?.categorias ?? 0} categoría(s). La planilla con lo borrado se descargó.`,
        variante: "exito",
      });
      setAbierto(false);
      setRubro("");
      router.refresh();
    } catch (motivo) {
      mostrarAviso({
        titulo: "No se cambió el rubro",
        mensaje: motivo instanceof Error ? motivo.message : "Revisá la conexión e intentá de nuevo.",
        variante: "error",
      });
    } finally {
      setOcupado(false);
    }
  }

  if (!abierto) {
    return (
      <button className={styles.abrir} onClick={() => setAbierto(true)} type="button">
        Cambiar de rubro
      </button>
    );
  }

  return (
    <div className={styles.caja}>
      <p>
        Hoy es <strong>{nombreDeRubro(rubroActual)}</strong>. Cambiarlo borra su catálogo y lo
        siembra de nuevo.
      </p>
      <label className={styles.campo}>
        <span>Rubro nuevo</span>
        <select onChange={(evento) => setRubro(evento.target.value)} value={rubro}>
          <option value="">Elegí uno</option>
          {DEFINICIONES_RUBROS.filter(({ id }) => id !== rubroActual).map(({ id, nombre: rotulo }) => (
            <option key={id} value={id}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.acciones}>
        <Boton
          cargando={ocupado}
          disabled={rubro === ""}
          onClick={() => void cambiar()}
          variante="peligro"
        >
          Cambiar el rubro
        </Boton>
        <Boton disabled={ocupado} onClick={() => setAbierto(false)} variante="secundario">
          Cancelar
        </Boton>
      </div>
    </div>
  );
}
