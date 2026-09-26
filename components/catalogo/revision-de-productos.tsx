"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import {
  CREAR,
  SIN_CATEGORIA,
  SIN_TITULO,
  proponerDestinos,
} from "../../lib/catalogo/destinos-de-lista";
import type { Atributo } from "../../lib/catalogo/atributos";
import type { CategoriaCatalogo } from "../../lib/catalogo/tipos";
import { etiquetaDePresentacion, type TipoPresentacion } from "../../lib/catalogo/variantes";
import { valoresDesdePlanilla } from "../../lib/importacion/datos-de-planilla";
import { posicionesYaExistentes } from "../../lib/importacion/ya-existentes";
import type { PresentacionDePlanilla } from "../../lib/importacion/planilla";
import type { InformeDeCobertura } from "../../lib/ia/cobertura";
import { planDe } from "../../lib/planes";
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
  /* Los datos propios de la categoría que la lectura pudo completar: la marca de
     un repuesto, el volumen de una gaseosa. Vienen ya filtrados contra las
     claves que la categoría declaró de verdad. */
  datos?: Array<{ clave: string; valor: string }>;
  /* La categoría del negocio que la lectura encontró más parecida, aunque el
     título de la sección no coincida. Solo la trae la lectura con IA; la
     planilla no. */
  categoriaSugeridaId?: string | null;
  /* Solo de la planilla: las tallas, números o tamaños —una fila de la
     planilla cada una—, las columnas de datos por su título y lo que se vio
     raro al leerla. */
  presentaciones?: PresentacionDePlanilla[];
  tipoPresentacion?: TipoPresentacion | null;
  campos?: Record<string, string>;
  avisos?: string[];
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
  /* Ya hay un producto con este nombre en el catálogo: viene sin marcar. */
  yaExiste: boolean;
};

/* Qué hacer con cada título de sección: crearlo como categoría nueva, mandarlo
   a una que ya existe, o dejar esos productos sin categoría. Se decide una vez
   por título y no producto por producto. */

export function RevisionDeProductos({
  atributosPorCategoria = {},
  nombresDelCatalogo = [],
  categorias,
  productos,
  introduccion,
  controlaStock,
  cobertura,
  onTerminado,
  planId,
  productosActuales,
  enlaceCatalogo,
}: {
  /* Los campos de cada categoría por su id. Con ellos, las columnas de datos
     de la planilla se guardan en la categoría donde termina el producto. */
  atributosPorCategoria?: Record<string, Atributo[]>;
  /* Los nombres de los productos que el negocio ya tiene. Los de la lectura
     que coinciden vienen sin marcar: así una importación cortada se retoma
     subiendo el mismo archivo, sin duplicar lo que ya se creó. */
  nombresDelCatalogo?: string[];
  categorias: CategoriaCatalogo[];
  productos: ProductoLeido[];
  introduccion: string;
  controlaStock: boolean;
  /* Cuánto se pudo completar. Ausente cuando la lectura no lo trae —una planilla
     importada no pasa por el modelo— y entonces no se dibuja nada. */
  cobertura?: InformeDeCobertura;
  onTerminado: () => void;
  /* El plan decide cuántos productos entran y cuántas fotos lleva cada uno
     (`lib/planes.ts`). Con lo que el negocio ya tiene, se sabe cuántos de los
     marcados caben antes de crear: la base rechaza el que sobra igual, pero a
     mitad de una importación y sin que el dueño entienda por qué. */
  planId: string;
  productosActuales: number;
  /* La dirección del catálogo público, para el «Ver mi catálogo» del final. */
  enlaceCatalogo?: string;
}) {
  const plan = planDe(planId);
  const topeFotos = plan.topes.fotosPorProducto;
  const lugarLibre = Math.max(0, plan.topes.productos - productosActuales);
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const [guardando, setGuardando] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [resultado, setResultado] = useState<ResultadoDeCarga | null>(null);

  /* El estado arranca de las propiedades una sola vez. Quien llama vuelve a
     montar este componente con una `key` distinta cuando hay una lectura nueva:
     así una lectura nueva nunca pisa en silencio las correcciones a mano de la
     anterior. */
  const [filas, setFilas] = useState<Fila[]>(() => {
    const yaExistentes = posicionesYaExistentes(productos, nombresDelCatalogo);
    return productos.map((producto, posicion) => ({
      ...producto,
      yaExiste: yaExistentes.has(posicion),
      elegido: producto.confianza !== "baja" && !yaExistentes.has(posicion),
      cantidad: producto.cantidad === null || producto.cantidad === undefined
        ? ""
        : String(producto.cantidad),
      imagenes: [],
    }));
  });
  /* El destino de cada sección se propone una sola vez, al montar: la categoría
     que se llama igual, o la más parecida que sugirió la lectura, o crear una.
     Lo que el dueño cambie después manda. */
  const [propuesta] = useState(() => proponerDestinos(productos, categorias));
  const [destinos, setDestinos] = useState<Record<string, string>>(propuesta.destinos);

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

  /* Mientras se crean los productos, cerrar la pestaña deja la importación a
     medias: el navegador pregunta antes. Si igual se cierra, volver a subir el
     archivo retoma sin duplicar —los ya creados vienen sin marcar—. */
  useEffect(() => {
    if (!guardando) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [guardando]);

  const yaExistentes = filas.filter(({ yaExiste }) => yaExiste).length;
  const elegidos = filas.filter(({ elegido }) => elegido);
  const sobran = Math.max(0, elegidos.length - lugarLibre);
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
    const lugar = topeFotos - actuales;
    if (lugar <= 0) {
      mostrarAviso({
        titulo: "Ese producto ya tiene sus fotos",
        mensaje: `Cada producto admite hasta ${topeFotos}.`,
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
          mensaje: error instanceof Error ? error.message : "Prueba con otra imagen.",
          variante: "error",
        });
      }
    }

    if (nuevas.length === 0) return;
    if (archivos.length > lugar) {
      mostrarAviso({
        titulo: "Tomamos las primeras",
        mensaje: `Cada producto admite hasta ${topeFotos} fotos.`,
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
    const advertencias: string[] = [];

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
      const presentaciones = producto.presentaciones ?? [];
      /* Con presentaciones, las existencias son de cada una: se controlan solo
         si todas las filas traían cantidad. Una talla sin número no se podría
         pedir, y la base no la acepta. */
      const conStockPorPresentacion =
        conStock && presentaciones.every(({ cantidad: suya }) => suya !== null);
      const categoriaId = idPorTitulo.get(titulo) ?? null;

      /* Las columnas de datos, cruzadas con los campos de la categoría de
         destino. Lo que no calza se avisa y no se manda: la ruta rechazaría el
         producto entero por un valor que no es opción. */
      const deLaPlanilla = producto.campos
        ? valoresDesdePlanilla(categoriaId ? (atributosPorCategoria[categoriaId] ?? []) : [], producto.campos)
        : { valores: {}, problemas: [] };
      for (const problema of deLaPlanilla.problemas) {
        advertencias.push(`${producto.nombre}: ${problema}.`);
      }
      const atributos = {
        ...(producto.datos?.length
          ? Object.fromEntries(producto.datos.map(({ clave, valor }) => [clave, valor]))
          : {}),
        ...deLaPlanilla.valores,
      };

      try {
        const respuesta = await fetch("/api/catalogo/productos", {
          body: JSON.stringify({
            nombre: producto.nombre,
            descripcion: producto.descripcion.trim() || null,
            precio: producto.precio,
            categoria_id: categoriaId,
            subcategoria_id: null,
            /* Lo que la lectura completó de los campos de la categoría. La ruta
               de productos los valida otra vez contra la categoría que termine
               teniendo: acá el dueño pudo haber mandado ese título a otra
               categoría, y un campo que allá no existe se descarta. */
            atributos: Object.keys(atributos).length > 0 ? atributos : undefined,
            controla_stock: presentaciones.length > 0 ? conStockPorPresentacion : conStock,
            cantidad_stock:
              presentaciones.length > 0
                ? conStockPorPresentacion
                  ? presentaciones.reduce((suma, una) => suma + (una.cantidad ?? 0), 0)
                  : null
                : conStock
                  ? Math.max(0, Math.round(cantidad))
                  : null,
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

        /* Las tallas, números o tamaños, con la misma ruta que el editor del
           producto: las mismas validaciones y el mismo tope. Si fallan, el
           producto queda creado sin ellas y se dice por qué. */
        if (id && presentaciones.length > 0) {
          try {
            const guardado = await fetch(`/api/catalogo/productos/${id}/variantes`, {
              body: JSON.stringify({
                tipo: producto.tipoPresentacion ?? "presentacion",
                variantes: presentaciones.map((una) => ({
                  nombre: una.nombre,
                  /* Sin precio propio si cuesta lo mismo que el producto: así
                     una promoción del producto le alcanza. */
                  precio: una.precio,
                  cantidadStock: conStockPorPresentacion ? una.cantidad : null,
                  visible: true,
                })),
              }),
              headers: { "content-type": "application/json" },
              method: "PUT",
            });
            if (!guardado.ok) {
              const respuesta = (await guardado.json().catch(() => ({}))) as { error?: string };
              advertencias.push(
                `${producto.nombre}: se creó sin sus presentaciones. ${respuesta.error ?? "Agrégalas desde Productos."}`,
              );
            }
          } catch {
            advertencias.push(`${producto.nombre}: se creó sin sus presentaciones. Agrégalas desde Productos.`);
          }
        }

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
    setResultado({ creados, fotos, fallidos, fotosFallidas, advertencias });
    onTerminado();
    router.refresh();
  }

  /* El resultado se queda en pantalla en vez de ser un aviso que se va solo. Lo
     que hay que leer acá es la lista de los que no entraron, y esa lista no
     puede desaparecer a los cinco segundos. */
  if (resultado) {
    return <ResultadoDeCreacion enlaceCatalogo={enlaceCatalogo} resultado={resultado} />;
  }

  return (
    <section className={styles.revision}>
      <header>
        <h2>Revisa antes de crear</h2>
        <p>{introduccion}</p>
      </header>

      {/* Qué pudo completar la lectura, antes de confirmar y no después.
          Después significa abrir cuarenta productos uno por uno para descubrir
          a cuáles les falta la marca. Acá todavía se puede completar a mano lo
          que falta, o decidir que no importa: el informe no impide nada. */}
      {cobertura && (cobertura.campos.length > 0 || cobertura.vacios.length > 0) ? (
        <aside aria-labelledby="titulo-cobertura" className={styles.cobertura}>
          <h3 id="titulo-cobertura">Qué pudimos completar</h3>
          <ul>
            {cobertura.campos.map((campo) => (
              <li key={`${campo.categoria}-${campo.clave}`}>
                <strong>
                  {campo.completos} de {campo.productos}
                </strong>{" "}
                productos de <em>{campo.categoria}</em> traen {campo.nombre.toLowerCase()}
              </li>
            ))}
            {/* Los que no vinieron nunca se dicen distinto: no es que la lista
                los traiga a medias, es que esa columna no está, y lo que hay que
                revisar es la lista y no los productos. */}
            {cobertura.vacios.map((campo) => (
              <li data-vacio="si" key={`${campo.categoria}-${campo.clave}`}>
                <strong>Ninguno</strong> de los {campo.productos} productos de{" "}
                <em>{campo.categoria}</em> trae {campo.nombre.toLowerCase()}
              </li>
            ))}
          </ul>
          <p>
            Los puedes completar ahora en cada producto, o después desde Productos. Nada de
            esto impide crearlos.
          </p>
        </aside>
      ) : null}

      {yaExistentes > 0 ? (
        <p className={styles.yaExistentes}>
          {yaExistentes === 1
            ? "1 producto ya está en tu catálogo con el mismo nombre y quedó sin marcar."
            : `${yaExistentes} productos ya están en tu catálogo con el mismo nombre y quedaron sin marcar.`}{" "}
          Si una importación anterior se cortó, sigue desde aquí sin duplicar. Si es otro
          producto con el mismo nombre, márcalo.
        </p>
      ) : null}

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
          <p>Decide qué hacer con cada una.</p>
          {/* Cuando la propuesta no es la categoría que se llama igual sino la
              más parecida, se dice: si no, el dueño ve «Poner en Refrescos» al
              lado de «BEBIDAS» y no sabe de dónde salió. */}
          {propuesta.sugeridas.size > 0 ? (
            <p className={styles.sugerencia}>
              Te sugerimos tu categoría más parecida en{" "}
              {propuesta.sugeridas.size === 1 ? "una sección" : `${propuesta.sugeridas.size} secciones`}.
              Revísalas antes de confirmar.
            </p>
          ) : null}
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
                  {/* Las tallas se ven como van a quedar, con cuántas hay de
                      cada una. La cantidad del producto no se pide: es la de
                      cada talla. */}
                  {fila.presentaciones && fila.presentaciones.length > 0 ? (
                    <p className={styles.presentaciones}>
                      {fila.presentaciones
                        .map((una) =>
                          `${etiquetaDePresentacion(fila.tipoPresentacion ?? "presentacion", una.nombre)}${
                            una.cantidad !== null && controlaStock ? ` (${una.cantidad})` : ""
                          }${una.precio !== null ? ` · Bs ${una.precio}` : ""}`,
                        )
                        .join(" · ")}
                    </p>
                  ) : null}
                  {fila.avisos && fila.avisos.length > 0 ? (
                    <p className={styles.avisoFila}>{fila.avisos.join(" ")}</p>
                  ) : null}

                  <div className={styles.extras}>
                    {controlaStock && !(fila.presentaciones && fila.presentaciones.length > 0) ? (
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
                        ? `Agregar fotos (hasta ${topeFotos})`
                        : `${fila.imagenes.length} de ${topeFotos}`}
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        disabled={guardando || fila.imagenes.length >= topeFotos}
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

                  {fila.yaExiste ? <span className={styles.etiquetaYaExiste}>Ya está en tu catálogo</span> : null}
                  {fila.confianza === "baja" ? <span>revisa</span> : null}
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

      {sobran > 0 ? (
        <p className={styles.aviso} id="aviso-tope-importacion" role="status">
          <strong>
            Tu plan {plan.nombre} incluye hasta {plan.topes.productos} productos y ya tienes{" "}
            {productosActuales}: entran {lugarLibre} más.
          </strong>{" "}
          Desmarca {sobran} para poder crear los demás.
        </p>
      ) : null}

      <div className={styles.confirmar}>
        <Boton
          cargando={guardando}
          aria-describedby={sobran > 0 ? "aviso-tope-importacion" : undefined}
          disabled={guardando || elegidos.length === 0 || sobran > 0}
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
        <strong>Revisa los precios antes de publicar.</strong>
      </p>
    </section>
  );
}

export type ResultadoDeCarga = {
  creados: number;
  fotos: number;
  fallidos: string[];
  fotosFallidas: number;
  /* Lo que entró a medias: un dato que no calzaba, una talla que no se
     guardó. El producto está creado; lo que falta se completa a mano. */
  advertencias: string[];
};

/* Lo que queda en pantalla al terminar. Los productos ya están a la vista de
   los clientes, así que el paso siguiente natural —ver cómo quedaron— va a un
   toque. Sin la dirección del catálogo no se dibuja el enlace. */
export function ResultadoDeCreacion({
  resultado,
  enlaceCatalogo,
}: {
  resultado: ResultadoDeCarga;
  enlaceCatalogo?: string;
}) {
  return (
    <section className={styles.revision}>
      <h2>{resultado.creados} producto(s) creado(s)</h2>
      {resultado.fotos > 0 ? <p>Se subieron {resultado.fotos} fotografía(s).</p> : null}
      {resultado.fotosFallidas > 0 ? (
        <p>
          {resultado.fotosFallidas} fotografía(s) no se pudieron subir. Los productos sí quedaron
          creados: puedes agregarles la foto desde el catálogo.
        </p>
      ) : null}
      <p>
        {resultado.fallidos.length > 0
          ? `No se pudieron crear: ${resultado.fallidos.slice(0, 3).join(", ")}.`
          : "Ya están publicados en tu catálogo. Revisa que los precios estén bien."}
      </p>
      {/* Se listan todas y no las tres primeras: cada una es algo que el
          dueño tiene que completar a mano, y la que no se ve no se completa. */}
      {resultado.advertencias.length > 0 ? (
        <div className={styles.advertencias}>
          <h3>Para completar a mano</h3>
          <ul>
            {resultado.advertencias.map((advertencia) => (
              <li key={advertencia}>{advertencia}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {enlaceCatalogo ? (
        <a className={styles.verCatalogo} href={enlaceCatalogo} rel="noreferrer" target="_blank">
          Ver mi catálogo
        </a>
      ) : null}
    </section>
  );
}
