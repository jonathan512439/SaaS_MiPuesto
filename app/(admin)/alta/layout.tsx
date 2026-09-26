import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { EncabezadoAlta } from "../../../components/alta/encabezado-alta";
import { ProveedorSupabaseNavegador } from "../../../components/supabase/proveedor-supabase-navegador";
import { ProveedorAvisos } from "../../../components/ui";
import { obtenerVariablesPublicasSupabase } from "../../../lib/supabase/variables";
import { crearClienteSupabaseServidor } from "../../../lib/supabase/server";
import styles from "./alta.module.css";
import { RUTAS_PANEL, RUTA_SIN_NEGOCIO } from "../../../lib/panel/rutas";

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
export default async function LayoutAlta({
  children,
}: {
  children: ReactNode;
}) {
  const { clavePublica, url } = obtenerVariablesPublicasSupabase();
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
  if (!negocio) redirect(RUTA_SIN_NEGOCIO);
  if (negocio.alta_completada_en) redirect(RUTAS_PANEL.productos);

  const alcanzado = negocio.alta_paso;

  /* Los proveedores van acá y no se heredan: al sacar el alta de `/dashboard`
     dejó de estar dentro del layout que los ponía, y los cuatro pasos usan
     `useAvisos` para contar que algo falló al guardar. Sin proveedor ese hook
     **lanza**, y el alta entera moría con la pantalla de error genérica antes de
     dibujar nada. Es la misma falla que ya se había visto en el catálogo público
     con este mismo hook, y por eso existe una guarda para ese caso. */
  return (
    <ProveedorSupabaseNavegador clavePublica={clavePublica} url={url}>
      <ProveedorAvisos>
        <main className={styles.contenido}>
          {/* El saludo **es** el título de la pantalla, así que usa el encabezado del
          panel en vez de dibujar uno propio. El progreso lo dibuja el navegador:
          ver `EncabezadoAlta`. */}
          <EncabezadoAlta
            alcanzado={alcanzado}
            titulo={
              negocio.nombre_admin
                ? `Hola, ${negocio.nombre_admin}`
                : "Vamos a publicar tu catálogo"
            }
          />

          {children}
        </main>
      </ProveedorAvisos>
    </ProveedorSupabaseNavegador>
  );
}
