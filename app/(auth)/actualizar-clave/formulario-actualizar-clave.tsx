"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import styles from "../../../components/auth/marco-auth.module.css";
import { useClienteSupabaseNavegador } from "../../../components/supabase/proveedor-supabase-navegador";
import { Boton, CampoClave } from "../../../components/ui";
import { explicarFalloDeEnlace, type Diagnostico } from "../../../lib/auth/diagnostico-enlace";
import { mensajeErrorActualizarClave } from "../../../lib/auth/mensajes";
import {
  leerTokensDeUrl,
  limpiarUrl,
  type TokensDeUrl,
} from "../../../lib/auth/sesion-desde-url";

/* El enlace del correo se canjea **en el mismo clic** que guarda la contraseña.
 *
 * Antes había dos pasos: uno abría la sesión y otro la usaba. Medido con el
 * dueño: la sesión existía después del primero y ya no existía en el segundo,
 * treinta segundos más tarde, en Chrome normal y sin modo incógnito. Algo la
 * borraba en el medio.
 *
 * En vez de seguir buscando qué, se quita la dependencia: el canje y el cambio
 * de contraseña ocurren seguidos, sin nada en el medio y sin necesidad de que la
 * sesión sobreviva a nada. Lo que la persona escribe se guarda en el mismo
 * gesto en que se prueba quién es.
 *
 * Se conserva la propiedad que buscábamos: el enlace no se consume al abrirse,
 * así que un antivirus de correo que lo visite no lo quema. */
export function FormularioActualizarClave() {
  const supabase = useClienteSupabaseNavegador();
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [tokens, setTokens] = useState<TokensDeUrl>({ tipo: "ninguno" });
  const [haySesion, setHaySesion] = useState(false);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelado = false;

    async function preparar() {
      const leidos = leerTokensDeUrl(window.location.href);

      /* Los tokens se guardan en memoria y se borran de la barra de direcciones:
         no deben quedar en el historial del teléfono. */
      if (leidos.tipo !== "ninguno") {
        window.history.replaceState(
          window.history.state,
          "",
          limpiarUrl(window.location.href),
        );
      }

      /* Quien ya entró por su cuenta —desde el panel, por ejemplo— no necesita
         ningún enlace: cambia su contraseña y ya. */
      const { data } = await supabase.auth.getSession();
      if (cancelado) return;

      setTokens(leidos);
      setHaySesion(Boolean(data.session));
      if (!data.session && leidos.tipo === "error") {
        setDiagnostico(explicarFalloDeEnlace(leidos));
      }
      if (!data.session && leidos.tipo === "ninguno") {
        setDiagnostico(explicarFalloDeEnlace(leidos));
      }
      setListo(true);
    }

    void preparar();
    return () => {
      cancelado = true;
    };
  }, [supabase]);

  /* Abre la sesión con lo que trajo la dirección, justo antes de usarla.
     Devuelve el motivo si no pudo, para poder decirlo con precisión. */
  async function abrirSesionDelEnlace(): Promise<string> {
    if (tokens.tipo === "hash") {
      const { error: errorAuth } = await supabase.auth.verifyOtp({
        token_hash: tokens.tokenHash,
        type: tokens.verificacion as "recovery" | "invite" | "email",
      });
      if (errorAuth) {
        return `El enlace ya no sirve. Pedí uno nuevo desde Recuperar contraseña. (${errorAuth.code ?? errorAuth.message})`;
      }
      return "";
    }

    if (tokens.tipo === "implicito") {
      const { error: errorAuth } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      return errorAuth ? "El enlace ya no sirve. Pedí uno nuevo." : "";
    }

    if (tokens.tipo === "codigo") {
      const { error: errorAuth } = await supabase.auth.exchangeCodeForSession(tokens.codigo);
      return errorAuth ? "El enlace ya no sirve. Pedí uno nuevo." : "";
    }

    return "Esta página se abre desde el enlace que te llega por correo.";
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

    /* El canje va acá y no antes: entre abrir la sesión y usarla no queda
       ningún hueco donde pueda perderse. */
    if (!haySesion) {
      const motivo = await abrirSesionDelEnlace();
      if (motivo) {
        setError(motivo);
        setEnviando(false);
        return;
      }
    }

    const { error: errorAuth } = await supabase.auth.updateUser({ password: clave });

    if (errorAuth) {
      setError(mensajeErrorActualizarClave(errorAuth));
      setEnviando(false);
      return;
    }

    /* Cambiar la contraseña tiene que echar a quien estuviera adentro con la
       anterior. Sin esto, un restablecimiento no recupera una cuenta tomada. */
    await supabase.auth.signOut({ scope: "others" });

    router.replace("/dashboard/configuracion");
    router.refresh();
  }

  if (!listo) return null;

  if (!haySesion && (tokens.tipo === "ninguno" || tokens.tipo === "error")) {
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
      {/* Se dice antes de escribir: el enlace sigue intacto hasta que toque
          guardar, que es lo que impide que un antivirus de correo lo queme. */}
      {!haySesion && tokens.tipo !== "ninguno" ? (
        <p>Al guardar confirmamos el enlace del correo. Recién ahí se usa.</p>
      ) : null}
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
