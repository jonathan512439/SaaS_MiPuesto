"use client";

import { useEffect, useState } from "react";

import { Boton } from "../ui";
import styles from "./selector-de-turno.module.css";

/* Elegir día y hora, y reservar.
 *
 * Los horarios **no vienen con el catálogo**: se piden al abrir la ficha. Es a
 * propósito: entre que la página se sirvió y que alguien la mira pueden pasar
 * horas, y ofrecer un horario que ya se ocupó es peor que tardar medio segundo
 * en pedirlos.
 */

type Horario = { inicio: string; hora: string; libres: number };
type Dia = { fecha: string; horarios: Horario[] };

const NOMBRES_DIA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const NOMBRES_MES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/* «Sáb 19 sep». Se arma con la fecha en texto y no con `toLocaleDateString`
   porque el navegador la interpretaría en la zona de quien mira: alguien que
   abre el catálogo desde otro país vería el día anterior. */
function rotuloDeFecha(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return `${NOMBRES_DIA[diaSemana]} ${Number(dia)} ${NOMBRES_MES[Number(mes) - 1]}`;
}

export function SelectorDeTurno({
  slug,
  productoId,
  productoNombre,
}: {
  slug: string;
  productoId: string;
  productoNombre: string;
}) {
  const [dias, setDias] = useState<Dia[] | null>(null);
  const [productoAnterior, setProductoAnterior] = useState(productoId);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  const [horarioElegido, setHorarioElegido] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [reservando, setReservando] = useState(false);
  const [reserva, setReserva] = useState<{ codigo: string; cuando: string; enlace: string | null } | null>(
    null,
  );
  /* El error se muestra acá adentro y no con un aviso flotante: `useAvisos`
     lanza si no encuentra su proveedor, y el proveedor **vive solo en el
     panel**. Usarlo en el catálogo público rompía la ficha entera con el
     mensaje de recargar. Además, el error pertenece a este formulario: quien
     está eligiendo un turno tiene que leerlo junto al botón que apretó. */
  const [error, setError] = useState<string | null>(null);

  /* El reinicio va durante el render y no dentro del efecto, que es el patrón
     que ya usa la hoja de producto: poner estado en un efecto dibuja una vez con
     los horarios del producto anterior antes de limpiarlos, y es lo que la regla
     de hooks señala. Acá se corrige antes de que nada llegue a la pantalla. */
  if (productoId !== productoAnterior) {
    setProductoAnterior(productoId);
    setDias(null);
    setDiaElegido(null);
    setHorarioElegido(null);
    setReserva(null);
    setError(null);
  }

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const respuesta = await fetch(
          `/api/publico/${slug}/horarios?producto=${encodeURIComponent(productoId)}`,
        );
        const datos = (await respuesta.json()) as { dias?: Dia[] };
        if (!vigente) return;
        setDias(datos.dias ?? []);
        setDiaElegido(datos.dias?.[0]?.fecha ?? null);
      } catch {
        if (vigente) setDias([]);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [productoId, slug]);

  if (dias === null) {
    return (
      <p className={styles.estado}>
        <span aria-hidden="true">⏳</span> Buscando horarios…
      </p>
    );
  }

  if (reserva) {
    return (
      <div className={styles.confirmacion}>
        <p className={styles.listo}>
          <span aria-hidden="true">✅</span> Tu turno quedó apartado.
        </p>
        <p className={styles.cuando}>
          <span aria-hidden="true">🗓️</span> {reserva.cuando}
        </p>
        <p className={styles.codigo}>
          <span aria-hidden="true">🔖</span> Código {reserva.codigo}
        </p>
        {/* El WhatsApp después de reservar y no antes: el turno ya está guardado,
            así que el mensaje sirve para confirmar con el negocio, no para pedir.
            Si la persona no lo manda, el turno igual existe. */}
        {reserva.enlace ? (
          <a
            className={styles.whatsapp}
            href={reserva.enlace}
            rel="noopener noreferrer"
            target="_blank"
          >
            Avisar por WhatsApp
          </a>
        ) : null}
      </div>
    );
  }

  if (dias.length === 0) {
    return (
      <p className={styles.estado}>
        <span aria-hidden="true">📭</span> No hay horarios disponibles por ahora.
        Consultá al negocio directamente.
      </p>
    );
  }

  const horariosDelDia = dias.find(({ fecha }) => fecha === diaElegido)?.horarios ?? [];

  async function reservar() {
    if (!horarioElegido) return;
    setError(null);
    setReservando(true);
    try {
      const respuesta = await fetch(`/api/publico/${slug}/citas`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productoId,
          inicio: horarioElegido,
          nombre,
          telefono,
          nota,
          /* Se genera acá y viaja con el pedido: un doble toque en un teléfono
             lento manda dos veces lo mismo, y la clave repetida hace que el
             servidor devuelva la cita que ya creó en vez de crear otra. */
          idempotencia: crypto.randomUUID(),
        }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        dias?: Dia[];
        cita?: { codigo: string; cuando: string };
        enlaceWhatsapp?: string | null;
      };

      if (respuesta.ok && datos.cita) {
        setReserva({
          codigo: datos.cita.codigo,
          cuando: datos.cita.cuando,
          enlace: datos.enlaceWhatsapp ?? null,
        });
        return;
      }

      /* Si alguien ganó el horario mientras esta persona escribía su nombre, el
         servidor devuelve los horarios al día: se actualizan sin recargar para
         que pueda elegir otro ahí mismo. */
      if (datos.dias) {
        setDias(datos.dias);
        setHorarioElegido(null);
      }
      throw new Error(datos.error || "No se pudo reservar.");
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo reservar. Intentá otra vez.");
    } finally {
      setReservando(false);
    }
  }

  return (
    <section className={styles.seccion}>
      <h3 className={styles.titulo}>
        <span aria-hidden="true">🗓️</span> Elegí tu turno
      </h3>

      {/* Los emojis van decorativos —`aria-hidden`— y el rótulo dice lo mismo en
          palabras: quien usa lector de pantalla escucha «Elegí el día» y no el
          nombre del pictograma. Sirven para separar de un vistazo las dos filas,
          que antes eran dos hileras de botones iguales sin nada que las
          distinguiera. */}
      <p className={styles.rotulo}>
        <span aria-hidden="true">📅</span> Elegí el día
      </p>

      <div className={styles.dias}>
        {dias.map((dia) => (
          <button
            aria-pressed={dia.fecha === diaElegido}
            className={dia.fecha === diaElegido ? styles.diaActivo : styles.dia}
            key={dia.fecha}
            onClick={() => {
              setDiaElegido(dia.fecha);
              setHorarioElegido(null);
            }}
            type="button"
          >
            {rotuloDeFecha(dia.fecha)}
          </button>
        ))}
      </div>

      <p className={styles.rotulo}>
        <span aria-hidden="true">🕒</span> Elegí la hora
      </p>

      <div className={styles.horas}>
        {horariosDelDia.map((horario) => (
          <button
            aria-pressed={horario.inicio === horarioElegido}
            className={horario.inicio === horarioElegido ? styles.horaActiva : styles.hora}
            /* Los llenos se dibujan igual, apagados. Esconderlos haría parecer
               que el negocio no atiende a esa hora, cuando lo que pasa es que ya
               la tomaron: son dos cosas distintas. */
            disabled={horario.libres === 0}
            key={horario.inicio}
            onClick={() => setHorarioElegido(horario.inicio)}
            type="button"
          >
            {horario.hora}
            {horario.libres === 0 ? <small>ocupado</small> : null}
          </button>
        ))}
      </div>

      {horarioElegido ? (
        <div className={styles.datos}>
          <label className={styles.control}>
            <span>Tu nombre</span>
            <input
              maxLength={80}
              onChange={(evento) => setNombre(evento.target.value)}
              type="text"
              value={nombre}
            />
          </label>

          <label className={styles.control}>
            <span>Tu WhatsApp</span>
            <input
              inputMode="tel"
              maxLength={20}
              onChange={(evento) => setTelefono(evento.target.value)}
              placeholder="7XXXXXXX"
              type="tel"
              value={telefono}
            />
          </label>

          <label className={styles.control}>
            <span>Algo que el negocio deba saber (opcional)</span>
            <input
              maxLength={300}
              onChange={(evento) => setNota(evento.target.value)}
              placeholder={`Para qué es el turno de ${productoNombre.toLowerCase()}`}
              type="text"
              value={nota}
            />
          </label>

          {error ? <strong className={styles.error}>{error}</strong> : null}

          <Boton
            cargando={reservando}
            disabled={nombre.trim() === "" || telefono.trim() === ""}
            onClick={() => void reservar()}
            type="button"
          >
            Apartar este turno
          </Boton>
        </div>
      ) : null}
    </section>
  );
}
