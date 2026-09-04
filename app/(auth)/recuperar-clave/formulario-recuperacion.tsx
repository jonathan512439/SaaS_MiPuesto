"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import styles from "../../../components/auth/marco-auth.module.css";
import { useClienteSupabaseNavegador } from "../../../components/supabase/proveedor-supabase-navegador";
import { Boton, Campo } from "../../../components/ui";

const MENSAJE_GENERICO =
  "Si el correo corresponde a una cuenta habilitada, recibirás un enlace para cambiar tu contraseña.";

export function FormularioRecuperacion() {
  const supabase = useClienteSupabaseNavegador();
  const [enviando, setEnviando] = useState(false);
  const [solicitudTerminada, setSolicitudTerminada] = useState(false);

  async function solicitarRecuperacion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);

    const datos = new FormData(evento.currentTarget);
    const correo = String(datos.get("correo") ?? "").trim().toLowerCase();
    const destino = new URL("/actualizar-clave", window.location.origin).toString();

    await supabase.auth.resetPasswordForEmail(correo, { redirectTo: destino });
    setSolicitudTerminada(true);
    setEnviando(false);
  }

  return (
    <form className={styles.formulario} onSubmit={solicitarRecuperacion}>
      <Campo
        autoComplete="email"
        disabled={solicitudTerminada}
        etiqueta="Correo electrónico"
        id="correo"
        inputMode="email"
        name="correo"
        placeholder="tu@negocio.com"
        required
        type="email"
      />
      {solicitudTerminada ? (
        <p className={styles.mensajeExito} role="status">
          {MENSAJE_GENERICO} Revisá también la carpeta de correo no deseado.
        </p>
      ) : null}
      <div className={styles.acciones}>
        <Boton
          anchoCompleto
          cargando={enviando}
          disabled={solicitudTerminada}
          type="submit"
        >
          Enviar enlace de recuperación
        </Boton>
        <Link className={styles.enlace} href="/login">
          Volver a ingresar
        </Link>
      </div>
    </form>
  );
}
