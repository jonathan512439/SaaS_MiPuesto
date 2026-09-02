"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import styles from "../../../components/auth/marco-auth.module.css";
import { Boton, Campo } from "../../../components/ui";
import { mensajeErrorActualizarClave } from "../../../lib/auth/mensajes";
import { crearClienteSupabaseNavegador } from "../../../lib/supabase/client";

export function FormularioActualizarClave() {
  const [supabase] = useState(crearClienteSupabaseNavegador);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  async function actualizarClave(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");

    const datos = new FormData(evento.currentTarget);
    const clave = String(datos.get("clave") ?? "");
    const confirmacion = String(datos.get("confirmacion") ?? "");

    if (clave.length < 10) {
      setError("La contraseña debe tener al menos 10 caracteres.");
      return;
    }

    if (clave !== confirmacion) {
      setError("Las contraseñas no coinciden. Escribilas nuevamente.");
      return;
    }

    setEnviando(true);
    const { error: errorAuth } = await supabase.auth.updateUser({ password: clave });

    if (errorAuth) {
      setError(mensajeErrorActualizarClave(errorAuth));
      setEnviando(false);
      return;
    }

    router.replace("/dashboard/configuracion");
    router.refresh();
  }

  return (
    <form className={styles.formulario} onSubmit={actualizarClave}>
      <Campo
        autoComplete="new-password"
        ayuda="Mínimo 10 caracteres. No reutilicés una contraseña personal."
        etiqueta="Contraseña nueva"
        id="clave"
        minLength={10}
        name="clave"
        required
        type="password"
      />
      <Campo
        autoComplete="new-password"
        etiqueta="Repetí la contraseña"
        id="confirmacion"
        minLength={10}
        name="confirmacion"
        required
        type="password"
      />
      {error ? (
        <p className={styles.mensajeError} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.acciones}>
        <Boton anchoCompleto cargando={enviando} type="submit">
          Guardar contraseña
        </Boton>
        <Link className={styles.enlace} href="/recuperar-clave">
          Solicitar otro enlace
        </Link>
      </div>
    </form>
  );
}
