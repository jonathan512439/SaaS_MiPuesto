"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useClienteSupabaseNavegador } from "../supabase/proveedor-supabase-navegador";
import { Boton } from "../ui/boton";

type PropiedadesCerrarSesion = {
  className?: string;
  texto?: string;
  /* Discreto en la barra del panel, que ya le pone su propio aspecto; con borde
     donde va suelto sobre el fondo, como en Plataforma, para que se encuentre. */
  variante?: "discreto" | "secundario";
};

export function CerrarSesion({
  className,
  texto = "Cerrar sesión",
  variante = "discreto",
}: PropiedadesCerrarSesion) {
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
      variante={variante}
    >
      {texto}
    </Boton>
  );
}
