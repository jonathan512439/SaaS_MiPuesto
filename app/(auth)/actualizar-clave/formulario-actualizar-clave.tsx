"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import styles from "../../../components/auth/marco-auth.module.css";
import { useClienteSupabaseNavegador } from "../../../components/supabase/proveedor-supabase-navegador";
import { Boton, CampoClave } from "../../../components/ui";
import { mensajeErrorActualizarClave } from "../../../lib/auth/mensajes";

export function FormularioActualizarClave() {
  const supabase = useClienteSupabaseNavegador();
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [haySesion, setHaySesion] = useState<boolean | null>(null);
  const router = useRouter();

  /* Se comprueba antes de mostrar el formulario. Sin sesión, escribir dos veces
     una contraseña para que después falle es hacerle perder el tiempo a alguien
     que ya viene peleando con un enlace que no anduvo. */
  useEffect(() => {
    let cancelado = false;
    async function comprobar() {
      const { data } = await supabase.auth.getSession();
      if (!cancelado) setHaySesion(Boolean(data.session));
    }
    void comprobar();
    return () => {
      cancelado = true;
    };
  }, [supabase]);

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

  if (haySesion === false) {
    return (
      <div className={styles.formulario}>
        <p className={styles.mensajeError} role="alert">
          El enlace ya no sirve: venció, ya se usó, o lo abriste en un navegador
          distinto del que lo pidió.
        </p>
        <p>
          Pedí uno nuevo y abrilo en el mismo teléfono o computadora donde lo
          solicitás. Los enlaces sirven una sola vez.
        </p>
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
