"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import type { CategoriaCatalogo } from "../../lib/catalogo/tipos";
import { MAXIMO_FOTOS_POR_PRODUCTO } from "../../lib/catalogo/validacion";
import { prepararImagenParaSubir } from "../../lib/imagenes";
import { Boton, Selector, useAvisos } from "../ui";
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
  /* `null` o ausente significa «no sabemos»: una foto no dice cuántos quedan y
     una planilla puede no traer la columna. No es cero, que significa
     «no queda ninguno» y publica el producto como agotado. */
  cantidad?: number | null;
};

type ImagenPendiente = { archivo: File; vistaPrevia: string };

/* `cantidad` se saca del tipo original antes de volver a declararla: en la
   lectura es un número y en el formulario es texto, y una intersección de las
   dos formas no da ninguna de las dos, da un tipo imposible. */
type Fila = Omit<ProductoLeido, "cantidad"> & {
  elegido: boolean;
  /* La cantidad se guarda como texto y no como número porque es lo que hay en
     un campo de formulario: si fuera número, borrar el contenido para escribir
     otro dejaría un `NaN` a mitad de camino. Se convierte recién al enviar. */
  cantidad: string;
  imagenes: ImagenPendiente[];
};

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
  controlaStock,
  onTerminado,
}: {
  categorias: CategoriaCatalogo[];
  productos: ProductoLeido[];
  introduccion: string;
  controlaStock: boolean;
  onTerminado: () => void;
}) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const [guardando, setGuardando] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [resultado, setResultado] = useState<{
    creados: number;
    fotos: number;
    fallidos: string[];
    fotosFallidas: number;
  } | null>(null);

  /* El estado arranca de las propiedades una sola vez. Quien llama vuelve a
     montar este componente con una `key` distinta cuando hay una lectura nueva:
     así una lectura nueva nunca pisa en silencio las correcciones a mano de la
     anterior. */
  const [filas, setFilas] = useState<Fila[]>(() =>
    productos.map((producto) => ({
      ...producto,
      elegido: producto.confianza !== "baja",
      cantidad: producto.cantidad === null || producto.cantidad === undefined
        ? ""
        : String(producto.cantidad),
      imagenes: [],
    })),
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

  /* Cada vista previa es una dirección que el navegador reserva hasta que se le
     diga que ya no hace falta. Con veintiocho productos y cuatro fotos cada uno
     son más de cien: sin soltarlas al desmontar, se quedan ocupando memoria
     mientras la pestaña siga abierta. */
  const filasVigentes = useRef(filas);
  /* La copia se actualiza en un efecto y no durante el dibujado. Escribir una
     referencia mientras React dibuja es leerla en un momento en que puede no
     valer lo que parece, y acá se necesita exacta: lo que guarda es la lista de
     direcciones que hay que soltar. */
  useEffect(() => {
    filasVigentes.current = filas;
  }, [filas]);

  useEffect(() => {
    return () => {
      for (const fila of filasVigentes.current) {
        for (const imagen of fila.imagenes) URL.revokeObjectURL(imagen.vistaPrevia);
      }
    };
  }, []);

  const elegidos = filas.filter(({ elegido }) => elegido);
  const totalFotos = elegidos.reduce((suma, fila) => suma + fila.imagenes.length, 0);

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

  /* Las fotos se comprimen al elegirlas y no al enviarlas. Comprimir veintiocho
     productos de golpe al confirmar dejaría la pantalla congelada varios
     segundos justo en el momento en que el dueño espera ver el resultado;
     además, así se entera en el acto si una foto no sirve. */
  async function agregarImagenes(indice: number, evento: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(evento.target.files ?? []);
    evento.target.value = "";
    if (archivos.length === 0) return;

    const actuales = filas[indice].imagenes.length;
    const lugar = MAXIMO_FOTOS_POR_PRODUCTO - actuales;
    if (lugar <= 0) {
      mostrarAviso({
        titulo: "Ese producto ya tiene sus fotos",
        mensaje: `Cada producto admite hasta ${MAXIMO_FOTOS_POR_PRODUCTO}.`,
        variante: "advertencia",
      });
      return;
    }

    const nuevas: ImagenPendiente[] = [];
    for (const original of archivos.slice(0, lugar)) {
      try {
        const comprimida = await prepararImagenParaSubir(original);
        nuevas.push({ archivo: comprimida, vistaPrevia: URL.createObjectURL(comprimida) });
      } catch (error) {
        mostrarAviso({
          titulo: `No se pudo usar «${original.name}»`,
          mensaje: error instanceof Error ? error.message : "Probá con otra imagen.",
          variante: "error",
        });
      }
    }

    if (nuevas.length === 0) return;
    if (archivos.length > lugar) {
      mostrarAviso({
        titulo: "Tomamos las primeras",
        mensaje: `Cada producto admite hasta ${MAXIMO_FOTOS_POR_PRODUCTO} fotos.`,
        variante: "advertencia",
      });
    }
    setFilas((todas) =>
      todas.map((fila, posicion) =>
        posicion === indice ? { ...fila, imagenes: [...fila.imagenes, ...nuevas] } : fila,
      ),
    );
  }

  function quitarImagen(indice: number, posicionImagen: number) {
    setFilas((todas) =>
      todas.map((fila, posicion) => {
        if (posicion !== indice) return fila;
        const fuera = fila.imagenes[posicionImagen];
        if (fuera) URL.revokeObjectURL(fuera.vistaPrevia);
        return { ...fila, imagenes: fila.imagenes.filter((_, i) => i !== posicionImagen) };
      }),
    );
  }

  async function crear() {
    setGuardando(true);
    let creados = 0;
    let fotos = 0;
    let fotosFallidas = 0;
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
    for (const [posicion, producto] of elegidos.entries()) {
      const titulo = producto.categoria || SIN_TITULO;
      setProgreso(`Creando ${posicion + 1} de ${elegidos.length}: ${producto.nombre}`);

      /* Se cuenta la existencia solo si el negocio la lleva y esta fila trae un
         número. Un campo vacío con el control prendido significa «no lo sé», y
         guardarlo como cero publicaría el producto agotado sin que nadie lo
         haya dicho. */
      const cantidad = Number(producto.cantidad);
      const conStock =
        controlaStock && producto.cantidad.trim() !== "" && Number.isFinite(cantidad);

      try {
        const respuesta = await fetch("/api/catalogo/productos", {
          body: JSON.stringify({
            nombre: producto.nombre,
            descripcion: producto.descripcion.trim() || null,
            precio: producto.precio,
            categoria_id: idPorTitulo.get(titulo) ?? null,
            subcategoria_id: null,
            controla_stock: conStock,
            cantidad_stock: conStock ? Math.max(0, Math.round(cantidad)) : null,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        if (!respuesta.ok) throw new Error("rechazado");
        const datos = (await respuesta.json()) as { producto?: { id: string } };
        creados += 1;

        /* Las fotos van después de crear el producto porque se guardan en su
           carpeta, y esa carpeta lleva el identificador que la base recién
           acaba de dar. Si una falla, el producto queda igual: es mucho más
           fácil agregarle una foto después que volver a cargar el producto. */
        const id = datos.producto?.id;
        if (id) {
          for (const [numero, imagen] of producto.imagenes.entries()) {
            setProgreso(
              `Subiendo la foto ${numero + 1} de ${producto.imagenes.length} de ${producto.nombre}`,
            );
            try {
              const cuerpo = new FormData();
              cuerpo.append("producto_id", id);
              cuerpo.append("archivo", imagen.archivo);
              const subida = await fetch("/api/catalogo/imagenes", {
                body: cuerpo,
                method: "POST",
              });
              if (!subida.ok) throw new Error("rechazada");
              fotos += 1;
            } catch {
              fotosFallidas += 1;
            }
          }
        } else {
          fotosFallidas += producto.imagenes.length;
        }
      } catch {
        fallidos.push(producto.nombre);
      }
    }

    setProgreso("");
    setGuardando(false);
    setResultado({ creados, fotos, fallidos, fotosFallidas });
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
        {resultado.fotos > 0 ? <p>Se subieron {resultado.fotos} fotografía(s).</p> : null}
        {resultado.fotosFallidas > 0 ? (
          <p>
            {resultado.fotosFallidas} fotografía(s) no se pudieron subir. Los productos sí quedaron
            creados: podés agregarles la foto desde el catálogo.
          </p>
        ) : null}
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
        <button disabled={guardando} onClick={() => marcarTodos(true)} type="button">
          Marcar todos
        </button>
        <button disabled={guardando} onClick={() => marcarTodos(false)} type="button">
          Desmarcar todos
        </button>
        <span>
          {elegidos.length} de {filas.length} marcados
          {totalFotos > 0 ? ` · ${totalFotos} foto(s) por subir` : ""}
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
                    disabled={guardando}
                    onChange={(evento) => cambiar(indice, { elegido: evento.target.checked })}
                    type="checkbox"
                  />
                  <input
                    aria-label="Nombre del producto"
                    disabled={guardando}
                    onChange={(evento) => cambiar(indice, { nombre: evento.target.value })}
                    value={fila.nombre}
                  />
                  <input
                    aria-label="Precio"
                    disabled={guardando}
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
                      disabled={guardando}
                      onChange={(evento) => cambiar(indice, { descripcion: evento.target.value })}
                      value={fila.descripcion}
                    />
                  ) : null}

                  {/* La cantidad y las fotos van en su propio renglón, debajo del
                      nombre y el precio. En un teléfono, cinco columnas en una
                      línea dejan cada campo del ancho de un dedo. */}
                  <div className={styles.extras}>
                    {controlaStock ? (
                      <label className={styles.cantidad}>
                        <span>Cantidad</span>
                        <input
                          disabled={guardando}
                          inputMode="numeric"
                          min={0}
                          onChange={(evento) => cambiar(indice, { cantidad: evento.target.value })}
                          placeholder="—"
                          type="number"
                          value={fila.cantidad}
                        />
                      </label>
                    ) : null}

                    <label className={styles.agregarFoto}>
                      {fila.imagenes.length === 0
                        ? "Agregar fotos"
                        : `${fila.imagenes.length} de ${MAXIMO_FOTOS_POR_PRODUCTO}`}
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        disabled={guardando || fila.imagenes.length >= MAXIMO_FOTOS_POR_PRODUCTO}
                        multiple
                        onChange={(evento) => void agregarImagenes(indice, evento)}
                        type="file"
                      />
                    </label>

                    {fila.imagenes.map((imagen, posicionImagen) => (
                      <button
                        className={styles.miniatura}
                        disabled={guardando}
                        key={imagen.vistaPrevia}
                        onClick={() => quitarImagen(indice, posicionImagen)}
                        title="Quitar esta fotografía"
                        type="button"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt={`Foto ${posicionImagen + 1} de ${fila.nombre}`} src={imagen.vistaPrevia} />
                        <span aria-hidden="true">×</span>
                        <span className={styles.soloLectores}>
                          Quitar la foto {posicionImagen + 1} de {fila.nombre}
                        </span>
                      </button>
                    ))}
                  </div>

                  {fila.confianza === "baja" ? <span>revisá</span> : null}
                </li>
              ),
            )}
          </ul>
        </div>
      ))}

      {progreso ? (
        <p className={styles.progreso} role="status">
          {progreso}
        </p>
      ) : null}

      <div className={styles.confirmar}>
        <Boton
          cargando={guardando}
          disabled={guardando || elegidos.length === 0}
          onClick={() => void crear()}
        >
          Crear {elegidos.length} producto(s)
          {totalFotos > 0 ? ` y subir ${totalFotos} foto(s)` : ""}
        </Boton>
      </div>
      <p className={styles.aviso}>
        {controlaStock
          ? "Los que dejes sin cantidad se crean sin control de existencias."
          : "Se crean sin existencias."}{" "}
        <strong>Revisá los precios antes de publicar.</strong>
      </p>
    </section>
  );
}
