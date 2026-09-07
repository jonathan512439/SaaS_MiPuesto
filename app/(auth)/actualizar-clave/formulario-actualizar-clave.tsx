"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import styles from "../../../components/auth/marco-auth.module.css";
import { useClienteSupabaseNavegador } from "../../../components/supabase/proveedor-supabase-navegador";
import { Boton, CampoClave } from "../../../components/ui";
import { mensajeErrorActualizarClave } from "../../../lib/auth/mensajes";
import { explicarFalloDeEnlace, type Diagnostico } from "../../../lib/auth/diagnostico-enlace";
import {
  leerTokensDeUrl,
  limpiarUrl,
  type TokensDeUrl,
} from "../../../lib/auth/sesion-desde-url";

export function FormularioActualizarClave() {
  const supabase = useClienteSupabaseNavegador();
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [haySesion, setHaySesion] = useState<boolean | null>(null);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [porConfirmar, setPorConfirmar] = useState<TokensDeUrl | null>(null);
  const router = useRouter();

  /* La sesión del enlace se toma acá a mano. El cliente del navegador la
     rechazaba solo: `createBrowserClient` fija `flowType: "pkce"`, y auth-js
     descarta un enlace que llega como `#access_token=...` por no corresponder a
     ese flujo. El enlace estaba bien; el cliente no lo miraba.

     Después se comprueba que haya sesión antes de mostrar el formulario: sin
     ella, escribir dos veces una contraseña para que falle es hacerle perder el
     tiempo a alguien que ya viene peleando con esto. */
  useEffect(() => {
    let cancelado = false;

    async function tomarSesion() {
      const tokens = leerTokensDeUrl(window.location.href);

      if (tokens.tipo === "implicito") {
        await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
      } else if (tokens.tipo === "codigo") {
        await supabase.auth.exchangeCodeForSession(tokens.codigo);
      } else if (tokens.tipo === "hash") {
        /* Esta forma **no se verifica al abrir la página**: se espera a que la
           persona toque el botón. Comprobado contra la API que el enlace es de
           un solo uso —la segunda visita devuelve `otp_expired`—, así que
           cualquier antivirus de correo o vista previa que lo visite antes lo
           quema. Si nadie lo consume hasta el clic, eso no puede pasar. */
        if (!cancelado) {
          setPorConfirmar(tokens);
          setHaySesion(false);
        }
        return;
      }

      if (tokens.tipo !== "ninguno") {
        window.history.replaceState(
          window.history.state,
          "",
          limpiarUrl(window.location.href),
        );
      }

      const { data } = await supabase.auth.getSession();
      if (cancelado) return;
      setHaySesion(Boolean(data.session));
      if (!data.session) setDiagnostico(explicarFalloDeEnlace(tokens));
    }

    void tomarSesion();
    return () => {
      cancelado = true;
    };
  }, [supabase]);

  async function confirmarEnlace() {
    if (porConfirmar?.tipo !== "hash") return;
    setEnviando(true);
    const { error: errorAuth } = await supabase.auth.verifyOtp({
      token_hash: porConfirmar.tokenHash,
      type: porConfirmar.verificacion as "recovery" | "invite" | "email",
    });
    setEnviando(false);
    if (errorAuth) {
      setDiagnostico({
        titulo: "El enlace ya no sirve",
        detalle: "Pedí uno nuevo desde Recuperar contraseña.",
      });
      setPorConfirmar(null);
      return;
    }
    window.history.replaceState(window.history.state, "", limpiarUrl(window.location.href));
    setPorConfirmar(null);
    setHaySesion(true);
  }

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

    /* Cambiar la contraseña tiene que echar a quien estuviera adentro con la
       anterior. Sin esto, alguien que hubiera entrado antes se queda con su
       sesión abierta y el cambio no lo saca. */
    await supabase.auth.signOut({ scope: "others" });

    router.replace("/dashboard/configuracion");
    router.refresh();
  }

  if (porConfirmar) {
    return (
      <div className={styles.formulario}>
        <p>
          Confirmá que sos vos y te dejamos definir tu contraseña. El enlace se usa
          recién cuando tocás este botón.
        </p>
        <Boton anchoCompleto cargando={enviando} onClick={() => void confirmarEnlace()}>
          Continuar
        </Boton>
      </div>
    );
  }

  if (haySesion === false) {
    return (
      <div className={styles.formulario}>
        <p className={styles.mensajeError} role="alert">
          {diagnostico?.titulo ?? "No pudimos abrir la sesión"}
        </p>
        <p>{diagnostico?.detalle ?? "Pedí un enlace nuevo desde Recuperar contraseña."}</p>
        <Link className={styles.enlace} href="/recuperar-clave">
          Pedir un enlace nuevo
        </Link>
      </div>
    );
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
