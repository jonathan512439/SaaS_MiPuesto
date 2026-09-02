import type { ReactNode } from "react";

import { ProveedorSupabaseNavegador } from "../../../components/supabase/proveedor-supabase-navegador";
import { obtenerVariablesPublicasSupabase } from "../../../lib/supabase/variables";

type PropiedadesLayoutPanel = Readonly<{
  children: ReactNode;
}>;

export default function LayoutPanel({ children }: PropiedadesLayoutPanel) {
  const { clavePublica, url } = obtenerVariablesPublicasSupabase();

  return (
    <ProveedorSupabaseNavegador clavePublica={clavePublica} url={url}>
      {children}
    </ProveedorSupabaseNavegador>
  );
}
