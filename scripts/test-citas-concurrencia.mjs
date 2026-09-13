/* ¿Dos personas pueden quedarse con el mismo horario?
 *
 * Esta prueba no se puede reemplazar con una unitaria y no es opcional. La
 * garantía la da la **restricción de exclusión de Postgres**, no el código de la
 * aplicación; simularla en memoria probaría el simulacro, no el sistema.
 *
 * Dispara N inserciones a la vez sobre el mismo horario y comprueba que entre
 * exactamente `cupo_por_franja`. Corre contra el proyecto de **ensayo**, nunca
 * contra producción: la validación de `ENSAYO_DB_URL` está en `ensayo.mjs` y acá
 * se repite la comprobación antes de escribir una sola fila.
 *
 * Uso: npm run test:citas:concurrencia
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.ENSAYO_URL;
const clave = process.env.ENSAYO_SERVICE_ROLE_KEY;

if (!url || !clave) {
  console.error(
    "Faltan ENSAYO_URL y ENSAYO_SERVICE_ROLE_KEY en .env.local.\n" +
      "Esta prueba escribe filas, así que no corre contra producción.",
  );
  process.exit(1);
}

/* La misma negativa que `ensayo.mjs`: si la URL de ensayo coincide con la de
   producción, no se escribe nada. Se comprueba acá también porque un error de
   copiado en `.env.local` no puede terminar creando citas falsas en el catálogo
   de un cliente. */
if (url === process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("ENSAYO_URL apunta al mismo proyecto que producción. No se corre.");
  process.exit(1);
}

const supabase = createClient(url, clave, { auth: { persistSession: false } });

async function tabla(nombre, consulta) {
  const { data, error } = await consulta;
  if (error) throw new Error(`${nombre}: ${error.message}`);
  return data;
}

async function main() {
  const negocios = await tabla(
    "negocios",
    supabase.from("negocios").select("id").limit(1),
  );
  if (negocios.length === 0) {
    console.error("El proyecto de ensayo no tiene negocios. Restaurá un respaldo primero.");
    process.exit(1);
  }
  const negocioId = negocios[0].id;

  const productos = await tabla(
    "productos",
    supabase
      .from("productos")
      .select("id,categoria_id")
      .eq("negocio_id", negocioId)
      .not("categoria_id", "is", null)
      .limit(2),
  );
  if (productos.length === 0) {
    console.error("El negocio de ensayo no tiene productos.");
    process.exit(1);
  }
  const productoId = productos[0].id;
  const categoriaId = productos[0].categoria_id;

  /* Un recurso propio para la prueba, que se borra al final. El calendario es
     del recurso: es sobre él que la exclusión decide. */
  const { data: recursoCreado, error: errorRecurso } = await supabase
    .from("recursos")
    .insert({ negocio_id: negocioId, nombre: `Prueba concurrencia ${Date.now()}` })
    .select("id")
    .single();
  if (errorRecurso || !recursoCreado) throw new Error(`recursos: ${errorRecurso?.message}`);
  const recursoId = recursoCreado.id;
  /* Un segundo producto de **la misma categoría** si lo hay: es lo que prueba el
     caso que originó el cambio de modelo, un consultorio con un solo profesional
     y dos servicios distintos. */
  const otroProducto = productos.find(
    (p) => p.id !== productoId && p.categoria_id === categoriaId,
  );

  /* Un horario lejos en el futuro para no chocar con datos reales del respaldo. */
  const inicio = new Date(Date.now() + 400 * 24 * 3600_000);
  inicio.setUTCMinutes(0, 0, 0);
  const fin = new Date(inicio.getTime() + 30 * 60_000);
  const rango = `[${inicio.toISOString()},${fin.toISOString()})`;

  await supabase.from("citas").delete().eq("recurso_id", recursoId).gte("creado_en", "2000-01-01")
    .filter("rango", "eq", rango);

  let fallos = 0;

  async function intentar(cantidad, cupos, etiqueta) {
    /* Todas a la vez, sin await entre medio: es la única forma de que lleguen
       juntas y la restricción tenga que decidir. */
    const intentos = Array.from({ length: cantidad }, (_, i) =>
      supabase
        .from("citas")
        .insert({
          negocio_id: negocioId,
          /* Los intentos se reparten entre los productos de la categoría cuando
             hay más de uno: el choque tiene que darse igual, porque el
             calendario es del profesional y no del servicio. */
          producto_id: otroProducto && i % 2 === 1 ? otroProducto.id : productoId,
          categoria_id: categoriaId,
          recurso_id: recursoId,
          rango,
          cupo: (i % cupos) + 1,
          nombre_cliente: `Prueba ${i + 1}`,
          telefono_cliente: "59170000000",
        })
        .select("id")
        .maybeSingle(),
    );
    const resultados = await Promise.all(intentos);
    const ganaron = resultados.filter(({ error }) => !error).length;
    const chocaron = resultados.filter(({ error }) => error?.code === "23P01").length;

    if (ganaron !== cupos) {
      const otro = resultados.find(({ error }) => error && error.code !== "23P01");
      console.error(
        `✗ ${etiqueta}: entraron ${ganaron}, se esperaban ${cupos}` +
          (otro ? ` — ${otro.error.code}: ${otro.error.message}` : ""),
      );
      fallos += 1;
    } else {
      /* Lo que importa es **cuántos entraron**, no con qué código rebotaron los
         demás. Bajo concurrencia Postgres también puede devolver un fallo de
         serialización o un interbloqueo en vez de la violación de exclusión:
         los tres significan «este no entró», que es la garantía. Exigir el
         código exacto hacía fallar una corrida correcta. */
      const codigos = [...new Set(resultados.filter((r) => r.error).map((r) => r.error.code))];
      console.log(
        `✓ ${etiqueta}: ${ganaron} entraron, ${cantidad - ganaron} rebotaron` +
          ` (${chocaron} por choque${codigos.length > 1 ? `, códigos ${codigos.join(", ")}` : ""})`,
      );
    }
  }

  await intentar(8, 1, otroProducto
    ? "un cupo, ocho pedidos a la vez entre dos servicios"
    : "un cupo, ocho pedidos a la vez");

  await supabase.from("citas").delete().eq("recurso_id", recursoId).filter("rango", "eq", rango);
  await intentar(8, 2, "dos cupos, ocho pedidos a la vez");

  /* Cancelar libera: la exclusión deja fuera las canceladas, así que el horario
     vuelve a estar disponible. */
  const { data: activas } = await supabase
    .from("citas")
    .select("id,cupo")
    .eq("recurso_id", recursoId)
    .filter("rango", "eq", rango)
    .neq("estado", "cancelada");

  if (activas && activas.length > 0) {
    await supabase
      .from("citas")
      .update({ estado: "cancelada", cancelado_en: new Date().toISOString() })
      .eq("id", activas[0].id);

    /* Se vuelve a pedir **el cupo que se acaba de liberar**, no el número uno:
       con dos consultorios ocupados, insertar siempre en el primero probaría
       otra cosa y fallaría aunque cancelar funcione. */
    const { error } = await supabase.from("citas").insert({
      negocio_id: negocioId,
      producto_id: productoId,
      categoria_id: categoriaId,
      recurso_id: recursoId,
      rango,
      cupo: activas[0].cupo,
      nombre_cliente: "Después de cancelar",
      telefono_cliente: "59170000000",
    });
    if (error) {
      console.error(`✗ cancelar no liberó el cupo: ${error.message}`);
      fallos += 1;
    } else {
      console.log("✓ cancelar libera el horario");
    }
  }

  await supabase.from("citas").delete().eq("recurso_id", recursoId).filter("rango", "eq", rango);

  if (fallos > 0) {
    console.error(`\n${fallos} comprobación(es) fallaron. El doble agendamiento es posible.`);
    process.exit(1);
  }
  console.log("\nCitas: la restricción de exclusión impide el doble agendamiento.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
