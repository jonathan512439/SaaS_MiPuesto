import type { PaletaId } from "../../apariencia";
import type { FormaDeVender } from "../../catalogo/categorias";
import type { TipoAtributo } from "../../catalogo/atributos";
import type { TipoNegocio } from "../../negocios/validacion";
import type { RubroId } from "../../negocios/rubros";
import type { PatronFondo } from "../../patrones-fondo";

/* La siembra de un rubro: el catálogo con el que arranca quien lo elige.
 *
 * **Son datos, no migraciones.** La siembra corre desde el servidor al elegir el
 * rubro, no al desplegar. Ponerla en una migración obligaría a desplegar la base
 * cada vez que se corrige el nombre de una categoría, y a que un negocio dado de
 * alta ayer tenga un catálogo distinto al de mañana por una corrección de texto.
 *
 * Lo sembrado **es del dueño desde el primer segundo**: lo renombra, lo borra o
 * le agrega lo suyo. La siembra existe para que no arranque de una pantalla en
 * blanco, no para decidir por él.
 */

export type AtributoSembrado = {
  /* La llave con la que se guarda el valor en cada producto. En minúsculas y con
     guiones bajos: es la misma que usa la importación y la que viaja a la IA. */
  clave: string;
  nombre: string;
  tipo: TipoAtributo;
  /* Solo para `numero`: «W», «kg», «ml». */
  unidad?: string;
  /* Solo para `opcion`, y entre 2 y 24. Una opción sola no es una opción. */
  opciones?: string[];
  /* Si se muestra en la línea de la tarjeta. Hasta seis por categoría: la
     tarjeta es del tamaño de un pulgar y todo no entra. */
  enTarjeta?: boolean;
};

export type CategoriaSembrada = {
  nombre: string;
  /* Del juego generado desde Lucide. Una prueba comprueba que exista: un ícono
     mal escrito se descubriría recién cuando un cliente elige ese rubro. */
  icono: string;
  vende: FormaDeVender;
  atributos?: AtributoSembrado[];
  /* Solo para las que venden tiempo. Sin esto, una categoría de consultas queda
     sin horario y el cliente no puede agendar nada. */
  agenda?: {
    duracionMinutos: number;
    /* Cuántos se pueden atender a la vez. Dos consultorios, dos cupos. */
    cupo: number;
    anticipacionMinutosMinima: number;
    diasHaciaAdelante: number;
  };
};

export type SiembraDeRubro = {
  rubro: RubroId;
  patron: PatronFondo;
  /* Sugeridas, no impuestas: el dueño las cambia en Apariencia y en
     Configuración. Se siembran para que el catálogo se vea terminado de entrada
     en vez de salir con la paleta de todos. */
  paletaSugerida: PaletaId;
  modalidadSugerida: TipoNegocio;
  categorias: CategoriaSembrada[];
};
