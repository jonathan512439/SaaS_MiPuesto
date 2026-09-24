"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import {
  CENTRO_DE_BOLIVIA,
  CENTRO_DE_CIUDAD,
  coordenadasDeEnlace,
  zonaMasCercana,
  type Punto,
  type ZonaConCentro,
} from "../../lib/negocios/coordenadas";
import { construirEnlaceContacto } from "../../lib/contacto";
import { CIUDADES, NOMBRES_CIUDADES } from "../../lib/negocios/lugares";
import {
  MAXIMO_RUBROS_SECUNDARIOS,
  rubrosPublicosPorGrupo,
} from "../../lib/negocios/rubros-publicos";
import { Boton, Selector, useAvisos } from "../ui";
import { MapaPin } from "./mapa-pin";
import styles from "./que-vendes-y-donde.module.css";

/* «Qué vendes y dónde». Fase 11.
 *
 * Un solo formulario para dos lugares: el paso 2 del alta y «Mi negocio». Así
 * no pueden preguntar cosas distintas, y el dueño reconoce la pantalla la
 * segunda vez que la ve.
 *
 * Tres preguntas, en el orden en que un comerciante las contesta:
 *
 * 1. **Qué vendes**, en sus palabras, y hasta dos cosas más.
 * 2. **Si quiere que lo encuentren** en el buscador. Obligatoria y sin respuesta
 *    marcada: es su decisión, no la nuestra.
 * 3. **Dónde está**, solo si dijo que sí: ciudad y un pin. El pin arranca en el
 *    mejor lugar que tengamos —su enlace de Google Maps, su GPS, el centro de su
 *    ciudad— y la zona sale sola de dónde lo deje. Lo confirma él.
 *
 * El punto exacto no se publica nunca, y se lo decimos antes de pedírselo.
 */

export type PresenciaInicial = {
  rubroPublico: string;
  rubrosSecundarios: string[];
  aparece: boolean | null;
  ciudad: string;
  ubicacion: Punto | null;
  zonaId: string | null;
  zonaPropuesta: string;
};

/* Lo que se eligió en la pregunta de la zona: la que sale del pin, otra de la
   lista, o «Mi zona no está». */
const ZONA_PROPIA = "propia";

export function QueVendesYDonde({
  modo,
  inicial,
  zonas,
  enlaceMaps,
  rubroFijo,
}: {
  /* En el alta guarda el paso y sigue al siguiente; en el panel guarda y avisa. */
  modo: "alta" | "panel";
  inicial: PresenciaInicial;
  zonas: ZonaConCentro[];
  /* El enlace de «Cómo llegar» que el negocio ya haya pegado, si lo hay. */
  enlaceMaps: string | null;
  /* Si ya eligió rubro. Elegido, no se cambia desde acá: se nos escribe. */
  rubroFijo: boolean;
}) {
  const router = useRouter();
  const { mostrarAviso } = useAvisos();

  const [rubroPublico, setRubroPublico] = useState(inicial.rubroPublico);
  const [secundarios, setSecundarios] = useState<string[]>(() => {
    const lista = [...inicial.rubrosSecundarios];
    while (lista.length < MAXIMO_RUBROS_SECUNDARIOS) lista.push("");
    return lista;
  });
  const [aparece, setAparece] = useState<boolean | null>(inicial.aparece);
  const [ciudad, setCiudad] = useState(inicial.ciudad);
  const [ubicacion, setUbicacion] = useState<Punto | null>(inicial.ubicacion);
  const [zonaElegida, setZonaElegida] = useState<string>(
    inicial.zonaId ?? (inicial.zonaPropuesta ? ZONA_PROPIA : ""),
  );
  /* Si el dueño eligió la zona a mano. Mientras no lo haga, la zona sigue al
     pin; en cuanto elige, se respeta lo que eligió aunque mueva el pin. */
  const [zonaAMano, setZonaAMano] = useState(Boolean(inicial.zonaId || inicial.zonaPropuesta));
  const [zonaPropuesta, setZonaPropuesta] = useState(inicial.zonaPropuesta);
  const [buscandoPunto, setBuscandoPunto] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const zonasDeLaCiudad = useMemo(() => zonas.filter((zona) => zona.ciudad === ciudad), [zonas, ciudad]);
  const zonaDelPin = ubicacion ? zonaMasCercana(ubicacion, ciudad || null, zonas) : null;

  /* La zona sigue al pin hasta que el dueño elija otra: se calcula, no se
     copia a un estado, así no queda un paso atrás del pin. */
  const zonaEfectiva = zonaAMano ? zonaElegida : (zonaDelPin?.id ?? "");

  const centro = CENTRO_DE_CIUDAD[ciudad] ?? CENTRO_DE_BOLIVIA;

  /* El enlace de Google Maps, si trae el punto adentro, se lee sin salir a la
     red. Si es corto, lo sigue el servidor. */
  async function usarEnlaceMaps() {
    if (!enlaceMaps) return;
    const directo = coordenadasDeEnlace(enlaceMaps);
    if (directo) {
      setUbicacion(directo);
      return;
    }
    setBuscandoPunto(true);
    try {
      const respuesta = await fetch("/api/negocios/ubicacion-desde-enlace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enlace: enlaceMaps }),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        ubicacion?: Punto;
        error?: string;
      };
      if (!respuesta.ok || !datos.ubicacion) throw new Error(datos.error);
      setUbicacion(datos.ubicacion);
    } catch (causa) {
      mostrarAviso({
        titulo: "No pudimos leer tu enlace de Google Maps",
        mensaje:
          causa instanceof Error && causa.message
            ? causa.message
            : "Marca tu local tocando el mapa.",
        variante: "error",
      });
    } finally {
      setBuscandoPunto(false);
    }
  }

  function usarMiUbicacion() {
    if (!("geolocation" in navigator)) {
      mostrarAviso({
        titulo: "Tu teléfono no comparte la ubicación",
        mensaje: "Marca tu local tocando el mapa.",
        variante: "error",
      });
      return;
    }
    setBuscandoPunto(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUbicacion({ lat: coords.latitude, lng: coords.longitude });
        setBuscandoPunto(false);
      },
      (problema) => {
        setBuscandoPunto(false);
        /* Cada motivo tiene su arreglo, y un mismo mensaje para los tres
           mandaba a revisar un permiso que a veces estaba bien. */
        const mensajes: Record<number, string> = {
          [problema.PERMISSION_DENIED]:
            "Le negaste el permiso al navegador. Para darlo, toca el candado junto a la dirección y permite la ubicación. O marca tu local tocando el mapa.",
          [problema.POSITION_UNAVAILABLE]:
            "Tu equipo no sabe dónde está: revisa que la ubicación del teléfono esté encendida. O marca tu local tocando el mapa.",
          [problema.TIMEOUT]:
            "Tardó demasiado en encontrarte. Prueba de nuevo al aire libre, o marca tu local tocando el mapa.",
        };
        mostrarAviso({
          titulo: "No pudimos saber dónde estás",
          mensaje: mensajes[problema.code] ?? "Marca tu local tocando el mapa.",
          variante: "error",
        });
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  /* Al decir que sí por primera vez, si ya pegó su enlace de Maps y todavía no
     hay pin, se lo ponemos ahí: es lo más probable, y él solo confirma. */
  function elegirAparecer(valor: boolean) {
    setAparece(valor);
    setErrores({});
    if (valor && !ubicacion && enlaceMaps) void usarEnlaceMaps();
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setErrores({});
    const cuerpo = {
      rubro_publico: rubroPublico,
      rubros_secundarios: secundarios.filter(Boolean),
      aparece_en_directorio: aparece,
      ciudad,
      ubicacion,
      zona_id: zonaEfectiva && zonaEfectiva !== ZONA_PROPIA ? zonaEfectiva : null,
      zona_propuesta: zonaEfectiva === ZONA_PROPIA ? zonaPropuesta : null,
    };
    try {
      const respuesta = await fetch(modo === "alta" ? "/api/alta/paso" : "/api/negocios/presencia", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(modo === "alta" ? { paso: 2, ...cuerpo } : cuerpo),
      });
      const datos = (await respuesta.json().catch(() => ({}))) as {
        error?: string;
        errores?: Record<string, string>;
        ruta?: string;
      };
      if (!respuesta.ok) {
        setErrores(datos.errores ?? {});
        throw new Error(datos.error || "No se pudo guardar.");
      }
      if (modo === "alta" && datos.ruta) {
        router.push(datos.ruta);
        return;
      }
      mostrarAviso({ titulo: "Guardado", variante: "exito" });
      router.refresh();
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

  const grupos = rubrosPublicosPorGrupo();
  const opcionesRubro = (vacio: string) => (
    <>
      <option value="">{vacio}</option>
      {grupos.map(({ grupo, rubros }) => (
        <optgroup key={grupo} label={grupo}>
          {rubros.map(({ id, nombre }) => (
            <option key={id} value={id}>
              {nombre}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );

  return (
    <form className={styles.formulario} onSubmit={guardar}>
      {/* 1 · Qué vendes */}
      <div className={styles.bloque}>
        {/* Elegido, queda a la vista y apagado: el dueño ve cuál tiene, y el
            cómo se cambia está al lado, no en una pantalla de ayuda. */}
        <Selector
          disabled={rubroFijo}
          error={errores.rubro_publico}
          etiqueta="¿Qué vendes?"
          id="rubro-publico"
          onChange={(evento) => setRubroPublico(evento.target.value)}
          required
          value={rubroPublico}
        >
          {opcionesRubro("Elige uno")}
        </Selector>
        {rubroFijo ? (
          <p className={styles.nota}>
            Tu rubro quedó fijo al crear tu catálogo.{" "}
            <a
              href={construirEnlaceContacto("Hola, quiero cambiar el rubro de mi negocio en MiPuesto.")}
              rel="noreferrer"
              target="_blank"
            >
              Escríbenos para cambiarlo
            </a>
            .
          </p>
        ) : null}

        <details className={styles.tambien} open={secundarios.some(Boolean)}>
          <summary>¿También vendes otra cosa? (opcional)</summary>
          <p>Hasta {MAXIMO_RUBROS_SECUNDARIOS} más, para que te encuentren también por eso.</p>
          {secundarios.map((valor, indice) => (
            <Selector
              etiqueta={`Otro rubro ${indice + 1}`}
              id={`rubro-secundario-${indice}`}
              key={indice}
              onChange={(evento) =>
                setSecundarios((actuales) =>
                  actuales.map((actual, posicion) => (posicion === indice ? evento.target.value : actual)),
                )
              }
              value={valor}
            >
              {opcionesRubro("Ninguno")}
            </Selector>
          ))}
          {errores.rubros_secundarios ? (
            <strong className={styles.error}>{errores.rubros_secundarios}</strong>
          ) : null}
        </details>

        {/* Breve y a la vista en el momento de decidir, no en un enlace: quien
            tiene que leerlo es el que no va a abrir «más información». */}
        {!rubroFijo ? (
          <div className={styles.advertencia} role="note">
            <p>
              <strong>El rubro se elige una sola vez.</strong> Con él preparamos tus categorías
              y los datos de cada producto. Para cambiarlo después hay que escribirnos.
            </p>
          </div>
        ) : null}
      </div>

      {/* 2 · Si quiere que lo encuentren */}
      <fieldset className={styles.bloque}>
        <legend className={styles.pregunta}>¿Quieres que te encuentren en el buscador de MiPuesto?</legend>
        <p className={styles.explicacion}>
          Si alguien busca en MiPuesto algo que vendes —por ejemplo, «juguetes en Oruro»— puede
          encontrar tu catálogo. Para eso necesitamos tu ciudad y dónde está tu local.{" "}
          <strong>Tu dirección exacta no se publica: se muestra solo tu zona.</strong>
        </p>
        <div className={styles.opciones}>
          <label className={aparece === true ? styles.opcionElegida : styles.opcion}>
            <input
              checked={aparece === true}
              name="aparece"
              onChange={() => elegirAparecer(true)}
              type="radio"
            />
            <span>
              <strong>Sí, quiero aparecer</strong>
              <small>Te pedimos tu ciudad y que marques tu local en el mapa.</small>
            </span>
          </label>
          <label className={aparece === false ? styles.opcionElegida : styles.opcion}>
            <input
              checked={aparece === false}
              name="aparece"
              onChange={() => elegirAparecer(false)}
              type="radio"
            />
            <span>
              <strong>No, por ahora</strong>
              <small>Tu catálogo funciona igual, con tu enlace y tu QR.</small>
            </span>
          </label>
        </div>
        {errores.aparece_en_directorio ? (
          <strong className={styles.error}>{errores.aparece_en_directorio}</strong>
        ) : null}
        {aparece === false ? (
          <p className={styles.nota}>Puedes cambiarlo cuando quieras en «Mi negocio».</p>
        ) : null}
      </fieldset>

      {/* 3 · Dónde está, solo si quiere aparecer */}
      {aparece === true ? (
        <div className={styles.bloque}>
          <Selector
            error={errores.ciudad}
            etiqueta="Tu ciudad"
            id="ciudad-presencia"
            onChange={(evento) => {
              setCiudad(evento.target.value);
              setZonaAMano(false);
            }}
            required
            value={ciudad}
          >
            <option value="">Elige tu ciudad</option>
            {CIUDADES.map((id) => (
              <option key={id} value={id}>
                {NOMBRES_CIUDADES[id]}
              </option>
            ))}
          </Selector>

          <div className={styles.ubicacion}>
            <p className={styles.pregunta}>¿Dónde está tu local?</p>
            <p className={styles.explicacion}>
              Toca el mapa donde está tu puerta, o arrastra el pin.
            </p>
            <div className={styles.atajos}>
              <Boton disabled={buscandoPunto} onClick={usarMiUbicacion} type="button" variante="secundario">
                Estoy en mi local
              </Boton>
              {enlaceMaps ? (
                <Boton
                  disabled={buscandoPunto}
                  onClick={() => void usarEnlaceMaps()}
                  type="button"
                  variante="secundario"
                >
                  Usar mi enlace de Google Maps
                </Boton>
              ) : null}
            </div>
            <MapaPin
              alCambiar={setUbicacion}
              centro={centro}
              etiqueta="Ubicación de tu local"
              valor={ubicacion}
            />
            {errores.ubicacion ? <strong className={styles.error}>{errores.ubicacion}</strong> : null}
          </div>

          {ubicacion && ciudad ? (
            <div className={styles.zona}>
              {zonaDelPin && !zonaAMano ? (
                <p className={styles.zonaDetectada}>
                  Tu local queda en <strong>{zonaDelPin.nombre}</strong>. Si no es así, elige la tuya.
                </p>
              ) : null}
              <Selector
                error={errores.zona_id}
                etiqueta="Tu zona"
                id="zona-presencia"
                onChange={(evento) => {
                  setZonaElegida(evento.target.value);
                  setZonaAMano(true);
                }}
                value={zonaEfectiva}
              >
                <option value="">
                  {zonasDeLaCiudad.length === 0 ? "Todavía no cargamos zonas de tu ciudad" : "Elige tu zona"}
                </option>
                {zonasDeLaCiudad.map((zona) => (
                  <option key={zona.id} value={zona.id}>
                    {zona.nombre}
                  </option>
                ))}
                <option value={ZONA_PROPIA}>Mi zona no está en la lista</option>
              </Selector>
              {zonaEfectiva === ZONA_PROPIA ? (
                <label className={styles.campoPropio} htmlFor="zona-propuesta">
                  <span>¿Cómo se llama tu zona?</span>
                  <input
                    id="zona-propuesta"
                    maxLength={60}
                    onChange={(evento) => setZonaPropuesta(evento.target.value)}
                    placeholder="Como la dice la gente del barrio"
                    type="text"
                    value={zonaPropuesta}
                  />
                  <small>La revisamos y la sumamos a la lista.</small>
                  {errores.zona_propuesta ? (
                    <strong className={styles.error}>{errores.zona_propuesta}</strong>
                  ) : null}
                </label>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <Boton cargando={guardando} disabled={rubroPublico === "" || aparece === null} type="submit">
        {modo === "alta" ? "Guardar y seguir" : "Guardar"}
      </Boton>
    </form>
  );
}
