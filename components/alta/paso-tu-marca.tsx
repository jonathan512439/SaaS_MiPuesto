"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { DEFINICIONES_PALETAS, type PaletaId } from "../../lib/apariencia";
import { prepararImagenParaSubir } from "../../lib/imagenes";
import type { RespuestaSubidaIdentidad } from "../../lib/negocios/identidad";
import type { DatosPlantilla } from "../../lib/plantillas/tipos";
import { PlantillaMipuesto } from "../templates/mipuesto/plantilla-mipuesto";
import temaStyles from "../templates/tema-catalogo.module.css";
import { Boton, Campo, useAvisos } from "../ui";
import styles from "./paso.module.css";

/* Paso 3 del alta: el logo, el renglón bajo el nombre y el color.
 *
 * Con la vista previa al lado y cambiando en vivo. Es lo que hace que este paso
 * valga la pena: elegir un color de una lista de nombres —«Altiplano», «Jazmín»—
 * es adivinar; verlo puesto en el catálogo propio es decidir.
 *
 * **Los tres son opcionales.** Se puede seguir sin nada: el logo lo hace después
 * quien todavía no lo tiene, y el color ya viene sugerido por el rubro. Este es
 * el único paso sin datos obligatorios, y por eso el avance se guarda en
 * `alta_paso` en vez de deducirse.
 */
export function PasoTuMarca({
  datos,
  logoInicial,
  subnombreInicial,
  paletaInicial,
}: {
  datos: DatosPlantilla;
  logoInicial: string | null;
  subnombreInicial: string;
  paletaInicial: PaletaId;
}) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();
  const [logo, setLogo] = useState(logoInicial);
  const [subnombre, setSubnombre] = useState(subnombreInicial);
  const [paleta, setPaleta] = useState(paletaInicial);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  /* La muestra se arma con lo que hay en pantalla ahora mismo, no con lo
     guardado: el punto del paso es ver el cambio antes de decidirlo. */
  const datosMostrados: DatosPlantilla = {
    ...datos,
    negocio: { ...datos.negocio, logoUrl: logo, subnombre: subnombre.trim() || null },
  };

  async function subirLogo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    /* Se limpia antes de nada: sin esto, elegir el mismo archivo dos veces
       seguidas no dispara el evento y parece que no pasó nada. */
    evento.target.value = "";
    if (!archivo) return;

    setSubiendo(true);
    try {
      const imagen = await prepararImagenParaSubir(archivo);
      const formulario = new FormData();
      formulario.append("tipo", "logo");
      formulario.append("archivo", imagen);
      const respuesta = await fetch("/api/negocios/identidad", {
        method: "POST",
        body: formulario,
      });
      const resultado = (await respuesta.json().catch(() => ({}))) as RespuestaSubidaIdentidad;
      if (!respuesta.ok || !resultado.imagen) {
        throw new Error(resultado.error || "No se pudo subir el logo.");
      }
      setLogo(resultado.imagen.url);
    } catch (causa) {
      mostrarAviso({
        titulo: "No se pudo subir el logo",
        mensaje: causa instanceof Error ? causa.message : "Intenta con otra imagen.",
        variante: "error",
      });
    } finally {
      setSubiendo(false);
    }
  }

  async function seguir() {
    setGuardando(true);
    try {
      /* Dos guardados y no uno: el subnombre y la paleta viven en pantallas
         distintas del panel y cada una tiene su endpoint con su validación.
         Inventar acá un tercero que escriba las dos cosas duplicaría esas reglas
         y las dejaría listas para separarse. */
      const respuestas = await Promise.all([
        fetch("/api/negocios/plantilla", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            paleta_id: paleta,
            patron_fondo: datos.negocio.patronFondo,
            patron_opacidad: datos.negocio.patronOpacidad,
          }),
        }),
        fetch("/api/alta/paso", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paso: 3, subnombre }),
        }),
      ]);

      const paso = (await respuestas[1].json().catch(() => ({}))) as {
        error?: string;
        ruta?: string;
      };
      if (!respuestas[0].ok || !respuestas[1].ok || !paso.ruta) {
        throw new Error(paso.error || "No se pudo guardar.");
      }
      router.push(paso.ruta);
    } catch (causa) {
      mostrarAviso({
        titulo: "No se pudo guardar",
        mensaje: causa instanceof Error ? causa.message : "Intenta de nuevo.",
        variante: "error",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={styles.conMuestra}>
      <div className={styles.paso}>
        <div className={styles.titulo}>
          <h2>Tu marca</h2>
          <p>Mira a la derecha: lo que cambies acá se ve al instante.</p>
        </div>

        <label className={styles.campoArchivo} htmlFor="logo-alta">
          <span className={styles.etiquetaArchivo}>Tu logo</span>
          <div className={styles.logoFila}>
            {logo ? (
              <Image alt="Tu logo" className={styles.logoPrevio} height={56} src={logo} width={56} />
            ) : (
              <span aria-hidden="true" className={styles.logoVacio}>
                Sin logo
              </span>
            )}
            <input
              accept="image/jpeg,image/png,image/webp"
              disabled={subiendo}
              id="logo-alta"
              onChange={(evento) => void subirLogo(evento)}
              type="file"
            />
          </div>
          <small>{subiendo ? "Subiendo…" : "Puedes cargarlo después, en Apariencia."}</small>
        </label>

        <Campo
          ayuda="El renglón corto que va bajo el nombre, en la cabecera."
          etiqueta="Renglón bajo el nombre (opcional)"
          id="subnombre-alta"
          maxLength={60}
          onChange={(evento) => setSubnombre(evento.target.value)}
          placeholder="Pollos a la brasa · Desde 1998"
          value={subnombre}
        />

        <fieldset className={styles.paletas}>
          <legend>El color de tu catálogo</legend>
          <div className={styles.listaPaletas}>
            {DEFINICIONES_PALETAS.map(({ id, nombre }) => (
              <label className={paleta === id ? styles.paletaElegida : styles.paleta} key={id}>
                <input
                  checked={paleta === id}
                  name="paleta-alta"
                  onChange={() => setPaleta(id)}
                  type="radio"
                  value={id}
                />
                <span aria-hidden="true" className={temaStyles.tema} data-paleta={id} />
                {nombre}
              </label>
            ))}
          </div>
        </fieldset>

        <Boton cargando={guardando} onClick={() => void seguir()} type="button">
          Seguir
        </Boton>
      </div>

      {/* Envuelta en `.tema` con la paleta puesta: el marco es el que le da el
          color a la muestra, igual que el contenedor del catálogo real. */}
      <div className={`${temaStyles.tema} ${styles.muestra}`} data-paleta={paleta}>
        <PlantillaMipuesto datos={datosMostrados} paleta={paleta} />
      </div>
    </div>
  );
}
