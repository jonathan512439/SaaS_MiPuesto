"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useClienteSupabaseNavegador } from "../supabase/proveedor-supabase-navegador";
import { Boton } from "../ui/boton";

type PropiedadesCerrarSesion = {
  className?: string;
  texto?: string;
};

export function CerrarSesion({ className, texto = "Cerrar sesión" }: PropiedadesCerrarSesion) {
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
      aria-label="Cerrar sesión"
      cargando={cerrando}
      className={className}
      onClick={cerrarSesion}
      variante="discreto"
    >
      {texto}
    </Boton>
  );
}
