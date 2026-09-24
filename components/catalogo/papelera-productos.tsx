"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { obtenerUrlPublicaImagenProducto } from "../../lib/catalogo/imagenes-publicas";
import { describirPlazo, venciEnPapelera } from "../../lib/catalogo/papelera";
import type { ProductoEnPapelera } from "../../lib/catalogo/papelera";
import { formatearPrecioBolivianos } from "../../lib/precios";
import { Boton, EstadoVacio, useAvisos, useConfirmacion } from "../ui";
import styles from "./papelera-productos.module.css";

const LADO_MINIATURA = 72;

export function PapeleraProductos({
  productos,
  urlSupabase,
}: {
  productos: ProductoEnPapelera[];
  urlSupabase: string;
}) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();
  const [ocupado, setOcupado] = useState("");

  async function actuar(producto: ProductoEnPapelera, accion: "recuperar" | "borrar") {
    if (accion === "borrar") {
      const seguro = await confirmar({
        titulo: `¿Borrar «${producto.nombre}» para siempre?`,
        descripcion:
          "Se borran también sus fotografías. Esto ya no se puede deshacer de ninguna manera.",
        textoAccion: "Borrar para siempre",
        textoCancelar: "Conservarlo",
        destructiva: true,
      });
      if (!seguro) return;
    }

    setOcupado(producto.id);
    try {
      const respuesta = await fetch("/api/catalogo/papelera", {
        body: JSON.stringify({ accion, id: producto.id }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const cuerpo = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) throw new Error(cuerpo.error ?? "No se pudo completar la acción.");

      mostrarAviso({
        titulo: accion === "recuperar" ? "Producto recuperado" : "Producto borrado",
        mensaje:
          accion === "recuperar"
            ? `«${producto.nombre}» volvió a tu catálogo.`
            : `«${producto.nombre}» ya no está en ninguna parte.`,
        variante: accion === "recuperar" ? "exito" : "informacion",
      });
      router.refresh();
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo completar",
        mensaje: error instanceof Error ? error.message : "Intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setOcupado("");
    }
  }

  if (productos.length === 0) {
    return (
      <EstadoVacio
        titulo="La papelera está vacía"
        descripcion="Lo que borres de tu catálogo aparece acá y puedes recuperarlo."
      />
    );
  }

  return (
    <ul className={styles.lista}>
      {productos.map((producto) => {
        const vencido = venciEnPapelera(producto.eliminado_en);
        const trabajando = ocupado === producto.id;

        return (
          <li className={styles.fila} key={producto.id}>
            {producto.fotos.length > 0 ? (
              <Image
                alt=""
                className={styles.miniatura}
                height={LADO_MINIATURA}
                src={obtenerUrlPublicaImagenProducto(urlSupabase, producto.fotos[0])}
                width={LADO_MINIATURA}
              />
            ) : (
              <span aria-hidden="true" className={styles.sinFoto} />
            )}

            <div className={styles.datos}>
              <h2>{producto.nombre}</h2>
              <p className={styles.precio}>{formatearPrecioBolivianos(producto.precio)}</p>
              <p className={vencido ? styles.plazoVencido : styles.plazo}>
                {describirPlazo(producto.eliminado_en)}
              </p>
            </div>

            <div className={styles.acciones}>
              <Boton
                cargando={trabajando}
                disabled={trabajando}
                onClick={() => void actuar(producto, "recuperar")}
              >
                Recuperar
              </Boton>
              <Boton
                disabled={trabajando}
                onClick={() => void actuar(producto, "borrar")}
                variante="peligro"
              >
                Borrar ya
              </Boton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
