import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { obtenerClaveServicioLocal } from "./servicio-supabase-local.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clavePublica =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const claveServicio = await obtenerClaveServicioLocal();

if (!url || !clavePublica) {
  throw new Error(
    "La prueba multi-tenant necesita NEXT_PUBLIC_SUPABASE_URL y la clave Publishable.",
  );
}

const opcionesAuth = {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
};
const administrador = createClient(url, claveServicio, opcionesAuth);
const marca = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
const claveTemporal = `Mp-${randomUUID()}-9aA`;
const correos = [`rls-a-${marca}@mipuesto.com`, `rls-b-${marca}@mipuesto.com`];
const usuarios = [];
const negocios = [];
const rutasStorage = [];
const rutasStorageNegocios = [];
let clienteA;
let clienteB;

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(`RLS multi-tenant: ${mensaje}`);
}

async function insertarUno(cliente, tabla, valores) {
  const { data, error } = await cliente.from(tabla).insert(valores).select("id").single();
  if (error || !data) {
    throw new Error(`No se pudo preparar ${tabla}: ${error?.message ?? "sin datos"}`);
  }
  return data;
}

async function comprobarAislamiento(tabla, idAjeno, cambio, escrituraRevocada = false) {
  const lectura = await clienteA.from(tabla).select("id").eq("id", idAjeno);
  comprobar(!lectura.error, `${tabla}: la lectura ajena produjo un error inesperado`);
  comprobar(lectura.data?.length === 0, `${tabla}: A pudo leer una fila de B`);

  const actualizacion = await clienteA
    .from(tabla)
    .update(cambio)
    .eq("id", idAjeno)
    .select("id");
  if (escrituraRevocada) {
    comprobar(
      actualizacion.error?.code === "42501",
      `${tabla}: la actualización sin permiso no fue rechazada como se esperaba`,
    );
  } else {
    comprobar(!actualizacion.error, `${tabla}: la actualización ajena produjo un error inesperado`);
    comprobar(actualizacion.data?.length === 0, `${tabla}: A pudo actualizar una fila de B`);
  }

  const borrado = await clienteA.from(tabla).delete().eq("id", idAjeno).select("id");
  if (escrituraRevocada) {
    comprobar(
      borrado.error?.code === "42501",
      `${tabla}: el borrado sin permiso no fue rechazado como se esperaba`,
    );
  } else {
    comprobar(!borrado.error, `${tabla}: el borrado ajeno produjo un error inesperado`);
    comprobar(borrado.data?.length === 0, `${tabla}: A pudo borrar una fila de B`);
  }
}

try {
  for (const correo of correos) {
    const { data, error } = await administrador.auth.admin.createUser({
      email: correo,
      password: claveTemporal,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`No se pudo crear un usuario de prueba: ${error?.message}`);
    usuarios.push(data.user.id);
  }

  clienteA = createClient(url, clavePublica, opcionesAuth);
  clienteB = createClient(url, clavePublica, opcionesAuth);

  const sesiones = await Promise.all(
    [clienteA, clienteB].map((cliente, indice) =>
      cliente.auth.signInWithPassword({ email: correos[indice], password: claveTemporal }),
    ),
  );
  sesiones.forEach(({ error }, indice) => {
    if (error) throw new Error(`No se pudo iniciar la sesión ${indice + 1}: ${error.message}`);
  });

  for (const [indice, cliente] of [clienteA, clienteB].entries()) {
    negocios.push(
      await insertarUno(cliente, "negocios", {
        admin_user_id: usuarios[indice],
        slug: `rls-${indice + 1}-${marca}`.slice(0, 48),
        nombre: `Negocio RLS ${indice + 1}`,
        descripcion: "Fila temporal para verificar aislamiento.",
        tipo_negocio: "tienda_virtual",
        telefono_whatsapp: `5917000000${indice + 4}`,
        activo: false,
      }),
    );
  }

  const categoriaA = await insertarUno(clienteA, "categorias", {
    negocio_id: negocios[0].id,
    nombre: "Categoría A",
  });
  const categoriaB = await insertarUno(clienteB, "categorias", {
    negocio_id: negocios[1].id,
    nombre: "Categoría B",
  });
  await insertarUno(clienteA, "subcategorias", {
    categoria_id: categoriaA.id,
    nombre: "Subcategoría A",
  });
  const subcategoriaB = await insertarUno(clienteB, "subcategorias", {
    categoria_id: categoriaB.id,
    nombre: "Subcategoría B",
  });
  /* Los campos de categoría entran a la comprobación como cualquier otra tabla
     con dueño. El aislamiento lo sostiene la clave foránea compuesta, pero eso es
     forma: acá se comprueba comportamiento, que es que el negocio A no pueda leer
     ni escribir el campo del B. */
  await insertarUno(clienteA, "atributos_categoria", {
    negocio_id: negocios[0].id,
    categoria_id: categoriaA.id,
    clave: "material",
    nombre: "Material",
    tipo: "texto",
  });
  const atributoB = await insertarUno(clienteB, "atributos_categoria", {
    negocio_id: negocios[1].id,
    categoria_id: categoriaB.id,
    clave: "material",
    nombre: "Material",
    tipo: "texto",
  });
  const productoA = await insertarUno(clienteA, "productos", {
    negocio_id: negocios[0].id,
    categoria_id: categoriaA.id,
    nombre: "Producto A",
    precio: 10,
  });
  const productoB = await insertarUno(clienteB, "productos", {
    negocio_id: negocios[1].id,
    categoria_id: categoriaB.id,
    subcategoria_id: subcategoriaB.id,
    nombre: "Producto B",
    precio: 20,
  });
  await insertarUno(clienteA, "promociones", {
    negocio_id: negocios[0].id,
    categoria_id: categoriaA.id,
    tipo: "porcentaje",
    valor: 10,
  });
  const promocionB = await insertarUno(clienteB, "promociones", {
    negocio_id: negocios[1].id,
    producto_id: productoB.id,
    tipo: "monto_fijo",
    valor: 2,
  });
  const pedidoA = await insertarUno(administrador, "pedidos", {
    negocio_id: negocios[0].id,
    items: [{ nombre: "Producto A", precio: 10, cantidad: 1 }],
    total: 10,
  });
  const pedidoB = await insertarUno(administrador, "pedidos", {
    negocio_id: negocios[1].id,
    items: [{ nombre: "Producto B", precio: 20, cantidad: 1 }],
    total: 20,
  });
  await insertarUno(administrador, "pedido_items", {
    pedido_id: pedidoA.id,
    producto_id: productoA.id,
    producto_codigo: "PRD-RLS-A",
    nombre: "Producto A",
    precio_unitario: 10,
    cantidad: 1,
    subtotal: 10,
    controla_stock: false,
  });
  const pedidoItemB = await insertarUno(administrador, "pedido_items", {
    pedido_id: pedidoB.id,
    producto_id: productoB.id,
    producto_codigo: "PRD-RLS-B",
    nombre: "Producto B",
    precio_unitario: 20,
    cantidad: 1,
    subtotal: 20,
    controla_stock: false,
  });
  await insertarUno(administrador, "eventos_analitica", {
    negocio_id: negocios[0].id,
    sesion_id: randomUUID(),
    tipo: "vista_catalogo",
  });
  const eventoB = await insertarUno(administrador, "eventos_analitica", {
    negocio_id: negocios[1].id,
    producto_id: productoB.id,
    sesion_id: randomUUID(),
    tipo: "clic_producto",
  });

  const filasB = {
    negocios: negocios[1].id,
    categorias: categoriaB.id,
    subcategorias: subcategoriaB.id,
    atributos_categoria: atributoB.id,
    productos: productoB.id,
    promociones: promocionB.id,
    pedidos: pedidoB.id,
    pedido_items: pedidoItemB.id,
    eventos_analitica: eventoB.id,
  };
  const cambios = {
    negocios: { plantilla_id: "moderna", paleta_id: "noche" },
    categorias: { nombre: "Intento ajeno" },
    subcategorias: { nombre: "Intento ajeno" },
    atributos_categoria: { nombre: "Intento ajeno" },
    productos: { nombre: "Intento ajeno" },
    promociones: { activo: false },
    pedidos: { estado: "cancelado" },
    pedido_items: { nombre: "Intento ajeno" },
    eventos_analitica: { tipo: "clic_whatsapp" },
  };

  for (const tabla of Object.keys(filasB)) {
    await comprobarAislamiento(
      tabla,
      filasB[tabla],
      cambios[tabla],
      tabla === "pedidos" ||
        tabla === "pedido_items" ||
        tabla === "eventos_analitica",
    );
  }

  const limitesInternos = await clienteA.from("limites_pedidos_ip").select("negocio_id");
  comprobar(
    limitesInternos.error?.code === "42501",
    "A pudo consultar la tabla interna de límites por IP",
  );

  const actualizacionPlantillaPropia = await clienteA
    .from("negocios")
    .update({ plantilla_id: "minimal", paleta_id: "oceano" })
    .eq("id", negocios[0].id)
    .select("plantilla_id,paleta_id")
    .single();
  comprobar(
    actualizacionPlantillaPropia.data?.plantilla_id === "minimal" &&
      actualizacionPlantillaPropia.data?.paleta_id === "oceano",
    "A no pudo guardar la apariencia de su propio negocio",
  );

  const verificacionPlantillaAjena = await clienteB
    .from("negocios")
    .select("plantilla_id,paleta_id")
    .eq("id", negocios[1].id)
    .single();
  comprobar(
    verificacionPlantillaAjena.data?.plantilla_id === "clasica" &&
      verificacionPlantillaAjena.data?.paleta_id === "mercado",
    "A alteró la apariencia del negocio de B",
  );

  const lecturaReciproca = await clienteB
    .from("negocios")
    .select("id")
    .eq("id", negocios[0].id);
  comprobar(lecturaReciproca.data?.length === 0, "B pudo leer el negocio de A");

  const slugAjeno = await clienteA.rpc("slug_disponible", {
    p_slug: `rls-2-${marca}`.slice(0, 48),
  });
  const slugPropio = await clienteA.rpc("slug_disponible", {
    p_slug: `rls-1-${marca}`.slice(0, 48),
  });
  comprobar(slugAjeno.data === false, "la función marcó como disponible el slug ajeno");
  comprobar(slugPropio.data === true, "la función rechazó el slug propio durante edición");

  const insercionAjena = await clienteA.from("categorias").insert({
    negocio_id: negocios[1].id,
    nombre: "Categoría intrusa",
  });
  comprobar(Boolean(insercionAjena.error), "A pudo insertar una categoría en el negocio de B");

  const relacionCruzada = await clienteA.from("productos").insert({
    negocio_id: negocios[0].id,
    categoria_id: categoriaB.id,
    subcategoria_id: subcategoriaB.id,
    nombre: "Producto con relación ajena",
    precio: 30,
  });
  comprobar(
    Boolean(relacionCruzada.error),
    "A pudo vincular su producto con categoría y subcategoría de B",
  );

  const promocionProductoAjeno = await clienteA.from("promociones").insert({
    negocio_id: negocios[0].id,
    producto_id: productoB.id,
    tipo: "porcentaje",
    valor: 15,
  });
  comprobar(
    Boolean(promocionProductoAjeno.error),
    "A pudo crear una promoción sobre un producto de B",
  );

  const promocionCategoriaAjena = await clienteA.from("promociones").insert({
    negocio_id: negocios[0].id,
    categoria_id: categoriaB.id,
    tipo: "monto_fijo",
    valor: 3,
  });
  comprobar(
    Boolean(promocionCategoriaAjena.error),
    "A pudo crear una promoción sobre una categoría de B",
  );

  const cambioPrecio = await clienteA
    .from("productos")
    .update({ precio: 12 })
    .eq("id", productoA.id)
    .select("precio,precio_anterior,precio_actualizado_por,precio_actualizado_en")
    .single();
  comprobar(!cambioPrecio.error, `no se pudo auditar el precio propio: ${cambioPrecio.error?.message}`);
  comprobar(
    Number(cambioPrecio.data?.precio) === 12 &&
      Number(cambioPrecio.data?.precio_anterior) === 10 &&
      cambioPrecio.data?.precio_actualizado_por === usuarios[0] &&
      Boolean(cambioPrecio.data?.precio_actualizado_en),
    "el cambio de precio propio no conservó valor anterior, usuario y fecha",
  );

  const reactivacionPropia = await clienteA
    .from("negocios")
    .update({ activo: true })
    .eq("id", negocios[0].id);
  comprobar(
    reactivacionPropia.error?.code === "42501",
    "A pudo modificar el estado de suscripción de su negocio",
  );

  const imagenPrueba = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
  const rutaA = `${negocios[0].id}/${productoA.id}/${randomUUID()}.webp`;
  const rutaB = `${negocios[1].id}/${productoB.id}/${randomUUID()}.webp`;
  const rutaIntrusa = `${negocios[1].id}/${productoB.id}/${randomUUID()}.webp`;
  rutasStorage.push(rutaA, rutaB, rutaIntrusa);
  const logoA = `${negocios[0].id}/logo/${randomUUID()}.webp`;
  const logoB = `${negocios[1].id}/logo/${randomUUID()}.webp`;
  const logoIntruso = `${negocios[1].id}/portada/${randomUUID()}.webp`;
  rutasStorageNegocios.push(logoA, logoB, logoIntruso);

  const subidaA = await clienteA.storage
    .from("productos")
    .upload(rutaA, imagenPrueba, { contentType: "image/webp", upsert: false });
  comprobar(!subidaA.error, `A no pudo subir su imagen: ${subidaA.error?.message}`);

  const subidaB = await clienteB.storage
    .from("productos")
    .upload(rutaB, imagenPrueba, { contentType: "image/webp", upsert: false });
  comprobar(!subidaB.error, `B no pudo subir su imagen: ${subidaB.error?.message}`);

  const subidaEnCarpetaAjena = await clienteA.storage
    .from("productos")
    .upload(
      rutaIntrusa,
      imagenPrueba,
      { contentType: "image/webp", upsert: false },
    );
  comprobar(Boolean(subidaEnCarpetaAjena.error), "A pudo subir una imagen en la carpeta de B");

  await clienteA.storage.from("productos").remove([rutaB]);
  const imagenBConservada = await administrador.storage.from("productos").download(rutaB);
  comprobar(!imagenBConservada.error, "A pudo borrar una imagen de B");

  const subidaLogoA = await clienteA.storage
    .from("negocios")
    .upload(logoA, imagenPrueba, { contentType: "image/webp", upsert: false });
  comprobar(!subidaLogoA.error, `A no pudo subir su logo: ${subidaLogoA.error?.message}`);

  const subidaLogoB = await clienteB.storage
    .from("negocios")
    .upload(logoB, imagenPrueba, { contentType: "image/webp", upsert: false });
  comprobar(!subidaLogoB.error, `B no pudo subir su logo: ${subidaLogoB.error?.message}`);

  const subidaLogoAjeno = await clienteA.storage
    .from("negocios")
    .upload(logoIntruso, imagenPrueba, { contentType: "image/webp", upsert: false });
  comprobar(Boolean(subidaLogoAjeno.error), "A pudo subir identidad en la carpeta de B");

  await clienteA.storage.from("negocios").remove([logoB]);
  const logoBConservado = await administrador.storage.from("negocios").download(logoB);
  comprobar(!logoBConservado.error, "A pudo borrar una imagen de identidad de B");

  // Lo que se agregó después de escribir esta prueba: cada columna y tabla
  // nuevas son superficie nueva, y una prueba que se queda en el esquema de
  // ayer da una confianza que ya no corresponde.
  const etiquetasAjenas = await clienteA.from("etiquetas").select("codigo");
  comprobar(
    Boolean(etiquetasAjenas.error) || (etiquetasAjenas.data ?? []).length === 0,
    "un dueño común pudo leer las etiquetas de la plataforma",
  );

  const etiquetaInventada = await clienteA
    .from("etiquetas")
    .insert({ codigo: "ZZZ999", negocio_id: negocios[0].id });
  comprobar(
    Boolean(etiquetaInventada.error),
    "un dueño común pudo crearse una etiqueta apuntando a su negocio",
  );

  const papeleraAjena = await clienteA
    .from("productos")
    .update({ eliminado_en: new Date().toISOString() })
    .eq("id", productoB.id)
    .select("id");
  comprobar(
    Boolean(papeleraAjena.error) || (papeleraAjena.data ?? []).length === 0,
    "A pudo mandar a la papelera un producto de B",
  );

  const cartaAjena = await clienteA
    .from("productos")
    .update({ en_carta_hasta: "2026-01-01" })
    .eq("id", productoB.id)
    .select("id");
  comprobar(
    Boolean(cartaAjena.error) || (cartaAjena.data ?? []).length === 0,
    "A pudo poner en la carta del día un producto de B",
  );

  const identidadAjena = await clienteA
    .from("negocios")
    .update({ rubro: "restaurante", ciudad: "la_paz", resenas_url: "https://ejemplo.com" })
    .eq("id", negocios[1].id)
    .select("id");
  comprobar(
    Boolean(identidadAjena.error) || (identidadAjena.data ?? []).length === 0,
    "A pudo cambiar rubro, ciudad o reseñas de B",
  );

  const propiaIdentidad = await clienteA
    .from("negocios")
    .update({ rubro: "restaurante", ciudad: "la_paz", zona: "Miraflores", pide_numero_mesa: true })
    .eq("id", negocios[0].id)
    .select("rubro,ciudad,zona,pide_numero_mesa")
    .maybeSingle();
  comprobar(
    !propiaIdentidad.error && propiaIdentidad.data?.rubro === "restaurante",
    `A no pudo guardar su propio rubro y ciudad: ${propiaIdentidad.error?.message}`,
  );

  // La analítica dejó de aceptar escrituras directas: si esto vuelve a pasar,
  // el límite por IP de la ruta se puede saltear escribiendo a la base.
  const analiticaDirecta = await clienteA.from("eventos_analitica").insert({
    negocio_id: negocios[0].id,
    sesion_id: randomUUID(),
    tipo: "vista_catalogo",
  });
  comprobar(
    Boolean(analiticaDirecta.error),
    "se pudo escribir analítica sin pasar por la ruta que cuenta por IP",
  );

  const limitesAnalitica = await clienteA.from("limites_analitica_ip").select("negocio_id");
  comprobar(
    Boolean(limitesAnalitica.error) || (limitesAnalitica.data ?? []).length === 0,
    "un dueño común pudo leer el conteo de límites por IP",
  );

  console.log(
    "RLS multi-tenant: 2 usuarios, 9 tablas de negocio, etiquetas, papelera, carta del día, identidad por rubro y zona, analítica cerrada, límites internos, promociones, auditoría y ambos buckets aislados correctamente.",
  );
} finally {
  await Promise.allSettled([
    clienteA?.auth.signOut({ scope: "global" }),
    clienteB?.auth.signOut({ scope: "global" }),
  ]);

  if (rutasStorage.length > 0) {
    await administrador.storage.from("productos").remove(rutasStorage);
  }
  if (rutasStorageNegocios.length > 0) {
    await administrador.storage.from("negocios").remove(rutasStorageNegocios);
  }

  if (negocios.length > 0) {
    await administrador.from("negocios").delete().in(
      "id",
      negocios.map(({ id }) => id),
    );
  }

  for (const idUsuario of usuarios) {
    await administrador.auth.admin.deleteUser(idUsuario);
  }
}
