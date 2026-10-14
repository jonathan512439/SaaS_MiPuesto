"use client";

import {
  armarEnlace,
  leerDestino,
  type ContextoDestino,
  type DestinoBanner,
} from "../../lib/negocios/destino-banner";
import {
  LARGO_MAXIMO_BOTON,
  LARGO_MAXIMO_COPY,
  LARGO_MAXIMO_EYEBROW,
  LARGO_MAXIMO_TITULO,
  type TextoSobreImagen,
} from "../../lib/negocios/texto-sobre-imagen";
import styles from "./cartel.module.css";

/* Lo que se escribe encima de una imagen —la portada, un banner—, compartido
 * por los dos formularios que lo editan: «Texto sobre tu portada» en
 * Apariencia y «Banner publicitario» en Promociones. Eran un solo formulario;
 * se separaron el 2026-10-13 a pedido del dueño, y estos campos quedaron acá
 * para que los dos sigan pidiendo lo mismo con las mismas palabras.
 *
 * El destino se guarda **desarmado**: el tipo por un lado y, si es una
 * dirección suelta, su texto por otro. Guardar solo la URL armada obligaría a
 * deducir el tipo en cada dibujado, y elegir «mi WhatsApp» sin teléfono cargado
 * dejaría el desplegable saltando solo a otra opción. */
export type TextoEnEdicion = {
  eyebrow: string;
  titulo: string;
  copy: string;
  boton: string;
  destino: DestinoBanner["tipo"];
  categoriaDestino: string;
  productoDestino: string;
  enlace: string;
};

export const TEXTO_VACIO: TextoEnEdicion = {
  eyebrow: "",
  titulo: "",
  copy: "",
  boton: "",
  destino: "ninguno",
  categoriaDestino: "",
  productoDestino: "",
  enlace: "",
};

function desarmarDestino(
  enlace: string | null,
  contexto: ContextoDestino,
): Pick<TextoEnEdicion, "destino" | "categoriaDestino" | "productoDestino" | "enlace"> {
  const destino = leerDestino(enlace, contexto);
  return {
    destino: destino.tipo,
    categoriaDestino: destino.tipo === "categoria" ? destino.categoriaId : "",
    productoDestino: destino.tipo === "producto" ? destino.codigo : "",
    enlace: destino.tipo === "otra" ? destino.url : "",
  };
}

function enlaceDe(texto: TextoEnEdicion, contexto: ContextoDestino): string | null {
  if (texto.destino === "categoria") {
    return armarEnlace({ tipo: "categoria", categoriaId: texto.categoriaDestino }, contexto);
  }
  if (texto.destino === "producto") {
    return armarEnlace({ tipo: "producto", codigo: texto.productoDestino }, contexto);
  }
  if (texto.destino === "otra") {
    return armarEnlace({ tipo: "otra", url: texto.enlace }, contexto);
  }
  return armarEnlace({ tipo: texto.destino }, contexto);
}

export function textoEnEdicion(guardado: TextoSobreImagen, contexto: ContextoDestino): TextoEnEdicion {
  return {
    eyebrow: guardado.eyebrow ?? "",
    titulo: guardado.titulo ?? "",
    copy: guardado.copy ?? "",
    boton: guardado.boton ?? "",
    ...desarmarDestino(guardado.enlace, contexto),
  };
}

/* Lo que se manda a guardar y lo que se manda a la vista previa: la misma
   forma, con los vacíos en nulo. */
export function textoGuardable(texto: TextoEnEdicion, contexto: ContextoDestino): TextoSobreImagen {
  return {
    eyebrow: texto.eyebrow.trim() || null,
    titulo: texto.titulo.trim() || null,
    copy: texto.copy.trim() || null,
    boton: texto.boton.trim() || null,
    enlace: enlaceDe(texto, contexto),
  };
}

/* Lo que pasa al tocar el botón, dicho para el dueño, según a dónde lleve. */
const QUE_HACE_EL_BOTON: Record<TextoEnEdicion["destino"], string> = {
  ninguno: "El cartel se ve, pero no se toca.",
  productos: "Baja hasta tus productos.",
  categoria: "Abre tu catálogo mostrando solo esa categoría.",
  producto: "Abre la página de ese producto, con su foto y su precio.",
  whatsapp:
    "Abre un chat contigo con el mensaje «Hola, vi en tu catálogo la promoción…» y el título que escribiste.",
  ubicacion: "Abre el mapa para llegar a tu local.",
  otra: "Abre esa página aparte, sin cerrar tu catálogo. Tiene que empezar con https://",
};

/* Un campo de una línea con su explicación y su tope dicho en palabras. */
function CampoDelCartel({
  id,
  etiqueta,
  ayuda,
  maximo,
  placeholder,
  valor,
  alCambiar,
}: {
  id: string;
  etiqueta: string;
  ayuda: string;
  maximo: number;
  placeholder: string;
  valor: string;
  alCambiar: (valor: string) => void;
}) {
  return (
    <label className={styles.campo} htmlFor={id}>
      <span>{etiqueta}</span>
      <input
        id={id}
        maxLength={maximo}
        onChange={(evento) => alCambiar(evento.target.value)}
        placeholder={placeholder}
        type="text"
        value={valor}
      />
      <small>
        {ayuda} Hasta {maximo} caracteres{valor.length > 0 ? ` (llevas ${valor.length})` : ""}.
      </small>
    </label>
  );
}

/* Los textos encima de la imagen y el botón, iguales para la portada y para el
   banner. Los nombres son los de un cartel —«frase corta arriba», «texto
   debajo»— y no los de una imprenta: «antetítulo» y «bajada» no los usa nadie
   que no haya trabajado en un diario. */
export function CamposDelCartel({
  prefijo,
  texto,
  cambiar,
  destinos,
  error,
}: {
  prefijo: string;
  texto: TextoEnEdicion;
  cambiar: (cambio: Partial<TextoEnEdicion>) => void;
  destinos: ContextoDestino;
  error?: string;
}) {
  return (
    <>
      <CampoDelCartel
        alCambiar={(eyebrow) => cambiar({ eyebrow })}
        ayuda="Una o dos palabras, en letra chica, que llamen la atención."
        etiqueta="Frase corta arriba del título (opcional)"
        id={`${prefijo}-eyebrow`}
        maximo={LARGO_MAXIMO_EYEBROW}
        placeholder="Solo esta semana"
        valor={texto.eyebrow}
      />
      <CampoDelCartel
        alCambiar={(titulo) => cambiar({ titulo })}
        ayuda="Lo más importante, en letra grande."
        etiqueta="Título (opcional)"
        id={`${prefijo}-titulo`}
        maximo={LARGO_MAXIMO_TITULO}
        placeholder="20 % en toda la línea eléctrica"
        valor={texto.titulo}
      />
      <CampoDelCartel
        alCambiar={(copy) => cambiar({ copy })}
        ayuda="Un detalle más: hasta cuándo, para quién, dónde."
        etiqueta="Texto debajo del título (opcional)"
        id={`${prefijo}-copy`}
        maximo={LARGO_MAXIMO_COPY}
        placeholder="Del lunes al sábado"
        valor={texto.copy}
      />
      <CampoDelCartel
        alCambiar={(boton) => cambiar({ boton })}
        ayuda="Lo que dice el botón. Aparece solo si también eliges a dónde lleva."
        etiqueta="Texto del botón (opcional)"
        id={`${prefijo}-boton`}
        maximo={LARGO_MAXIMO_BOTON}
        placeholder="Ver la promoción"
        valor={texto.boton}
      />

      <label className={styles.campo} htmlFor={`${prefijo}-destino`}>
        <span>¿A dónde lleva el botón?</span>
        {/* Lugares, no direcciones. Pedirle una URL escrita a mano a un
            comerciante es pedirle que falle. Escribir una dirección sigue
            estando, pero como última opción. */}
        <select
          id={`${prefijo}-destino`}
          onChange={(evento) => cambiar({ destino: evento.target.value as TextoEnEdicion["destino"] })}
          value={texto.destino}
        >
          <option value="ninguno">A ninguna parte (es solo un cartel)</option>
          <option value="productos">A mis productos</option>
          {destinos.categorias.length > 0 ? (
            <option value="categoria">A una categoría de mi catálogo</option>
          ) : null}
          {destinos.productos.length > 0 ? (
            <option value="producto">A un producto de mi catálogo</option>
          ) : null}
          <option value="whatsapp">A mi WhatsApp, con el mensaje de la promoción</option>
          {/* Sin ubicación publicada no se ofrece: elegirla dejaría un botón
              que no lleva a ninguna parte sin haberlo pedido. */}
          {destinos.ubicacionUrl ? <option value="ubicacion">A cómo llegar a mi local</option> : null}
          <option value="otra">A otra página de internet</option>
        </select>

        {texto.destino === "categoria" ? (
          <select
            aria-label="Qué categoría"
            onChange={(evento) => cambiar({ categoriaDestino: evento.target.value })}
            value={texto.categoriaDestino}
          >
            <option value="">Elige la categoría</option>
            {destinos.categorias.map(({ id, nombre }) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        ) : null}

        {texto.destino === "producto" ? (
          <select
            aria-label="Qué producto"
            onChange={(evento) => cambiar({ productoDestino: evento.target.value })}
            value={texto.productoDestino}
          >
            <option value="">Elige el producto</option>
            {destinos.productos.map(({ codigo, nombre }) => (
              <option key={codigo} value={codigo}>
                {nombre}
              </option>
            ))}
          </select>
        ) : null}

        {texto.destino === "otra" ? (
          <input
            aria-label="La dirección de la página"
            onChange={(evento) => cambiar({ enlace: evento.target.value })}
            placeholder="https://…"
            type="url"
            value={texto.enlace}
          />
        ) : null}

        <small>{QUE_HACE_EL_BOTON[texto.destino]}</small>
        {error ? <strong className={styles.error}>{error}</strong> : null}
      </label>
    </>
  );
}
