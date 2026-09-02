"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useMemo } from "react";

import {
  crearClienteSupabaseNavegador,
  type CredencialesPublicasSupabase,
} from "../../lib/supabase/client";
import type { Database } from "../../lib/supabase/database.types";

const ContextoSupabaseNavegador = createContext<SupabaseClient<Database> | null>(null);

type PropiedadesProveedorSupabaseNavegador = CredencialesPublicasSupabase & {
  children: ReactNode;
};

export function ProveedorSupabaseNavegador({
  children,
  clavePublica,
  url,
}: PropiedadesProveedorSupabaseNavegador) {
  const cliente = useMemo(
    () => crearClienteSupabaseNavegador({ url, clavePublica }),
    [clavePublica, url],
  );

  return (
    <ContextoSupabaseNavegador.Provider value={cliente}>
      {children}
    </ContextoSupabaseNavegador.Provider>
  );
}

export function useClienteSupabaseNavegador() {
  const cliente = useContext(ContextoSupabaseNavegador);

  if (!cliente) {
    throw new Error("El cliente de Supabase no está disponible en esta ruta.");
  }

  return cliente;
}
