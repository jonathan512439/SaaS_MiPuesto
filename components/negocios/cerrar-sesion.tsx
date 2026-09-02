"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useClienteSupabaseNavegador } from "../supabase/proveedor-supabase-navegador";
import { Boton } from "../ui";

type PropiedadesCerrarSesion = {
  className?: string;
};

export function CerrarSesion({ className }: PropiedadesCerrarSesion) {
  const supabase = useClienteSupabaseNavegador();
  const [cerrando, setCerrando] = useState(false);
  const router = useRouter();

  async function cerrarSesion() {
    setCerrando(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Boton
      cargando={cerrando}
      className={className}
      onClick={cerrarSesion}
      variante="discreto"
    >
      Cerrar sesión
    </Boton>
  );
}
