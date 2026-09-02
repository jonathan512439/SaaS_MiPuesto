import type { Metadata } from "next";

import { MarcoAuth } from "../../../components/auth/marco-auth";
import { FormularioRecuperacion } from "./formulario-recuperacion";

export const metadata: Metadata = {
  title: "Recuperar contraseña | MiPuesto",
  description: "Recuperación de acceso para administradores de MiPuesto.",
};

export default function PaginaRecuperarClave() {
  return (
    <MarcoAuth
      descripcion="Te enviaremos un enlace para definir una contraseña nueva."
      paso="Recuperación de acceso"
      titulo="Recuperá tu contraseña"
    >
      <FormularioRecuperacion />
    </MarcoAuth>
  );
}
