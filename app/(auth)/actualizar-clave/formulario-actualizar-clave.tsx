"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import styles from "../../../components/auth/marco-auth.module.css";
import { useClienteSupabaseNavegador } from "../../../components/supabase/proveedor-supabase-navegador";
import { Boton, CampoClave } from "../../../components/ui";
import { mensajeErrorActualizarClave } from "../../../lib/auth/mensajes";

export function FormularioActualizarClave() {
  const supabase = useClienteSupabaseNavegador();
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
      <CampoClave
        autoComplete="new-password"
        ayuda="Mínimo 10 caracteres. No reutilicés una contraseña personal."
        etiqueta="Contraseña nueva"
        id="clave"
        minLength={10}
        name="clave"
        required
      />
      <CampoClave
        autoComplete="new-password"
        etiqueta="Repetí la contraseña"
        id="confirmacion"
        minLength={10}
        name="confirmacion"
        required
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
