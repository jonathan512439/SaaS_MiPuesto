import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SelectorApariencia } from "../../../../components/plantillas/selector-apariencia";
import { crearDatosDemoPlantilla } from "../../../../lib/plantillas/datos-demo";
import { esTipoNegocio } from "../../../../lib/modalidades";
import { esPaletaId, esPlantillaId } from "../../../../lib/plantillas/validacion";
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
    .select("nombre,descripcion,telefono_whatsapp,tipo_negocio,plantilla_id,paleta_id")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (!negocio) redirect("/dashboard/configuracion");

  const plantillaInicial = esPlantillaId(negocio.plantilla_id)
    ? negocio.plantilla_id
    : "clasica";
  const paletaInicial = esPaletaId(negocio.paleta_id) ? negocio.paleta_id : "mercado";
  const datos = crearDatosDemoPlantilla({
    nombre: negocio.nombre,
    descripcion: negocio.descripcion,
    telefonoWhatsapp: negocio.telefono_whatsapp,
    tipoNegocio: esTipoNegocio(negocio.tipo_negocio)
      ? negocio.tipo_negocio
      : "catalogo_estatico",
  });

  return (
    <main className={styles.contenido}>
      <header className={styles.encabezado}>
        <h1>Apariencia</h1>
        <p>Cambiarla no altera tus productos ni tus pedidos.</p>
      </header>

      <SelectorApariencia
        datos={datos}
        paletaInicial={paletaInicial}
        plantillaInicial={plantillaInicial}
      />
    </main>
  );
}
