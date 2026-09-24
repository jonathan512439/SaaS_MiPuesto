import type { Metadata } from "next";

import { MarcoAuth } from "../../../components/auth/marco-auth";
import { FormularioActualizarClave } from "./formulario-actualizar-clave";

export const metadata: Metadata = {
  title: "Definir contraseña | MiPuesto",
  description: "Definición segura de contraseña para MiPuesto.",
};

export default async function PaginaActualizarClave({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string | string[] }>;
}) {
  const parametros = await searchParams;
  const motivo = Array.isArray(parametros.motivo) ? parametros.motivo[0] : parametros.motivo;

  return (
    <MarcoAuth
      descripcion={
        /* Quien llegó acá rebotado desde el panel necesita saber por qué: si no,
           parece que el sistema no lo deja entrar por capricho. */
        motivo === "pendiente"
          ? "Entraste con el enlace del correo, así que primero define tu contraseña. Recién después se abre el panel."
          : "Usa al menos 10 caracteres y evita contraseñas que ya uses en otros servicios."
      }
      paso="Contraseña de administrador"
      titulo="Define tu contraseña"
    >
      <FormularioActualizarClave />
    </MarcoAuth>
  );
}
