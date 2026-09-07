"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent } from "react";

import { AYUDA_LISTA } from "../../lib/ia/ayuda";
import { prepararFotoParaLectura } from "../../lib/imagenes";
import type { CategoriaCatalogo } from "../../lib/catalogo/tipos";
import { Boton, Selector, Trabajando, useAvisos } from "../ui";
import styles from "./carga-desde-foto.module.css";

type Leido = {
  nombre: string;
  precio: number;
  descripcion: string;
  categoria: string;
  confianza: "alta" | "media" | "baja";
  elegido: boolean;
};

/* Qué hacer con cada título de sección que trajo la lista: crearlo como
   categoría nueva, mandarlo a una que ya existe, o dejar esos productos sin
   categoría. Se decide una vez por título y no producto por producto. */
const CREAR = "crear";
const SIN_CATEGORIA = "";

const SIN_TITULO = "__sin_titulo__";

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
  const [destinos, setDestinos] = useState<Record<string, string>>({});

  const elegidos = productos.filter(({ elegido }) => elegido);

  /* Los títulos en el orden en que aparecieron en la lista, sin repetir. El
     orden importa: es el de la hoja que el dueño tiene delante. */
  const titulos = useMemo(() => {
    const vistos: string[] = [];
    for (const producto of productos) {
      const titulo = producto.categoria || SIN_TITULO;
      if (!vistos.includes(titulo)) vistos.push(titulo);
    }
    return vistos;
  }, [productos]);

  async function leerFoto(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;

    setLeyendo(true);
    setProductos([]);
    setDestinos({});
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
        productos?: Array<Omit<Leido, "elegido">>;
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

      /* Cada título encontrado arranca en «crear», salvo que ya exista una
         categoría con ese nombre: entonces se propone la existente, porque
         crear una segunda «Bebidas» es el error más fácil de cometer acá. */
      const propuestas: Record<string, string> = {};
      for (const producto of datos.productos) {
        const titulo = producto.categoria || SIN_TITULO;
        if (propuestas[titulo] !== undefined) continue;
        if (titulo === SIN_TITULO) {
          propuestas[titulo] = SIN_CATEGORIA;
          continue;
        }
        const existente = categorias.find(
          (categoria) => categoria.nombre.toLowerCase() === titulo.toLowerCase(),
        );
        propuestas[titulo] = existente ? existente.id : CREAR;
      }
      setDestinos(propuestas);
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

    /* Primero las categorías, porque los productos las necesitan. Si una falla,
       sus productos van sin categoría en vez de perderse: es más fácil mover un
       producto después que volver a leer la foto. */
    const idPorTitulo = new Map<string, string>();
    for (const titulo of titulos) {
      const destino = destinos[titulo] ?? SIN_CATEGORIA;
      if (titulo === SIN_TITULO || destino === SIN_CATEGORIA) continue;
      if (destino !== CREAR) {
        idPorTitulo.set(titulo, destino);
        continue;
      }
      try {
        const respuesta = await fetch("/api/catalogo/categorias", {
          body: JSON.stringify({ nombre: titulo }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        const datos = (await respuesta.json()) as { categoria?: { id: string } };
        if (respuesta.ok && datos.categoria) idPorTitulo.set(titulo, datos.categoria.id);
      } catch {
        /* Sin categoría, pero con el producto. */
      }
    }

    /* De a uno y reusando la misma ruta que el formulario normal: así cada
       producto pasa por las mismas validaciones y el mismo límite del plan. */
    for (const producto of elegidos) {
      const titulo = producto.categoria || SIN_TITULO;
      try {
        const respuesta = await fetch("/api/catalogo/productos", {
          body: JSON.stringify({
            nombre: producto.nombre,
            descripcion: producto.descripcion.trim() || null,
            precio: producto.precio,
            categoria_id: idPorTitulo.get(titulo) ?? null,
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
                  <span className={styles.enCategoria}> en {fila.categoria}</span>
                </li>
              ))}
            </ul>
          </div>
          <p>{AYUDA_LISTA.ejemplo.nota}</p>
        </div>
      </section>

      <Trabajando
        abierto={leyendo}
        detalle="Estamos leyendo la lista y separando cada producto con su precio. Cuanto más larga, más tarda."
        titulo="Leyendo tu lista…"
      />

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

          {titulos.some((titulo) => titulo !== SIN_TITULO) ? (
            <div className={styles.titulos}>
              <h3>Las secciones de tu lista</h3>
              <p>Las encontramos en la foto. Decidí qué hacer con cada una.</p>
              {titulos
                .filter((titulo) => titulo !== SIN_TITULO)
                .map((titulo) => (
                  <Selector
                    etiqueta={titulo}
                    id={`destino-${titulo}`}
                    key={titulo}
                    onChange={(evento) =>
                      setDestinos((actuales) => ({ ...actuales, [titulo]: evento.target.value }))
                    }
                    value={destinos[titulo] ?? CREAR}
                  >
                    <option value={CREAR}>Crear la categoría «{titulo}»</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        Poner en {categoria.nombre}
                      </option>
                    ))}
                    <option value={SIN_CATEGORIA}>Sin categoría</option>
                  </Selector>
                ))}
            </div>
          ) : null}

          {titulos.map((titulo) => (
            <div className={styles.grupo} key={titulo}>
              {titulo === SIN_TITULO ? null : <h3>{titulo}</h3>}
              {/* Las cabeceras se repiten en cada sección y no una sola vez
                  arriba: en el celular hay que desplazarse, y una cabecera que
                  quedó tres pantallas más arriba no dice qué columna es cuál. */}
              <div aria-hidden="true" className={styles.cabeceras}>
                <span>Incluir</span>
                <span>Producto</span>
                <span>Precio Bs</span>
              </div>
              <ul className={styles.filas}>
                {productos.map((producto, indice) =>
                  (producto.categoria || SIN_TITULO) !== titulo ? null : (
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
                        onChange={(evento) =>
                          cambiar(indice, { precio: Number(evento.target.value) })
                        }
                        type="number"
                        value={producto.precio}
                      />
                      {/* La descripción solo aparece si la lista la traía: un
                          campo vacío por producto alarga la revisión sin
                          agregar nada. */}
                      {producto.descripcion ? (
                        <input
                          aria-label="Descripción"
                          className={styles.descripcion}
                          onChange={(evento) =>
                            cambiar(indice, { descripcion: evento.target.value })
                          }
                          value={producto.descripcion}
                        />
                      ) : null}
                      {producto.confianza === "baja" ? <span>revisá</span> : null}
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}

          <div className={styles.confirmar}>
            <Boton
              cargando={guardando}
              disabled={guardando || elegidos.length === 0}
              onClick={() => void crear()}
            >
              Crear {elegidos.length} producto(s)
            </Boton>
          </div>
          <p className={styles.aviso}>
            Se crean sin fotografía y sin existencias. <strong>Revisá los precios antes de
            publicar.</strong>
          </p>
        </section>
      ) : null}
    </div>
  );
}
