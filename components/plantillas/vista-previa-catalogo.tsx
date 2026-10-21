"use client";

import type { PaletaId } from "../../lib/apariencia";
import { iconosDePatron, patronDeRubro } from "../../lib/patrones-fondo";
import type { DatosPlantilla } from "../../lib/plantillas/tipos";
import { PasoNumerado } from "../dashboard/paso-numerado";
import { PlantillaMipuesto } from "../templates/mipuesto/plantilla-mipuesto";
import temaStyles from "../templates/tema-catalogo.module.css";
import styles from "./vista-previa-catalogo.module.css";

/* El catálogo del negocio dibujado en el panel, con lo que se está editando.
 *
 * Lo usan Apariencia —paleta, forma, fondo, logo, portada y su texto— y
 * Promociones —los dos banners—. Vivía adentro del selector de Apariencia; al
 * sumarse Promociones se sacó acá para que las dos muestren el mismo catálogo.
 *
 * En escritorio queda fija al costado mientras se desplazan los ajustes (lo
 * decide la pantalla que la usa, con la clase que le pasa): cambiar algo abajo
 * y no verlo arriba es lo que obligaba a subir y bajar.
 */
export function VistaPreviaCatalogo({
  datos,
  paleta,
  patron,
  opacidad,
  descripcion = "Así se verá la experiencia de tus clientes.",
  fija = false,
  className,
}: {
  datos: DatosPlantilla;
  paleta: PaletaId;
  patron: boolean;
  opacidad: number;
  descripcion?: string;
  /* Fija al costado en escritorio. */
  fija?: boolean;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="titulo-vista-previa"
      className={[styles.vista, fija ? styles.fija : null, className].filter(Boolean).join(" ")}
    >
      <header>
        <PasoNumerado
          descripcion={descripcion}
          icono="ojo"
          idTitulo="titulo-vista-previa"
          titulo="Así se ve tu catálogo"
        />
        <span>Vista de demostración</span>
      </header>
      {/* El marco lleva `.tema` y las dos marcas porque el patrón se pinta con
          `.tema[data-patron] > article`: sin el envoltorio, la vista previa
          mostraría todo menos el fondo. Misma regla que el catálogo: el de rubro
          es el de reserva, y con categorías propias el fondo lo dibuja la
          plantilla. */}
      <div
        className={`${temaStyles.tema} ${styles.marco}`}
        /* Al costado, la vista previa mide media pantalla: el catálogo, que
           decide sus columnas por el ancho de la ventana, ponía las de un monitor
           en esa media pantalla y cortaba nombres y precios. Con la marca se
           dibuja como en un teléfono, que además es como lo ve casi todo cliente. */
        data-marco={fija ? "telefono" : undefined}
        data-paleta={paleta}
        data-patron={
          patron && iconosDePatron(datos.categorias).length === 0
            ? patronDeRubro(datos.negocio.rubro)
            : undefined
        }
        data-patron-opacidad={patron ? opacidad : undefined}
      >
        <PlantillaMipuesto datos={datos} paleta={paleta} />
      </div>
    </section>
  );
}
