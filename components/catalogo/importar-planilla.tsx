"use client";

import { useMemo, useState, type ChangeEvent } from "react";

import type { Atributo } from "../../lib/catalogo/atributos";
import type { CategoriaCatalogo } from "../../lib/catalogo/tipos";
import { columnasDeDatos, type Mapeo } from "../../lib/importacion/columnas";
import {
  MAXIMO_FILAS,
  leerArchivoDePlanilla,
  productosDeLaPlanilla,
  type ResultadoLectura,
} from "../../lib/importacion/planilla";
import { Boton, Selector, useAvisos } from "../ui";
import { RevisionDeProductos } from "./revision-de-productos";
import styles from "./importar-planilla.module.css";

/* Importar la planilla que el negocio ya tiene.
 *
 * Es la misma pantalla de revisión que la herramienta de fotos, con un paso
 * extra antes: decir qué columna es cuál. Ese paso existe porque la planilla de
 * un comerciante no tiene un formato, tiene el que le quedó, y una adivinanza
 * que no se puede corregir es peor que ninguna. */

const SIN_COLUMNA = "-1";

function nombreDeColumna(indice: number): string {
  let letras = "";
  let numero = indice;
  do {
    letras = String.fromCharCode(65 + (numero % 26)) + letras;
    numero = Math.floor(numero / 26) - 1;
  } while (numero >= 0);
  return letras;
}

export function ImportarPlanilla({
  atributosPorCategoria,
  categorias,
  negocioLlevaStock,
  plantillas,
}: {
  /* Los campos de cada categoría, por su id: los datos de la planilla se
     guardan en los de la categoría donde termine cada producto. */
  atributosPorCategoria: Record<string, Atributo[]>;
  categorias: CategoriaCatalogo[];
  /* Las plantillas de su rubro y de sus rubros secundarios que existen. Vacía
     si ninguno de sus rubros tiene plantilla todavía. */
  plantillas: ReadonlyArray<{ rubro: string; nombre: string }>;
  /* Si el negocio ya lleva la cuenta en los productos que tiene. Sirve para
     proponer lo mismo en los que va a importar: quien cuenta lo que le queda
     lo cuenta para todo, y prenderlo veintiocho veces a mano no lo haría
     nadie. */
  negocioLlevaStock: boolean;
}) {
  const { mostrarAviso } = useAvisos();
  const [leyendo, setLeyendo] = useState(false);
  const [lectura, setLectura] = useState<ResultadoLectura | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [mapeo, setMapeo] = useState<Mapeo | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [conStock, setConStock] = useState(false);

  const columnas = useMemo(() => {
    if (!lectura) return [];
    const cuantas = Math.max(
      lectura.cabeceras?.length ?? 0,
      ...lectura.filas.slice(0, 20).map((fila) => fila.length),
      1,
    );
    return Array.from({ length: cuantas }, (_, indice) => {
      const titulo = lectura.cabeceras?.[indice]?.trim();
      /* Cuando la planilla no trae títulos se muestra la letra de la columna y
         un ejemplo de lo que hay adentro. Sin el ejemplo, elegir entre
         «Columna B» y «Columna C» es adivinar. */
      const ejemplo = lectura.filas.find((fila) => (fila[indice] ?? "").trim() !== "")?.[indice];
      return {
        indice,
        etiqueta: titulo || `Columna ${nombreDeColumna(indice)}`,
        ejemplo: (ejemplo ?? "").slice(0, 24),
      };
    });
  }, [lectura]);

  const resultado = useMemo(() => {
    if (!lectura || !mapeo) return null;
    return productosDeLaPlanilla(lectura.filas, mapeo, lectura.cabeceras);
  }, [lectura, mapeo]);

  /* Las columnas que se van a guardar como datos de la categoría. Se dicen
     antes de confirmar: si «Color» no aparece acá, no se va a guardar. */
  const columnasDeDatosVistas = useMemo(
    () => (lectura && mapeo ? columnasDeDatos(lectura.cabeceras, mapeo).map(({ titulo }) => titulo) : []),
    [lectura, mapeo],
  );
  const conPresentaciones =
    resultado?.productos.filter(({ presentaciones }) => presentaciones.length > 0).length ?? 0;

  async function elegirArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;

    setLeyendo(true);
    setLectura(null);
    setMapeo(null);
    setConfirmado(false);
    try {
      const leido = await leerArchivoDePlanilla(archivo);
      setLectura(leido);
      setMapeo(leido.mapeo);
      setNombreArchivo(archivo.name);
      /* Se prende solo si la planilla trae una columna de existencias o si el
         negocio ya lleva la cuenta. Las dos son señales de lo mismo, y quedan a
         la vista en un interruptor que se puede apagar: proponer no es
         decidir. */
      setConStock(leido.mapeo.cantidad !== null || negocioLlevaStock);
      if (leido.recortada) {
        mostrarAviso({
          titulo: "Tomamos las primeras filas",
          mensaje: `Tu planilla tiene ${leido.totalLeido} filas y trabajamos con ${MAXIMO_FILAS} por vez. Importá el resto en una segunda vuelta.`,
          variante: "advertencia",
        });
      }
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo abrir la planilla",
        mensaje: error instanceof Error ? error.message : "Intentá nuevamente.",
        variante: "error",
      });
    } finally {
      setLeyendo(false);
    }
  }

  function cambiarMapeo(campo: keyof Mapeo, valor: string) {
    setMapeo((actual) => {
      if (!actual) return actual;
      const indice = Number(valor);
      if (campo === "nombre" || campo === "precio") return { ...actual, [campo]: indice };
      return { ...actual, [campo]: indice === -1 ? null : indice };
    });
  }

  return (
    <div className={styles.pantalla}>
      {/* La plantilla va primero: a quien no tiene planilla, o la tiene
          desordenada, le ahorra el paso de adivinar qué columnas poner. */}
      {plantillas.length > 0 ? (
        <section aria-labelledby="titulo-plantilla" className={styles.plantilla}>
          <h2 id="titulo-plantilla">Empieza con la plantilla de tu rubro</h2>
          <p>
            Trae tus categorías, los datos que pide cada una y ejemplos para copiar. Llénala en
            Excel o en Google Sheets y súbela aquí: todo cae en su lugar sin que tengas que decir qué
            columna es cuál.
          </p>
          <div className={styles.descargas}>
            {plantillas.map(({ rubro, nombre }) => (
              <a
                className={styles.descarga}
                download
                href={`/api/catalogo/plantilla?rubro=${encodeURIComponent(rubro)}`}
                key={rubro}
              >
                Descargar plantilla de {nombre.toLowerCase()}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.ayuda}>
        <h2>Importar tu Excel o tu CSV</h2>
        <p className={styles.gratis}>
          Esta importación es gratis y no tiene tope. No usa las lecturas de tu plan: tu planilla ya
          es una tabla, así que la leemos tal cual, sin interpretar nada.
        </p>
        <div className={styles.columnas}>
          <div>
            <h3>Funciona con</h3>
            <ul>
              <li>Archivos .xlsx de Excel, Google Sheets o LibreOffice</li>
              <li>Tu lista en cualquier pestaña del libro, no solo la primera</li>
              <li>Archivos .csv, con coma o con punto y coma</li>
              <li>Con fila de títulos o sin ella</li>
              <li>Precios escritos «12», «12,50» o «Bs 12,50»</li>
              <li>Una columna de categoría, si la tenés</li>
            </ul>
          </div>
          <div>
            <h3>Tener en cuenta</h3>
            <ul className={styles.ojo}>
              <li>Leemos la primera hoja que tenga datos, no todas</li>
              <li>El formato viejo .xls hay que guardarlo antes como .xlsx</li>
              <li>Los renglones sin nombre o sin precio se descartan y te lo decimos</li>
              <li>Hasta {MAXIMO_FILAS} productos por vez</li>
              <li>Las fotos de cada producto las subís vos después</li>
            </ul>
          </div>
        </div>
      </section>

      <label className={styles.cargar}>
        {leyendo ? "Abriendo tu planilla…" : "Elegir el archivo"}
        <input
          accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={leyendo}
          onChange={(evento) => void elegirArchivo(evento)}
          type="file"
        />
      </label>

      {lectura && mapeo && !confirmado ? (
        <section className={styles.mapeo}>
          <header>
            <h2>¿Qué columna es cuál?</h2>
            <p>
              Abrimos <strong>{nombreArchivo}</strong> y encontramos {lectura.filas.length} fila(s).
              Esto es lo que entendimos: corregilo si no coincide.
            </p>
          </header>

          <Selector
            etiqueta="El nombre del producto está en"
            id="columna-nombre"
            onChange={(evento) => cambiarMapeo("nombre", evento.target.value)}
            value={String(mapeo.nombre)}
          >
            {columnas.map(({ indice, etiqueta, ejemplo }) => (
              <option key={indice} value={indice}>
                {etiqueta}
                {ejemplo ? ` — por ejemplo «${ejemplo}»` : ""}
              </option>
            ))}
          </Selector>

          <Selector
            etiqueta="El precio está en"
            id="columna-precio"
            onChange={(evento) => cambiarMapeo("precio", evento.target.value)}
            value={String(mapeo.precio)}
          >
            {columnas.map(({ indice, etiqueta, ejemplo }) => (
              <option key={indice} value={indice}>
                {etiqueta}
                {ejemplo ? ` — por ejemplo «${ejemplo}»` : ""}
              </option>
            ))}
          </Selector>

          <Selector
            etiqueta="La descripción está en (opcional)"
            id="columna-descripcion"
            onChange={(evento) => cambiarMapeo("descripcion", evento.target.value)}
            value={String(mapeo.descripcion ?? -1)}
          >
            <option value={SIN_COLUMNA}>Mi planilla no tiene descripción</option>
            {columnas.map(({ indice, etiqueta }) => (
              <option key={indice} value={indice}>
                {etiqueta}
              </option>
            ))}
          </Selector>

          <Selector
            etiqueta="La categoría está en (opcional)"
            id="columna-categoria"
            onChange={(evento) => cambiarMapeo("categoria", evento.target.value)}
            value={String(mapeo.categoria ?? -1)}
          >
            <option value={SIN_COLUMNA}>Mi planilla no tiene categoría</option>
            {columnas.map(({ indice, etiqueta }) => (
              <option key={indice} value={indice}>
                {etiqueta}
              </option>
            ))}
          </Selector>

          {/* El control de cantidad es una decisión del negocio, no del
              archivo: hay quien lleva una planilla con existencias y publica un
              catálogo sin contar nada. Por eso se propone y se puede apagar. */}
          <label className={styles.interruptor}>
            <input
              checked={conStock}
              onChange={(evento) => setConStock(evento.target.checked)}
              type="checkbox"
            />
            <span>
              Estos productos llevan control de cantidad
              {mapeo.cantidad !== null ? " (tu planilla trae una columna de existencias)" : ""}
            </span>
          </label>

          {conStock ? (
            <Selector
              etiqueta="La cantidad en existencia está en (opcional)"
              id="columna-cantidad"
              onChange={(evento) => cambiarMapeo("cantidad", evento.target.value)}
              value={String(mapeo.cantidad ?? -1)}
            >
              <option value={SIN_COLUMNA}>La escribo a mano en el paso siguiente</option>
              {columnas.map(({ indice, etiqueta, ejemplo }) => (
                <option key={indice} value={indice}>
                  {etiqueta}
                  {ejemplo ? ` — por ejemplo «${ejemplo}»` : ""}
                </option>
              ))}
            </Selector>
          ) : null}

          {/* Talla, número o tamaño: una fila por cada uno, y las filas con el
              mismo nombre se juntan en un producto. Solo si la planilla trae
              títulos: sin ellos no hay forma de reconocer esa columna. */}
          {lectura.cabeceras ? (
            <>
              <Selector
                etiqueta="La talla, el número o el tamaño está en (opcional)"
                id="columna-presentacion"
                onChange={(evento) => cambiarMapeo("presentacion", evento.target.value)}
                value={String(mapeo.presentacion ?? -1)}
              >
                <option value={SIN_COLUMNA}>Mis productos se venden de una sola forma</option>
                {columnas.map(({ indice, etiqueta, ejemplo }) => (
                  <option key={indice} value={indice}>
                    {etiqueta}
                    {ejemplo ? ` — por ejemplo «${ejemplo}»` : ""}
                  </option>
                ))}
              </Selector>
              {mapeo.presentacion !== null ? (
                <Selector
                  ayuda="Talla, Número, Tamaño u Opción. Si no la tienes, lo deducimos de lo que escribiste."
                  etiqueta="Cómo se elige está en (opcional)"
                  id="columna-tipo-presentacion"
                  onChange={(evento) => cambiarMapeo("tipoPresentacion", evento.target.value)}
                  value={String(mapeo.tipoPresentacion ?? -1)}
                >
                  <option value={SIN_COLUMNA}>Dedúcelo de lo que escribí</option>
                  {columnas.map(({ indice, etiqueta, ejemplo }) => (
                    <option key={indice} value={indice}>
                      {etiqueta}
                      {ejemplo ? ` — por ejemplo «${ejemplo}»` : ""}
                    </option>
                  ))}
                </Selector>
              ) : null}
              {columnasDeDatosVistas.length > 0 ? (
                <p className={styles.datosReconocidos}>
                  <strong>Datos de categoría:</strong> {columnasDeDatosVistas.join(", ")}. Se guardan
                  en cada producto si su categoría tiene un dato con ese nombre; los demás se
                  ignoran.
                </p>
              ) : null}
            </>
          ) : null}

          {/* La cuenta se muestra antes de confirmar y se actualiza al cambiar
              una columna: es la forma de darse cuenta de que se eligió mal sin
              tener que pasar a la pantalla siguiente. Si la columna del precio
              está equivocada, acá se ve que no entró casi nada. */}
          <p className={styles.cuenta}>
            Con esta elección entran <strong>{resultado?.productos.length ?? 0} producto(s)</strong>
            {conPresentaciones > 0 ? `, ${conPresentaciones} con tallas, números o tamaños` : ""}
            {resultado && resultado.descartadas > 0
              ? `, y se descartan ${resultado.descartadas} fila(s) que no tienen nombre o no tienen un precio válido.`
              : "."}
            {resultado && resultado.ejemplos > 0
              ? ` Dejamos afuera ${resultado.ejemplos} fila(s) de ejemplo de la plantilla.`
              : ""}
          </p>

          <Boton
            disabled={!resultado || resultado.productos.length === 0}
            onClick={() => setConfirmado(true)}
          >
            Continuar
          </Boton>
        </section>
      ) : null}

      {confirmado && resultado ? (
        <RevisionDeProductos
          atributosPorCategoria={atributosPorCategoria}
          categorias={categorias}
          controlaStock={conStock}
          introduccion={`${resultado.productos.length} producto(s) de tu planilla, tal como estaban escritos. Agregales fotos si querés y sacá los que no vayas a publicar.`}
          key={nombreArchivo}
          onTerminado={() => setConfirmado(true)}
          productos={resultado.productos}
        />
      ) : null}
    </div>
  );
}
