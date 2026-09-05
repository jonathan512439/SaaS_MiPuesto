"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useClienteSupabaseNavegador } from "../supabase/proveedor-supabase-navegador";
import { useAvisos } from "../ui";
import styles from "./segundo-factor.module.css";

type Etapa = "cargando" | "inscribir" | "verificar_alta" | "desafio" | "listo";

const LARGO_CODIGO = 6;

/* Esta cuenta ya no protege un negocio: protege a todos. `SECURITY.md` marca el
   segundo factor como prematuro para el producto, y esta es la excepción escrita
   y justificada a esa regla.

   Todo ocurre en el navegador porque son llamadas al sistema de autenticación
   que no pasan por nuestro servidor: la clave del factor nunca toca el Worker. */
export function SegundoFactor() {
  const supabase = useClienteSupabaseNavegador();
  const router = useRouter();
  const { mostrarAviso } = useAvisos();

  const [etapa, setEtapa] = useState<Etapa>("cargando");
  const [factorId, setFactorId] = useState("");
  const [desafioId, setDesafioId] = useState("");
  const [qr, setQr] = useState("");
  const [secreto, setSecreto] = useState("");
  const [codigo, setCodigo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function preparar() {
      const { data: existentes } = await supabase.auth.mfa.listFactors();
      if (cancelado) return;

      const verificado = existentes?.totp?.find(({ status }) => status === "verified");
      if (verificado) {
        setFactorId(verificado.id);
        setEtapa("desafio");
        return;
      }

      /* Los factores a medio inscribir se descartan antes de crear otro: sin
         esto, cada visita a la página dejaría uno nuevo sin verificar, y la
         clave de un intento anterior ya no se puede volver a mostrar. */
      for (const pendiente of existentes?.totp ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: pendiente.id });
      }
      if (cancelado) return;

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (cancelado) return;
      if (error || !data) {
        mostrarAviso({
          titulo: "No se pudo preparar el segundo factor",
          mensaje: error?.message ?? "Recargá la página.",
          variante: "error",
        });
        setEtapa("inscribir");
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecreto(data.totp.secret);
      setEtapa("verificar_alta");
    }

    void preparar();
    return () => {
      cancelado = true;
    };
  }, [mostrarAviso, supabase]);

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setOcupado(true);

    try {
      let desafio = desafioId;
      if (!desafio) {
        const { data, error } = await supabase.auth.mfa.challenge({ factorId });
        if (error || !data) throw new Error(error?.message ?? "No se pudo pedir el código.");
        desafio = data.id;
        setDesafioId(desafio);
      }

      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: desafio,
        code: codigo,
      });
      if (error) throw new Error("El código no coincide. Probá con el siguiente.");

      setEtapa("listo");
      /* La sesión sube de nivel y el servidor tiene que volver a evaluarla: sin
         refrescar, la página seguiría mostrando esta pantalla. */
      router.refresh();
    } catch (error) {
      setDesafioId("");
      setCodigo("");
      mostrarAviso({
        titulo: "No se pudo verificar",
        mensaje: error instanceof Error ? error.message : "Intentá nuevamente.",
        variante: "error",
      });
    } finally {
      setOcupado(false);
    }
  }

  if (etapa === "cargando") {
    return <p className={styles.tarjeta}>Preparando el segundo factor…</p>;
  }

  return (
    <section className={styles.tarjeta} aria-labelledby="segundo-factor">
      <h1 id="segundo-factor">
        {etapa === "desafio" ? "Confirmá que sos vos" : "Activá el segundo factor"}
      </h1>

      {etapa === "verificar_alta" ? (
        <>
          <p>
            Escaneá este código con Google Authenticator, Authy o la aplicación que
            uses. Después escribí el número de seis dígitos que te muestre.
          </p>
          {qr ? (
            /* Imagen de datos que genera el sistema de autenticación en el
               momento: no hay nada que optimizar ni ningún servidor al que
               pedírsela. */
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Código para la aplicación de autenticación" className={styles.qr} src={qr} />
          ) : null}
          <p className={styles.secreto}>
            Si no podés escanear, cargá esta clave a mano: <code>{secreto}</code>
          </p>
        </>
      ) : (
        <p>
          Abrí tu aplicación de autenticación y escribí el número de seis dígitos que
          muestra para MiPuesto.
        </p>
      )}

      <form className={styles.formulario} onSubmit={confirmar}>
        <label htmlFor="codigo-factor">Código de seis dígitos</label>
        <input
          autoComplete="one-time-code"
          id="codigo-factor"
          inputMode="numeric"
          maxLength={LARGO_CODIGO}
          onChange={(evento) => setCodigo(evento.target.value.replace(/\D/g, ""))}
          pattern="\d{6}"
          required
          value={codigo}
        />
        <button disabled={ocupado || codigo.length !== LARGO_CODIGO} type="submit">
          {ocupado ? "Verificando…" : "Confirmar"}
        </button>
      </form>

      <p className={styles.nota}>
        Guardá la aplicación de autenticación en un lugar seguro. Sin ella no vas a
        poder entrar a esta pantalla.
      </p>
    </section>
  );
}
