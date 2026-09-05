"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useRef, useState } from "react";

import { obtenerUrlPublicaImagenProducto } from "../../lib/catalogo/imagenes-publicas";
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
  useAvisos,
  useConfirmacion,
} from "../ui";
import styles from "./gestor-catalogo.module.css";

/* Buscar sin tildes ni mayúsculas: quien escribe "cafe" en el panel espera
   encontrar "Café", igual que en el catálogo público. */
function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const FORMATEADOR_CAMBIO_PRECIO = new Intl.DateTimeFormat("es-BO", {
  timeZone: "America/La_Paz",
  dateStyle: "medium",
  timeStyle: "short",
});

type PropiedadesGestorCatalogo = {
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
};

const CATEGORIAS_POR_PAGINA = 5;
const PRODUCTOS_POR_PAGINA = 10;

async function solicitarJson<T>(ruta: string, opciones: RequestInit) {
  const respuesta = await fetch(ruta, opciones);
  const datos = (await respuesta.json().catch(() => ({}))) as RespuestaError & T;
  if (!respuesta.ok) throw Object.assign(new Error(datos.error || "No se pudo completar la acción."), { datos });
  return datos;
}

export function GestorCatalogo({ datosIniciales, urlSupabase }: PropiedadesGestorCatalogo) {
  const [categorias, setCategorias] = useState(datosIniciales.categorias);
  const [subcategorias, setSubcategorias] = useState(datosIniciales.subcategorias);
  const [productos, setProductos] = useState(datosIniciales.productos);
  const [categoriaActiva, setCategoriaActiva] = useState("");
  const [paginaCategorias, setPaginaCategorias] = useState(1);
  const [paginaProductos, setPaginaProductos] = useState(1);
  const [nombreCategoria, setNombreCategoria] = useState("");
  const [nuevasSubcategorias, setNuevasSubcategorias] = useState<Record<string, string>>({});
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const { mostrarAviso } = useAvisos();
  const confirmar = useConfirmacion();
  const [productoEditando, setProductoEditando] = useState<string | null>(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [imagenesPendientes, setImagenesPendientes] = useState<File[]>([]);
  const [erroresFormulario, setErroresFormulario] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
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
  const subcategoriasFormulario = subcategorias.filter(
    (subcategoria) => subcategoria.categoria_id === formulario.categoria_id,
  );
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
          body: JSON.stringify({ nombre: nombreCategoria }),
        },
      );
      setCategorias((actuales) => [...actuales, categoria]);
      setPaginaCategorias(Math.ceil((categorias.length + 1) / CATEGORIAS_POR_PAGINA));
      setCategoriaActiva(categoria.id);
      setPaginaProductos(1);
      setNombreCategoria("");
      informarExito("Categoría creada");
    } catch (error) {
      informarError("No se pudo crear la categoría", error);
    } finally {
      setOcupado(false);
    }
  }

  async function cambiarCategoria(
    id: string,
    cambio: { nombre: string } | { direccion: "subir" | "bajar" },
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
    setFormulario({ ...FORMULARIO_VACIO, categoria_id: categoriaActiva });
    setErroresFormulario({});
    setImagenesPendientes([]);
    setFormularioAbierto(true);
    enfocarFormularioProducto();
  }

  function editarProducto(producto: ProductoCatalogo) {
    setProductoEditando(producto.id);
    setFormulario({
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? "",
      precio: String(producto.precio),
      categoria_id: producto.categoria_id ?? "",
      subcategoria_id: producto.subcategoria_id ?? "",
      controla_stock: producto.controla_stock,
      cantidad_stock: producto.cantidad_stock === null ? "" : String(producto.cantidad_stock),
    });
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
  }

  function seleccionarCategoria(id: string) {
    setCategoriaActiva(id);
    setPaginaProductos(1);
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
    if (imagenesPendientes.length + archivos.length > 4) {
      informarError(
        "Demasiadas fotografías",
        new Error(`Puedes seleccionar ${4 - imagenesPendientes.length} más.`),
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
      descripcion: "Se borran también sus fotografías. No se puede deshacer.",
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
      informarExito("Producto borrado", "También borramos sus fotografías.");
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
      informarExito("Enlace copiado", "Pegalo en WhatsApp para compartir este producto.");
    } catch {
      mostrarAviso({
        titulo: "Copiá el enlace a mano",
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
        agotado ? "Marcado como agotado" : "Vuelve a estar disponible",
        agotado && producto.controla_stock
          ? "Sus existencias quedaron en cero. Para reponer, editá la cantidad."
          : agotado
            ? "Tocá «Hay de nuevo» cuando vuelva a haber."
            : "Ya se puede pedir otra vez.",
      );
    } catch (error) {
      informarError("No se pudo cambiar el estado", error);
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
        "Cada producto guarda su precio anterior, así que podés corregirlo uno por uno si algo no cuadra.",
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
    if (producto.fotos.length + archivos.length > 4) {
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
          <div className={styles.camposProducto}>
            <Campo
              error={erroresFormulario.nombre}
              id="producto-nombre"
              etiqueta="Nombre del producto"
              maxLength={120}
              onChange={(evento) => actualizarCampo("nombre", evento.target.value)}
              required
              value={formulario.nombre}
            />
            <Campo
              error={erroresFormulario.precio}
              id="producto-precio"
              etiqueta="Precio en bolivianos"
              inputMode="decimal"
              min="0"
              onChange={(evento) => actualizarCampo("precio", evento.target.value)}
              placeholder="Ej.: 45,00"
              required
              type="number"
              step="0.01"
              value={formulario.precio}
            />
            <AreaTexto
              className={styles.descripcion}
              error={erroresFormulario.descripcion}
              id="producto-descripcion"
              etiqueta="Descripción"
              maxLength={1000}
              onChange={(evento) => actualizarCampo("descripcion", evento.target.value)}
              placeholder="Ingredientes, medidas, materiales o detalles útiles."
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
          {formulario.controla_stock ? (
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
          {!productoEditando ? (
            <section className={styles.imagenesFormulario} aria-labelledby="fotos-nuevo-producto">
              <div>
                <h3 id="fotos-nuevo-producto">Fotografías</h3>
                <p>Selecciona hasta cuatro. Se optimizan antes de subirlas.</p>
              </div>
              <label className={styles.botonFoto}>
                Seleccionar fotografías
                <input
                  accept="image/jpeg,image/png,image/webp"
                  disabled={ocupado || imagenesPendientes.length >= 4}
                  multiple
                  onChange={(evento) => void prepararImagenesNuevas(evento)}
                  type="file"
                />
              </label>
              {imagenesPendientes.length ? (
                <ul className={styles.archivosPendientes}>
                  {imagenesPendientes.map((archivo, indice) => (
                    <li key={`${archivo.name}-${archivo.lastModified}-${indice}`}>
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
              <small>{imagenesPendientes.length} de 4 fotografías seleccionadas</small>
            </section>
          ) : null}
          <div className={styles.accionesFormulario}>
            <Boton cargando={ocupado} type="submit">
              {productoEditando ? "Guardar cambios" : "Crear producto"}
            </Boton>
            <Boton disabled={ocupado} onClick={cerrarFormulario} variante="secundario">Cancelar</Boton>
          </div>
        </form>
      ) : null}

      {/* Buscar, filtrar y crear van juntos y arriba de todo: es lo que se hace
          todos los días. Las categorías se administran de vez en cuando, así que
          bajan a un panel plegado. */}
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
          <Boton onClick={abrirProductoNuevo}>Crear producto</Boton>
        </div>
      </section>

      <div className={styles.columnas}>
        <details className={styles.organizacion}>
          <summary className={styles.resumenOrganizacion}>
            <span>Organizar categorías</span>
            <small>{categorias.length} de 40 creadas</small>
          </summary>
          <form className={styles.nuevaCategoria} onSubmit={crearCategoria}>
            <label htmlFor="nueva-categoria">Nueva categoría</label>
            <div>
              <input
                id="nueva-categoria"
                maxLength={80}
                onChange={(evento) => setNombreCategoria(evento.target.value)}
                placeholder="Ej.: Bebidas"
                required
                value={nombreCategoria}
              />
              <Boton cargando={ocupado} type="submit">Crear categoría</Boton>
            </div>
          </form>
          <button
            className={!categoriaActiva ? styles.filtroActivo : styles.filtro}
            onClick={() => seleccionarCategoria("")}
            type="button"
          >
            Todos los productos <span>{productos.length}</span>
          </button>
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
                  <button
                    className={categoriaActiva === categoria.id ? styles.filtroActivo : styles.filtro}
                    onClick={() => seleccionarCategoria(categoria.id)}
                    type="button"
                  >
                    {categoria.nombre} <span>{cantidadProductos}</span>
                  </button>
                  <div className={styles.accionesPequenas} aria-label={`Acciones para ${categoria.nombre}`}>
                    <button onClick={() => pedirNuevoNombreCategoria(categoria)} type="button">Cambiar nombre</button>
                    <button onClick={() => void borrarCategoria(categoria)} type="button">Eliminar categoría</button>
                  </div>
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
        </details>

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
            </div>
          </div>

          {/* Ajustar precios de a uno sobre trescientos productos es lo que hace
              que un catálogo quede desactualizado. Va acá arriba y no escondido
              en otra pantalla porque con inflación se usa varias veces al año. */}
          {productos.length > 0 ? (
            <form className={styles.ajustePrecios} onSubmit={ajustarPrecios}>
              <div className={styles.tituloAjuste}>
                <h3>Ajustar precios en lote</h3>
                <p>Cada producto guarda su precio anterior, así que se puede corregir uno por uno.</p>
              </div>
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
                Escribí <strong>10</strong> para subir un 10 % o <strong>-10</strong> para
                bajarlo. Ningún precio queda en cero.
              </p>
            </form>
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
                  : "Probá con otra palabra o quitá los filtros."
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
                  <div className={styles.fotos}>
                    {producto.fotos.length ? producto.fotos.map((ruta, indice) => (
                      <div className={styles.foto} key={ruta}>
                        <Image
                          alt={`${producto.nombre}, fotografía ${indice + 1}`}
                          fill
                          sizes="(min-width: 60rem) 112px, 96px"
                          src={obtenerUrlPublicaImagenProducto(urlSupabase, ruta)}
                        />
                        <button aria-label={`Borrar fotografía ${indice + 1} de ${producto.nombre}`} onClick={() => void borrarImagen(producto, ruta)} type="button">Borrar</button>
                      </div>
                    )) : <div className={styles.sinFoto}>Sin foto</div>}
                  </div>
                  <div className={styles.detalleProducto}>
                    <div className={styles.nombreProducto}>
                      <h3>{producto.nombre}</h3>
                      {producto.visible ? null : <IndicadorEstado estado="oculto" />}
                      {producto.estado === "disponible" ? null : (
                        <IndicadorEstado estado={producto.estado as EstadoProducto} />
                      )}
                    </div>
                    <small>Código: {producto.codigo}</small>
                    <strong>Bs {Number(producto.precio).toFixed(2).replace(".", ",")}</strong>
                    {producto.precio_anterior !== null && producto.precio_actualizado_en ? (
                      <small className={styles.auditoriaPrecio}>
                        Precio anterior: Bs {Number(producto.precio_anterior).toFixed(2).replace(".", ",")}. Actualizado {producto.precio_actualizado_por ? "por tu cuenta" : "por administración de MiPuesto"} el {FORMATEADOR_CAMBIO_PRECIO.format(new Date(producto.precio_actualizado_en))}.
                      </small>
                    ) : null}
                    {producto.descripcion ? <p>{producto.descripcion}</p> : null}
                    <small>
                      {producto.controla_stock
                        ? `${Math.max(0, (producto.cantidad_stock ?? 0) - producto.cantidad_reservada)} disponible(s) de ${producto.cantidad_stock ?? 0}; ${producto.cantidad_reservada} reservada(s)`
                        : "Sin control de existencias"}
                    </small>
                    <div className={styles.accionesProducto}>
                      <Boton onClick={() => editarProducto(producto)} variante="secundario">Editar</Boton>
                      <Boton onClick={() => void duplicarProducto(producto)} variante="discreto">Duplicar</Boton>
                      <Boton onClick={() => void copiarEnlaceProducto(producto)} variante="discreto">Copiar enlace</Boton>
                      {producto.estado !== "agotado" || !producto.controla_stock ? (
                        <Boton
                          onClick={() => void alternarAgotado(producto)}
                          variante="discreto"
                        >
                          {producto.estado === "agotado" ? "Hay de nuevo" : "Agotado"}
                        </Boton>
                      ) : null}
                      <Boton onClick={() => void cambiarVisibilidad(producto)} variante="discreto">{producto.visible ? "Ocultar" : "Mostrar"}</Boton>
                      <label className={styles.botonFoto}>
                        Agregar fotos
                        <input
                          accept="image/jpeg,image/png,image/webp"
                          disabled={ocupado || producto.fotos.length >= 4}
                          multiple
                          onChange={(evento) => void subirImagenes(producto, evento)}
                          type="file"
                        />
                      </label>
                      <Boton onClick={() => void borrarProducto(producto)} variante="peligro">Borrar</Boton>
                    </div>
                    <small>{producto.fotos.length} de 4 fotografías</small>
                  </div>
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
      </div>
    </div>
  );
}
