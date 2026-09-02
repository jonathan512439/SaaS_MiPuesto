import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SelectorPlantilla } from "../../../../components/plantillas/selector-plantilla";
import { crearDatosDemoPlantilla } from "../../../../lib/plantillas/datos-demo";
import { esPlantillaId } from "../../../../lib/plantillas/validacion";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";
import styles from "./plantilla.module.css";

export const metadata: Metadata = {
  title: "Plantilla del catálogo | MiPuesto",
  description: "Compara y elige la presentación visual de tu catálogo.",
};

export default async function PaginaPlantilla() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;

  if (!idUsuario) redirect("/login?motivo=sesion");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("nombre,descripcion,telefono_whatsapp,plantilla_id")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (!negocio) redirect("/dashboard/configuracion");

  const plantillaInicial = esPlantillaId(negocio.plantilla_id)
    ? negocio.plantilla_id
    : "clasica";
  const datos = crearDatosDemoPlantilla({
    nombre: negocio.nombre,
    descripcion: negocio.descripcion,
    telefonoWhatsapp: negocio.telefono_whatsapp,
  });

  return (
    <main className={styles.contenido}>
      <header className={styles.encabezado}>
        <p>Presentación del catálogo</p>
        <h1>Elige la plantilla que mejor explica tu negocio</h1>
        <p>
          Todas muestran la misma información de demostración. Cambia la forma de
          organizarla, no tus datos. Puedes elegir otra más adelante.
        </p>
      </header>

      <SelectorPlantilla datos={datos} plantillaInicial={plantillaInicial} />
    </main>
  );
}
