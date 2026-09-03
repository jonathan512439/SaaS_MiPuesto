"use client";

import Image from "next/image";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useRef, useState } from "react";

import { obtenerUrlPublicaImagenProducto } from "../../lib/catalogo/imagenes-publicas";
import type {
  CategoriaCatalogo,
  DatosCatalogoAdmin,
  ProductoCatalogo,
  SubcategoriaCatalogo,
} from "../../lib/catalogo/tipos";
import { prepararImagenParaSubir } from "../../lib/imagenes";
import { AreaTexto } from "../ui/area-texto";
import { Boton } from "../ui/boton";
import { Campo } from "../ui/campo";
import { Selector } from "../ui/selector";
import styles from "./gestor-catalogo.module.css";

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
  const [productoEditando, setProductoEditando] = useState<string | null>(null);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [imagenesPendientes, setImagenesPendientes] = useState<File[]>([]);
  const [erroresFormulario, setErroresFormulario] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [errorGeneral, setErrorGeneral] = useState("");
  const formularioProductoRef = useRef<HTMLFormElement>(null);

  const productosVisibles = useMemo(
    () =>
      categoriaActiva
        ? productos.filter((producto) => producto.categoria_id === categoriaActiva)
        : productos,
    [categoriaActiva, productos],
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

  function informarExito(texto: string) {
    setErrorGeneral("");
    setMensaje(texto);
  }

  function informarError(error: unknown) {
    setMensaje("");
    setErrorGeneral(error instanceof Error ? error.message : "No se pudo completar la acción.");
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
      informarExito(`Categoría “${categoria.nombre}” creada.`);
    } catch (error) {
      informarError(error);
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
      informarExito("Categoría actualizada.");
    } catch (error) {
      informarError(error);
    }
  }

  function pedirNuevoNombreCategoria(categoria: CategoriaCatalogo) {
    const nombre = window.prompt("Nuevo nombre de la categoría", categoria.nombre)?.trim();
    if (nombre && nombre !== categoria.nombre) void cambiarCategoria(categoria.id, { nombre });
  }

  async function borrarCategoria(categoria: CategoriaCatalogo) {
    if (!window.confirm(`¿Borrar la categoría “${categoria.nombre}”? Sus productos quedarán sin categoría.`)) return;
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
      informarExito("Categoría borrada. Los productos se conservaron.");
    } catch (error) {
      informarError(error);
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
      informarExito(`Subcategoría “${subcategoria.nombre}” creada.`);
    } catch (error) {
      informarError(error);
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
      informarExito("Subcategoría actualizada.");
    } catch (error) {
      informarError(error);
    }
  }

  function pedirNuevoNombreSubcategoria(subcategoria: SubcategoriaCatalogo) {
    const nombre = window.prompt("Nuevo nombre de la subcategoría", subcategoria.nombre)?.trim();
    if (nombre && nombre !== subcategoria.nombre) {
      void cambiarSubcategoria(subcategoria, { nombre });
    }
  }

  async function borrarSubcategoria(subcategoria: SubcategoriaCatalogo) {
    if (!window.confirm(`¿Borrar la subcategoría “${subcategoria.nombre}”?`)) return;
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
      informarExito("Subcategoría borrada. Los productos se conservaron.");
    } catch (error) {
      informarError(error);
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
      setMensaje(`Preparando ${archivoOriginal.name}…`);
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
        new Error(`Puedes seleccionar ${4 - imagenesPendientes.length} foto(s) más.`),
      );
      return;
    }

    setOcupado(true);
    try {
      const preparadas: File[] = [];
      for (const archivo of archivos) {
        setMensaje(`Preparando ${archivo.name}…`);
        preparadas.push(await prepararImagenParaSubir(archivo));
      }
      setImagenesPendientes((actuales) => [...actuales, ...preparadas]);
      informarExito(
        preparadas.length === 1
          ? "Fotografía lista para guardar."
          : "Fotografías listas para guardar.",
      );
    } catch (error) {
      informarError(error);
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
          new Error(
            "El producto se creó, pero una fotografía no pudo subirse. Puedes agregarla desde su ficha.",
          ),
        );
      } else {
        informarExito(
          productoEditando
            ? "Producto actualizado."
            : imagenesPendientes.length
              ? "Producto y fotografías guardados."
              : "Producto creado.",
        );
      }
    } catch (error) {
      const datos = (error as Error & { datos?: RespuestaError }).datos;
      if (datos?.errores) setErroresFormulario(datos.errores);
      informarError(error);
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
      informarExito(respuesta.producto.visible ? "Producto visible en el catálogo." : "Producto ocultado.");
    } catch (error) {
      informarError(error);
    }
  }

  async function borrarProducto(producto: ProductoCatalogo) {
    if (!window.confirm(`¿Borrar “${producto.nombre}” y sus fotos? Esta acción no se puede deshacer.`)) return;
    try {
      await solicitarJson<{ eliminado: true }>("/api/catalogo/productos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: producto.id }),
      });
      setProductos((actuales) => actuales.filter(({ id }) => id !== producto.id));
      informarExito("Producto y fotografías borrados.");
    } catch (error) {
      informarError(error);
    }
  }

  async function subirImagenes(producto: ProductoCatalogo, evento: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(evento.target.files ?? []);
    evento.target.value = "";
    if (!archivos.length) return;
    if (producto.fotos.length + archivos.length > 4) {
      informarError(new Error(`Puedes agregar ${4 - producto.fotos.length} foto(s) más a este producto.`));
      return;
    }
    setOcupado(true);
    try {
      await cargarArchivosProducto(producto, archivos);
      informarExito(archivos.length === 1 ? "Fotografía agregada." : "Fotografías agregadas.");
    } catch (error) {
      informarError(error);
    } finally {
      setOcupado(false);
    }
  }

  async function borrarImagen(producto: ProductoCatalogo, ruta: string) {
    if (!window.confirm("¿Borrar esta fotografía?")) return;
    try {
      await solicitarJson<{ eliminado: true }>("/api/catalogo/imagenes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ producto_id: producto.id, ruta }),
      });
      reemplazarProducto({ ...producto, fotos: producto.fotos.filter((foto) => foto !== ruta) });
      informarExito("Fotografía borrada.");
    } catch (error) {
      informarError(error);
    }
  }

  return (
    <div className={styles.gestor}>
      <div aria-live="polite" className={styles.mensajes}>
        {mensaje ? <p className={styles.exito}>{mensaje}</p> : null}
        {errorGeneral ? <p className={styles.error}>{errorGeneral}</p> : null}
      </div>

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

      <div className={styles.columnas}>
        <aside className={styles.organizacion} aria-labelledby="titulo-organizacion">
          <div className={styles.tituloSeccion}>
            <div>
              <h2 id="titulo-organizacion">Categorías</h2>
              <p>{categorias.length} de 40 creadas</p>
            </div>
          </div>
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
        </aside>

        <section className={styles.productos} aria-labelledby="titulo-productos">
          <div className={styles.tituloProductos}>
            <div>
              <h2 id="titulo-productos">{categoriaActiva ? categorias.find(({ id }) => id === categoriaActiva)?.nombre : "Todos los productos"}</h2>
              <p>{productosVisibles.length} producto(s) en esta vista</p>
            </div>
            <Boton onClick={abrirProductoNuevo}>Crear producto</Boton>
          </div>
          {productosVisibles.length === 0 ? (
            <div className={styles.estadoVacio}>
              <h3>Todavía no cargaste productos aquí</h3>
              <p>Empieza con el primero. Después podrás agregar hasta cuatro fotografías.</p>
              <Boton onClick={abrirProductoNuevo}>Crear el primer producto</Boton>
            </div>
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
                      <span className={producto.visible ? styles.estadoVisible : styles.estadoOculto}>{producto.visible ? "Visible" : "Oculto"}</span>
                      {producto.estado === "agotado" ? <span className={styles.estadoAgotado}>Agotado</span> : null}
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
