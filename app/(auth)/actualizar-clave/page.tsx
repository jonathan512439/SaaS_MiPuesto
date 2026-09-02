import type { Metadata } from "next";

import { MarcoAuth } from "../../../components/auth/marco-auth";
import { FormularioActualizarClave } from "./formulario-actualizar-clave";

export const metadata: Metadata = {
  title: "Definir contraseña | MiPuesto",
  description: "Definición segura de contraseña para MiPuesto.",
};

export default function PaginaActualizarClave() {
  return (
    <MarcoAuth
      descripcion="Usá al menos 10 caracteres y evitá contraseñas que ya uses en otros servicios."
      paso="Contraseña de administrador"
      titulo="Definí tu contraseña"
    >
      <FormularioActualizarClave />
    </MarcoAuth>
  );
}
