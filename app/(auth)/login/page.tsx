import type { Metadata } from "next";

import { MarcoAuth } from "../../../components/auth/marco-auth";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = {
  title: "Ingresar | MiPuesto",
  description: "Acceso privado para administradores de MiPuesto.",
};

type PropiedadesPaginaLogin = {
  searchParams: Promise<{ motivo?: string }>;
};

export default async function PaginaLogin({ searchParams }: PropiedadesPaginaLogin) {
  const { motivo } = await searchParams;

  return (
    <MarcoAuth
      descripcion="Usa el correo que recibió la invitación y tu contraseña."
      paso="Acceso de administradores"
      titulo="Ingresa a tu negocio"
    >
      <FormularioLogin
        claveGuardada={motivo === "clave-lista"}
        sesionRequerida={motivo === "sesion"}
      />
    </MarcoAuth>
  );
}
