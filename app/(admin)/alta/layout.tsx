import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { EncabezadoPanel } from "../../../components/dashboard/encabezado-panel";
import { PASOS_ALTA } from "../../../lib/negocios/alta";
import { crearClienteSupabaseServidor } from "../../../lib/supabase/server";
import styles from "./alta.module.css";

/* La cáscara de los cuatro pasos: el progreso, siempre visible.
 *
 * El progreso no es adorno. El diagnóstico del plan es que el dueño «entra y
 * tiene que adivinar por dónde empezar»; saber que son cuatro pasos y en cuál
 * va es la mitad de la respuesta. La otra mitad es que cada paso guarde, y eso
 * lo hace cada pantalla.
 *
 * Se dibuja en el servidor porque el paso ya viene con los datos: pedirlo
 * después desde el navegador mostraría la barra vacía un instante y saltando
 * al valor bueno, justo en la pantalla que tiene que dar seguridad.
 */
export default async function LayoutAlta({ children }: { children: ReactNode }) {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;

  if (!idUsuario) redirect("/login");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("nombre_admin,alta_paso,alta_completada_en")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  /* Sin negocio no hay nada que dar de alta todavía: primero se crea el perfil.
     Con el alta terminada, el camino no se vuelve a recorrer. */
  if (!negocio) redirect("/dashboard/configuracion");
  if (negocio.alta_completada_en) redirect("/dashboard/catalogo");

  const alcanzado = negocio.alta_paso;

  return (
    <main className={styles.contenido}>
      {/* El saludo **es** el título de la pantalla, así que usa el encabezado del
          panel en vez de dibujar uno propio. El progreso va como contenido suyo:
          pertenece al encabezado, no es una sección aparte. */}
      <EncabezadoPanel
        rotulo={`Paso ${alcanzado} de ${PASOS_ALTA.length}`}
        titulo={
          negocio.nombre_admin ? `Hola, ${negocio.nombre_admin}` : "Vamos a publicar tu catálogo"
        }
      >
        {/* Una lista ordenada y no una fila de puntos: para quien usa lector de
            pantalla, «paso 2 de 4» tiene que poder leerse, no solo verse. */}
        <ol className={styles.progreso}>
          {PASOS_ALTA.map((paso) => {
            const estado =
              paso.numero < alcanzado ? "hecho" : paso.numero === alcanzado ? "actual" : "pendiente";
            return (
              <li className={styles.paso} data-estado={estado} key={paso.id}>
                <span aria-hidden="true" className={styles.disco}>
                  {paso.numero}
                </span>
                <span className={styles.nombrePaso}>{paso.titulo}</span>
                <span className={styles.soloLectores}>
                  {estado === "hecho" ? " (hecho)" : estado === "actual" ? " (acá estás)" : ""}
                </span>
              </li>
            );
          })}
        </ol>
      </EncabezadoPanel>

      {children}
    </main>
  );
}
