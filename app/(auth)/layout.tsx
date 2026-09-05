import type { ReactNode } from "react";

import { PieSitio } from "../../components/sitio/pie-sitio";
import { ProveedorSupabaseNavegador } from "../../components/supabase/proveedor-supabase-navegador";
import { obtenerVariablesPublicasSupabase } from "../../lib/supabase/variables";

type PropiedadesLayoutAuth = Readonly<{
  children: ReactNode;
}>;

export default function LayoutAuth({ children }: PropiedadesLayoutAuth) {
  const { clavePublica, url } = obtenerVariablesPublicasSupabase();

  return (
    <ProveedorSupabaseNavegador clavePublica={clavePublica} url={url}>
      {children}
      <PieSitio />
    </ProveedorSupabaseNavegador>
  );
}
