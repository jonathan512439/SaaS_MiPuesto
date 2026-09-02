"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { crearClienteSupabaseNavegador } from "../../lib/supabase/client";
import { Boton } from "../ui";

type PropiedadesCerrarSesion = {
  className?: string;
};

export function CerrarSesion({ className }: PropiedadesCerrarSesion) {
  const [supabase] = useState(crearClienteSupabaseNavegador);
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
