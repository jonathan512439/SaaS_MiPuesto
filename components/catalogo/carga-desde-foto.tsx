"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";

import { AVISO_PRIVACIDAD_IA, AYUDA_LISTA } from "../../lib/ia/ayuda";
import { esPlanilla, prepararArchivoParaLectura } from "../../lib/ia/adjunto";
import { RUTAS_PANEL } from "../../lib/panel/rutas";
import type { CategoriaCatalogo } from "../../lib/catalogo/tipos";
import { Trabajando, useAvisos } from "../ui";
import type { InformeDeCobertura } from "../../lib/ia/cobertura";
import { RevisionDeProductos, type ProductoLeido } from "./revision-de-productos";
import styles from "./carga-desde-foto.module.css";

export function CargaDesdeFoto({
  categorias,
  fotosUsadas,
  negocioLlevaStock,
  nombresDelCatalogo = [],
  planId,
  productosActuales,
  topeFotos,
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
  topeFotos: number;
  /* La dirección del catálogo público, para el «Ver mi catálogo» del final. */
  enlaceCatalogo?: string;
}) {
  const { mostrarAviso } = useAvisos();
  const [vistaPrevia, setVistaPrevia] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [productos, setProductos] = useState<ProductoLeido[]>([]);
  const [cobertura, setCobertura] = useState<InformeDeCobertura | undefined>(undefined);
  /* Cambia con cada lectura y sirve de `key` del paso de revisión: una lectura
     nueva monta una revisión nueva en vez de mezclarse con la anterior. */
  const [lectura, setLectura] = useState(0);
  /* El nombre del Excel o del CSV que se eligió acá por error. Se contesta en la
     pantalla y no en un aviso que se va solo: lo que hay que hacer es ir a otro
     lado, y el botón para ir tiene que quedarse a la vista. */
  const [planillaElegida, setPlanillaElegida] = useState("");

  async function leerArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;

    setPlanillaElegida("");
    const cabecera = new Uint8Array(await archivo.slice(0, 8).arrayBuffer());
    if (esPlanilla(cabecera, archivo.name)) {
      setPlanillaElegida(archivo.name);
      return;
    }

    setLeyendo(true);
    setProductos([]);
    try {
      const adjunto = await prepararArchivoParaLectura(archivo);
      setVistaPrevia(adjunto.vistaPrevia);
      setNombreArchivo(adjunto.nombre);

      const respuesta = await fetch("/api/ia/lista", {
        body: JSON.stringify({ imagen: adjunto.base64, tipo: adjunto.tipo }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const datos = (await respuesta.json()) as {
        error?: string;
        productos?: ProductoLeido[];
        cobertura?: InformeDeCobertura;
      };
      if (!respuesta.ok || !datos.productos) {
        throw new Error(datos.error ?? "No pudimos leer el archivo.");
      }

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
        detalle="Estamos leyendo la lista y separando cada producto con su precio. Cuanto más larga, más tarda."
        titulo="Leyendo tu lista…"
      />

      {/* La cámara, para la lista que está pegada en la pared o en el cuaderno;
          la galería, para la foto que ya se sacó o el PDF del proveedor. La
          cámara solo se ofrece en pantallas táctiles: en una computadora
          `capture` se ignora y los dos botones harían lo mismo. */}
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
      <p className={styles.cupo}>
        Llevas {fotosUsadas} de {topeFotos} lecturas este mes.{" "}
        <strong>Importar un Excel o un CSV no gasta ninguna.</strong>
      </p>

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
