"use client";

import { useState, type FormEvent } from "react";

import { useAvisos } from "../ui";
import styles from "./invitar-negocio.module.css";

/* Dar de alta un cliente exigía correr un script desde la máquina del vendedor
   con la clave privilegiada. Eso no se puede hacer desde un celular en el
   mercado, que es justo donde se cierra la venta. */
export function InvitarNegocio() {
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { mostrarAviso } = useAvisos();

  async function invitar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    try {
      const respuesta = await fetch("/api/plataforma/invitaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo enviar la invitación.");

      setCorreo("");
      mostrarAviso({
        titulo: "Invitación enviada",
        mensaje: "Va a recibir un correo para definir su contraseña.",
        variante: "exito",
      });
    } catch (error) {
      mostrarAviso({
        titulo: "No se pudo invitar",
        mensaje: error instanceof Error ? error.message : "Intenta nuevamente.",
        variante: "error",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.invitar} onSubmit={invitar}>
      <div>
        <label htmlFor="correo-invitado">Invitar a un negocio nuevo</label>
        <p>Recibe un correo para definir su contraseña y cargar su catálogo.</p>
      </div>
      <div className={styles.campo}>
        <input
          autoComplete="off"
          id="correo-invitado"
          maxLength={200}
          onChange={(evento) => setCorreo(evento.target.value)}
          placeholder="correo@negocio.com"
          required
          type="email"
          value={correo}
        />
        <button disabled={enviando || !correo} type="submit">
          {enviando ? "Enviando…" : "Invitar"}
        </button>
      </div>
    </form>
  );
}
