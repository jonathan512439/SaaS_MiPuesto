"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import styles from "../../../components/auth/marco-auth.module.css";
import {
  useClienteSupabaseNavegador,
  useCredencialesSupabaseNavegador,
} from "../../../components/supabase/proveedor-supabase-navegador";
import { Boton, CampoClave } from "../../../components/ui";
import {
  canjearEnlace,
  definirClaveConToken,
  exigeSegundoFactor,
  obtenerFactorVerificado,
  verificarSegundoFactor,
} from "../../../lib/auth/definir-clave";
import { explicarFalloDeEnlace, type Diagnostico } from "../../../lib/auth/diagnostico-enlace";
import { mensajeErrorActualizarClave } from "../../../lib/auth/mensajes";
import {
  leerTokensDeUrl,
  limpiarUrl,
  type TokensDeUrl,
} from "../../../lib/auth/sesion-desde-url";
import { RUTAS_PANEL } from "../../../lib/panel/rutas";

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
  const { clavePublica, url } = useCredencialesSupabaseNavegador();
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const [tokens, setTokens] = useState<TokensDeUrl>({ tipo: "ninguno" });
  const [haySesion, setHaySesion] = useState(false);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  /* Cuando la cuenta tiene segundo factor hay que pedir el código sin perder lo
     que ya se hizo: el enlace ya se canjeó y solo sirve una vez. */
  const [pendienteMfa, setPendienteMfa] = useState<{
    accessToken: string;
    refreshToken: string;
    factorId: string;
    clave: string;
  } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [guardada, setGuardada] = useState(false);
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

  /* Nada de lo que pase acá puede dejar el botón girando para siempre: si algo
     falla, la contraseña ya está guardada y alcanza con mandarlo a ingresar. */
  async function entrarConLaClaveNueva(correo: string, clave: string) {
    try {
      /* Se confirma antes de navegar. La navegación tarda, y ese hueco en
         silencio es lo que hace pensar que no pasó nada. */
      setGuardada(true);

      if (correo) {
        const { error: errorEntrada } = await supabase.auth.signInWithPassword({
          email: correo,
          password: clave,
        });
        if (!errorEntrada) {
          await supabase.auth.signOut({ scope: "others" });
          router.replace(RUTAS_PANEL.negocio);
          router.refresh();
          return;
        }
      }
    } catch {
      /* Se cae al camino de abajo. */
    }

    setEnviando(false);
    setError("");
    router.replace("/login?motivo=clave-lista");
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
      setError("Las contraseñas no coinciden. Escríbelas nuevamente.");
      return;
    }

    setEnviando(true);

    /* **El enlace manda sobre cualquier sesión guardada.** Antes se prefería la
       sesión existente, y bastaba una vieja —de un intento anterior, ya vencida—
       para que el enlace recién llegado ni se mirara: el cambio salía por el SDK
       con una credencial muerta y devolvía 401. Quien abre un enlace del correo
       trae el dato más fresco que existe; lo demás es historia.

       Y no se pasa por el SDK: `verifyOtp` responde bien y `updateUser` devuelve
       401 inmediatamente después, mientras que la misma secuencia contra la API
       —canjear y usar el token devuelto en la cabecera— está probada de punta a
       punta y funciona. */
    if (tokens.tipo === "hash") {
      const canje = await canjearEnlace(url, clavePublica, tokens.tokenHash, tokens.verificacion);
      if (!canje.correcto) {
        setError(`No pudimos confirmar el enlace: ${canje.motivo}`);
        setEnviando(false);
        return;
      }

      const cambio = await definirClaveConToken(url, clavePublica, canje.accessToken, clave);
      if (!cambio.correcto) {
        /* La cuenta tiene segundo factor. El enlace ya se canjeó y no se puede
           volver a usar, así que se guarda todo y se pide el código acá mismo:
           mandarlo a pedir otro enlace sería hacerle repetir todo para chocar
           contra lo mismo. */
        if (exigeSegundoFactor(cambio.motivo)) {
          const factorId = await obtenerFactorVerificado(
            url,
            clavePublica,
            canje.accessToken,
          );
          if (factorId) {
            setPendienteMfa({
              accessToken: canje.accessToken,
              refreshToken: canje.refreshToken,
              factorId,
              clave,
            });
            setError("");
            setEnviando(false);
            return;
          }
        }
        setError(cambio.motivo);
        setEnviando(false);
        return;
      }

      /* Se entra con la contraseña recién puesta, no con la sesión del enlace.
         La del enlace llega marcada como `otp`, y el panel rebota esas sesiones
         de vuelta a esta misma página —con razón: quien solo abrió un correo
         todavía no definió nada—. Al invitado eso lo dejaba dando vueltas entre
         las dos páginas, con el botón girando y sin llegar nunca.

         Iniciar sesión de verdad tiene además la ventaja de comprobar, en el
         acto, que la contraseña que acaba de elegir funciona. */
      await entrarConLaClaveNueva(canje.correo, clave);
      return;
    }

    /* Un correo viejo, de antes de cambiar la plantilla, trae la sesión ya
       abierta en la propia dirección. Ahí el token está a mano y se usa igual,
       sin pasar por el SDK. */
    if (tokens.tipo === "implicito") {
      const cambio = await definirClaveConToken(url, clavePublica, tokens.accessToken, clave);
      if (!cambio.correcto) {
        setError(cambio.motivo);
        setEnviando(false);
        return;
      }
      const { data: quien } = await supabase.auth.getUser(tokens.accessToken);
      await entrarConLaClaveNueva(quien.user?.email ?? "", clave);
      return;
    }

    if (!haySesion) {
      setError("Esta página se abre desde el enlace que te llega por correo.");
      setEnviando(false);
      return;
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

    router.replace(RUTAS_PANEL.negocio);
    router.refresh();
  }

  async function confirmarSegundoFactor(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!pendienteMfa) return;
    setError("");
    setEnviando(true);

    const elevado = await verificarSegundoFactor(
      url,
      clavePublica,
      pendienteMfa.accessToken,
      pendienteMfa.factorId,
      codigo,
    );
    if (!elevado.correcto) {
      setError(elevado.motivo);
      setCodigo("");
      setEnviando(false);
      return;
    }

    const cambio = await definirClaveConToken(
      url,
      clavePublica,
      elevado.accessToken,
      pendienteMfa.clave,
    );
    if (!cambio.correcto) {
      setError(cambio.motivo);
      setEnviando(false);
      return;
    }

    /* Con segundo factor se conserva la sesión elevada: volver a entrar con la
       contraseña obligaría a escribir el código otra vez, y esa sesión ya trae el
       factor cumplido, así que el panel la deja pasar. */
    await supabase.auth.setSession({
      access_token: elevado.accessToken,
      refresh_token: pendienteMfa.refreshToken,
    });
    await supabase.auth.signOut({ scope: "others" });
    router.replace(RUTAS_PANEL.negocio);
    router.refresh();
  }

  if (guardada) {
    return (
      <div className={styles.formulario}>
        <p className={styles.mensajeExito} role="status">
          Tu contraseña quedó guardada.
        </p>
        <p>Te estamos llevando a tu panel…</p>
      </div>
    );
  }

  if (!listo) return null;

  if (pendienteMfa) {
    return (
      <form className={styles.formulario} onSubmit={confirmarSegundoFactor}>
        <p>
          Tu cuenta tiene segundo factor. Escribe el número de seis dígitos que
          muestra tu aplicación de autenticación y guardamos la contraseña nueva.
        </p>
        <label htmlFor="codigo-mfa">Código de seis dígitos</label>
        <input
          autoComplete="one-time-code"
          id="codigo-mfa"
          inputMode="numeric"
          maxLength={6}
          onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, ""))}
          pattern="\d{6}"
          required
          value={codigo}
        />
        {error ? (
          <p className={styles.mensajeError} role="alert">
            {error}
          </p>
        ) : null}
        <Boton
          anchoCompleto
          cargando={enviando}
          disabled={enviando || codigo.length !== 6}
          type="submit"
        >
          Confirmar y guardar
        </Boton>
      </form>
    );
  }

  /* Se muestra el formulario si hay enlace o si hay sesión. Con las dos cosas,
     gana el enlace. */
  if (!haySesion && (tokens.tipo === "ninguno" || tokens.tipo === "error")) {
    return (
      <div className={styles.formulario}>
        <p className={styles.mensajeError} role="alert">
          {diagnostico?.titulo ?? "No pudimos abrir la sesión"}
        </p>
        <p>{diagnostico?.detalle ?? "Pide un enlace nuevo desde Recuperar contraseña."}</p>
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
        ayuda="Mínimo 10 caracteres. No reutilices una contraseña personal."
        etiqueta="Contraseña nueva"
        id="clave"
        minLength={10}
        name="clave"
        required
      />
      <CampoClave
        autoComplete="new-password"
        etiqueta="Repite la contraseña"
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
