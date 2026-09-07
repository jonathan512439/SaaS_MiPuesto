"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import styles from "../../../components/auth/marco-auth.module.css";
import { useClienteSupabaseNavegador } from "../../../components/supabase/proveedor-supabase-navegador";
import { Boton, Campo, CampoClave } from "../../../components/ui";
import { mensajeErrorInicioSesion } from "../../../lib/auth/mensajes";

type PropiedadesFormularioLogin = {
  sesionRequerida?: boolean;
  claveGuardada?: boolean;
};

export function FormularioLogin({
  claveGuardada = false,
  sesionRequerida = false,
}: PropiedadesFormularioLogin) {
  const supabase = useClienteSupabaseNavegador();
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  async function iniciarSesion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    setEnviando(true);

    const datos = new FormData(evento.currentTarget);
    const correo = String(datos.get("correo") ?? "").trim().toLowerCase();
    const clave = String(datos.get("clave") ?? "");
    const { error: errorAuth } = await supabase.auth.signInWithPassword({
      email: correo,
      password: clave,
    });

    if (errorAuth) {
      setError(mensajeErrorInicioSesion(errorAuth));
      setEnviando(false);
      return;
    }

    router.replace("/dashboard/configuracion");
    router.refresh();
  }

  return (
    <form className={styles.formulario} onSubmit={iniciarSesion}>
      {/* Quien acaba de definir su contraseña necesita saber que se guardó. Sin
          esto, llegar al ingreso se lee como que algo falló, y lo primero que
          hace es pedir otro enlace. */}
      {claveGuardada ? (
        <p className={styles.nota} role="status">
          Tu contraseña quedó guardada. Ingresá con ella para entrar a tu panel.
        </p>
      ) : null}
      {sesionRequerida ? (
        <p className={styles.nota} role="status">
          Iniciá sesión para continuar en tu panel.
        </p>
      ) : null}
      <Campo
        autoComplete="email"
        etiqueta="Correo electrónico"
        id="correo"
        inputMode="email"
        name="correo"
        placeholder="tu@negocio.com"
        required
        type="email"
      />
      <CampoClave
        autoComplete="current-password"
        etiqueta="Contraseña"
        id="clave"
        minLength={10}
        name="clave"
        required
      />
      {error ? (
        <p className={styles.mensajeError} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.acciones}>
        <Boton anchoCompleto cargando={enviando} type="submit">
          Ingresar a mi negocio
        </Boton>
        <Link className={styles.enlace} href="/recuperar-clave">
          Recuperar contraseña
        </Link>
      </div>
    </form>
  );
}
