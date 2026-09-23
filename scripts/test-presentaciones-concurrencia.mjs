/* ¿Dos compradores pueden llevarse el último par del 40?
 *
 * Fase 13: la reserva por presentación. La garantía la dan los bloqueos de fila
 * de `crear_pedido_reservado` y la restricción que impide reservar más de lo
 * que hay; simularlos en memoria probaría el simulacro, no el sistema. Así que
 * esta prueba dispara pedidos de verdad, todos a la vez, contra la base.
 *
 * Corre contra el proyecto de **ensayo**, nunca contra producción: escribe
 * pedidos. La misma negativa que `ensayo.mjs` se repite acá antes de escribir
 * una sola fila.
 *
 * Cuatro situaciones:
 *   1. Veinte compradores a la vez por el último par del 40: gana uno.
 *   2. Cincuenta pedidos mezclados contra 10 del 41 y 10 del 42: nunca se
 *      aparta más de lo que hay, y lo apartado coincide con lo pedido.
 *   3. Treinta pedidos cruzados —la mitad pide 41 y 42, la otra 42 y 41—:
 *      ninguno se queda trabado esperando al otro.
 *   4. Cinco expiraciones a la vez del mismo pedido: la reserva vuelve una vez.
 *
 * Uso: npm run test:fase13:concurrencia
 */
import { createHash, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const url = process.env.ENSAYO_URL?.trim();
const clave = process.env.ENSAYO_SERVICE_ROLE_KEY?.trim();

if (!url || !clave) {
  console.error(
    "Faltan ENSAYO_URL y ENSAYO_SERVICE_ROLE_KEY en .env.local.\n" +
      "Esta prueba escribe pedidos, así que no corre contra producción.",
  );
  process.exit(1);
}

if (url === process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
  console.error("ENSAYO_URL apunta al mismo proyecto que producción. No se corre.");
  process.exit(1);
}

/* El motor lo llama la ruta de pedidos con la clave de servicio: se llama igual. */
const supabase = createClient(url, clave, { auth: { persistSession: false } });

function huella() {
  return createHash("sha256").update(randomUUID()).digest("hex");
}

async function tabla(nombre, consulta) {
  const { data, error } = await consulta;
  if (error) throw new Error(`${nombre}: ${error.message}`);
  return data;
}

function pedir(slug, items) {
  return supabase.rpc("crear_pedido_reservado", {
    p_slug: slug,
    p_items: items,
    p_cliente_nombre: "Prueba de concurrencia",
    p_cliente_telefono: "59170000000",
    p_idempotencia: randomUUID(),
    /* Una huella por pedido: el límite es de cinco pedidos cada quince minutos
       por huella, y acá se hacen más de cien. */
    p_huella_ip: huella(),
  });
}

let fallos = 0;

function comprobar(condicion, etiqueta, detalle = "") {
  if (condicion) {
    console.log(`✓ ${etiqueta}`);
  } else {
    console.error(`✗ ${etiqueta}${detalle ? ` — ${detalle}` : ""}`);
    fallos += 1;
  }
}

async function main() {
  /* Una tienda con carrito y un producto que vende cosas. */
  const negocios = await tabla(
    "negocios",
    supabase
      .from("negocios")
      .select("id,slug,admin_user_id")
      .eq("activo", true)
      .eq("tipo_negocio", "tienda_virtual")
      .limit(1),
  );
  if (negocios.length === 0) {
    console.error("El proyecto de ensayo no tiene una tienda con carrito.");
    process.exit(1);
  }
  const negocio = negocios[0];

  const productos = await tabla(
    "productos",
    supabase
      .from("productos")
      .select("id,cantidad_reservada")
      .eq("negocio_id", negocio.id)
      .is("eliminado_en", null)
      .eq("cantidad_reservada", 0)
      .limit(1),
  );
  if (productos.length === 0) {
    console.error("La tienda de ensayo no tiene un producto libre para la prueba.");
    process.exit(1);
  }
  const productoId = productos[0].id;

  /* Lo que haya quedado apartado de una corrida anterior se devuelve primero:
     una presentación con unidades apartadas no se puede reemplazar. */
  await liberar(negocio, await pendientesDelProducto(productoId));

  /* El producto de prueba: controla existencias y lleva tres números. Todo por
     `guardar_presentaciones`, que lo hace en una sola transacción: en dos pasos
     sueltos el producto quedaría un momento sin existencias en ningún lado, y la
     base lo rechaza. */
  await tabla(
    "preparar producto",
    supabase
      .from("productos")
      .update({ controla_stock: true, visible: true })
      .eq("id", productoId),
  );
  const creadas = await tabla(
    "presentaciones",
    supabase.rpc("guardar_presentaciones", {
      p_producto_id: productoId,
      p_tipo: "numero",
      p_presentaciones: [
        { nombre: "40", cantidad_stock: 1 },
        { nombre: "41", cantidad_stock: 10 },
        { nombre: "42", cantidad_stock: 10 },
      ],
    }),
  );
  const id = Object.fromEntries(creadas.map((fila) => [fila.nombre, fila.id]));
  const pedidosCreados = [];

  try {
    /* 1. El último par. */
    const ultimo = await Promise.all(
      Array.from({ length: 20 }, () =>
        pedir(negocio.slug, [{ producto_id: productoId, variante_id: id["40"], cantidad: 1 }]),
      ),
    );
    const ganaron = ultimo.filter(({ error }) => !error);
    for (const { data } of ganaron) pedidosCreados.push(data.id);
    const motivos = [...new Set(ultimo.filter((r) => r.error).map((r) => r.error.message))];
    comprobar(
      ganaron.length === 1,
      `el último par del 40: ${ganaron.length} de 20 se lo llevó`,
      `motivos de los demás: ${motivos.join(", ")}`,
    );
    comprobar(
      motivos.every((motivo) => motivo === "STOCK_INSUFICIENTE"),
      "los que no llegaron recibieron «no alcanza», no otro error",
      motivos.join(", "),
    );

    /* 2. Cincuenta pedidos mezclados. */
    const pedidos = Array.from({ length: 50 }, (_, i) => {
      const cantidad = (i % 3) + 1;
      return i % 2 === 0
        ? [{ producto_id: productoId, variante_id: id["41"], cantidad }]
        : [
            { producto_id: productoId, variante_id: id["41"], cantidad: 1 },
            { producto_id: productoId, variante_id: id["42"], cantidad },
          ];
    });
    const mezclados = await Promise.all(pedidos.map((items) => pedir(negocio.slug, items)));
    let pedido41 = 0;
    let pedido42 = 0;
    mezclados.forEach(({ error, data }, i) => {
      if (error) return;
      pedidosCreados.push(data.id);
      for (const renglon of pedidos[i]) {
        if (renglon.variante_id === id["41"]) pedido41 += renglon.cantidad;
        if (renglon.variante_id === id["42"]) pedido42 += renglon.cantidad;
      }
    });
    const estado = await tabla(
      "estado",
      supabase.from("variantes_producto").select("nombre,cantidad_stock,cantidad_reservada").eq("producto_id", productoId),
    );
    const de = Object.fromEntries(estado.map((fila) => [fila.nombre, fila]));
    comprobar(
      de["41"].cantidad_reservada <= 10 && de["42"].cantidad_reservada <= 10,
      `nunca se aparta más de lo que hay: 41 → ${de["41"].cantidad_reservada} de 10, 42 → ${de["42"].cantidad_reservada} de 10`,
    );
    comprobar(
      de["41"].cantidad_reservada === pedido41 && de["42"].cantidad_reservada === pedido42,
      `lo apartado coincide con lo pedido en los pedidos que entraron (41: ${pedido41}, 42: ${pedido42})`,
      `apartado 41: ${de["41"].cantidad_reservada}, 42: ${de["42"].cantidad_reservada}`,
    );
    const otros = [...new Set(mezclados.filter((r) => r.error).map((r) => r.error.message))];
    comprobar(
      otros.every((motivo) => motivo === "STOCK_INSUFICIENTE"),
      `los ${mezclados.filter((r) => r.error).length} que no entraron fue por existencias`,
      otros.join(", "),
    );

    /* Se liberan para la siguiente prueba. */
    await liberar(negocio, pedidosCreados.splice(0));
    await tabla(
      "reponer",
      supabase.from("variantes_producto").update({ cantidad_stock: 20 }).in("id", [id["41"], id["42"]]),
    );

    /* 3. Pedidos cruzados: la mitad pide 41 y después 42, la otra al revés. */
    const cruzados = await Promise.race([
      Promise.all(
        Array.from({ length: 30 }, (_, i) =>
          pedir(
            negocio.slug,
            i % 2 === 0
              ? [
                  { producto_id: productoId, variante_id: id["41"], cantidad: 1 },
                  { producto_id: productoId, variante_id: id["42"], cantidad: 1 },
                ]
              : [
                  { producto_id: productoId, variante_id: id["42"], cantidad: 1 },
                  { producto_id: productoId, variante_id: id["41"], cantidad: 1 },
                ],
          ),
        ),
      ),
      new Promise((resolver) => setTimeout(() => resolver(null), 60_000)),
    ]);
    comprobar(cruzados !== null, "los pedidos cruzados terminaron: ninguno quedó trabado");
    if (cruzados) {
      for (const { data } of cruzados.filter((r) => !r.error)) pedidosCreados.push(data.id);
      const interbloqueos = cruzados.filter((r) => r.error?.code === "40P01").length;
      comprobar(interbloqueos === 0, `sin interbloqueos entre pedidos cruzados (${interbloqueos})`);
      comprobar(
        cruzados.filter((r) => !r.error).length === 20,
        `con 20 de cada número, entraron ${cruzados.filter((r) => !r.error).length} de 30`,
      );
    }
    await liberar(negocio, pedidosCreados.splice(0));

    /* 4. Cinco expiraciones a la vez del mismo pedido. */
    const { data: uno, error: errorUno } = await pedir(negocio.slug, [
      { producto_id: productoId, variante_id: id["41"], cantidad: 3 },
    ]);
    if (errorUno) throw new Error(`pedido para expirar: ${errorUno.message}`);
    await tabla(
      "vencer",
      supabase.from("pedidos").update({ expira_en: new Date(Date.now() - 60_000).toISOString() }).eq("id", uno.id),
    );
    await Promise.all(Array.from({ length: 5 }, () => supabase.rpc("expirar_reservas_vencidas", { p_limite: 100 })));
    const [despues] = await tabla(
      "después",
      supabase.from("variantes_producto").select("cantidad_stock,cantidad_reservada").eq("id", id["41"]),
    );
    const [pedidoExpirado] = await tabla("pedido", supabase.from("pedidos").select("estado").eq("id", uno.id));
    comprobar(
      despues.cantidad_reservada === 0 && despues.cantidad_stock === 20 && pedidoExpirado.estado === "expirado",
      `cinco expiraciones a la vez devolvieron la reserva una sola vez (apartado ${despues.cantidad_reservada}, existencias ${despues.cantidad_stock})`,
    );
  } finally {
    /* Lo que haya quedado apartado se devuelve y el producto vuelve a llevar
       sus existencias, para no dejarle basura a la próxima prueba. */
    await liberar(negocio, [...pedidosCreados, ...(await pendientesDelProducto(productoId))]);
    const { error } = await supabase.rpc("guardar_presentaciones", {
      p_producto_id: productoId,
      p_tipo: "presentacion",
      p_presentaciones: [],
      p_existencias_producto: 10,
    });
    if (error) console.error(`No se pudo dejar el producto como estaba: ${error.message}`);
  }

  if (fallos > 0) {
    console.error(`\n${fallos} comprobación(es) fallaron.`);
    process.exit(1);
  }
  console.log("\nFase 13: la reserva por presentación aguanta la concurrencia.");
}

/* Los pedidos pendientes que apartaron algo de este producto. */
async function pendientesDelProducto(productoId) {
  const renglones = await tabla(
    "pendientes",
    supabase
      .from("pedido_items")
      .select("pedido_id")
      .eq("producto_id", productoId)
      .eq("reserva_activa", true),
  );
  return [...new Set(renglones.map(({ pedido_id }) => pedido_id))];
}

/* Cancela los pedidos pendientes de la prueba, que es lo que devuelve lo
   apartado por el mismo camino que usa el dueño. */
async function liberar(negocio, pedidos) {
  for (const pedidoId of pedidos) {
    await supabase.rpc("cambiar_estado_pedido_admin", {
      p_pedido_id: pedidoId,
      p_admin_user_id: negocio.admin_user_id,
      p_nuevo_estado: "cancelado",
    });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
