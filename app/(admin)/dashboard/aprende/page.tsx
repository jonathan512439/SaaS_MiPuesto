import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EncabezadoPanel } from "../../../../components/dashboard/encabezado-panel";
import { EstadoVacio } from "../../../../components/ui";
import { COLUMNAS_TUTORIAL } from "../../../../lib/catalogo/columnas";
import { formatearDuracion } from "../../../../lib/tutoriales/validacion";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import panel from "../panel.module.css";
import styles from "./aprende.module.css";

export const metadata: Metadata = {
  title: "Aprende | MiPuesto",
  description: "Videos cortos para usar tu Panel de administrador.",
};

/* «Aprende»: los videos que sube la plataforma, en orden.
 *
 * La política de `tutoriales` le muestra al dueño solo los publicados, así que
 * acá no se filtra nada: lo que llega es lo que puede ver.
 *
 * El reproductor es el del navegador, sin componente propio: ya sabe
 * reproducir, pausar, adelantar y pantalla completa, y no suma un `"use
 * client"`. `preload="none"`: nada se baja hasta que el dueño toca reproducir;
 * dieciséis videos abiertos de golpe se comerían sus datos móviles.
 */
export default async function PaginaAprende() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  if (!datosClaims?.claims.sub) redirect("/login?motivo=sesion");

  const { data: tutoriales } = await supabase.from("tutoriales").select(COLUMNAS_TUTORIAL).order("numero");
  const publicados = (tutoriales ?? []).filter((tutorial) => tutorial.publicado && tutorial.video);

  return (
    <main className={panel.contenido}>
      <EncabezadoPanel
        descripcion="Videos cortos, de uno o dos minutos, para sacarle el jugo a tu Panel de administrador. Míralos en orden o el que necesites."
        titulo="Aprende"
      />

      {publicados.length === 0 ? (
        <EstadoVacio
          descripcion="Pronto vas a encontrar acá videos cortos que te muestran cómo usar cada parte de tu panel."
          titulo="Todavía no hay videos"
        />
      ) : (
        <ol className={styles.lista}>
          {publicados.map((tutorial) => (
            <li className={styles.tarjeta} key={tutorial.id}>
              <video
                className={styles.video}
                controls
                playsInline
                poster={tutorial.portada ? `/api/tutoriales/${tutorial.portada}` : undefined}
                preload="none"
                src={`/api/tutoriales/${tutorial.video}`}
              />
              <div className={styles.texto}>
                <h2>
                  <span className={styles.numero}>{tutorial.numero}</span> {tutorial.titulo}
                </h2>
                {tutorial.duracion_segundos ? (
                  <p className={styles.duracion}>{formatearDuracion(tutorial.duracion_segundos)} min</p>
                ) : null}
                {tutorial.descripcion ? <p>{tutorial.descripcion}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
