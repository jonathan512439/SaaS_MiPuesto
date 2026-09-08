"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { CategoriaCatalogo } from "../../lib/catalogo/tipos";
import { Boton, Selector } from "../ui";
import styles from "./revision-de-productos.module.css";

/* El paso que va entre «leímos algo» y «está publicado», y que es el mismo
   venga de donde venga: de la foto de una lista, del PDF del proveedor o de una
   planilla de Excel.

   Vive en un componente propio porque duplicarlo sería duplicar la única
   pantalla donde el dueño puede darse cuenta de un precio equivocado antes de
   que sus clientes lo vean. Dos copias de eso se separan con el tiempo, y la
   que se olvida es la que publica el error. */

export type ProductoLeido = {
  nombre: string;
  precio: number;
  descripcion: string;
  categoria: string;
  confianza: "alta" | "media" | "baja";
};

type Fila = ProductoLeido & { elegido: boolean };

/* Qué hacer con cada título de sección: crearlo como categoría nueva, mandarlo
   a una que ya existe, o dejar esos productos sin categoría. Se decide una vez
   por título y no producto por producto. */
const CREAR = "crear";
const SIN_CATEGORIA = "";
const SIN_TITULO = "__sin_titulo__";

export function RevisionDeProductos({
  categorias,
  productos,
  introduccion,
  onTerminado,
}: {
  categorias: CategoriaCatalogo[];
  productos: ProductoLeido[];
  introduccion: string;
  onTerminado: () => void;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<{ creados: number; fallidos: string[] } | null>(null);

  /* El estado arranca de las propiedades una sola vez. Quien llama vuelve a
     montar este componente con una `key` distinta cuando hay una lectura nueva:
     así una lectura nueva nunca pisa en silencio las correcciones a mano de la
     anterior. */
  const [filas, setFilas] = useState<Fila[]>(() =>
    productos.map((producto) => ({ ...producto, elegido: producto.confianza !== "baja" })),
  );
  const [destinos, setDestinos] = useState<Record<string, string>>(() => {
    const propuestas: Record<string, string> = {};
    for (const producto of productos) {
      const titulo = producto.categoria || SIN_TITULO;
      if (propuestas[titulo] !== undefined) continue;
      if (titulo === SIN_TITULO) {
        propuestas[titulo] = SIN_CATEGORIA;
        continue;
      }
      /* Se propone la categoría existente si ya hay una con ese nombre: crear
         una segunda «Bebidas» es el error más fácil de cometer acá. */
      const existente = categorias.find(
        (categoria) => categoria.nombre.toLowerCase() === titulo.toLowerCase(),
      );
      propuestas[titulo] = existente ? existente.id : CREAR;
    }
    return propuestas;
  });

  const elegidos = filas.filter(({ elegido }) => elegido);

  /* Los títulos en el orden en que aparecieron, sin repetir. El orden importa:
     es el de la hoja que el dueño tiene delante. */
  const titulos = useMemo(() => {
    const vistos: string[] = [];
    for (const fila of filas) {
      const titulo = fila.categoria || SIN_TITULO;
      if (!vistos.includes(titulo)) vistos.push(titulo);
    }
    return vistos;
  }, [filas]);

  function cambiar(indice: number, cambios: Partial<Fila>) {
    setFilas((actuales) =>
      actuales.map((fila, posicion) => (posicion === indice ? { ...fila, ...cambios } : fila)),
    );
  }

  function marcarTodos(elegido: boolean) {
    setFilas((actuales) => actuales.map((fila) => ({ ...fila, elegido })));
  }

  async function crear() {
    setGuardando(true);
    let creados = 0;
    const fallidos: string[] = [];

    /* Primero las categorías, porque los productos las necesitan. Si una falla,
       sus productos van sin categoría en vez de perderse: es más fácil mover un
       producto después que volver a leer el archivo. */
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
    setResultado({ creados, fallidos });
    onTerminado();
    router.refresh();
  }

  /* El resultado se queda en pantalla en vez de ser un aviso que se va solo. Lo
     que hay que leer acá es la lista de los que no entraron, y esa lista no
     puede desaparecer a los cinco segundos. */
  if (resultado) {
    return (
      <section className={styles.revision}>
        <h2>{resultado.creados} producto(s) creado(s)</h2>
        <p>
          {resultado.fallidos.length > 0
            ? `No se pudieron crear: ${resultado.fallidos.slice(0, 3).join(", ")}.`
            : "Ya están en tu catálogo. Revisá los precios antes de publicarlo."}
        </p>
      </section>
    );
  }

  return (
    <section className={styles.revision}>
      <header>
        <h2>Revisá antes de crear</h2>
        <p>{introduccion}</p>
      </header>

      {/* Con una planilla de doscientos renglones, marcar de a uno no es una
          opción. Con una foto de doce tampoco molesta tenerlo. */}
      <div className={styles.seleccion}>
        <button onClick={() => marcarTodos(true)} type="button">
          Marcar todos
        </button>
        <button onClick={() => marcarTodos(false)} type="button">
          Desmarcar todos
        </button>
        <span>
          {elegidos.length} de {filas.length} marcados
        </span>
      </div>

      {titulos.some((titulo) => titulo !== SIN_TITULO) ? (
        <div className={styles.titulos}>
          <h3>Las secciones de tu lista</h3>
          <p>Decidí qué hacer con cada una.</p>
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
          {/* Las cabeceras se repiten en cada sección y no una sola vez arriba:
              en el celular hay que desplazarse, y una cabecera que quedó tres
              pantallas más arriba no dice qué columna es cuál. */}
          <div aria-hidden="true" className={styles.cabeceras}>
            <span>Incluir</span>
            <span>Producto</span>
            <span>Precio Bs</span>
          </div>
          <ul className={styles.filas}>
            {filas.map((fila, indice) =>
              (fila.categoria || SIN_TITULO) !== titulo ? null : (
                <li
                  className={fila.confianza === "baja" ? styles.dudosa : styles.fila}
                  key={`${fila.nombre}-${indice}`}
                >
                  <input
                    aria-label={`Incluir ${fila.nombre}`}
                    checked={fila.elegido}
                    onChange={(evento) => cambiar(indice, { elegido: evento.target.checked })}
                    type="checkbox"
                  />
                  <input
                    aria-label="Nombre del producto"
                    onChange={(evento) => cambiar(indice, { nombre: evento.target.value })}
                    value={fila.nombre}
                  />
                  <input
                    aria-label="Precio"
                    inputMode="decimal"
                    onChange={(evento) => cambiar(indice, { precio: Number(evento.target.value) })}
                    type="number"
                    value={fila.precio}
                  />
                  {/* La descripción solo aparece si el archivo la traía: un campo
                      vacío por producto alarga la revisión sin agregar nada. */}
                  {fila.descripcion ? (
                    <input
                      aria-label="Descripción"
                      className={styles.descripcion}
                      onChange={(evento) => cambiar(indice, { descripcion: evento.target.value })}
                      value={fila.descripcion}
                    />
                  ) : null}
                  {fila.confianza === "baja" ? <span>revisá</span> : null}
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
        Se crean sin fotografía y sin existencias.{" "}
        <strong>Revisá los precios antes de publicar.</strong>
      </p>
    </section>
  );
}
