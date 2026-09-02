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

async function comprobarAislamiento(tabla, idAjeno, cambio) {
  const lectura = await clienteA.from(tabla).select("id").eq("id", idAjeno);
  comprobar(!lectura.error, `${tabla}: la lectura ajena produjo un error inesperado`);
  comprobar(lectura.data?.length === 0, `${tabla}: A pudo leer una fila de B`);

  const actualizacion = await clienteA
    .from(tabla)
    .update(cambio)
    .eq("id", idAjeno)
    .select("id");
  comprobar(!actualizacion.error, `${tabla}: la actualización ajena produjo un error inesperado`);
  comprobar(actualizacion.data?.length === 0, `${tabla}: A pudo actualizar una fila de B`);

  const borrado = await clienteA.from(tabla).delete().eq("id", idAjeno).select("id");
  comprobar(!borrado.error, `${tabla}: el borrado ajeno produjo un error inesperado`);
  comprobar(borrado.data?.length === 0, `${tabla}: A pudo borrar una fila de B`);
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
  await insertarUno(clienteA, "productos", {
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
  await insertarUno(clienteA, "pedidos", {
    negocio_id: negocios[0].id,
    items: [{ nombre: "Producto A", precio: 10, cantidad: 1 }],
    total: 10,
  });
  const pedidoB = await insertarUno(clienteB, "pedidos", {
    negocio_id: negocios[1].id,
    items: [{ nombre: "Producto B", precio: 20, cantidad: 1 }],
    total: 20,
  });
  await insertarUno(clienteA, "eventos_analitica", {
    negocio_id: negocios[0].id,
    tipo: "vista_catalogo",
  });
  const eventoB = await insertarUno(clienteB, "eventos_analitica", {
    negocio_id: negocios[1].id,
    producto_id: productoB.id,
    tipo: "clic_producto",
  });

  const filasB = {
    negocios: negocios[1].id,
    categorias: categoriaB.id,
    subcategorias: subcategoriaB.id,
    productos: productoB.id,
    promociones: promocionB.id,
    pedidos: pedidoB.id,
    eventos_analitica: eventoB.id,
  };
  const cambios = {
    negocios: { descripcion: "Intento ajeno" },
    categorias: { nombre: "Intento ajeno" },
    subcategorias: { nombre: "Intento ajeno" },
    productos: { nombre: "Intento ajeno" },
    promociones: { activo: false },
    pedidos: { estado: "cancelado" },
    eventos_analitica: { tipo: "clic_whatsapp" },
  };

  for (const tabla of Object.keys(filasB)) {
    await comprobarAislamiento(tabla, filasB[tabla], cambios[tabla]);
  }

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

  console.log("RLS multi-tenant: 2 usuarios, 7 tablas y función de slug aislados correctamente.");
} finally {
  await Promise.allSettled([
    clienteA?.auth.signOut({ scope: "global" }),
    clienteB?.auth.signOut({ scope: "global" }),
  ]);

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
