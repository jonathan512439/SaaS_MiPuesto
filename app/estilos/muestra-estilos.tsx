"use client";

import Link from "next/link";
import { useState } from "react";

import {
  Boton,
  Campo,
  Esqueleto,
  EstadoVacio,
  HojaModal,
  IndicadorEstado,
  ProveedorAvisos,
  ProveedorConfirmacion,
  Toast,
  useAvisos,
  useConfirmacion,
} from "@/components/ui";

import styles from "./estilos.module.css";

const colores = [
  { nombre: "Marca", valor: "#1F5B63", clase: styles.colorMarca },
  { nombre: "Superficie", valor: "#FBFAF8", clase: styles.colorSuperficie },
  { nombre: "Texto", valor: "#15292C", clase: styles.colorTexto },
  { nombre: "Acción", valor: "#B3440E", clase: styles.colorAccion },
  { nombre: "Éxito", valor: "#1E6A45", clase: styles.colorExito },
  { nombre: "Alerta", valor: "#8A5500", clase: styles.colorAlerta },
];

export function MuestraEstilos() {
  return (
    <ProveedorAvisos>
      <ProveedorConfirmacion>
        <Galeria />
      </ProveedorConfirmacion>
    </ProveedorAvisos>
  );
}

function Galeria() {
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [avisoVisible, setAvisoVisible] = useState(true);
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();

  return (
    <main className={styles.pagina}>
      <header className={styles.portada}>
        <div className={styles.contenedor}>
          <Link className={styles.marca} href="/">
            MiPuesto
          </Link>
          <div className={styles.presentacion}>
            <div>
              <h1 className={styles.tituloPrincipal}>Sistema de diseño</h1>
              <p className={styles.bajada}>
                Componentes claros para vender, reservar y administrar desde el celular.
              </p>
            </div>
            <p className={styles.version}>Referencia interna de Fase 1</p>
          </div>
        </div>
      </header>

      <div className={styles.contenedor}>
        <section className={styles.seccion}>
          <EncabezadoSeccion
            titulo="Color"
            descripcion="Seis colores base con roles estables. Los tonos auxiliares se derivan como tokens."
          />
          <ul className={styles.listaColores}>
            {colores.map((color) => (
              <li className={styles.filaColor} key={color.nombre}>
                <span aria-hidden="true" className={[styles.muestraColor, color.clase].join(" ")} />
                <span className={styles.nombreColor}>{color.nombre}</span>
                <code className={styles.valorColor}>{color.valor}</code>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.seccion}>
          <EncabezadoSeccion
            titulo="Tipografía"
            descripcion="Una sola familia, jerarquía por peso y una escala cerrada."
          />
          <div className={styles.muestraTipo}>
            <p className={styles.tipoHero}>Un catálogo que se entiende de un vistazo</p>
            <p className={styles.tipoTitulo}>Productos listos para vender</p>
            <p className={styles.tipoSubtitulo}>Organizá el menú como atiende tu negocio.</p>
            <p className={styles.tipoCuerpo}>
              Texto de lectura para descripciones claras, sin tecnicismos y con líneas cortas.
            </p>
            <p className={styles.tipoPrecio}>Bs 45,00</p>
            <p className={styles.tipoAyuda}>Ayuda breve para completar un campo.</p>
          </div>
        </section>

        <section className={styles.seccion}>
          <EncabezadoSeccion
            titulo="Botones"
            descripcion="La etiqueta dice exactamente qué ocurrirá. Probá hover, clic y navegación con Tab."
          />
          <div className={styles.grupoBotones}>
            <Boton>Publicar catálogo</Boton>
            <Boton variante="secundario">Guardar borrador</Boton>
            <Boton variante="discreto">Cancelar</Boton>
            <Boton variante="peligro">Eliminar producto</Boton>
          </div>
          <div className={styles.grupoBotones}>
            <Boton className={styles.focoDemostracion} variante="secundario">
              Foco visible
            </Boton>
            <Boton cargando>Guardando cambios</Boton>
            <Boton disabled>Acción deshabilitada</Boton>
          </div>
        </section>

        <section className={styles.seccion}>
          <EncabezadoSeccion
            titulo="Campos de formulario"
            descripcion="Etiqueta persistente, ayuda concreta y errores que explican cómo corregirlos."
          />
          <div className={styles.cuadriculaCampos}>
            <Campo
              ayuda="Así aparecerá en el catálogo."
              etiqueta="Nombre del producto"
              id="producto"
              placeholder="Ej. Majadito batido"
              required
            />
            <Campo
              defaultValue="-15"
              error="El precio debe ser igual o mayor a Bs 0."
              etiqueta="Precio en bolivianos"
              id="precio-error"
              inputMode="decimal"
            />
            <Campo
              defaultValue="Este campo no se puede cambiar todavía"
              disabled
              etiqueta="Modalidad del catálogo"
              id="campo-deshabilitado"
            />
          </div>
        </section>

        <section className={styles.seccion}>
          <EncabezadoSeccion
            titulo="Estados de producto"
            descripcion="Color, símbolo y texto trabajan juntos para seguir siendo legibles con reflejo o baja visión."
          />
          <div className={styles.grupoEstados}>
            <IndicadorEstado estado="disponible" />
            <IndicadorEstado estado="reservado" />
            <IndicadorEstado estado="vendido" />
            <IndicadorEstado estado="agotado" />
            <IndicadorEstado estado="oculto" />
          </div>
        </section>

        <section className={styles.seccion}>
          <EncabezadoSeccion
            titulo="Hoja modal"
            descripcion="En celular nace desde abajo; el diálogo nativo administra el foco y la tecla Escape."
          />
          <Boton onClick={() => setHojaAbierta(true)}>Revisar producto</Boton>
          <HojaModal
            abierta={hojaAbierta}
            acciones={
              <>
                <Boton onClick={() => setHojaAbierta(false)} variante="discreto">
                  Seguir editando
                </Boton>
                <Boton onClick={() => setHojaAbierta(false)}>Publicar producto</Boton>
              </>
            }
            descripcion="Confirmá que el nombre y el precio estén correctos antes de publicar."
            onCerrar={() => setHojaAbierta(false)}
            titulo="Revisar producto"
          >
            <dl className={styles.resumenProducto}>
              <div>
                <dt>Producto</dt>
                <dd>Majadito batido</dd>
              </div>
              <div>
                <dt>Precio</dt>
                <dd className={styles.precioResumen}>Bs 38,00</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  <IndicadorEstado estado="disponible" />
                </dd>
              </div>
            </dl>
          </HojaModal>
        </section>

        <section className={styles.seccion}>
          <EncabezadoSeccion
            titulo="Avisos"
            descripcion="La urgencia define el rol accesible; el mensaje siempre indica el resultado o la solución."
          />
          <div className={styles.listaAvisos}>
            <Toast
              anunciar={false}
              mensaje="La vista previa ya muestra tus últimos cambios."
              titulo="Borrador actualizado"
            />
            {avisoVisible ? (
              <Toast
                anunciar={false}
                mensaje="El producto ya aparece en tu catálogo."
                onCerrar={() => setAvisoVisible(false)}
                titulo="Producto publicado"
                variante="exito"
              />
            ) : (
              <Boton onClick={() => setAvisoVisible(true)} variante="secundario">
                Mostrar aviso de éxito
              </Boton>
            )}
            <Toast
              anunciar={false}
              mensaje="La reserva vence en 10 minutos."
              titulo="Pedido por confirmar"
              variante="advertencia"
            />
            <Toast
              anunciar={false}
              mensaje="Pesa más de 5 MB. Probá con una imagen más liviana."
              titulo="No se pudo subir la foto"
              variante="error"
            />
          </div>
        </section>

        <section className={styles.seccion}>
          <EncabezadoSeccion
            titulo="Avisos y confirmaciones en uso"
            descripcion="Los avisos se apilan abajo, se pausan al pasar el puntero y desaparecen solos. La confirmación arranca con el foco en la salida segura."
          />
          <div className={styles.filaBotones}>
            <Boton
              onClick={() =>
                mostrarAviso({ titulo: "Producto publicado", variante: "exito" })
              }
              variante="secundario"
            >
              Aviso de éxito
            </Boton>
            <Boton
              onClick={() =>
                mostrarAviso({
                  titulo: "No se pudo subir la foto",
                  mensaje: "Pesa más de 5 MB. Probá con una imagen más liviana.",
                  variante: "error",
                })
              }
              variante="secundario"
            >
              Aviso de error
            </Boton>
            <Boton
              onClick={async () => {
                const aceptado = await confirmar({
                  titulo: "Borrar “Hamburguesa clásica”",
                  descripcion: "Se borran también sus fotografías. No se puede deshacer.",
                  destructiva: true,
                  textoAccion: "Borrar producto",
                });
                mostrarAviso({
                  titulo: aceptado ? "Producto borrado" : "No se borró nada",
                  variante: aceptado ? "exito" : "informacion",
                });
              }}
              variante="peligro"
            >
              Confirmación destructiva
            </Boton>
          </div>
        </section>

        <section className={styles.seccion}>
          <EncabezadoSeccion
            titulo="Estado vacío"
            descripcion="El mensaje propone una siguiente acción en lugar de llenar el espacio con decoración."
          />
          <EstadoVacio
            accion={<Boton>Agregar primer producto</Boton>}
            descripcion="Empieza con el primero para preparar tu catálogo."
            titulo="Todavía no cargaste ningún producto"
          />
        </section>

        <section className={styles.seccion}>
          <EncabezadoSeccion
            titulo="Carga"
            descripcion="Los esqueletos conservan el tamaño final y detienen la animación si el sistema reduce movimiento."
          />
          <div className={styles.muestraCarga}>
            <Esqueleto variante="imagen" />
            <div className={styles.lineasCarga}>
              <Esqueleto variante="titulo" />
              <Esqueleto />
              <Esqueleto />
              <div className={styles.filaCarga}>
                <Esqueleto variante="circulo" />
                <Esqueleto variante="titulo" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function EncabezadoSeccion({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div className={styles.encabezadoSeccion}>
      <h2>{titulo}</h2>
      <p>{descripcion}</p>
    </div>
  );
}
