"use client";

import Image from "next/image";
import Link from "next/link";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { obtenerUrlPublicaImagenProducto } from "../../lib/catalogo/imagenes-publicas";
import { estaEnLaCartaDeHoy } from "../../lib/catalogo/carta-del-dia";
import {
  AYUDA_FOTO_PRODUCTO,
  AYUDA_PRECIO,
} from "../../lib/ayudas-formularios";
import { leerAtributos, type Atributo } from "../../lib/catalogo/atributos";
import { leerValores, type ValorAtributo } from "../../lib/catalogo/valores";
import { CamposDeProducto } from "./campos-de-producto";
import {
  MENSAJE_POCO_ESPACIO,
  MENSAJE_SIN_ESPACIO,
  describirEspacio,
  nivelDeEspacio,
} from "../../lib/catalogo/almacenamiento";
import {
  ayudaCategoria,
  ejemploDeCategoria,
  guiaDelNegocio,
  textosDeProducto,
} from "../../lib/catalogo/guias-por-rubro";
import { EditorDeVariantes } from "./editor-de-variantes";
import { AVISO_PRIVACIDAD_IA, AYUDA_PRODUCTO } from "../../lib/ia/ayuda";
import { prepararFotoParaLectura } from "../../lib/imagenes";
import { DIAS_PAPELERA } from "../../lib/catalogo/papelera";
import { mensajeLimiteProductos } from "../../lib/catalogo/topes-del-plan";
import { planDe } from "../../lib/planes";
import { formatearPrecioBolivianos } from "../../lib/precios";
import { rubroOfrece } from "../../lib/negocios/rubros";
import { Icono } from "../iconos/icono";
import { IconoCatalogo } from "../iconos/icono-catalogo";
import {
  DEFINICIONES_FORMAS_DE_VENDER,
  ICONO_PREDETERMINADO,
} from "../../lib/catalogo/categorias";
import { EditorDeCampos } from "./editor-de-campos";
import { SelectorDeIcono } from "./selector-de-icono";
import {
  AJUSTE_MAXIMO,
  AJUSTE_MINIMO,
  aplicarPorcentaje,
  validarAjustePrecios,
} from "../../lib/catalogo/precios-lote";
import type {
  CategoriaCatalogo,
  DatosCatalogoAdmin,
  ProductoCatalogo,
  SubcategoriaCatalogo,
} from "../../lib/catalogo/tipos";
import { prepararImagenParaSubir } from "../../lib/imagenes";
import { construirUrlPublicaProducto } from "../../lib/url-sitio";
import {
  AreaTexto,
  Boton,
  Campo,
  EstadoVacio,
  HojaModal,
  IndicadorEstado,
  type EstadoProducto,
  Selector,
  Trabajando,
  useAvisos,
  useConfirmacion,
} from "../ui";
import styles from "./gestor-catalogo.module.css";
import { TOPE_FOTOS_POR_DIA } from "../../lib/ia/limites";
import { cupoDelPlan } from "../../lib/planes";
import { RUTAS_PANEL } from "../../lib/panel/rutas";
import { normalizarBusqueda as normalizarTexto } from "../../lib/texto";

const FORMATEADOR_CAMBIO_PRECIO = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  dateStyle: "medium",
  timeStyle: "short",
});

/* Las dos pantallas salen del mismo componente y no de dos.
 *
 * «Mi catálogo» y «Productos» se separaron porque son dos trabajos distintos:
 * armar las categorías se hace una vez, cargar productos se hace todos los días.
 * Pero comparten el estado —crear una categoría tiene que aparecer al instante
 * en el desplegable del formulario de producto— y partirlo en dos componentes
 * habría significado duplicar la mitad de las llamadas a la API para después
 * mantenerlas sincronizadas a mano.
 *
 * `vista` elige qué mitad se dibuja. El estado sigue siendo uno solo.
 *
 * De paso, esto desanuda `categoriaActiva`, que hacía dos cosas a la vez: era
 * el filtro de la lista de productos **y** cuál categoría está abierta para
 * editarla. Cada pantalla usa ahora uno solo de los dos sentidos.
 */
export type VistaCatalogo = "categorias" | "productos";

type PropiedadesGestorCatalogo = {
  vista: VistaCatalogo;
  datosIniciales: DatosCatalogoAdmin;
  urlSupabase: string;
};

type FormularioProducto = {
  nombre: string;
  descripcion: string;
  precio: string;
  categoria_id: string;
  subcategoria_id: string;
  controla_stock: boolean;
  cantidad_stock: string;
  duracion_minutos: string;
  recurso_id: string;
};

type RespuestaError = { error?: string; errores?: Record<string, string> };

type Renombrado = {
  etiqueta: string;
  nombre: string;
  guardar: (nombre: string) => void;
};

const FORMULARIO_VACIO: FormularioProducto = {
  nombre: "",
  descripcion: "",
  precio: "",
  categoria_id: "",
  subcategoria_id: "",
  controla_stock: false,
  cantidad_stock: "",
  duracion_minutos: "",
  recurso_id: "",
};

const CATEGORIAS_POR_PAGINA = 5;
const PRODUCTOS_POR_PAGINA = 10;

async function solicitarJson<T>(ruta: string, opciones: RequestInit) {
  const respuesta = await fetch(ruta, opciones);
  const datos = (await respuesta.json().catch(() => ({}))) as RespuestaError & T;
  if (!respuesta.ok) throw Object.assign(new Error(datos.error || "No se pudo completar la acción."), { datos });
  return datos;
}

export function GestorCatalogo({ datosIniciales, urlSupabase, vista }: PropiedadesGestorCatalogo) {
  const [categorias, setCategorias] = useState(datosIniciales.categorias);
  const [subcategorias, setSubcategorias] = useState(datosIniciales.subcategorias);
  const [productos, setProductos] = useState(datosIniciales.productos);
  /* El rubro apaga botones, nunca datos: quien no eligió rubro los ve todos, y
     cambiar de rubro no borra ninguna marca ya puesta. */
  const ofreceCartaDelDia = rubroOfrece(datosIniciales.negocio.rubro, "carta_del_dia");
  const ofreceLecturaDeFotos = datosIniciales.negocio.foto_ia_habilitada === true;
  /* Cuánto entra según el plan. La base lo hace cumplir igual; acá se dice
     antes, para que el dueño no se entere con un producto que no se guarda. */
  const plan = planDe(datosIniciales.negocio.plan_id);
  const topeFotos = plan.topes.fotosPorProducto;
  const productosLlenos = productos.length >= plan.topes.productos;
  /* Cuántas lecturas le quedan al negocio este mes. Se dice acá, pegado al
     botón que las gasta, y no en otra pantalla: la pregunta «¿me queda?» aparece
     justo cuando se está por tocar, y una cuenta que hay que ir a buscar no la
     busca nadie. Nunca baja de cero: el servidor corta antes, y un número
     negativo se leería como una deuda. */
  /* Lo que le queda **de su plan**. Decía «de 200», que es el techo técnico
     del sistema y no lo que compró: el dueño del plan Catálogo leía que le
     quedaban 190 cuando en realidad le quedaban cero a la décima lectura. */
  const cupoDeLecturas = cupoDelPlan(datosIniciales.negocio.plan_id, TOPE_FOTOS_POR_DIA);
  const lecturasQueQuedan = Math.max(0, cupoDeLecturas.mensual - datosIniciales.fotosUsadasMes);
  const [leyendoFoto, setLeyendoFoto] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState("");
  const [paginaCategorias, setPaginaCategorias] = useState(1);
  const [paginaProductos, setPaginaProductos] = useState(1);
  /* Los valores de los campos propios del producto en edición. Van aparte del
     resto del formulario porque **su forma cambia con la categoría**: no son
     campos fijos con nombre conocido, son los que la categoría declaró. */
  const [valoresAtributos, setValoresAtributos] = useState<Record<string, ValorAtributo>>({});
  const [nombreCategoria, setNombreCategoria] = useState("");
  /* El ícono de la que se está creando. Arranca en el predeterminado y no en
     vacío: obligar a elegirlo antes de escribir el nombre pondría una decisión
     de aspecto delante de la única que importa acá, que es cómo se llama. */
  const [iconoCategoria, setIconoCategoria] = useState<string>(ICONO_PREDETERMINADO);
  const [nuevasSubcategorias, setNuevasSubcategorias] = useState<Record<string, string>>({});
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();
  const [productoEditando, setProductoEditando] = useState<string | null>(null);
  /* Si el producto que se edita lleva presentaciones. Con control de
     existencias, sus existencias van en cada una y el formulario deja de
     pedírselas al producto (fase 13). Lo actualiza el editor al guardar. */
  const [conPresentaciones, setConPresentaciones] = useState(false);
  /* El producto que se está editando, ya guardado. Las fotos se suben contra
     él y no contra el formulario: existe, tiene id, y es el mismo objeto que
     toca la lista. */
  const productoEnEdicion = productoEditando
    ? (productos.find(({ id }) => id === productoEditando) ?? null)
    : null;
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  /* Va **después** de `formulario`, no antes: lee `formulario.recurso_id`, y
     un `const` no existe hasta su línea. Estuvo arriba y tumbó «Productos» y
     «Mi catálogo» enteros con un «Cannot access before initialization» que
     ni el compilador ni el lint ven, porque el orden de dos `const` en la
     misma función no es cosa de tipos. */
  /* Cuánto dura un turno de quien atiende este producto, según su cronograma.
     Es el número que el campo de duración usa de omisión. */
  const duracionDeQuienAtiende = (() => {
    const recurso = datosIniciales.recursos.find(({ id }) => id === formulario.recurso_id) as
      | { agenda_recurso?: { duracion_minutos?: number | null } | { duracion_minutos?: number | null }[] }
      | undefined;
    const agenda = Array.isArray(recurso?.agenda_recurso)
      ? recurso?.agenda_recurso[0]
      : recurso?.agenda_recurso;
    return agenda?.duracion_minutos ?? null;
  })();
  const [imagenesPendientes, setImagenesPendientes] = useState<File[]>([]);
  /* Las miniaturas se crean en un efecto y no al dibujar: `createObjectURL`
     reserva memoria del navegador y hay que devolverla. Sin el `revoke`, cada
     foto elegida queda retenida hasta que se recarga la página. */
  const previasPendientes = useMemo(
    () => imagenesPendientes.map((archivo) => URL.createObjectURL(archivo)),
    [imagenesPendientes],
  );

  useEffect(
    () => () => {
      for (const url of previasPendientes) URL.revokeObjectURL(url);
    },
    [previasPendientes],
  );
  const [erroresFormulario, setErroresFormulario] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  /* Qué producto tiene abierta su tira de fotografías. Uno solo: dos tiras
     abiertas en una lista de trescientos productos es volver a la pantalla que
     esto vino a arreglar. */
  const [fotosAbiertas, setFotosAbiertas] = useState<string | null>(null);
  const [busquedaProductos, setBusquedaProductos] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "visibles" | "ocultos">(
    "todos",
  );
  const [ajustePorcentaje, setAjustePorcentaje] = useState("");
  const [ajusteCategoria, setAjusteCategoria] = useState("");
  const [ajustando, setAjustando] = useState(false);
  const [progreso, setProgreso] = useState("");
  const [renombrando, setRenombrando] = useState<Renombrado | null>(null);
  const formularioProductoRef = useRef<HTMLFormElement>(null);

  /* Tres filtros que se combinan, y no una lista entera para recorrer a ojo:
     con trescientos productos, encontrar uno sin buscador es abrir la lista y
     bajar. El de estado existe sobre todo para las copias, que nacen ocultas. */
  const productosVisibles = useMemo(() => {
    const terminos = normalizarTexto(busquedaProductos).split(/\s+/).filter(Boolean);

    return productos.filter((producto) => {
      if (categoriaActiva && producto.categoria_id !== categoriaActiva) return false;
      if (filtroEstado === "visibles" && !producto.visible) return false;
      if (filtroEstado === "ocultos" && producto.visible) return false;
      if (terminos.length === 0) return true;

      const texto = normalizarTexto(
        `${producto.nombre} ${producto.descripcion ?? ""} ${producto.codigo}`,
      );
      return terminos.every((termino) => texto.includes(termino));
    });
  }, [busquedaProductos, categoriaActiva, filtroEstado, productos]);
  const ocultos = useMemo(
    () => productos.filter((producto) => !producto.visible).length,
    [productos],
  );
  /* Agrupadas una sola vez y no en cada dibujo: el formulario se vuelve a
     dibujar con cada tecla, y filtrar la lista entera ahí sería recorrerla
     cientos de veces mientras alguien escribe un nombre. */
  const atributosPorCategoria = useMemo(() => {
    const mapa = new Map<string, Atributo[]>();
    for (const fila of datosIniciales.atributos) {
      const lista = mapa.get(fila.categoria_id) ?? [];
      lista.push(...leerAtributos([fila]));
      mapa.set(fila.categoria_id, lista);
    }
    return mapa;
  }, [datosIniciales.atributos]);

  const atributosDelFormulario = atributosPorCategoria.get(formulario.categoria_id) ?? [];

  const subcategoriasFormulario = subcategorias.filter(
    (subcategoria) => subcategoria.categoria_id === formulario.categoria_id,
  );
  /* Los ejemplos del formulario hablan del rubro de la categoría elegida: en
     una pollería que también vende helados, «Helados» pide sabores. */
  const guiaProducto = guiaDelNegocio(
    datosIniciales.negocio,
    categorias.find(({ id }) => id === formulario.categoria_id)?.nombre,
  );
  const textosProducto = textosDeProducto(guiaProducto);
  const totalPaginasProductos = Math.max(
    1,
    Math.ceil(productosVisibles.length / PRODUCTOS_POR_PAGINA),
  );
  const paginaProductosActual = Math.min(paginaProductos, totalPaginasProductos);
  const productosPaginados = productosVisibles.slice(
    (paginaProductosActual - 1) * PRODUCTOS_POR_PAGINA,
    paginaProductosActual * PRODUCTOS_POR_PAGINA,
  );
  const totalPaginasCategorias = Math.max(
    1,
    Math.ceil(categorias.length / CATEGORIAS_POR_PAGINA),
  );
  const paginaCategoriasActual = Math.min(paginaCategorias, totalPaginasCategorias);
  const categoriasPaginadas = categorias.slice(
    (paginaCategoriasActual - 1) * CATEGORIAS_POR_PAGINA,
    paginaCategoriasActual * CATEGORIAS_POR_PAGINA,
  );

  function informarExito(titulo: string, mensaje?: string) {
    mostrarAviso({ titulo, mensaje, variante: "exito" });
  }

  function informarError(titulo: string, error: unknown) {
    mostrarAviso({
      titulo,
      mensaje:
        error instanceof Error ? error.message : "Revisa tu conexión e intenta nuevamente.",
      variante: "error",
    });
  }

  async function crearCategoria(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setOcupado(true);
    try {
      const { categoria } = await solicitarJson<{ categoria: CategoriaCatalogo }>(
        "/api/catalogo/categorias",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: nombreCategoria, icono: iconoCategoria }),
        },
      );
      setCategorias((actuales) => [...actuales, categoria]);
      setPaginaCategorias(Math.ceil((categorias.length + 1) / CATEGORIAS_POR_PAGINA));
      setCategoriaActiva(categoria.id);
      setPaginaProductos(1);
      setNombreCategoria("");
      setIconoCategoria(ICONO_PREDETERMINADO);
      informarExito("Categoría creada");
    } catch (error) {
      informarError("No se pudo crear la categoría", error);
    } finally {
      setOcupado(false);
    }
  }

  async function cambiarCategoria(
    id: string,
    cambio:
      | { nombre: string }
      | { direccion: "subir" | "bajar" }
      | { icono: string }
      | { visible: boolean }
      | { vende: string },
  ) {
    try {
      const respuesta = await solicitarJson<{
        categoria?: CategoriaCatalogo;
        categorias?: CategoriaCatalogo[];
      }>("/api/catalogo/categorias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...cambio }),
      });
      if (respuesta.categorias) setCategorias(respuesta.categorias);
      if (respuesta.categoria) {
        setCategorias((actuales) =>
          actuales.map((categoria) =>
            categoria.id === respuesta.categoria?.id ? respuesta.categoria : categoria,
          ),
        );
      }
      informarExito("Categoría actualizada");
    } catch (error) {
      informarError("No se pudo actualizar la categoría", error);
    }
  }

  function pedirNuevoNombreCategoria(categoria: CategoriaCatalogo) {
    setRenombrando({
      etiqueta: "Nombre de la categoría",
      nombre: categoria.nombre,
      guardar: (nombre) => void cambiarCategoria(categoria.id, { nombre }),
    });
  }

  async function borrarCategoria(categoria: CategoriaCatalogo) {
    const aceptado = await confirmar({
      titulo: `Borrar “${categoria.nombre}”`,
      descripcion: "Sus productos se conservan, pero quedan sin categoría.",
      destructiva: true,
      textoAccion: "Borrar categoría",
    });
    if (!aceptado) return;
    try {
      await solicitarJson<{ eliminado: true }>("/api/catalogo/categorias", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoria.id }),
      });
      setCategorias((actuales) => actuales.filter(({ id }) => id !== categoria.id));
      setSubcategorias((actuales) =>
        actuales.filter(({ categoria_id }) => categoria_id !== categoria.id),
      );
      setProductos((actuales) =>
        actuales.map((producto) =>
          producto.categoria_id === categoria.id
            ? { ...producto, categoria_id: null, subcategoria_id: null }
            : producto,
        ),
      );
      if (categoriaActiva === categoria.id) {
        setCategoriaActiva("");
        setPaginaProductos(1);
      }
      setPaginaCategorias(
        Math.max(1, Math.ceil((categorias.length - 1) / CATEGORIAS_POR_PAGINA)),
      );
      informarExito("Categoría borrada", "Sus productos se conservaron sin categoría.");
    } catch (error) {
      informarError("No se pudo borrar la categoría", error);
    }
  }

  async function crearSubcategoria(categoriaId: string) {
    const nombre = nuevasSubcategorias[categoriaId]?.trim();
    if (!nombre) return;
    try {
      const { subcategoria } = await solicitarJson<{ subcategoria: SubcategoriaCatalogo }>(
        "/api/catalogo/subcategorias",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoria_id: categoriaId, nombre }),
        },
      );
      setSubcategorias((actuales) => [...actuales, subcategoria]);
      setNuevasSubcategorias((actuales) => ({ ...actuales, [categoriaId]: "" }));
      informarExito("Subcategoría creada");
    } catch (error) {
      informarError("No se pudo crear la subcategoría", error);
    }
  }

  async function cambiarSubcategoria(
    subcategoria: SubcategoriaCatalogo,
    cambio: { nombre: string } | { direccion: "subir" | "bajar" },
  ) {
    try {
      const respuesta = await solicitarJson<{
        subcategoria?: SubcategoriaCatalogo;
        subcategorias?: SubcategoriaCatalogo[];
      }>("/api/catalogo/subcategorias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subcategoria.id, ...cambio }),
      });
      if (respuesta.subcategoria) {
        setSubcategorias((actuales) =>
          actuales.map((item) =>
            item.id === respuesta.subcategoria?.id ? respuesta.subcategoria : item,
          ),
        );
      }
      if (respuesta.subcategorias) {
        const ids = new Set(respuesta.subcategorias.map(({ id }) => id));
        setSubcategorias((actuales) => [
          ...actuales.filter(({ id }) => !ids.has(id)),
          ...respuesta.subcategorias!,
        ]);
      }
      informarExito("Subcategoría actualizada");
    } catch (error) {
      informarError("No se pudo actualizar la subcategoría", error);
    }
  }

  function pedirNuevoNombreSubcategoria(subcategoria: SubcategoriaCatalogo) {
    setRenombrando({
      etiqueta: "Nombre de la subcategoría",
      nombre: subcategoria.nombre,
      guardar: (nombre) => void cambiarSubcategoria(subcategoria, { nombre }),
    });
  }

  function confirmarRenombrado(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!renombrando) return;
    const nombre = new FormData(evento.currentTarget).get("nombre")?.toString().trim();
    if (nombre && nombre !== renombrando.nombre) renombrando.guardar(nombre);
    setRenombrando(null);
  }

  async function borrarSubcategoria(subcategoria: SubcategoriaCatalogo) {
    const aceptado = await confirmar({
      titulo: `Borrar “${subcategoria.nombre}”`,
      descripcion: "Sus productos se conservan dentro de la categoría.",
      destructiva: true,
      textoAccion: "Borrar subcategoría",
    });
    if (!aceptado) return;
    try {
      await solicitarJson<{ eliminado: true }>("/api/catalogo/subcategorias", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subcategoria.id }),
      });
      setSubcategorias((actuales) => actuales.filter(({ id }) => id !== subcategoria.id));
      setProductos((actuales) =>
        actuales.map((producto) =>
          producto.subcategoria_id === subcategoria.id
            ? { ...producto, subcategoria_id: null }
            : producto,
        ),
      );
      informarExito("Subcategoría borrada", "Sus productos se conservaron.");
    } catch (error) {
      informarError("No se pudo borrar la subcategoría", error);
    }
  }

  function enfocarFormularioProducto() {
    window.requestAnimationFrame(() => {
      formularioProductoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.requestAnimationFrame(() => document.getElementById("producto-nombre")?.focus());
    });
  }

  function abrirProductoNuevo() {
    setProductoEditando(null);
    setConPresentaciones(false);
    setFormulario({ ...FORMULARIO_VACIO, categoria_id: categoriaActiva });
    setValoresAtributos({});
    setErroresFormulario({});
    setImagenesPendientes([]);
    setFormularioAbierto(true);
    enfocarFormularioProducto();
  }

  function editarProducto(producto: ProductoCatalogo) {
    setProductoEditando(producto.id);
    setConPresentaciones(producto.con_presentaciones === true);
    setFormulario({
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? "",
      precio: String(producto.precio),
      categoria_id: producto.categoria_id ?? "",
      subcategoria_id: producto.subcategoria_id ?? "",
      controla_stock: producto.controla_stock,
      cantidad_stock: producto.cantidad_stock === null ? "" : String(producto.cantidad_stock),
      duracion_minutos:
        producto.duracion_minutos === null ? "" : String(producto.duracion_minutos),
      recurso_id: producto.recurso_id ?? "",
    });
    /* Se leen con las definiciones de **su** categoría: un valor que dejó de
       corresponder —porque el campo se borró o cambió de tipo— se descarta acá y
       no llega al formulario, que si no dibujaría un dato que ya no se puede
       guardar. */
    setValoresAtributos(
      leerValores(
        atributosPorCategoria.get(producto.categoria_id ?? "") ?? [],
        producto.atributos,
      ),
    );
    setErroresFormulario({});
    setImagenesPendientes([]);
    setFormularioAbierto(true);
    enfocarFormularioProducto();
  }

  function cerrarFormulario() {
    setFormularioAbierto(false);
    setProductoEditando(null);
    setErroresFormulario({});
    setImagenesPendientes([]);
  }

  function actualizarCampo<K extends keyof FormularioProducto>(
    campo: K,
    valor: FormularioProducto[K],
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
      ...(campo === "categoria_id" ? { subcategoria_id: "" } : {}),
    }));
    /* Cambiar de categoría cambia qué campos existen, así que los valores de la
       anterior se sueltan. No se conservan «por las dudas»: quedarían invisibles
       en el formulario y se guardarían igual, y el dueño terminaría con un foco
       que arrastra la talla de una remera. */
    if (campo === "categoria_id") setValoresAtributos({});
  }

  function seleccionarCategoria(id: string) {
    setCategoriaActiva(id);
    setPaginaProductos(1);
  }

  /* Presionar la categoría que ya está abierta la cierra. Antes volvía a
     asignarla, o sea que el segundo toque no hacía **nada**: se abría y no había
     forma de cerrarla salvo buscando el botón «Todo», que está en otro lado y no
     se lee como «cerrar esto».
     Va aparte de `seleccionarCategoria` porque esa la llaman el desplegable y
     tres acciones más, donde alternar sería un error: al borrar una categoría se
     quiere ir a «Todo», no conmutar. */
  function alternarCategoria(id: string) {
    seleccionarCategoria(categoriaActiva === id ? "" : id);
  }

  async function cargarArchivosProducto(
    producto: ProductoCatalogo,
    archivos: File[],
    preparados = false,
  ) {
    let fotos = [...producto.fotos];
    for (const archivoOriginal of archivos) {
      setProgreso(`Preparando ${archivoOriginal.name}…`);
      const archivo = preparados
        ? archivoOriginal
        : await prepararImagenParaSubir(archivoOriginal);
      const datos = new FormData();
      datos.append("producto_id", producto.id);
      datos.append("archivo", archivo);
      const { ruta } = await solicitarJson<{ ruta: string }>("/api/catalogo/imagenes", {
        method: "POST",
        body: datos,
      });
      fotos = [...fotos, ruta];
      setProgreso("");
      setProductos((actuales) =>
        actuales.map((item) =>
          item.id === producto.id ? { ...item, fotos } : item,
        ),
      );
    }
    return { ...producto, fotos };
  }

  async function prepararImagenesNuevas(evento: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(evento.target.files ?? []);
    evento.target.value = "";
    if (!archivos.length) return;
    if (imagenesPendientes.length + archivos.length > topeFotos) {
      informarError(
        "Demasiadas fotografías",
        new Error(`Puedes seleccionar ${topeFotos - imagenesPendientes.length} más.`),
      );
      return;
    }

    setOcupado(true);
    try {
      const preparadas: File[] = [];
      for (const archivo of archivos) {
        setProgreso(`Preparando ${archivo.name}…`);
        preparadas.push(await prepararImagenParaSubir(archivo));
      }
      setImagenesPendientes((actuales) => [...actuales, ...preparadas]);
      informarExito(preparadas.length === 1 ? "Fotografía lista" : "Fotografías listas");
    } catch (error) {
      informarError("No se pudieron preparar las fotografías", error);
    } finally {
      setOcupado(false);
    }
  }

  async function guardarProducto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setOcupado(true);
    setErroresFormulario({});
    try {
      const cuerpo = {
        ...(productoEditando ? { id: productoEditando } : {}),
        ...formulario,
        categoria_id: formulario.categoria_id || null,
        subcategoria_id: formulario.subcategoria_id || null,
        atributos: valoresAtributos,
        /* Vacío viaja como nulo y no como cero: cero minutos no es una
           duración, y nulo es lo que la base entiende como «la de mi
           categoría». */
        duracion_minutos: formulario.duracion_minutos.trim() || null,
        recurso_id: formulario.recurso_id || null,
      };
      const { producto } = await solicitarJson<{ producto: ProductoCatalogo }>(
        "/api/catalogo/productos",
        {
          method: productoEditando ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        },
      );
      setProductos((actuales) =>
        productoEditando
          ? actuales.map((item) => (item.id === producto.id ? producto : item))
          : [...actuales, producto],
      );
      let errorImagenes: unknown = null;
      if (!productoEditando && imagenesPendientes.length > 0) {
        try {
          await cargarArchivosProducto(producto, imagenesPendientes, true);
        } catch (error) {
          errorImagenes = error;
        }
      }
      if (!productoEditando) {
        setPaginaProductos(
          Math.max(1, Math.ceil((productosVisibles.length + 1) / PRODUCTOS_POR_PAGINA)),
        );
      }
      cerrarFormulario();
      if (errorImagenes) {
        informarError(
          "Producto creado con una foto pendiente",
          new Error("Una fotografía no se pudo subir. Agrégala desde su ficha."),
        );
      } else {
        informarExito(productoEditando ? "Producto actualizado" : "Producto creado");
      }
    } catch (error) {
      const datos = (error as Error & { datos?: RespuestaError }).datos;
      if (datos?.errores) setErroresFormulario(datos.errores);
      informarError("No se pudo guardar el producto", error);
    } finally {
      setOcupado(false);
    }
  }

  function reemplazarProducto(producto: ProductoCatalogo) {
    setProductos((actuales) =>
      actuales.map((item) => (item.id === producto.id ? producto : item)),
    );
  }

  async function cambiarVisibilidad(producto: ProductoCatalogo) {
    try {
      const respuesta = await solicitarJson<{ producto: ProductoCatalogo }>(
        "/api/catalogo/productos",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: producto.id, visible: !producto.visible }),
        },
      );
      reemplazarProducto(respuesta.producto);
      informarExito(respuesta.producto.visible ? "Producto visible" : "Producto oculto");
    } catch (error) {
      informarError("No se pudo cambiar la visibilidad", error);
    }
  }

  async function borrarProducto(producto: ProductoCatalogo) {
    const aceptado = await confirmar({
      titulo: `Borrar “${producto.nombre}”`,
      /* Ya no dice «no se puede deshacer» porque ahora sí se puede, y decirlo
         asusta de más a quien sólo quiere ordenar su catálogo. */
      descripcion: `Va a la papelera con sus fotografías. Puedes recuperarlo durante ${DIAS_PAPELERA} días.`,
      destructiva: true,
      textoAccion: "Borrar producto",
    });
    if (!aceptado) return;
    try {
      await solicitarJson<{ eliminado: true }>("/api/catalogo/productos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: producto.id }),
      });
      setProductos((actuales) => actuales.filter(({ id }) => id !== producto.id));
      informarExito(
        "Producto borrado",
        `Está en la papelera. Puedes recuperarlo durante ${DIAS_PAPELERA} días.`,
      );
    } catch (error) {
      informarError("No se pudo borrar el producto", error);
    }
  }

  /* El enlace de la ficha vive acá y no en la tarjeta del catálogo: quien
     reparte un producto suelto por WhatsApp es el dueño. En la tarjeta era un
     destino táctil de más, compitiendo con el botón de pedir. */
  async function copiarEnlaceProducto(producto: ProductoCatalogo) {
    const enlace = construirUrlPublicaProducto(
      datosIniciales.negocio.slug,
      producto.codigo,
    );
    try {
      await navigator.clipboard.writeText(enlace);
      informarExito("Enlace copiado", "Pégalo en WhatsApp para compartir este producto.");
    } catch {
      mostrarAviso({
        titulo: "Copia el enlace a mano",
        mensaje: enlace,
        variante: "informacion",
      });
    }
  }

  /* Un toque, sin abrir el formulario. Es lo que un negocio hace varias veces
     al día, y por el camino largo se termina no haciendo: el catálogo miente y
     el cliente pide algo que no hay. */
  async function alternarAgotado(producto: ProductoCatalogo) {
    const agotado = producto.estado !== "agotado";
    try {
      const { producto: actualizado } = await solicitarJson<{ producto: ProductoCatalogo }>(
        "/api/catalogo/productos",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: producto.id, agotado }),
        },
      );
      setProductos((actuales) =>
        actuales.map((item) => (item.id === producto.id ? actualizado : item)),
      );
      informarExito(
        agotado ? "Marcado como agotado" : "Disponible otra vez",
        agotado && producto.controla_stock
          ? "Sus existencias quedaron en cero. Para reponer, edita la cantidad."
          : agotado
            ? "Toca «Hay de nuevo» cuando vuelva a haber."
            : "Ya se puede pedir otra vez.",
      );
    } catch (error) {
      informarError("No se pudo cambiar el estado", error);
    }
  }

  /* Se guarda la fecha de hoy y no un sí/no: la carta se vacía sola a la
     medianoche. Un interruptor que hay que apagar a mano queda encendido, y a
     los tres días la carta «de hoy» miente sobre lo que se está sirviendo. */
  async function alternarCartaDelDia(producto: ProductoCatalogo) {
    const enCarta = !estaEnLaCartaDeHoy(producto.en_carta_hasta);
    try {
      const { producto: actualizado } = await solicitarJson<{ producto: ProductoCatalogo }>(
        "/api/catalogo/productos",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: producto.id, en_carta: enCarta }),
        },
      );
      setProductos((actuales) =>
        actuales.map((item) => (item.id === producto.id ? actualizado : item)),
      );
      informarExito(
        enCarta ? "Está en la carta de hoy" : "Salió de la carta de hoy",
        enCarta
          ? "Aparece primero en tu catálogo. Se quita solo a la medianoche."
          : "Volvió a su categoría de siempre.",
      );
    } catch (error) {
      informarError("No se pudo cambiar la carta del día", error);
    }
  }

  /* Llena el formulario, no guarda. Y respeta lo que el dueño ya haya escrito:
     pisar un nombre que alguien tecleó es la clase de ayuda que se termina
     apagando. */
  /* Devuelve qué pasó con la fotografía para poder contárselo al dueño en el
     mismo aviso. Si el producto todavía no existe queda en espera y se sube al
     guardar; si ya existe, se sube en el momento. */
  async function guardarFotoDelProducto(archivo: File): Promise<string> {
    const producto = productos.find(({ id }) => id === productoEditando);

    if (!productoEditando) {
      if (imagenesPendientes.length >= topeFotos) return "";
      try {
        const preparada = await prepararImagenParaSubir(archivo);
        setImagenesPendientes((actuales) => [...actuales, preparada]);
        return "La foto queda como imagen del producto.";
      } catch {
        return "";
      }
    }

    if (!producto || producto.fotos.length >= topeFotos) return "";
    try {
      await cargarArchivosProducto(producto, [archivo]);
      return "La foto se agregó al producto.";
    } catch {
      /* Los campos ya se completaron: que la foto no suba no convierte la
         lectura en un fracaso, y decirlo como error confundiría. */
      return "";
    }
  }

  async function completarConFoto(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;

    setLeyendoFoto(true);
    try {
      const foto = await prepararFotoParaLectura(archivo);
      const { propuesta } = await solicitarJson<{
        propuesta: {
          nombre: string;
          descripcion: string;
          categoriaId: string | null;
          categoria: string;
          confianza: string;
        };
      }>("/api/ia/producto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: foto.base64, tipo: foto.tipo }),
      });

      /* La categoría la elige el modelo entre las del negocio, o ninguna si no
         corresponde. Crear una categoría nueva desde acá no: eso es una
         decisión de cómo se organiza el catálogo y no la toma una fotografía.
         Se busca igual en la lista de esta pantalla por si alguien la borró
         mientras la foto se leía. */
      const categoriaSugerida = propuesta.categoriaId
        ? categorias.find((categoria) => categoria.id === propuesta.categoriaId)
        : undefined;
      const habiaCategoria = formulario.categoria_id !== "";

      const habiaNombre = formulario.nombre.trim().length > 0;
      const habiaDescripcion = formulario.descripcion.trim().length > 0;

      setFormulario((actual) => ({
        ...actual,
        nombre: actual.nombre.trim() || propuesta.nombre,
        descripcion: actual.descripcion.trim() || propuesta.descripcion,
        categoria_id: actual.categoria_id || categoriaSugerida?.id || "",
      }));

      /* Cuando no pisa nada porque ya había texto, hay que decirlo: si no, el
         botón parece roto. Es el reclamo más probable de alguien que lo toca dos
         veces seguidas y la segunda no ve cambiar nada. */
      const conservado =
        habiaNombre && habiaDescripcion
          ? "Dejamos lo que ya habías escrito. Borra el nombre y la descripción si quieres que los reescriba."
          : habiaNombre
            ? "Conservamos el nombre que ya tenías."
            : habiaDescripcion
              ? "Conservamos la descripción que ya tenías."
              : "";

      /* La misma foto se queda como fotografía del producto. Sacarla dos veces
         —una para que la lea y otra para publicarla— era un paso que no le
         servía a nadie, y el archivo ya está acá. */
      const guardada = await guardarFotoDelProducto(archivo);

      /* Dónde quedó, dicho con el nombre: el selector de categoría está más
         abajo en el formulario y en el teléfono no se ve al mismo tiempo. Si ya
         había una elegida no se toca y no hace falta decir nada. */
      const sobreLaCategoria = habiaCategoria
        ? ""
        : categoriaSugerida
          ? `La pusimos en «${categoriaSugerida.nombre}».`
          : categorias.length
            ? "Ninguna de tus categorías le corresponde: elígela vos."
            : "";

      informarExito(
        habiaNombre && habiaDescripcion ? "No había campos vacíos" : "Campos completados",
        [
          conservado ||
            (propuesta.confianza === "alta"
              ? "Revisa el texto y pon tu precio."
              : "No estamos seguros de qué es. Revisa bien antes de guardar."),
          sobreLaCategoria,
          guardada,
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (error) {
      informarError("No se pudo leer la foto", error);
    } finally {
      setLeyendoFoto(false);
    }
  }

  async function duplicarProducto(producto: ProductoCatalogo) {
    try {
      const { producto: copia, fotosCopiadas } = await solicitarJson<{
        producto: ProductoCatalogo;
        fotosCopiadas: number;
      }>("/api/catalogo/productos/duplicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: producto.id }),
      });
      setProductos((actuales) => [...actuales, copia]);
      /* Se abre la copia para editar en el acto. Antes quedaba al final de la
         lista, oculta y en otra página: el dueño duplicaba y no encontraba nada. */
      editarProducto(copia);
      informarExito(
        "Copia lista para editar",
        fotosCopiadas > 0
          ? `Se copiaron ${fotosCopiadas} fotografía(s). Queda oculta hasta que la publiques.`
          : "Queda oculta hasta que la publiques.",
      );
    } catch (error) {
      informarError("No se pudo duplicar el producto", error);
    }
  }

  async function ajustarPrecios(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const porcentaje = Number(ajustePorcentaje);
    const validacion = validarAjustePrecios({
      porcentaje,
      categoria_id: ajusteCategoria || null,
    });
    if (!validacion.correcto) {
      informarError("Revisa el ajuste", new Error(validacion.error));
      return;
    }

    const nombreCategoria = ajusteCategoria
      ? categorias.find(({ id }) => id === ajusteCategoria)?.nombre
      : null;
    const alcance = nombreCategoria ? `la categoría ${nombreCategoria}` : "todo el catálogo";
    const aceptado = await confirmar({
      titulo: `${porcentaje > 0 ? "Subir" : "Bajar"} ${Math.abs(porcentaje)} % en ${alcance}`,
      descripcion:
        "Cada producto guarda su precio anterior, así que puedes corregirlo uno por uno si algo no cuadra.",
      textoAccion: "Ajustar precios",
    });
    if (!aceptado) return;

    setAjustando(true);
    try {
      const { ajustados } = await solicitarJson<{ ajustados: number; revisados: number }>(
        "/api/catalogo/precios",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validacion.datos),
        },
      );
      setProductos((actuales) =>
        actuales.map((producto) =>
          !ajusteCategoria || producto.categoria_id === ajusteCategoria
            ? {
                ...producto,
                precio_anterior: producto.precio,
                precio: aplicarPorcentaje(Number(producto.precio), porcentaje),
              }
            : producto,
        ),
      );
      setAjustePorcentaje("");
      informarExito(
        "Precios ajustados",
        `${ajustados} producto(s) cambiaron de precio en ${alcance}.`,
      );
    } catch (error) {
      informarError("No se pudieron ajustar los precios", error);
    } finally {
      setAjustando(false);
    }
  }

  async function subirImagenes(producto: ProductoCatalogo, evento: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(evento.target.files ?? []);
    evento.target.value = "";
    if (!archivos.length) return;
    if (producto.fotos.length + archivos.length > topeFotos) {
      informarError("Demasiadas fotografías", new Error(`Este producto admite ${4 - producto.fotos.length} más.`));
      return;
    }
    setOcupado(true);
    try {
      await cargarArchivosProducto(producto, archivos);
      informarExito(archivos.length === 1 ? "Fotografía agregada" : "Fotografías agregadas");
    } catch (error) {
      informarError("No se pudieron subir las fotografías", error);
    } finally {
      setOcupado(false);
    }
  }

  async function borrarImagen(producto: ProductoCatalogo, ruta: string) {
    const aceptado = await confirmar({
      titulo: "Borrar esta fotografía",
      destructiva: true,
      textoAccion: "Borrar fotografía",
    });
    if (!aceptado) return;
    try {
      await solicitarJson<{ eliminado: true }>("/api/catalogo/imagenes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ producto_id: producto.id, ruta }),
      });
      reemplazarProducto({ ...producto, fotos: producto.fotos.filter((foto) => foto !== ruta) });
      informarExito("Fotografía borrada");
    } catch (error) {
      informarError("No se pudo borrar la fotografía", error);
    }
  }

  return (
    <div className={styles.gestor}>
      {progreso ? (
        <p className={styles.progreso} role="status">
          {progreso}
        </p>
      ) : null}

      <HojaModal
        abierta={renombrando !== null}
        onCerrar={() => setRenombrando(null)}
        titulo="Cambiar el nombre"
      >
        <form className={styles.formularioRenombrado} id="form-renombrar" onSubmit={confirmarRenombrado}>
          <Campo
            defaultValue={renombrando?.nombre}
            etiqueta={renombrando?.etiqueta ?? "Nombre"}
            id="nombre-renombrado"
            key={renombrando?.nombre}
            maxLength={60}
            name="nombre"
            required
          />
          <div>
            <Boton onClick={() => setRenombrando(null)} variante="secundario">
              Cancelar
            </Boton>
            <Boton form="form-renombrar" type="submit">
              Guardar nombre
            </Boton>
          </div>
        </form>
      </HojaModal>

      <Trabajando
        abierto={leyendoFoto}
        detalle="Estamos leyendo la foto para completar el nombre y la descripción. Suele tardar unos segundos."
        titulo="Mirando la foto…"
      />

      {formularioAbierto ? (
        <form
          className={styles.formularioProducto}
          onSubmit={guardarProducto}
          ref={formularioProductoRef}
          tabIndex={-1}
        >
          <header className={styles.cabeceraFormulario}>
            <div>
              <h2>{productoEditando ? "Editar producto" : "Nuevo producto"}</h2>
              <p>Los campos obligatorios son el nombre y el precio.</p>
            </div>
            <Boton onClick={cerrarFormulario} variante="discreto">Cerrar</Boton>
          </header>
          {/* Antes de los campos y no después: sirve para empezar, no para
              corregir lo que ya se escribió. El precio se pide igual, porque
              ninguna foto sabe cuánto cobra este negocio. */}
          {ofreceLecturaDeFotos ? (
            <section aria-labelledby="titulo-ia-producto" className={styles.tarjetaIa}>
              <div className={styles.tarjetaIaCuerpo}>
                <span className={styles.selloIa}>Herramienta con IA</span>
                <h3 id="titulo-ia-producto">Completa los campos con una foto del producto</h3>
                <ol className={styles.pasosIa}>
                  <li>
                    <b>1</b> Sacas o eliges la foto del producto
                  </li>
                  <li>
                    <b>2</b> Se completan el nombre y la descripción
                  </li>
                  {/* El tercer paso se dice porque no se ve: la foto queda
                      adjunta sola y quien no lo sabe la vuelve a subir. */}
                  <li>
                    <b>3</b> Esa misma foto queda adjunta abajo
                  </li>
                </ol>
                {/* Con el producto en la mano, sacarle la foto ahí mismo es un paso
                    menos que buscarla en la galería. `capture` abre la cámara de
                    atrás; en una computadora se ignora, y por eso ese botón solo
                    aparece en pantallas táctiles. Las dos gastan una lectura y
                    las dos llevan el degradado que lo avisa. */}
                <div className={styles.accionesIa}>
                  <label className={`${styles.abrirIa} ${styles.soloTactil}`}>
                    {leyendoFoto ? "Mirando la foto…" : "Sacar una foto"}
                    <input
                      accept="image/*"
                      capture="environment"
                      disabled={leyendoFoto}
                      onChange={(evento) => void completarConFoto(evento)}
                      type="file"
                    />
                  </label>
                  <label className={styles.abrirIa}>
                    {leyendoFoto ? "Mirando la foto…" : "Elegir una foto"}
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      disabled={leyendoFoto}
                      onChange={(evento) => void completarConFoto(evento)}
                      type="file"
                    />
                  </label>
                </div>
                <small>{AYUDA_PRODUCTO.advertencia}</small>
                <small>{AVISO_PRIVACIDAD_IA}</small>
              </div>
              {/* Cuántas quedan, en un renglón y pegado al botón que las gasta.
                  Del mes y no del día: el mes es el tope que el negocio tiene
                  contratado —el diario es un reparto interno de la cuota— y es
                  además el único que el dueño puede consultar. Decirle dos
                  números lo obligaría a calcular cuál lo frena antes. */}
              <p className={styles.usosIa}>
                <span>
                  Te quedan <strong>{lecturasQueQuedan}</strong> de {cupoDeLecturas.mensual} lecturas
                  este mes
                </span>
                {/* En cero no se esconde ni se cambia de color: se dice qué pasa
                    después, que es lo único que sirve cuando ya no se puede
                    usar. */}
                {lecturasQueQuedan === 0 ? <small>Vuelven el día 1</small> : null}
              </p>
            </section>
          ) : null}
          <div className={styles.camposProducto}>
            <Campo
              error={erroresFormulario.nombre}
              id="producto-nombre"
              ayuda={textosProducto.ayudaNombre}
              etiqueta="Nombre del producto"
              maxLength={120}
              onChange={(evento) => actualizarCampo("nombre", evento.target.value)}
              placeholder={textosProducto.nombre}
              required
              value={formulario.nombre}
            />
            <Campo
              error={erroresFormulario.precio}
              id="producto-precio"
              ayuda={AYUDA_PRECIO}
              etiqueta="Precio en bolivianos"
              inputMode="decimal"
              min="0"
              onChange={(evento) => actualizarCampo("precio", evento.target.value)}
              placeholder={textosProducto.precio}
              required
              type="number"
              step="0.01"
              value={formulario.precio}
            />
            <AreaTexto
              className={styles.descripcion}
              error={erroresFormulario.descripcion}
              id="producto-descripcion"
              ayuda={textosProducto.ayudaDescripcion}
              etiqueta="Descripción"
              maxLength={1000}
              onChange={(evento) => actualizarCampo("descripcion", evento.target.value)}
              placeholder={textosProducto.descripcion}
              value={formulario.descripcion}
            />
            <Selector
              error={erroresFormulario.categoria_id}
              id="producto-categoria"
              etiqueta="Categoría"
              onChange={(evento) => actualizarCampo("categoria_id", evento.target.value)}
              value={formulario.categoria_id}
            >
              <option value="">Sin categoría</option>
              {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
            </Selector>
            <Selector
              disabled={!formulario.categoria_id}
              error={erroresFormulario.subcategoria_id}
              id="producto-subcategoria"
              etiqueta="Subcategoría"
              onChange={(evento) => actualizarCampo("subcategoria_id", evento.target.value)}
              value={formulario.subcategoria_id}
            >
              <option value="">Sin subcategoría</option>
              {subcategoriasFormulario.map((subcategoria) => <option key={subcategoria.id} value={subcategoria.id}>{subcategoria.nombre}</option>)}
            </Selector>
          </div>
          {/* La duración solo aparece si la categoría vende tiempo: en una
              ferretería no significa nada, y un campo que no aplica es un campo
              que hay que aprender a ignorar. Vacío significa «la de mi
              categoría», que es lo normal. */}
          {categorias.find(({ id }) => id === formulario.categoria_id)?.vende === "tiempo" ? (
            <div className={styles.filaDoble}>
              <Selector
                ayuda={
                  datosIniciales.recursos.length === 0
                    ? "Todavía no cargaste a nadie. Hazlo en Agenda."
                    : "Dos servicios de la misma persona no se pueden dar a la misma hora."
                }
                error={erroresFormulario.recurso_id}
                etiqueta="Quién lo atiende"
                id="producto-recurso"
                onChange={(evento) => actualizarCampo("recurso_id", evento.target.value)}
                value={formulario.recurso_id}
              >
                <option value="">Sin asignar · no se puede agendar</option>
                {datosIniciales.recursos
                  .filter((recurso) => recurso.activo)
                  .map((recurso) => (
                    <option key={recurso.id} value={recurso.id}>
                      {recurso.nombre}
                    </option>
                  ))}
              </Selector>
              <Campo
                /* Se dice el número, no «la que esté configurada»: sin verlo, poner
                   otro es una decisión a ciegas. Con el número delante, dejarlo vacío
                   o cambiarlo son las dos cosas que son. */
                ayuda={
                  duracionDeQuienAtiende
                    ? `Vacío: ${duracionDeQuienAtiende} minutos, que es lo que dura su turno en Cronograma.`
                    : "Vacío: la duración configurada para quien lo atiende."
                }
                error={erroresFormulario.duracion_minutos}
                etiqueta="Cuánto dura (minutos)"
                id="producto-duracion"
                inputMode="numeric"
                onChange={(evento) => actualizarCampo("duracion_minutos", evento.target.value)}
                placeholder="30"
                value={formulario.duracion_minutos}
              />
            </div>
          ) : null}
          {/* Solo con el producto ya creado: las presentaciones necesitan su
              identificador para guardarse, y pedirlas antes obligaría a
              mantener dos caminos de guardado para lo mismo. */}
          {productoEditando ? (
            <EditorDeVariantes
              alGuardar={(cantidad) => setConPresentaciones(cantidad > 0)}
              controlaStock={formulario.controla_stock}
              precioProducto={Number(formulario.precio) || 0}
              productoId={productoEditando}
              vendeTiempo={
                categorias.find(({ id }) => id === formulario.categoria_id)?.vende === "tiempo"
              }
            />
          ) : null}
          <CamposDeProducto
            alCambiar={(clave, valor) =>
              setValoresAtributos((actuales) => {
                const siguientes = { ...actuales };
                /* Se borra la llave en vez de guardar vacío: así lo que está en
                   el objeto es lo que de verdad está cargado, que es lo que
                   cuenta el aviso al borrar un campo. */
                if (valor === null || valor === "") delete siguientes[clave];
                else siguientes[clave] = valor;
                return siguientes;
              })
            }
            atributos={atributosDelFormulario}
            errores={erroresFormulario}
            guia={guiaProducto}
            valores={valoresAtributos}
          />
          <label className={styles.opcionStock}>
            <input
              checked={formulario.controla_stock}
              onChange={(evento) => actualizarCampo("controla_stock", evento.target.checked)}
              type="checkbox"
            />
            <span>
              <strong>Controlar existencias</strong>
              <small>El producto se marcará como agotado cuando llegue a cero.</small>
            </span>
          </label>
          {formulario.controla_stock && conPresentaciones ? (
            <p className={styles.notaExistencias}>
              Las existencias de este producto se cargan en cada presentación, más abajo.
            </p>
          ) : formulario.controla_stock ? (
            <Campo
              error={erroresFormulario.cantidad_stock}
              id="producto-stock"
              etiqueta="Cantidad disponible"
              inputMode="numeric"
              min="0"
              onChange={(evento) => actualizarCampo("cantidad_stock", evento.target.value)}
              required
              type="number"
              value={formulario.cantidad_stock}
            />
          ) : null}
          {/* Editando, las fotografías del producto, con las que ya tiene.
              Este bloque **no existía**: el formulario de edición escondía las
              fotos y solo se podían tocar desde la lista, abriendo la miniatura.
              Quien entraba a «Editar» daba por hecho que ahí estaba todo lo del
              producto, no encontraba las fotos, y concluía que no se podían
              cambiar. El dueño lo reportó así.

              Sube y borra contra el producto guardado —que existe, porque se lo
              está editando— con las mismas funciones que usa la lista. */}
          {productoEnEdicion ? (
            <section className={styles.imagenesFormulario} aria-labelledby="fotos-producto-editado">
              <div>
                <h3 id="fotos-producto-editado">Fotografías</h3>
                <p>
                  {productoEnEdicion.fotos.length} de {topeFotos}. Se optimizan
                  antes de subirlas.
                </p>
              </div>
              {productoEnEdicion.fotos.length ? (
                <div className={styles.fotos}>
                  {productoEnEdicion.fotos.map((ruta, indice) => (
                    <div className={styles.foto} key={ruta}>
                      <Image
                        alt={`${productoEnEdicion.nombre}, fotografía ${indice + 1}`}
                        fill
                        sizes="96px"
                        src={obtenerUrlPublicaImagenProducto(urlSupabase, ruta)}
                      />
                      <button
                        aria-label={`Borrar fotografía ${indice + 1} de ${productoEnEdicion.nombre}`}
                        onClick={() => void borrarImagen(productoEnEdicion, ruta)}
                        type="button"
                      >
                        Borrar
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <label className={styles.botonFoto}>
                Agregar fotos
                <input
                  accept="image/jpeg,image/png,image/webp"
                  disabled={ocupado || productoEnEdicion.fotos.length >= topeFotos}
                  multiple
                  onChange={(evento) => void subirImagenes(productoEnEdicion, evento)}
                  type="file"
                />
              </label>
            </section>
          ) : (
            <section className={styles.imagenesFormulario} aria-labelledby="fotos-nuevo-producto">
              <div>
                <h3 id="fotos-nuevo-producto">Fotografías</h3>
                <p>Selecciona hasta {topeFotos}. Se optimizan antes de subirlas.</p>
              </div>
              <label className={styles.botonFoto}>
                Seleccionar fotografías
                <input
                  accept="image/jpeg,image/png,image/webp"
                  disabled={ocupado || imagenesPendientes.length >= topeFotos}
                  multiple
                  onChange={(evento) => void prepararImagenesNuevas(evento)}
                  type="file"
                />
              </label>
              {imagenesPendientes.length ? (
                <ul className={styles.archivosPendientes}>
                  {imagenesPendientes.map((archivo, indice) => (
                    <li key={`${archivo.name}-${archivo.lastModified}-${indice}`}>
                      {/* La miniatura y no solo el texto «lista»: probándolo, una
                          persona creyó que tenía que volver a subir la foto que
                          la herramienta acababa de leer, porque no la veía. */}
                      {previasPendientes[indice] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className={styles.miniatura} src={previasPendientes[indice]} />
                      ) : null}
                      <span>Fotografía {indice + 1} lista</span>
                      <button
                        aria-label={`Quitar fotografía ${indice + 1}`}
                        onClick={() =>
                          setImagenesPendientes((actuales) =>
                            actuales.filter((_, posicion) => posicion !== indice),
                          )
                        }
                        type="button"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <small className={styles.ayudaCampo}>{AYUDA_FOTO_PRODUCTO}</small>
              {/* Cuánto ocupan las fotos del negocio, y el aviso antes del
                  tope: llegar sin saberlo es encontrarse con una foto que no
                  sube en el peor momento. */}
              {datosIniciales.espacioUsado !== null ? (
                <small
                  className={
                    nivelDeEspacio(datosIniciales.espacioUsado) === "holgado"
                      ? styles.ayudaCampo
                      : styles.avisoEspacio
                  }
                >
                  Espacio de fotos del negocio: {describirEspacio(datosIniciales.espacioUsado)}.
                  {nivelDeEspacio(datosIniciales.espacioUsado) === "lleno"
                    ? ` ${MENSAJE_SIN_ESPACIO}`
                    : nivelDeEspacio(datosIniciales.espacioUsado) === "poco"
                      ? ` ${MENSAJE_POCO_ESPACIO}`
                      : ""}
                </small>
              ) : null}
              <small>
                {imagenesPendientes.length} de {topeFotos} fotografías seleccionadas
              </small>
            </section>
          )}
          <div className={styles.accionesFormulario}>
            <Boton cargando={ocupado} type="submit">
              {productoEditando ? "Guardar cambios" : "Crear producto"}
            </Boton>
            <Boton disabled={ocupado} onClick={cerrarFormulario} variante="secundario">Cancelar</Boton>
          </div>
        </form>
      ) : null}

      {/* Buscar, filtrar y crear van juntos y arriba de todo: es lo que se hace
          todos los días. El filtro por categoría es un desplegable y no la lista
          de categorías: acá se viene a trabajar sobre productos, y administrar
          las categorías es otra pantalla. */}
      {vista === "productos" ? (
        <section className={styles.barraCatalogo} aria-label="Buscar productos">
          <div className={styles.buscadorProductos}>
            <label htmlFor="buscar-producto">Buscar producto</label>
            <input
              autoComplete="off"
              id="buscar-producto"
              onChange={(evento) => {
                setBusquedaProductos(evento.target.value);
                setPaginaProductos(1);
              }}
              placeholder="Nombre, descripción o código"
              type="search"
              value={busquedaProductos}
            />
          </div>
          <div className={styles.filtrosCatalogo}>
            <label htmlFor="filtrar-categoria">
              Categoría
              <select
                id="filtrar-categoria"
                onChange={(evento) => seleccionarCategoria(evento.target.value)}
                value={categoriaActiva}
              >
                <option value="">Todas</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.chipsEstado} role="group" aria-label="Estado de publicación">
              {(
                [
                  ["todos", `Todos (${productos.length})`],
                  ["visibles", `Publicados (${productos.length - ocultos})`],
                  ["ocultos", `Ocultos (${ocultos})`],
                ] as const
              ).map(([valor, etiqueta]) => (
                <button
                  aria-pressed={filtroEstado === valor}
                  className={filtroEstado === valor ? styles.chipActivo : styles.chip}
                  key={valor}
                  onClick={() => {
                    setFiltroEstado(valor);
                    setPaginaProductos(1);
                  }}
                  type="button"
                >
                  {etiqueta}
                </button>
              ))}
            </div>
            <Boton
              aria-describedby={productosLlenos ? "aviso-tope-productos" : undefined}
              disabled={productosLlenos}
              onClick={abrirProductoNuevo}
            >
              Crear producto
            </Boton>
            {productosLlenos ? (
              <p className={styles.avisoEspacio} id="aviso-tope-productos">
                {mensajeLimiteProductos(datosIniciales.negocio.plan_id)}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className={styles.columnas}>
        {/* Era un panel plegado arriba de la lista de productos, y se leía como
            un recuadro con una leyenda adentro: casi nadie descubría que se
            abría. Ahora es la pantalla entera, así que no hay nada que abrir. */}
        {vista === "categorias" ? (
          <section aria-labelledby="titulo-categorias" className={styles.organizacion}>
            <div className={styles.tituloOrganizacion}>
              <h2 id="titulo-categorias">Tus categorías</h2>
              <small>{categorias.length} de 40 creadas</small>
            </div>
            <form className={styles.nuevaCategoria} onSubmit={crearCategoria}>
              <label htmlFor="nueva-categoria">Nueva categoría</label>
              <small className={styles.ayudaCampo}>{ayudaCategoria(datosIniciales.negocio)}</small>
              <div>
                <input
                  id="nueva-categoria"
                  maxLength={80}
                  onChange={(evento) => setNombreCategoria(evento.target.value)}
                  placeholder={ejemploDeCategoria(datosIniciales.negocio)}
                  required
                  value={nombreCategoria}
                />
                <Boton cargando={ocupado} type="submit">Crear categoría</Boton>
              </div>
              <SelectorDeIcono
                alElegir={setIconoCategoria}
                etiqueta="Su ícono"
                rubro={datosIniciales.negocio.rubro}
                valor={iconoCategoria}
              />
            </form>
            <div className={styles.listaCategorias}>
              {categoriasPaginadas.map((categoria) => {
                const subcategoriasDeCategoria = subcategorias
                  .filter((item) => item.categoria_id === categoria.id)
                  .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
                const cantidadProductos = productos.filter(
                  (producto) => producto.categoria_id === categoria.id,
                ).length;
                return (
                  <section className={styles.categoria} key={categoria.id}>
                    {/* El galón dice que acá hay algo que se abre, y girando dice si
                        está abierto. Sin él esto se leía como un filtro —se presiona y
                        aparecen opciones abajo sin que nada lo hubiera anunciado—.
                        `aria-expanded` cuenta lo mismo a quien no lo ve. */}
                    <button
                      aria-expanded={categoriaActiva === categoria.id}
                      className={categoriaActiva === categoria.id ? styles.filtroActivo : styles.filtro}
                      onClick={() => alternarCategoria(categoria.id)}
                      type="button"
                    >
                      <IconoCatalogo nombre={categoria.icono} />
                      <span className={styles.nombreCategoria}>{categoria.nombre}</span>
                      <span>{cantidadProductos}</span>
                      <Icono className={styles.flechaCategoria} nombre="flechaArriba" />
                    </button>
                    <div className={styles.accionesPequenas} aria-label={`Acciones para ${categoria.nombre}`}>
                      {/* El orden lo decide el dueño, no la siembra. La ruta y la
                          función ya lo sabían hacer —las subcategorías se mueven
                          desde hace tiempo— y a las categorías les faltaban los
                          dos botones. El catálogo mostraba «Postres» antes que el
                          plato de la casa porque así vino la plantilla, y no
                          había forma de cambiarlo. */}
                      <button
                        aria-label={`Subir ${categoria.nombre}`}
                        disabled={categorias[0]?.id === categoria.id}
                        onClick={() => void cambiarCategoria(categoria.id, { direccion: "subir" })}
                        type="button"
                      >
                        <Icono nombre="flechaArriba" /> Subir
                      </button>
                      <button
                        aria-label={`Bajar ${categoria.nombre}`}
                        disabled={categorias[categorias.length - 1]?.id === categoria.id}
                        onClick={() => void cambiarCategoria(categoria.id, { direccion: "bajar" })}
                        type="button"
                      >
                        <Icono nombre="flechaAbajo" /> Bajar
                      </button>
                      <button onClick={() => pedirNuevoNombreCategoria(categoria)} type="button">Cambiar nombre</button>
                      <button onClick={() => void borrarCategoria(categoria)} type="button">Eliminar categoría</button>
                    </div>
                    {/* La identidad se edita con la categoría abierta y no en una
                        pantalla aparte: el ícono y la esfera son de esta categoría
                        y se entienden mirándola, no en una lista de ajustes. */}
                    {categoriaActiva === categoria.id ? (
                      <div className={styles.identidadCategoria}>
                        <SelectorDeIcono
                          alElegir={(icono) => void cambiarCategoria(categoria.id, { icono })}
                          rubro={datosIniciales.negocio.rubro}
                          valor={categoria.icono}
                        />
                        <label className={styles.interruptor}>
                          <input
                            checked={categoria.visible}
                            onChange={(evento) =>
                              void cambiarCategoria(categoria.id, {
                                visible: evento.target.checked,
                              })
                            }
                            type="checkbox"
                          />
                          <span>Mostrar su esfera en el catálogo</span>
                          {/* Se aclara qué **no** hace, porque «ocultar» se lee
                              como «esconder la mercadería» y no es eso. */}
                          <small>Apagarla no esconde sus productos.</small>
                        </label>

                        {/* Quedó fuera de la fase 1 a propósito: elegir «tiempo»
                            no hacía nada hasta que existiera la agenda, y un
                            interruptor que no cambia nada enseña que los
                            controles no sirven. Ahora enciende el editor de
                            horarios que está debajo. */}
                        <label className={styles.campoVende}>
                          <span>Qué vende esta categoría</span>
                          <select
                            onChange={(evento) =>
                              void cambiarCategoria(categoria.id, { vende: evento.target.value })
                            }
                            value={categoria.vende}
                          >
                            {DEFINICIONES_FORMAS_DE_VENDER.map((forma) => (
                              <option key={forma.id} value={forma.id}>
                                {forma.nombre}
                              </option>
                            ))}
                          </select>
                          <small>
                            {DEFINICIONES_FORMAS_DE_VENDER.find(
                              (forma) => forma.id === categoria.vende,
                            )?.descripcion}
                          </small>
                        </label>
                      </div>
                    ) : null}
                    {/* El horario ya no se configura acá: es del recurso —el doctor,
                        el peluquero— y no de la categoría, y vive en la pantalla
                        de Agenda. Se deja el camino a la vista para que el dueño
                        no lo busque adentro de la categoría, que es donde estaba. */}
                    {categoriaActiva === categoria.id && categoria.vende === "tiempo" ? (
                      <p className={styles.avisoAgenda}>
                        Los horarios se configuran en <Link href={RUTAS_PANEL.pedidos}>Pedidos y citas</Link>,
                        por cada persona o consultorio que atiende. Después, en cada servicio,
                        eliges quién lo atiende.
                      </p>
                    ) : null}
                    {categoriaActiva === categoria.id ? (
                      <EditorDeCampos
                        categoriaId={categoria.id}
                        categoriaNombre={categoria.nombre}
                        guia={guiaDelNegocio(datosIniciales.negocio, categoria.nombre)}
                      />
                    ) : null}
                    {categoriaActiva === categoria.id ? <div className={styles.subcategorias}>
                      {subcategoriasDeCategoria.map((subcategoria, subindice) => (
                        <div className={styles.subcategoria} key={subcategoria.id}>
                          <span>{subcategoria.nombre}</span>
                          <div>
                            <button aria-label={`Subir ${subcategoria.nombre}`} disabled={subindice === 0} onClick={() => void cambiarSubcategoria(subcategoria, { direccion: "subir" })} type="button">↑</button>
                            <button aria-label={`Bajar ${subcategoria.nombre}`} disabled={subindice === subcategoriasDeCategoria.length - 1} onClick={() => void cambiarSubcategoria(subcategoria, { direccion: "bajar" })} type="button">↓</button>
                            <button aria-label={`Cambiar nombre de ${subcategoria.nombre}`} onClick={() => pedirNuevoNombreSubcategoria(subcategoria)} type="button">Cambiar nombre</button>
                            <button aria-label={`Eliminar ${subcategoria.nombre}`} onClick={() => void borrarSubcategoria(subcategoria)} type="button">Eliminar</button>
                          </div>
                        </div>
                      ))}
                      <div className={styles.nuevaSubcategoria}>
                        <input
                          aria-label={`Nueva subcategoría de ${categoria.nombre}`}
                          maxLength={80}
                          onChange={(evento) => setNuevasSubcategorias((actuales) => ({ ...actuales, [categoria.id]: evento.target.value }))}
                          placeholder="Nueva subcategoría"
                          value={nuevasSubcategorias[categoria.id] ?? ""}
                        />
                        <button onClick={() => void crearSubcategoria(categoria.id)} type="button">Crear subcategoría</button>
                      </div>
                    </div> : null}
                  </section>
                );
              })}
            </div>
            {totalPaginasCategorias > 1 ? (
              <nav className={styles.paginacion} aria-label="Páginas de categorías">
                <button
                  disabled={paginaCategoriasActual === 1}
                  onClick={() => {
                    setPaginaCategorias((pagina) => Math.max(1, pagina - 1));
                    seleccionarCategoria("");
                  }}
                  type="button"
                >
                  Anterior
                </button>
                <span>Página {paginaCategoriasActual} de {totalPaginasCategorias}</span>
                <button
                  disabled={paginaCategoriasActual === totalPaginasCategorias}
                  onClick={() => {
                    setPaginaCategorias((pagina) => Math.min(totalPaginasCategorias, pagina + 1));
                    seleccionarCategoria("");
                  }}
                  type="button"
                >
                  Siguiente
                </button>
              </nav>
            ) : null}
          </section>
        ) : null}

        {vista === "productos" ? (
          <section className={styles.productos} aria-labelledby="titulo-productos">
            <div className={styles.tituloProductos}>
              <div>
                <h2 id="titulo-productos">
                  {categoriaActiva
                    ? categorias.find(({ id }) => id === categoriaActiva)?.nombre
                    : "Todos los productos"}
                </h2>
                <p>
                  {productosVisibles.length} de {productos.length} producto(s)
                  {busquedaProductos.trim() ? ` para «${busquedaProductos.trim()}»` : ""}
                </p>
                <p>
                  Tu plan {plan.nombre}: {productos.length} de {plan.topes.productos} productos,
                  hasta {topeFotos} fotos en cada uno.
                </p>
              </div>
            </div>

            {/* Ajustar precios de a uno sobre trescientos productos es lo que hace
                que un catálogo quede desactualizado. Va acá arriba y no escondido
                en otra pantalla porque con inflación se usa varias veces al año. */}
            {/* Plegado por omisión: se usa unas pocas veces al año —cuando cambian los
                precios— y desplegado ocupaba la mitad de la pantalla de productos todos
                los días. El resumen dice de una qué hace, así que no hace falta abrirlo
                para saber si es lo que se busca. */}
            {productos.length > 0 ? (
              <details className={styles.ajustePrecios}>
                <summary className={styles.resumenAjuste}>
                  <span className={styles.tituloAjuste}>
                    <strong>
                      <span aria-hidden="true">⚠</span> Cambiar precios
                    </strong>
                    <small>
                      Sube o baja de una vez el precio de todo tu catálogo o de una categoría.
                    </small>
                  </span>
                  <Icono className={styles.flechaAjuste} nombre="flechaArriba" />
                </summary>
                <form className={styles.formularioAjuste} onSubmit={ajustarPrecios}>
                {/* Se dice qué **no** es, y no por capricho: al lado existe
                    «Promociones», que baja un precio con fecha de vencimiento y lo
                    devuelve solo. Sin esta línea, un dueño sube todos sus precios
                    creyendo que el domingo vuelven como estaban. */}
                <p className={styles.avisoAjuste}>
                  <strong>Reescribe el precio guardado y no vence.</strong> No es una oferta:
                  para un descuento con fecha, usa Promociones. Cada producto guarda su precio
                  anterior, así que se puede corregir uno por uno.
                </p>
                <div className={styles.controlesAjuste}>
                  <label htmlFor="ajuste-alcance">
                    Qué ajustar
                    <select
                      id="ajuste-alcance"
                      onChange={(evento) => setAjusteCategoria(evento.target.value)}
                      value={ajusteCategoria}
                    >
                      <option value="">Todo el catálogo</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="ajuste-porcentaje">
                    Porcentaje
                    <input
                      id="ajuste-porcentaje"
                      inputMode="decimal"
                      max={AJUSTE_MAXIMO}
                      min={AJUSTE_MINIMO}
                      onChange={(evento) => setAjustePorcentaje(evento.target.value)}
                      placeholder="10"
                      step="0.1"
                      type="number"
                      value={ajustePorcentaje}
                    />
                  </label>
                  <Boton cargando={ajustando} disabled={!ajustePorcentaje} type="submit">
                    Aplicar
                  </Boton>
                </div>
                <p className={styles.ayudaAjuste}>
                  Escribe <strong>10</strong> para subir un 10 % o <strong>-10</strong> para
                  bajarlo. Ningún precio queda en cero.
                </p>
                </form>
              </details>
            ) : null}

            {productosVisibles.length === 0 ? (
              <EstadoVacio
                accion={
                  productos.length === 0 ? (
                    <Boton onClick={abrirProductoNuevo}>Crear el primer producto</Boton>
                  ) : (
                    <Boton
                      onClick={() => {
                        setBusquedaProductos("");
                        setFiltroEstado("todos");
                        seleccionarCategoria("");
                      }}
                      variante="secundario"
                    >
                      Quitar los filtros
                    </Boton>
                  )
                }
                descripcion={
                  productos.length === 0
                    ? "Empieza por el primero."
                    : "Prueba con otra palabra o quita los filtros."
                }
                titulo={
                  productos.length === 0
                    ? "Todavía no cargaste productos"
                    : "Ningún producto coincide"
                }
              />
            ) : (
              <ul className={styles.listaProductos}>
                {productosPaginados.map((producto) => (
                  <li className={styles.producto} key={producto.id}>
                    {/* La miniatura es un botón: abre las demás fotos.
                        Antes la tarjeta mostraba todas las fotografías en una
                        fila que se desplazaba, y en un teléfono eso era media
                        pantalla por producto: para ver diez productos había que
                        recorrer diez tiras de fotos que casi nunca se miran.
                        Ahora se ve una, con la cuenta de las que hay detrás, y
                        se abren solo cuando se las busca. */}
                    <button
                      aria-expanded={fotosAbiertas === producto.id}
                      aria-label={
                        producto.fotos.length
                          ? `Fotografías de ${producto.nombre} (${producto.fotos.length})`
                          : `Agregar una fotografía a ${producto.nombre}`
                      }
                      className={styles.miniaturaProducto}
                      onClick={() =>
                        setFotosAbiertas((abierto) => (abierto === producto.id ? null : producto.id))
                      }
                      type="button"
                    >
                      {producto.fotos.length ? (
                        <Image
                          alt=""
                          fill
                          sizes="64px"
                          src={obtenerUrlPublicaImagenProducto(urlSupabase, producto.fotos[0])}
                        />
                      ) : (
                        <span className={styles.sinFotoMini}>Sin foto</span>
                      )}
                      {/* La seña de que hay más. Sin esto, la tarjeta de un
                          producto con seis fotos y la de uno con una se ven
                          iguales, y nadie abre lo que no sabe que existe. */}
                      {producto.fotos.length - 1 > 0 ? (
                        <span aria-hidden="true" className={styles.masFotos}>
                          +{producto.fotos.length - 1}
                        </span>
                      ) : null}
                    </button>

                    <div className={styles.datosProducto}>
                      <div className={styles.nombreProducto}>
                        <h3>{producto.nombre}</h3>
                        {producto.visible ? null : <IndicadorEstado estado="oculto" />}
                        {producto.estado === "disponible" ? null : (
                          <IndicadorEstado estado={producto.estado as EstadoProducto} />
                        )}
                      </div>
                      <strong>{formatearPrecioBolivianos(Number(producto.precio))}</strong>
                      <small>
                        {producto.codigo}
                        {" · "}
                        {producto.controla_stock && producto.con_presentaciones
                          ? "Existencias por presentación"
                          : producto.controla_stock
                            ? `${Math.max(0, (producto.cantidad_stock ?? 0) - producto.cantidad_reservada)} de ${producto.cantidad_stock ?? 0} disponible(s), ${producto.cantidad_reservada} reservada(s)`
                            : "Sin control de existencias"}
                      </small>
                      {producto.precio_anterior !== null && producto.precio_actualizado_en ? (
                        <small className={styles.auditoriaPrecio}>
                          Precio anterior: {formatearPrecioBolivianos(Number(producto.precio_anterior))}. Actualizado {producto.precio_actualizado_por ? "por tu cuenta" : "por administración de MiPuesto"} el {FORMATEADOR_CAMBIO_PRECIO.format(new Date(producto.precio_actualizado_en))}
                        </small>
                      ) : null}
                    </div>

                    {/* A la derecha y en dos escalones: «Editar», que es lo que
                        se toca, y el resto detrás de un menú.
                        Estaban los siete botones a la vista, y en un teléfono se
                        envolvían en tres renglones que hacían la tarjeta más
                        alta que el producto. Siete botones del mismo tamaño
                        tampoco dicen cuál es el importante. */}
                    <div className={styles.mandosProducto}>
                      <Boton onClick={() => editarProducto(producto)} variante="secundario">
                        Editar
                      </Boton>

                      <details className={styles.masOpciones}>
                        <summary>Más</summary>
                        <div className={styles.accionesProducto}>
                          {producto.estado !== "agotado" || !producto.controla_stock ? (
                            <Boton onClick={() => void alternarAgotado(producto)} variante="discreto">
                              {producto.estado === "agotado" ? "Hay de nuevo" : "Agotado"}
                            </Boton>
                          ) : null}
                          {ofreceCartaDelDia ? (
                            <Boton
                              onClick={() => void alternarCartaDelDia(producto)}
                              variante="discreto"
                            >
                              {estaEnLaCartaDeHoy(producto.en_carta_hasta)
                                ? "Sacar de hoy"
                                : "Poner en hoy"}
                            </Boton>
                          ) : null}
                          <Boton onClick={() => void cambiarVisibilidad(producto)} variante="discreto">
                            {producto.visible ? "Ocultar" : "Mostrar"}
                          </Boton>
                          <Boton onClick={() => void duplicarProducto(producto)} variante="discreto">
                            Duplicar
                          </Boton>
                          <Boton
                            onClick={() => void copiarEnlaceProducto(producto)}
                            variante="discreto"
                          >
                            Copiar enlace
                          </Boton>
                          <Boton onClick={() => void borrarProducto(producto)} variante="peligro">
                            Borrar
                          </Boton>
                        </div>
                      </details>
                    </div>

                    {/* La tira ocupa el ancho entero y va debajo de las tres
                        columnas: es lo único de la tarjeta que a veces necesita
                        sitio, y dárselo abajo no angosta lo de arriba. */}
                    {fotosAbiertas === producto.id ? (
                      <div className={styles.tiraFotos}>
                        <div className={styles.fotos}>
                          {producto.fotos.map((ruta, indice) => (
                            <div className={styles.foto} key={ruta}>
                              <Image
                                alt={`${producto.nombre}, fotografía ${indice + 1}`}
                                fill
                                sizes="96px"
                                src={obtenerUrlPublicaImagenProducto(urlSupabase, ruta)}
                              />
                              <button
                                aria-label={`Borrar fotografía ${indice + 1} de ${producto.nombre}`}
                                onClick={() => void borrarImagen(producto, ruta)}
                                type="button"
                              >
                                Borrar
                              </button>
                            </div>
                          ))}
                          <label className={styles.botonFoto}>
                            Agregar fotos
                            <input
                              accept="image/jpeg,image/png,image/webp"
                              disabled={ocupado || producto.fotos.length >= topeFotos}
                              multiple
                              onChange={(evento) => void subirImagenes(producto, evento)}
                              type="file"
                            />
                          </label>
                        </div>
                        <small>
                          {producto.fotos.length} de {topeFotos} fotografías
                        </small>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {totalPaginasProductos > 1 ? (
              <nav className={styles.paginacionProductos} aria-label="Páginas de productos">
                <button
                  disabled={paginaProductosActual === 1}
                  onClick={() => setPaginaProductos((actual) => Math.max(1, actual - 1))}
                  type="button"
                >
                  Anterior
                </button>
                <span>Página {paginaProductosActual} de {totalPaginasProductos}</span>
                <button
                  disabled={paginaProductosActual === totalPaginasProductos}
                  onClick={() =>
                    setPaginaProductos((actual) =>
                      Math.min(totalPaginasProductos, actual + 1),
                    )
                  }
                  type="button"
                >
                  Siguiente
                </button>
              </nav>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
