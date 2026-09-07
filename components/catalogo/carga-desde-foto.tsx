"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";

import { AYUDA_LISTA } from "../../lib/ia/ayuda";
import { prepararFotoParaLectura } from "../../lib/imagenes";
import type { CategoriaCatalogo } from "../../lib/catalogo/tipos";
import { Boton, Selector, useAvisos } from "../ui";
import styles from "./carga-desde-foto.module.css";

type Leido = {
  nombre: string;
  precio: number;
  confianza: "alta" | "media" | "baja";
  elegido: boolean;
};

export function CargaDesdeFoto({
  categorias,
  fotosUsadas,
  topeFotos,
}: {
  categorias: CategoriaCatalogo[];
  fotosUsadas: number;
  topeFotos: number;
}) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [productos, setProductos] = useState<Leido[]>([]);
  const [categoriaId, setCategoriaId] = useState("");

  const elegidos = productos.filter(({ elegido }) => elegido);

  async function leerFoto(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;

    setLeyendo(true);
    setProductos([]);
    try {
      const foto = await prepararFotoParaLectura(archivo);
      setVistaPrevia(foto.vistaPrevia);

      const respuesta = await fetch("/api/ia/lista", {
        body: JSON.stringify({ imagen: foto.base64, tipo: foto.tipo }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const datos = (await respuesta.json()) as {
        error?: string;
        productos?: Array<{ nombre: string; precio: number; confianza: Leido["confianza"] }>;
      };
      if (!respuesta.ok || !datos.productos) {
        throw new Error(datos.error ?? "No pudimos leer la fotografía.");
      }

      /* Lo dudoso llega desmarcado. La carga mental tiene que estar en confirmar
         lo que sirve, no en cazar lo que está mal: si todo viene marcado, el
         apuro hace que se publique cualquier cosa. */
      setProductos(
        datos.productos.map((producto) => ({
          ...producto,
          elegido: producto.confianza !== "baja",
        })),
      );
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo leer la lista",
        mensaje: error instanceof Error ? error.message : "Intentá nuevamente.",
        variante: "error",
      });
    } finally {
      setLeyendo(false);
    }
  }

  function cambiar(indice: number, cambios: Partial<Leido>) {
    setProductos((actuales) =>
      actuales.map((producto, posicion) =>
        posicion === indice ? { ...producto, ...cambios } : producto,
      ),
    );
  }

  async function crear() {
    setGuardando(true);
    let creados = 0;
    const fallidos: string[] = [];

    /* De a uno y en orden, reusando la misma ruta que el formulario normal: así
       cada producto pasa por las mismas validaciones y el mismo límite del plan.
       Una ruta nueva que insertara en lote sería una segunda puerta a la que
       habría que enseñarle todas las reglas otra vez. */
    for (const producto of elegidos) {
      try {
        const respuesta = await fetch("/api/catalogo/productos", {
          body: JSON.stringify({
            nombre: producto.nombre,
            descripcion: null,
            precio: producto.precio,
            categoria_id: categoriaId || null,
            subcategoria_id: null,
            controla_stock: false,
            cantidad_stock: null,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        if (!respuesta.ok) throw new Error("rechazado");
        creados += 1;
      } catch {
        fallidos.push(producto.nombre);
      }
    }

    setGuardando(false);
    setProductos([]);
    setVistaPrevia("");
    mostrarAviso({
      titulo: `${creados} producto(s) creado(s)`,
      mensaje:
        fallidos.length > 0
          ? `No se pudieron crear: ${fallidos.slice(0, 3).join(", ")}.`
          : "Revisá los precios antes de publicar.",
      variante: fallidos.length > 0 ? "advertencia" : "exito",
    });
    router.refresh();
  }

  return (
    <div className={styles.pantalla}>
      <section className={styles.ayuda}>
        <h2>{AYUDA_LISTA.titulo}</h2>
        <ol>
          {AYUDA_LISTA.pasos.map((paso) => (
            <li key={paso}>{paso}</li>
          ))}
        </ol>
        <div className={styles.columnas}>
          <div>
            <h3>Funciona con</h3>
            <ul>
              {AYUDA_LISTA.funciona.map((caso) => (
                <li key={caso}>{caso}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>No funciona con</h3>
            <ul className={styles.no}>
              {AYUDA_LISTA.noFunciona.map((caso) => (
                <li key={caso}>{caso}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.ejemplo}>
          <h3>{AYUDA_LISTA.ejemplo.titulo}</h3>
          <div className={styles.columnas}>
            <pre>{AYUDA_LISTA.ejemplo.entrada.join("\n")}</pre>
            <ul>
              {AYUDA_LISTA.ejemplo.salida.map((fila) => (
                <li key={fila.nombre}>
                  {fila.nombre} — <strong>{fila.precio}</strong>
                </li>
              ))}
            </ul>
          </div>
          <p>{AYUDA_LISTA.ejemplo.nota}</p>
        </div>
      </section>

      <label className={styles.cargar}>
        {leyendo ? "Leyendo tu lista…" : "Elegir la foto de la lista"}
        <input
          accept="image/jpeg,image/png,image/webp"
          disabled={leyendo || guardando}
          onChange={(evento) => void leerFoto(evento)}
          type="file"
        />
      </label>
      <p className={styles.cupo}>
        Llevás {fotosUsadas} de {topeFotos} fotos este mes.
      </p>

      {vistaPrevia ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="La lista que mandaste a leer" className={styles.previa} src={vistaPrevia} />
      ) : null}

      {productos.length > 0 ? (
        <section className={styles.revision}>
          <header>
            <h2>Revisá antes de crear</h2>
            <p>
              Encontramos {productos.length} producto(s). Lo que no leímos con seguridad viene
              desmarcado. Compará con la foto antes de confirmar.
            </p>
          </header>

          <ul className={styles.filas}>
            {productos.map((producto, indice) => (
              <li
                className={producto.confianza === "baja" ? styles.dudosa : styles.fila}
                key={`${producto.nombre}-${indice}`}
              >
                <input
                  aria-label={`Incluir ${producto.nombre}`}
                  checked={producto.elegido}
                  onChange={(evento) => cambiar(indice, { elegido: evento.target.checked })}
                  type="checkbox"
                />
                <input
                  aria-label="Nombre del producto"
                  onChange={(evento) => cambiar(indice, { nombre: evento.target.value })}
                  value={producto.nombre}
                />
                <input
                  aria-label="Precio"
                  inputMode="decimal"
                  onChange={(evento) => cambiar(indice, { precio: Number(evento.target.value) })}
                  type="number"
                  value={producto.precio}
                />
                {producto.confianza === "baja" ? <span>revisá</span> : null}
              </li>
            ))}
          </ul>

          <div className={styles.confirmar}>
            <Selector
              ayuda="Podés cambiarla después en cada producto."
              etiqueta="Crear todos en la categoría"
              id="categoria-desde-foto"
              onChange={(evento) => setCategoriaId(evento.target.value)}
              value={categoriaId}
            >
              <option value="">Sin categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </Selector>
            <Boton
              cargando={guardando}
              disabled={guardando || elegidos.length === 0}
              onClick={() => void crear()}
            >
              Crear {elegidos.length} producto(s)
            </Boton>
          </div>
          <p className={styles.aviso}>
            Se crean sin fotografía y sin descripción.{" "}
            <strong>Revisá los precios antes de publicar.</strong>
          </p>
        </section>
      ) : null}
    </div>
  );
}
