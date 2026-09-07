"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useMemo } from "react";

import {
  crearClienteSupabaseNavegador,
  type CredencialesPublicasSupabase,
} from "../../lib/supabase/client";
import type { Database } from "../../lib/supabase/database.types";

/* Además del cliente se exponen las credenciales públicas. Son las mismas que
   ya viajan al navegador dentro del cliente; tenerlas a mano permite hablarle a
   la API de autenticación directamente cuando hace falta, sin depender de dónde
   guarda el cliente la sesión. */
type ValorContexto = CredencialesPublicasSupabase & {
  cliente: SupabaseClient<Database>;
};

const ContextoSupabaseNavegador = createContext<ValorContexto | null>(null);

type PropiedadesProveedorSupabaseNavegador = CredencialesPublicasSupabase & {
  children: ReactNode;
};

export function ProveedorSupabaseNavegador({
  children,
  clavePublica,
  url,
}: PropiedadesProveedorSupabaseNavegador) {
  const valor = useMemo(
    () => ({
      cliente: crearClienteSupabaseNavegador({ url, clavePublica }),
      clavePublica,
      url,
    }),
    [clavePublica, url],
  );

  return (
    <ContextoSupabaseNavegador.Provider value={valor}>
      {children}
    </ContextoSupabaseNavegador.Provider>
  );
}

function useContexto() {
  const contexto = useContext(ContextoSupabaseNavegador);

  if (!contexto) {
    throw new Error("El cliente de Supabase no está disponible en esta ruta.");
  }

  return contexto;
}

export function useClienteSupabaseNavegador() {
  return useContexto().cliente;
}

export function useCredencialesSupabaseNavegador(): CredencialesPublicasSupabase {
  const { clavePublica, url } = useContexto();
  return { clavePublica, url };
}
