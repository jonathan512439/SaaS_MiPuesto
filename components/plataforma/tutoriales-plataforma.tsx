"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  ARCHIVOS,
  BYTES_CABECERA_MP4,
  MENSAJES_MP4,
  type TipoArchivo,
  esFormatoCorrecto,
  formatearDuracion,
  leerCabeceraMp4,
} from "../../lib/tutoriales/validacion";
import { AreaTexto, Boton, Campo, useAvisos, useConfirmacion } from "../ui";
import styles from "./tutoriales-plataforma.module.css";

export type TutorialPlataforma = {
  id: string;
  numero: number;
  titulo: string;
  descripcion: string;
  video: string | null;
  portada: string | null;
  duracion_segundos: number | null;
  publicado: boolean;
};

type Avance = { id: string; tipo: TipoArchivo; fraccion: number };

/* El archivo va tal cual en el cuerpo y con `XMLHttpRequest`, no con `fetch`:
   es lo único del navegador que avisa cuánto lleva subido, y treinta megas
   por datos móviles sin una barra que avance parecen un error. */
function subirArchivo(
  id: string,
  tipo: TipoArchivo,
  archivo: File,
  duracion: number | null,
  alAvanzar: (fraccion: number) => void,
) {
  return new Promise<void>((resolver, rechazar) => {
    const pedido = new XMLHttpRequest();
    pedido.open("PUT", `/api/plataforma/tutoriales/${id}/${tipo}${duracion ? `?duracion=${duracion}` : ""}`);
    pedido.setRequestHeader("content-type", ARCHIVOS[tipo].tipo);
    pedido.upload.onprogress = (evento) => {
      if (evento.lengthComputable) alAvanzar(evento.loaded / evento.total);
    };
    pedido.onload = () => {
      if (pedido.status >= 200 && pedido.status < 300) return resolver();
      let mensaje = "No se pudo subir el archivo.";
      try {
        mensaje = (JSON.parse(pedido.responseText) as { error?: string }).error ?? mensaje;
      } catch {
        /* La respuesta no era JSON: queda el mensaje general. */
      }
      rechazar(new Error(mensaje));
    };
    pedido.onerror = () => rechazar(new Error("Se cortó la conexión. Vuelve a intentarlo."));
    pedido.send(archivo);
  });
}

/* Lo que se puede revisar antes de subir, para no mandar treinta megas que el
   servidor va a rechazar. El servidor lo vuelve a mirar igual. */
async function revisarArchivo(tipo: TipoArchivo, archivo: File): Promise<{ duracion: number | null } | { error: string }> {
  const datos = ARCHIVOS[tipo];
  if (archivo.size > datos.tope) return { error: `El archivo pesa más de ${datos.texto}.` };
  const comienzo = new Uint8Array(await archivo.slice(0, tipo === "video" ? BYTES_CABECERA_MP4 : 16).arrayBuffer());
  if (!esFormatoCorrecto(tipo, comienzo)) {
    return { error: tipo === "video" ? "El archivo no es un video MP4." : "La portada tiene que ser una imagen JPG." };
  }
  if (tipo === "portada") return { duracion: null };
  const cabecera = leerCabeceraMp4(comienzo);
  return "error" in cabecera ? { error: MENSAJES_MP4[cabecera.error] } : { duracion: cabecera.duracion };
}

export function TutorialesPlataforma({ tutoriales }: { tutoriales: TutorialPlataforma[] }) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();
  const siguiente = Math.min(99, Math.max(0, ...tutoriales.map(({ numero }) => numero)) + 1);
  const [nuevo, setNuevo] = useState({ numero: String(siguiente), titulo: "", descripcion: "" });
  const [ocupado, setOcupado] = useState("");
  const [avance, setAvance] = useState<Avance | null>(null);
  const [editando, setEditando] = useState<TutorialPlataforma | null>(null);
  const elegirArchivo = useRef<HTMLInputElement>(null);
  const destino = useRef<{ id: string; tipo: TipoArchivo } | null>(null);

  function avisarError(error: unknown) {
    mostrarAviso({
      titulo: "No se pudo completar",
      mensaje: error instanceof Error ? error.message : "Intenta nuevamente.",
      variante: "error",
    });
  }

  async function pedir(cuerpo: Record<string, unknown>, ocupada: string, exito: string) {
    setOcupado(ocupada);
    try {
      const respuesta = await fetch("/api/plataforma/tutoriales", {
        body: JSON.stringify(cuerpo),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const datos = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) throw new Error(datos.error ?? "No se pudo completar la acción.");
      mostrarAviso({ titulo: exito, variante: "exito" });
      router.refresh();
      return true;
    } catch (error) {
      avisarError(error);
      return false;
    } finally {
      setOcupado("");
    }
  }

  async function crear() {
    const creado = await pedir({ accion: "crear", ...nuevo }, "crear", "Tutorial creado");
    if (creado) setNuevo({ numero: String(Math.min(99, Number(nuevo.numero) + 1)), titulo: "", descripcion: "" });
  }

  async function guardarEdicion() {
    if (!editando) return;
    const guardado = await pedir({ accion: "editar", ...editando }, editando.id, "Tutorial guardado");
    if (guardado) setEditando(null);
  }

  async function eliminar(tutorial: TutorialPlataforma) {
    const aceptado = await confirmar({
      titulo: `Eliminar el tutorial ${tutorial.numero}`,
      descripcion: tutorial.publicado
        ? "Está publicado: los dueños dejan de verlo en «Aprende». También se borran su video y su portada."
        : "También se borran su video y su portada.",
      destructiva: true,
      textoAccion: "Eliminar tutorial",
    });
    if (aceptado) await pedir({ accion: "eliminar", id: tutorial.id }, tutorial.id, "Tutorial eliminado");
  }

  function pedirArchivo(id: string, tipo: TipoArchivo) {
    destino.current = { id, tipo };
    if (elegirArchivo.current) {
      elegirArchivo.current.accept = ARCHIVOS[tipo].tipo;
      elegirArchivo.current.value = "";
      elegirArchivo.current.click();
    }
  }

  async function alElegirArchivo(archivo: File | undefined) {
    const elegido = destino.current;
    if (!archivo || !elegido) return;
    const revision = await revisarArchivo(elegido.tipo, archivo);
    if ("error" in revision) {
      mostrarAviso({ titulo: "Ese archivo no sirve", mensaje: revision.error, variante: "error" });
      return;
    }
    setOcupado(elegido.id);
    setAvance({ ...elegido, fraccion: 0 });
    try {
      await subirArchivo(elegido.id, elegido.tipo, archivo, revision.duracion, (fraccion) =>
        setAvance({ ...elegido, fraccion }),
      );
      mostrarAviso({ titulo: elegido.tipo === "video" ? "Video subido" : "Portada subida", variante: "exito" });
      router.refresh();
    } catch (error) {
      avisarError(error);
    } finally {
      setAvance(null);
      setOcupado("");
    }
  }

  return (
    <section aria-labelledby="tutoriales" className={styles.panel}>
      <header>
        <h2 id="tutoriales">Tutoriales</h2>
        <p>
          Los videos de «Aprende», en el Panel de administrador de cada dueño. Sube el video en MP4
          de 720×1280 y con inicio rápido (faststart), hasta {ARCHIVOS.video.texto}; la portada, en
          JPG. Un tutorial se ve recién cuando lo publicas.
        </p>
      </header>

      {/* Uno solo para toda la lista: cada botón dice para qué tutorial y qué
          archivo antes de abrirlo. */}
      <input
        className={styles.oculto}
        onChange={(evento) => void alElegirArchivo(evento.target.files?.[0])}
        ref={elegirArchivo}
        tabIndex={-1}
        type="file"
      />

      <div className={styles.crear}>
        <h3>Nuevo tutorial</h3>
        <Campo
          etiqueta="Número"
          id="tutorial-numero"
          inputMode="numeric"
          max={99}
          min={1}
          onChange={(evento) => setNuevo({ ...nuevo, numero: evento.target.value })}
          type="number"
          value={nuevo.numero}
        />
        <Campo
          etiqueta="Título"
          id="tutorial-titulo"
          maxLength={80}
          onChange={(evento) => setNuevo({ ...nuevo, titulo: evento.target.value })}
          placeholder="Ej.: Tu Panel de administrador"
          value={nuevo.titulo}
        />
        <AreaTexto
          etiqueta="Qué se aprende (opcional)"
          id="tutorial-descripcion"
          maxLength={280}
          onChange={(evento) => setNuevo({ ...nuevo, descripcion: evento.target.value })}
          rows={2}
          value={nuevo.descripcion}
        />
        <Boton cargando={ocupado === "crear"} disabled={ocupado !== ""} onClick={() => void crear()}>
          Crear tutorial
        </Boton>
      </div>

      {tutoriales.length === 0 ? (
        <p className={styles.vacio}>Todavía no hay tutoriales.</p>
      ) : (
        <ol className={styles.lista}>
          {tutoriales.map((tutorial) => {
            const subiendo = avance?.id === tutorial.id ? avance : null;
            if (editando?.id === tutorial.id) {
              return (
                <li className={styles.edicion} key={tutorial.id}>
                  <Campo
                    etiqueta="Número"
                    id={`numero-${tutorial.id}`}
                    inputMode="numeric"
                    max={99}
                    min={1}
                    onChange={(evento) => setEditando({ ...editando, numero: Number(evento.target.value) })}
                    type="number"
                    value={editando.numero}
                  />
                  <Campo
                    etiqueta="Título"
                    id={`titulo-${tutorial.id}`}
                    maxLength={80}
                    onChange={(evento) => setEditando({ ...editando, titulo: evento.target.value })}
                    value={editando.titulo}
                  />
                  <AreaTexto
                    etiqueta="Qué se aprende (opcional)"
                    id={`descripcion-${tutorial.id}`}
                    maxLength={280}
                    onChange={(evento) => setEditando({ ...editando, descripcion: evento.target.value })}
                    rows={2}
                    value={editando.descripcion}
                  />
                  <div className={styles.acciones}>
                    <Boton cargando={ocupado === tutorial.id} disabled={ocupado !== ""} onClick={() => void guardarEdicion()}>
                      Guardar
                    </Boton>
                    <Boton disabled={ocupado !== ""} onClick={() => setEditando(null)} variante="secundario">
                      Cancelar
                    </Boton>
                  </div>
                </li>
              );
            }
            return (
              <li className={styles.fila} key={tutorial.id}>
                <div className={styles.datos}>
                  <div className={styles.titulo}>
                    <span className={styles.numero}>{tutorial.numero}</span>
                    <strong>{tutorial.titulo}</strong>
                    {/* El estado en palabras y con borde distinto: el color
                        nunca va solo. */}
                    <span className={tutorial.publicado ? styles.publicado : styles.borrador}>
                      {tutorial.publicado ? "Publicado" : "Borrador"}
                    </span>
                  </div>
                  {tutorial.descripcion ? <p className={styles.descripcion}>{tutorial.descripcion}</p> : null}
                  <ul className={styles.archivos}>
                    <li>
                      {tutorial.video
                        ? `Video${tutorial.duracion_segundos ? ` de ${formatearDuracion(tutorial.duracion_segundos)}` : ""}`
                        : "Sin video"}
                    </li>
                    <li>{tutorial.portada ? "Con portada" : "Sin portada"}</li>
                  </ul>
                  {subiendo ? (
                    <label className={styles.avance}>
                      <small>
                        Subiendo {subiendo.tipo === "video" ? "el video" : "la portada"}…{" "}
                        {Math.round(subiendo.fraccion * 100)} %
                      </small>
                      {/* `<progress>` y no un div con ancho en línea, como en
                          el uso de almacenamiento: el navegador ya sabe
                          anunciarlo. */}
                      <progress className={styles.barra} max={100} value={Math.round(subiendo.fraccion * 100)} />
                    </label>
                  ) : null}
                </div>

                <div className={styles.acciones}>
                  <Boton disabled={ocupado !== ""} onClick={() => pedirArchivo(tutorial.id, "video")} variante="secundario">
                    {tutorial.video ? "Reemplazar video" : "Subir video"}
                  </Boton>
                  <Boton disabled={ocupado !== ""} onClick={() => pedirArchivo(tutorial.id, "portada")} variante="secundario">
                    {tutorial.portada ? "Reemplazar portada" : "Subir portada"}
                  </Boton>
                  <Boton
                    cargando={ocupado === tutorial.id && !subiendo}
                    disabled={ocupado !== "" || (!tutorial.publicado && !tutorial.video)}
                    onClick={() =>
                      void pedir(
                        { accion: tutorial.publicado ? "ocultar" : "publicar", id: tutorial.id },
                        tutorial.id,
                        tutorial.publicado ? "Tutorial oculto" : "Tutorial publicado",
                      )
                    }
                    variante={tutorial.publicado ? "secundario" : "principal"}
                  >
                    {tutorial.publicado ? "Ocultar" : "Publicar"}
                  </Boton>
                  <Boton disabled={ocupado !== ""} onClick={() => setEditando(tutorial)} variante="secundario">
                    Editar
                  </Boton>
                  {/* Abre el archivo tal cual lo van a ver: es la forma de
                      revisar que se subió bien antes de publicarlo. */}
                  {tutorial.video ? (
                    <a href={`/api/tutoriales/${tutorial.video}`} rel="noreferrer" target="_blank">
                      Ver video
                    </a>
                  ) : null}
                  <Boton disabled={ocupado !== ""} onClick={() => void eliminar(tutorial)} variante="peligro">
                    Eliminar
                  </Boton>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
