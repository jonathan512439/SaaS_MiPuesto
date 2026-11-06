"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";

import { AVISO_PRIVACIDAD_IA, AYUDA_LISTA } from "../../lib/ia/ayuda";
import { esPdfGrande, esPlanilla, prepararArchivoParaLectura } from "../../lib/ia/adjunto";
import { cupoDeLecturas, gastarLectura, periodoDeLecturas } from "../../lib/ia/cupo-de-lecturas";
import { prepararFotoParaLectura } from "../../lib/imagenes";
import { dividirEnTandas, recortarPaginas } from "../../lib/ia/pdf-texto";
import { RUTAS_PANEL } from "../../lib/panel/rutas";
import type { CategoriaCatalogo } from "../../lib/catalogo/tipos";
import { Trabajando, useAvisos, useConfirmacion } from "../ui";
import type { InformeDeCobertura } from "../../lib/ia/cobertura";
import { Icono } from "../iconos/icono";
import { ContadorLecturas } from "./contador-lecturas";
import { RevisionDeProductos, type ProductoLeido } from "./revision-de-productos";
import { SalidasCatalogo } from "./salidas-catalogo";
import styles from "./carga-desde-foto.module.css";

/* Lo que contesta la lectura, venga de una foto o del texto de un PDF. */
type RespuestaLectura = {
  error?: string;
  productos?: ProductoLeido[];
  cobertura?: InformeDeCobertura;
  tandasPerdidas?: number;
};

async function pedirLectura(cuerpo: unknown) {
  const respuesta = await fetch("/api/ia/lista", {
    body: JSON.stringify(cuerpo),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const datos = (await respuesta.json().catch(() => ({}))) as RespuestaLectura;
  if (!respuesta.ok || !datos.productos) {
    throw new Error(datos.error ?? "No pudimos leer el archivo.");
  }
  return datos as RespuestaLectura & { productos: ProductoLeido[] };
}

export function CargaDesdeFoto({
  categorias,
  fotosUsadas,
  negocioLlevaStock,
  nombresDelCatalogo = [],
  planId,
  productosActuales,
  enlaceCatalogo,
}: {
  categorias: CategoriaCatalogo[];
  fotosUsadas: number;
  /* Ninguna fotografía dice cuántas unidades quedan. El campo aparece igual si
     el negocio lleva la cuenta, vacío: es el momento en que el dueño tiene el
     producto en la cabeza, y volver después a cargarlo de a uno no lo hace
     nadie. */
  negocioLlevaStock: boolean;
  /* Los nombres de los productos que ya tiene, para no duplicarlos. */
  nombresDelCatalogo?: string[];
  /* El plan y cuántos productos vivos tiene: la revisión avisa si lo marcado
     no entra en el plan (`lib/planes.ts`). */
  planId: string;
  productosActuales: number;
  /* La dirección del catálogo público, para el «Ver mi catálogo» del final. */
  enlaceCatalogo?: string;
}) {
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  /* Qué se está haciendo con un PDF grande, para decirlo mientras dura: abrirlo
     en el teléfono lleva tiempo y no se debe ver como una pantalla trabada. */
  const [avance, setAvance] = useState("");
  /* Por qué no se pudo leer. Con esto a la vista, el dueño ve qué puede hacer
     en vez de un error que se va solo. */
  const [motivoSalida, setMotivoSalida] = useState("");
  /* Lo que conviene avisar sobre lo leído, junto a la revisión. */
  const [avisoLectura, setAvisoLectura] = useState("");
  const [productos, setProductos] = useState<ProductoLeido[]>([]);
  const [cobertura, setCobertura] = useState<InformeDeCobertura | undefined>(undefined);
  /* Cambia con cada lectura y sirve de `key` del paso de revisión: una lectura
     nueva monta una revisión nueva en vez de mezclarse con la anterior. */
  const [lectura, setLectura] = useState(0);
  /* El nombre del Excel o del CSV que se eligió acá por error. Se contesta en la
     pantalla y no en un aviso que se va solo: lo que hay que hacer es ir a otro
     lado, y el botón para ir tiene que quedarse a la vista. */
  const [planillaElegida, setPlanillaElegida] = useState("");
  /* Que la IA escriba una descripción corta donde la lista no trae ninguna.
     Prendido de entrada: va en la misma lectura y no gasta otra, y una lista de
     precios casi nunca trae descripciones. Llegan marcadas como sugeridas. */
  const [describir, setDescribir] = useState(true);
  /* Lo que le queda, descontado apenas se lee una lista: decía «llevas X de Y»
     con el número de cuando abrió la pantalla, y después de tres listas seguía
     diciendo lo mismo. */
  const [lecturas, setLecturas] = useState(() => cupoDeLecturas(planId, fotosUsadas));

  /* Un PDF grande no se sube: sus fotos se quedan en el teléfono y viaja el
     texto. Si no trae texto —escaneado, o exportado como imagen— se leen sus
     páginas como fotos, avisando antes, porque ahí sí gasta una lectura por
     página. */
  async function leerPdfGrande(archivo: File) {
    setLeyendo(true);
    setProductos([]);
    setVistaPrevia("");
    setNombreArchivo(archivo.name);
    setAvisoLectura("");
    setAvance("Abriendo tu catálogo…");
    try {
      const { abrirPdf, paginaComoImagen, PdfIlegible } = await import("../../lib/ia/pdf-grande");
      let abierto;
      try {
        abierto = await abrirPdf(archivo, (hecho, total) =>
          setAvance(`Leyendo tu catálogo: página ${hecho} de ${total}…`),
        );
      } catch (error) {
        if (error instanceof PdfIlegible) {
          setMotivoSalida(error.message);
          setNombreArchivo("");
          return;
        }
        throw error;
      }

      const avisos: string[] = [];
      const { entran, afuera } = recortarPaginas(abierto.paginas);
      if (afuera > 0) avisos.push(`${afuera} página(s) del final no entraron en esta lectura.`);

      if (entran.length >= abierto.sinTexto.length) {
        if (abierto.sinTexto.length > 0) {
          avisos.push(`Las páginas ${abierto.sinTexto.join(", ")} son imágenes: esas no se leyeron.`);
        }
        const tandas = dividirEnTandas(entran).length;
        setAvance(
          tandas > 1 ? `Separando tus productos, en ${tandas} partes…` : "Separando tus productos…",
        );
        const datos = await pedirLectura({ paginas: entran, describir });
        if (datos.tandasPerdidas) {
          /* No se descuenta: el servidor devolvió la lectura. */
          avisos.push(
            "Una parte del catálogo no se pudo leer porque el servicio estaba saturado. No te gastamos la lectura: crea estos y vuelve a subir el PDF en un rato. Lo que ya creaste viene desmarcado.",
          );
        } else {
          setLecturas(gastarLectura);
        }
        setProductos(datos.productos);
        setCobertura(datos.cobertura);
      } else {
        const paginas = abierto.sinTexto.slice(0, lecturas.quedan);
        if (paginas.length === 0) {
          setMotivoSalida(`Tu catálogo viene como imágenes y ya no te quedan lecturas ${periodoDeLecturas(lecturas)}.`);
          setNombreArchivo("");
          return;
        }
        const aceptado = await confirmar({
          titulo: "Tu catálogo viene como imágenes",
          descripcion: `Trae ${abierto.sinTexto.length} página(s) sin texto, y cada una gasta 1 lectura. Te quedan ${lecturas.quedan}: leemos ${paginas.length === abierto.sinTexto.length ? "todas" : `las primeras ${paginas.length}`}.`,
          textoAccion: `Leer ${paginas.length} página(s)`,
          textoCancelar: "Ver otras opciones",
        });
        if (!aceptado) {
          setMotivoSalida("Tu catálogo viene como imágenes y leerlo gasta una lectura por página.");
          setNombreArchivo("");
          return;
        }
        const leidos: ProductoLeido[] = [];
        for (const [indice, numero] of paginas.entries()) {
          setAvance(`Leyendo la página ${indice + 1} de ${paginas.length}…`);
          try {
            const foto = await prepararFotoParaLectura(await paginaComoImagen(abierto.documento, numero));
            const datos = await pedirLectura({ imagen: foto.base64, tipo: foto.tipo, describir });
            setLecturas(gastarLectura);
            leidos.push(...datos.productos);
          } catch (error) {
            /* Lo que ya se leyó costó lecturas: no se tira porque falló una. */
            if (leidos.length === 0) throw error;
            avisos.push(`La lectura se cortó en la página ${numero}.`);
            break;
          }
        }
        if (paginas.length < abierto.sinTexto.length) {
          avisos.push(`Quedaron ${abierto.sinTexto.length - paginas.length} página(s) sin leer: no alcanzaron tus lecturas.`);
        }
        setProductos(leidos);
        setCobertura(undefined);
      }
      setAvisoLectura(avisos.join(" "));
      setLectura((numero) => numero + 1);
    } catch (error) {
      setNombreArchivo("");
      setMotivoSalida(error instanceof Error ? error.message : "No pudimos leer tu catálogo.");
    } finally {
      setLeyendo(false);
      setAvance("");
    }
  }

  async function leerArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;

    setPlanillaElegida("");
    setMotivoSalida("");
    const cabecera = new Uint8Array(await archivo.slice(0, 8).arrayBuffer());
    if (esPlanilla(cabecera, archivo.name)) {
      setPlanillaElegida(archivo.name);
      return;
    }
    if (esPdfGrande(cabecera, archivo.size)) {
      await leerPdfGrande(archivo);
      return;
    }

    setLeyendo(true);
    setProductos([]);
    setAvisoLectura("");
    try {
      const adjunto = await prepararArchivoParaLectura(archivo);
      setVistaPrevia(adjunto.vistaPrevia);
      setNombreArchivo(adjunto.nombre);

      const datos = await pedirLectura({ imagen: adjunto.base64, tipo: adjunto.tipo, describir });

      setLecturas(gastarLectura);
      setProductos(datos.productos);
      setCobertura(datos.cobertura);
      setLectura((numero) => numero + 1);
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo leer la lista",
        mensaje: error instanceof Error ? error.message : "Intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setLeyendo(false);
    }
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
        <p className={styles.avisoPrivacidad}>{AVISO_PRIVACIDAD_IA}</p>
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
        detalle={
          avance
            ? `${avance} Las fotos se quedan en tu teléfono: no gasta tus datos.`
            : "Estamos leyendo la lista y separando cada producto con su precio. Cuanto más larga, más tarda."
        }
        titulo="Leyendo tu lista…"
      />

      {/* La cámara, para la lista que está pegada en la pared o en el cuaderno;
          la galería, para la foto que ya se sacó o el PDF del proveedor. La
          cámara solo se ofrece en pantallas táctiles: en una computadora
          `capture` se ignora y los dos botones harían lo mismo. */}
      <label className={styles.describirFaltantes}>
        <input
          checked={describir}
          disabled={leyendo}
          onChange={(evento) => setDescribir(evento.target.checked)}
          type="checkbox"
        />
        <span className={styles.describirTexto}>
          <strong>
            <Icono nombre="rayo" />
            Escribir una descripción corta donde falte
          </strong>
          <small>
            La IA usa solo lo que dice tu lista y te las marca para que las revises. No gasta otra
            lectura.
          </small>
        </span>
      </label>
      <div className={styles.acciones}>
        <label className={`${styles.cargar} ${styles.soloTactil}`}>
          {leyendo ? "Leyendo tu lista…" : "Sacar foto a la lista"}
          <input
            accept="image/*"
            capture="environment"
            disabled={leyendo}
            onChange={(evento) => void leerArchivo(evento)}
            type="file"
          />
        </label>
        <label className={styles.cargar}>
          {leyendo ? "Leyendo tu lista…" : "Elegir la foto o el PDF de la lista"}
          {/* El Excel y el CSV se aceptan para poder contestarlos: fuera de la
              lista, el selector los escondía y el dueño creía que su archivo no
              servía. Elegidos, no se leen acá: se manda a importar. */}
          <input
            accept="image/jpeg,image/png,image/webp,application/pdf,.xlsx,.xls,.csv"
            disabled={leyendo}
            onChange={(evento) => void leerArchivo(evento)}
            type="file"
          />
        </label>
      </div>
      <div className={styles.cupo}>
        <ContadorLecturas cupo={lecturas} />
        <p>
          Cada foto o PDF gasta una, aunque traiga la lista entera.{" "}
          <strong>Importar un Excel o un CSV no gasta ninguna.</strong>
        </p>
      </div>

      {planillaElegida ? (
        <section aria-live="polite" className={styles.esPlanilla}>
          <h2>
            <strong>{planillaElegida}</strong> es una planilla
          </h2>
          <p>
            Los Excel y los CSV no se leen con IA: ya son una tabla. Súbelo en «Importar una
            planilla», que lo carga tal cual, es gratis y no gasta tus lecturas.
          </p>
          <Link href={RUTAS_PANEL.importar}>Ir a Importar una planilla</Link>
        </section>
      ) : null}

      {motivoSalida ? <SalidasCatalogo motivo={motivoSalida} /> : null}

      {avisoLectura ? (
        <p className={styles.avisoLectura} role="status">
          {avisoLectura}
        </p>
      ) : null}

      {/* De una foto se muestra la foto, para poder comparar renglón por
          renglón. De un PDF se muestra el nombre: dibujarlo pediría rasterizar
          el archivo en el navegador, y quien lo eligió del teléfono necesita
          sobre todo confirmar que mandó el que quería. */}
      {vistaPrevia ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="La lista que mandaste a leer" className={styles.previa} src={vistaPrevia} />
      ) : nombreArchivo ? (
        <p className={styles.adjunto}>
          Leímos el PDF <strong>{nombreArchivo}</strong>
        </p>
      ) : null}

      {productos.length > 0 ? (
        <RevisionDeProductos
          categorias={categorias}
          nombresDelCatalogo={nombresDelCatalogo}
          cobertura={cobertura}
          controlaStock={negocioLlevaStock}
          enlaceCatalogo={enlaceCatalogo}
          introduccion={`Encontramos ${productos.length} producto(s). Lo que no leímos con seguridad viene desmarcado. Compara con tu lista antes de confirmar.`}
          key={lectura}
          planId={planId}
          productosActuales={productosActuales}
          /* No se vacía la lista de productos: eso desmontaría el panel y con
             él el resumen de qué se creó y qué no. Se saca la vista previa,
             que ya cumplió su función de permitir comparar. */
          onTerminado={() => {
            setVistaPrevia("");
            setNombreArchivo("");
          }}
          productos={productos}
        />
      ) : null}
    </div>
  );
}
