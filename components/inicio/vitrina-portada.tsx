"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentType } from "react";

import type { PaletaId } from "../../lib/apariencia";
import { crearDatosDemoPlantilla } from "../../lib/plantillas/datos-demo";
import type { DatosPlantilla, PropiedadesPlantilla } from "../../lib/plantillas/tipos";
import { Icono } from "../iconos/icono";
import type { NombreIcono } from "../iconos/trazos";
import { Esqueleto } from "../ui";
import styles from "./vitrina-portada.module.css";

function PantallaCargando() {
  return (
    <div aria-hidden="true" className={styles.cargando}>
      <Esqueleto variante="imagen" />
      <Esqueleto variante="titulo" />
      <Esqueleto />
      <Esqueleto />
    </div>
  );
}

const Catalogo: ComponentType<PropiedadesPlantilla> = dynamic(
  () =>
    import("../templates/mipuesto/plantilla-mipuesto").then((m) => m.PlantillaMipuesto),
  { loading: PantallaCargando },
);

type Muestra = {
  id: string;
  rubro: string;
  datos: DatosPlantilla;
  paleta: PaletaId;
  /* Lo que le llega al dueño mientras el cliente mira, dicho con cosas de su
     rubro: un aviso de salteñas sobre un catálogo de ropa contradecía lo que el
     carrusel vino a decir. */
  aviso: { icono: NombreIcono; titulo: string; detalle: string };
  busqueda: string;
};

/* Tres rubros con fotos de verdad, uno al lado del otro.
 *
 * Arriba de todo, la portada mostraba solo comida —el catálogo, los avisos y la
 * lista a mano hablaban de salteñas—, y quien vendía otra cosa leía «esto es
 * para restaurantes» antes de llegar a la muestra por rubro (pedido del dueño,
 * 2026-10-22). Ahora el teléfono es un carrusel: comida, ropa y veterinaria, y
 * cada uno con su color, sus productos y sus avisos. Los tres son el catálogo de
 * verdad, no una ilustración. Las fotos de ropa y veterinaria son de dominio
 * público (`docs/creditos-fotos-demo.md`). */
const MUESTRAS: Muestra[] = [
  {
    id: "comida",
    rubro: "Comida",
    datos: crearDatosDemoPlantilla({
      nombre: "Doña Rosa",
      descripcion: "Salteñas y comida casera, en el mercado de siempre.",
      telefonoWhatsapp: "70000000",
      rubro: "restaurante",
    }),
    paleta: "mercado",
    aviso: { icono: "carrito", titulo: "Nuevo pedido", detalle: "2 salteñas y 1 api, Bs 24" },
    busqueda: "salteñas",
  },
  {
    id: "ropa",
    rubro: "Ropa",
    datos: crearDatosDemoPlantilla({
      nombre: "Tienda Kantuta",
      descripcion: "Ropa y calzado elegidos uno por uno en la feria.",
      telefonoWhatsapp: "70000000",
      rubro: "ropa_y_calzado",
    }),
    paleta: "noche",
    aviso: { icono: "carrito", titulo: "Nuevo pedido", detalle: "Zapatillas urbanas, talla 37, Bs 280" },
    busqueda: "zapatillas",
  },
  {
    id: "veterinaria",
    rubro: "Veterinaria",
    datos: crearDatosDemoPlantilla({
      nombre: "Patitas",
      descripcion: "Alimento, accesorios y baño para tu mascota.",
      telefonoWhatsapp: "70000000",
      rubro: "veterinaria",
    }),
    paleta: "selva",
    aviso: { icono: "calendario", titulo: "Nueva reserva", detalle: "Baño y peluquería, jueves 10:00" },
    busqueda: "veterinaria",
  },
];

/* Desplaza el carrusel hasta dejar una diapositiva al centro. Se mueve el
   carrusel y no la página: `scrollIntoView` también bajaría la página entera
   hasta el teléfono. */
function centrarDiapositiva(contenedor: HTMLDivElement | null, indice: number) {
  const diapositiva = contenedor?.children[indice] as HTMLElement | undefined;
  if (!contenedor || !diapositiva) return;
  contenedor.scrollTo({
    left: diapositiva.offsetLeft - (contenedor.clientWidth - diapositiva.clientWidth) / 2,
    behavior: "smooth",
  });
}

/* Cada cuánto pasa sola a la siguiente, hasta que la persona toca algo. */
const PASO_AUTOMATICO_MS = 5000;

export function VitrinaPortada() {
  const carrusel = useRef<HTMLDivElement>(null);
  const [activa, setActiva] = useState(0);
  /* La misma, para el reloj: leerla del estado dentro del intervalo daría
     siempre la del primer dibujo. */
  const activaActual = useRef(0);
  /* En cuanto la persona desliza o elige un rubro, el carrusel deja de moverse
     solo: quitarle de las manos lo que está mirando es la forma más rápida de
     que deje de mirarlo. */
  const tocado = useRef(false);

  const irA = (indice: number) => centrarDiapositiva(carrusel.current, indice);

  /* La activa es la más cercana al centro: sirve igual al deslizar con el dedo,
     con la rueda del mouse y con el paso automático. */
  function alDesplazar() {
    const contenedor = carrusel.current;
    if (!contenedor) return;
    const centro = contenedor.scrollLeft + contenedor.clientWidth / 2;
    let cercana = 0;
    let distancia = Infinity;
    Array.from(contenedor.children).forEach((hijo, indice) => {
      const elemento = hijo as HTMLElement;
      const suya = Math.abs(elemento.offsetLeft + elemento.clientWidth / 2 - centro);
      if (suya < distancia) {
        distancia = suya;
        cercana = indice;
      }
    });
    activaActual.current = cercana;
    setActiva(cercana);
  }

  useEffect(() => {
    /* Quien pidió menos movimiento no recibe un carrusel que se mueve solo. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const reloj = window.setInterval(() => {
      if (tocado.current) {
        window.clearInterval(reloj);
        return;
      }
      /* Solo se desplaza: la activa la marca `alDesplazar` al llegar. */
      centrarDiapositiva(carrusel.current, (activaActual.current + 1) % MUESTRAS.length);
    }, PASO_AUTOMATICO_MS);
    return () => window.clearInterval(reloj);
  }, []);

  const marcarTocado = () => {
    tocado.current = true;
  };
  const muestra = MUESTRAS[activa];

  return (
    <div className={styles.vitrina}>
      <div
        aria-label="Ejemplos de catálogo de distintos rubros"
        aria-roledescription="carrusel"
        className={styles.carrusel}
        onKeyDown={marcarTocado}
        onPointerDown={marcarTocado}
        onScroll={alDesplazar}
        onWheel={marcarTocado}
        ref={carrusel}
        role="region"
      >
        {MUESTRAS.map((opcion, indice) => (
          <div
            aria-label={`${opcion.rubro}, ${indice + 1} de ${MUESTRAS.length}`}
            aria-roledescription="diapositiva"
            className={styles.diapositiva}
            data-activa={indice === activa ? "si" : undefined}
            key={opcion.id}
            role="group"
          >
            <div className={styles.telefono}>
              <div aria-hidden="true" className={styles.barraTelefono}>
                <span>9:41</span>
                <span className={styles.muesca} />
                <span className={styles.bateria} />
              </div>
              <div className={styles.pantalla} data-marco="telefono">
                <Catalogo datos={opcion.datos} paleta={opcion.paleta} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Los rubros, para saltar a uno sin deslizar y para que se vea de un
          vistazo que hay más de uno. */}
      <div aria-label="Elige un rubro" className={styles.selector} role="group">
        {MUESTRAS.map((opcion, indice) => (
          <button
            aria-pressed={indice === activa}
            key={opcion.id}
            onClick={() => {
              marcarTocado();
              irA(indice);
            }}
            type="button"
          >
            {opcion.rubro}
          </button>
        ))}
      </div>

      {/* Lo que le pasa al dueño mientras el cliente mira: dos avisos de
          ejemplo, del rubro que se está viendo. Son decorado: lo mismo está
          dicho en texto en los pasos. */}
      <div aria-hidden="true" className={styles.avisoPedido} key={`pedido-${muestra.id}`}>
        <span className={styles.avisoIcono}>
          <Icono nombre={muestra.aviso.icono} />
        </span>
        <span>
          <strong>{muestra.aviso.titulo}</strong>
          <small>{muestra.aviso.detalle}</small>
        </span>
      </div>
      <div aria-hidden="true" className={styles.avisoBusqueda} key={`busqueda-${muestra.id}`}>
        <span className={styles.avisoIcono}>
          <Icono nombre="lupa" />
        </span>
        <span>
          <strong>Te encontraron</strong>
          <small>buscando «{muestra.busqueda}»</small>
        </span>
      </div>
    </div>
  );
}
