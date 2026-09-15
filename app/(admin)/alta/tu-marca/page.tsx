import { redirect } from "next/navigation";

import { PasoTuMarca } from "../../../../components/alta/paso-tu-marca";
import { esPaletaId } from "../../../../lib/plantillas/validacion";
import { crearDatosDemoPlantilla } from "../../../../lib/plantillas/datos-demo";
import { obtenerUrlPublicaImagenNegocio } from "../../../../lib/negocios/imagenes-publicas";
import { obtenerVariablesPublicasSupabase } from "../../../../lib/supabase/variables";
import { crearClienteSupabaseServidor } from "../../../../lib/supabase/server";

/* La muestra se arma con los datos de demostración y no con el catálogo real del
   negocio: en este paso el catálogo suele estar vacío —los productos vienen en el
   4— y una vista previa sin nada adentro no deja ver el color, que es justo lo
   que se está eligiendo. */
export default async function PaginaTuMarca() {
  const supabase = await crearClienteSupabaseServidor();
  const { data: datosClaims } = await supabase.auth.getClaims();
  const idUsuario = datosClaims?.claims.sub;
  if (!idUsuario) redirect("/login");

  const { data: negocio } = await supabase
    .from("negocios")
    .select("nombre,descripcion,telefono_whatsapp,tipo_negocio,rubro,logo_url,subnombre,paleta_id,patron_fondo,patron_opacidad")
    .eq("admin_user_id", idUsuario)
    .maybeSingle();

  if (!negocio) redirect("/dashboard/configuracion");

  const { url } = obtenerVariablesPublicasSupabase();
  const datos = crearDatosDemoPlantilla({
    nombre: negocio.nombre,
    descripcion: negocio.descripcion,
    telefonoWhatsapp: negocio.telefono_whatsapp,
    rubro: negocio.rubro,
    patronFondo: negocio.patron_fondo !== false,
    patronOpacidad: negocio.patron_opacidad,
  });

  return (
    <PasoTuMarca
      datos={datos}
      logoInicial={obtenerUrlPublicaImagenNegocio(url, negocio.logo_url ?? null, "logo")}
      paletaInicial={esPaletaId(negocio.paleta_id) ? negocio.paleta_id : "mercado"}
      subnombreInicial={negocio.subnombre ?? ""}
    />
  );
}
