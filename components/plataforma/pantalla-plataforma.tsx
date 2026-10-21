import Link from "next/link";
import type { ComponentProps } from "react";

import {
  ESTADO_CORTO,
  ETIQUETAS_ESTADO,
  FILTROS_CLIENTES,
  filtrarClientes,
  type ClienteResumen,
  type FiltroClientes,
} from "../../lib/plataforma/clientes";
import { PESTANAS_PLATAFORMA, type PestanaPlataforma } from "../../lib/plataforma/pestanas";
import { rubroQueVeElDueno } from "../../lib/negocios/rubros-publicos";
import { formatearFechaVencimiento } from "../../lib/suscripcion";
import { Icono, type NombreIcono } from "../iconos/icono";
import { Isotipo } from "../marca/isotipo";
import { CerrarSesion } from "../negocios/cerrar-sesion";
import { BarraDesplazable } from "../ui/barra-desplazable";
import { AccionesCliente } from "./acciones-cliente";
import { BuscadorPlataforma } from "./buscador-plataforma";
import { CambioDeRubro } from "./cambio-de-rubro";
import { EtiquetasNfc } from "./etiquetas-nfc";
import { InvitarNegocio } from "./invitar-negocio";
import { RubroPublicoPlataforma } from "./rubro-publico-plataforma";
import { TutorialesPlataforma } from "./tutoriales-plataforma";
import { UsoAlmacenamientoPanel } from "./uso-almacenamiento";
import { UsoIaPanel } from "./uso-ia";
import { ZonasPlataforma } from "./zonas-plataforma";
import styles from "./pantalla-plataforma.module.css";

/* La plataforma, dibujada. La página lee la base y arma esto; acá no se consulta
 * nada, y por eso se puede dibujar con datos inventados en una prueba.
 *
 * Rediseñada el 2026-10-21, a pedido del dueño, para que se use como una
 * consola y no como una lista de formularios:
 *
 * - En computadora, la navegación va en una barra lateral fija con las seis
 *   secciones; en el teléfono, en una fila que se desplaza, como antes.
 * - Negocios abre con cuatro números —cuántos, cuántos necesitan algo, cuánto
 *   entra al mes, cuántos usan la IA— y filtros por lo que hay que hacer.
 * - Cada negocio es una fila que se lee de un vistazo: estado, quién es, cuándo
 *   vence. Los controles —renovar, plan, IA, publicar, rubro— estaban todos a
 *   la vista en cada tarjeta, y una lista de diez negocios eran cien botones;
 *   ahora van en «Gestionar», que se abre por negocio.
 */

/* Lo de cada negocio que la fila necesita además del resumen. */
export type ClientePlataforma = ClienteResumen & {
  planId: string;
  planNombre: string;
  fotosUsadas: number;
  topeFotos: number;
};

export type DatosPlataforma = {
  pestana: PestanaPlataforma;
  filtro: FiltroClientes;
  clientes: ClientePlataforma[];
  resumen: {
    publicados: number;
    atencion: number;
    ingresoMensual: number;
    conIa: number;
  };
  consumo: {
    ia: ComponentProps<typeof UsoIaPanel>;
    almacenamiento: ComponentProps<typeof UsoAlmacenamientoPanel>;
  };
  etiquetas: ComponentProps<typeof EtiquetasNfc>;
  zonas: ComponentProps<typeof ZonasPlataforma>;
  buscador: ComponentProps<typeof BuscadorPlataforma>;
  tutoriales: ComponentProps<typeof TutorialesPlataforma>;
};

const ICONO_DE_PESTANA: Record<PestanaPlataforma, NombreIcono> = {
  negocios: "tienda",
  consumo: "grafico",
  herramientas: "nfc",
  zonas: "mapa",
  buscador: "lupa",
  tutoriales: "idea",
};

const enlacePestana = (id: PestanaPlataforma) => (id === "negocios" ? "/plataforma" : `/plataforma?vista=${id}`);
const enlaceFiltro = (id: FiltroClientes) => (id === "todos" ? "/plataforma" : `/plataforma?estado=${id}`);

export function PantallaPlataforma(datos: DatosPlataforma) {
  const actual = PESTANAS_PLATAFORMA.find(({ id }) => id === datos.pestana) ?? PESTANAS_PLATAFORMA[0];

  return (
    <div className={styles.consola}>
      <aside className={styles.lateral}>
        <div className={styles.marca}>
          <Isotipo className={styles.isotipo} />
          <div>
            <strong>MiPuesto</strong>
            <span>Plataforma</span>
          </div>
        </div>

        {/* Las secciones van en la dirección y no en el estado del navegador:
            así «Consumo» se puede guardar en favoritos, y volver de una acción
            no devuelve a la primera. En el teléfono se desplazan de costado con
            sus flechas; en computadora son la barra lateral. */}
        <BarraDesplazable
          claseBarra={styles.secciones}
          claseFlecha={styles.flechaSecciones}
          claseMarco={styles.seccionesMarco}
          clave={datos.pestana}
          etiqueta="Secciones de la plataforma"
        >
          {PESTANAS_PLATAFORMA.map(({ id, titulo, pregunta }) => (
            <Link
              aria-current={id === datos.pestana ? "page" : undefined}
              className={id === datos.pestana ? styles.seccionActiva : styles.seccion}
              href={enlacePestana(id)}
              key={id}
            >
              <Icono aria-hidden="true" className={styles.iconoSeccion} nombre={ICONO_DE_PESTANA[id]} />
              <span>
                <strong>{titulo}</strong>
                <small>{pregunta}</small>
              </span>
            </Link>
          ))}
        </BarraDesplazable>

        {/* Salir, siempre a la vista: esta cuenta administra a todos los
            negocios, y dejarla abierta en una computadora prestada es el riesgo
            más grande que tiene. */}
        <div className={styles.salir}>
          <CerrarSesion texto="Salir" variante="secundario" />
        </div>
      </aside>

      <main className={styles.contenido}>
        <header className={styles.encabezado}>
          <p>Administración</p>
          <h1>{actual.titulo}</h1>
          <span>{actual.pregunta}</span>
        </header>

        {datos.pestana === "negocios" ? <SeccionNegocios {...datos} /> : null}

        {datos.pestana === "consumo" ? (
          <div className={styles.pila}>
            <UsoIaPanel {...datos.consumo.ia} />
            <UsoAlmacenamientoPanel {...datos.consumo.almacenamiento} />
          </div>
        ) : null}

        {datos.pestana === "herramientas" ? (
          <div className={styles.dosColumnas}>
            <InvitarNegocio />
            <EtiquetasNfc {...datos.etiquetas} />
          </div>
        ) : null}

        {datos.pestana === "zonas" ? <ZonasPlataforma {...datos.zonas} /> : null}
        {datos.pestana === "buscador" ? <BuscadorPlataforma {...datos.buscador} /> : null}
        {datos.pestana === "tutoriales" ? <TutorialesPlataforma {...datos.tutoriales} /> : null}
      </main>
    </div>
  );
}

function SeccionNegocios({ clientes, filtro, resumen }: DatosPlataforma) {
  const visibles = filtrarClientes(clientes, filtro) as ClientePlataforma[];
  const cuantos = (id: FiltroClientes) => filtrarClientes(clientes, id).length;

  return (
    <>
      {/* Los cuatro números que se miran todos los días, antes que la lista. */}
      <dl className={styles.indicadores}>
        <div>
          <dt>Negocios</dt>
          <dd>{clientes.length}</dd>
          <small>{resumen.publicados} con el catálogo publicado</small>
        </div>
        <div data-alerta={resumen.atencion > 0 ? "si" : undefined}>
          <dt>Necesitan atención</dt>
          <dd>{resumen.atencion}</dd>
          <small>Vencidos, por vencer o fuera de línea</small>
        </div>
        <div>
          <dt>Ingreso del mes</dt>
          <dd>Bs {resumen.ingresoMensual}</dd>
          <small>Si todos los publicados pagan</small>
        </div>
        <div>
          <dt>Con lectura de fotos</dt>
          <dd>{resumen.conIa}</dd>
          <small>Negocios con la IA encendida</small>
        </div>
      </dl>

      <nav aria-label="Filtrar negocios" className={styles.filtros}>
        {FILTROS_CLIENTES.map(({ id, titulo }) => (
          <Link
            aria-current={id === filtro ? "page" : undefined}
            className={id === filtro ? styles.filtroActivo : styles.filtro}
            href={enlaceFiltro(id)}
            key={id}
          >
            {titulo}
            <span>{cuantos(id)}</span>
          </Link>
        ))}
      </nav>

      {clientes.length === 0 ? (
        <p className={styles.vacio}>Todavía no hay negocios cargados. Invita al primero en Herramientas.</p>
      ) : visibles.length === 0 ? (
        <p className={styles.vacio}>Ningún negocio en este filtro. Buena señal.</p>
      ) : (
        <ul className={styles.lista}>
          {visibles.map((cliente) => (
            <FilaNegocio cliente={cliente} key={cliente.negocio.id} />
          ))}
        </ul>
      )}
    </>
  );
}

function FilaNegocio({ cliente }: { cliente: ClientePlataforma }) {
  const { negocio, estado, diasRestantes, diasDeGuardaRestantes } = cliente;
  const vencimiento =
    diasRestantes < 0
      ? `Venció hace ${Math.abs(diasRestantes)} día(s)`
      : diasRestantes === 0
        ? "Vence hoy"
        : `Vence en ${diasRestantes} día(s)`;

  return (
    <li className={styles.fila} data-estado={estado}>
      <div className={styles.resumenFila}>
        {/* La insignia lleva el estado en palabras: el color de la franja ayuda
            a encontrar, pero nunca es lo único que lo dice. */}
        <span className={styles.insignia} data-estado={estado} title={ETIQUETAS_ESTADO[estado]}>
          {ESTADO_CORTO[estado]}
        </span>

        <div className={styles.quien}>
          <h2>{negocio.nombre}</h2>
          {/* Un enlace y no un renglón de texto: revisar el catálogo de un
              cliente es lo que se viene a hacer acá. Con `a` y no con `Link`,
              que precargaría todos los catálogos de la lista. Fuera de línea no
              se enlaza: llevaría a un «no encontrado» que parece un error. */}
          {negocio.activo ? (
            <a className={styles.direccion} href={`/${negocio.slug}`} rel="noreferrer noopener" target="_blank">
              /{negocio.slug}
            </a>
          ) : (
            <span className={styles.direccionApagada}>/{negocio.slug} · sin catálogo público</span>
          )}
          <ul className={styles.datos}>
            <li>{rubroQueVeElDueno(negocio.rubro_publico, negocio.rubro)}</li>
            <li>Plan {cliente.planNombre}</li>
            <li>Desde {formatearFechaVencimiento(new Date(negocio.creado_en))}</li>
            {negocio.foto_ia_habilitada ? (
              <li data-ia="si">
                IA · {cliente.fotosUsadas} de {cliente.topeFotos}
              </li>
            ) : null}
          </ul>
        </div>

        <div className={styles.vence}>
          <strong>{vencimiento}</strong>
          <small>{formatearFechaVencimiento(new Date(negocio.suscripcion_vence_en))}</small>
          {/* Los datos se guardan noventa días desde que sale de línea: saber
              cuántos quedan es lo que permite escribir a tiempo. */}
          {diasDeGuardaRestantes !== null ? (
            <small className={styles.guarda}>
              {diasDeGuardaRestantes > 0
                ? `Sus datos se guardan ${diasDeGuardaRestantes} día(s) más`
                : "La guarda venció: sus datos ya se pueden borrar"}
            </small>
          ) : null}
        </div>
      </div>

      {/* `details` y no un estado de React: se abre sin JavaScript, el teclado
          lo maneja solo y el lector de pantalla dice si está abierto. */}
      <details className={styles.gestionar}>
        <summary>
          <Icono aria-hidden="true" nombre="flechaAbajo" />
          Gestionar
        </summary>
        <div className={styles.paneles}>
          <section aria-label={`Suscripción y catálogo de ${negocio.nombre}`}>
            <h3>Suscripción y catálogo</h3>
            <AccionesCliente
              activo={negocio.activo}
              fotoIaHabilitada={negocio.foto_ia_habilitada === true}
              fotosUsadas={cliente.fotosUsadas}
              negocioId={negocio.id}
              nombre={negocio.nombre}
              planId={cliente.planId}
              suspendidoPorPago={estado === "suspendido"}
              topeFotos={cliente.topeFotos}
            />
          </section>
          <section aria-label={`Rubro de ${negocio.nombre}`}>
            <h3>Rubro</h3>
            <RubroPublicoPlataforma
              negocioId={negocio.id}
              rubroPublicoActual={negocio.rubro_publico ?? null}
              siembra={negocio.rubro ?? null}
            />
            <CambioDeRubro negocioId={negocio.id} nombre={negocio.nombre} rubroActual={negocio.rubro ?? null} />
          </section>
        </div>
      </details>
    </li>
  );
}
