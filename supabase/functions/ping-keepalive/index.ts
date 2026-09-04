declare const Deno: {
  env: { get(nombre: string): string | undefined };
  serve(
    manejador: (solicitud: Request) => Response | Promise<Response>,
  ): void;
};

const MESES_RETENCION = 6;
const CABECERAS_JSON = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function responder(estadoHttp: number, cuerpo: Record<string, unknown>) {
  return new Response(JSON.stringify(cuerpo), {
    status: estadoHttp,
    headers: CABECERAS_JSON,
  });
}

async function huella(valor: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valor)),
  );
}

async function secretosCoinciden(esperado: string, recibido: string) {
  const [huellaEsperada, huellaRecibida] = await Promise.all([
    huella(esperado),
    huella(recibido),
  ]);
  let diferencia = 0;

  for (let indice = 0; indice < huellaEsperada.length; indice += 1) {
    diferencia |= huellaEsperada[indice] ^ huellaRecibida[indice];
  }

  return diferencia === 0;
}

function restarMeses(fecha: Date, cantidad: number) {
  const resultado = new Date(fecha);
  const diaOriginal = resultado.getUTCDate();
  resultado.setUTCDate(1);
  resultado.setUTCMonth(resultado.getUTCMonth() - cantidad);
  const ultimoDia = new Date(
    Date.UTC(resultado.getUTCFullYear(), resultado.getUTCMonth() + 1, 0),
  ).getUTCDate();
  resultado.setUTCDate(Math.min(diaOriginal, ultimoDia));
  return resultado;
}

function obtenerCantidad(cabecera: string | null) {
  const coincidencia = cabecera?.match(/\/(\d+)$/);
  return coincidencia ? Number(coincidencia[1]) : 0;
}

async function manejarKeepalive(solicitud: Request) {
  if (solicitud.method !== "POST") {
    return new Response(JSON.stringify({ estado: "metodo_no_permitido" }), {
      status: 405,
      headers: { ...CABECERAS_JSON, Allow: "POST" },
    });
  }

  const secretoEsperado = Deno.env.get("KEEPALIVE_SECRET") ?? "";
  const secretoRecibido = solicitud.headers.get("x-mipuesto-keepalive") ?? "";
  if (secretoEsperado.length < 40) {
    return responder(503, { estado: "configuracion_incompleta" });
  }
  if (
    secretoRecibido.length > 256 ||
    !(await secretosCoinciden(secretoEsperado, secretoRecibido))
  ) {
    return responder(401, { estado: "no_autorizado" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRole) {
    return responder(503, { estado: "configuracion_incompleta" });
  }

  const cabecerasBase = {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
  };

  try {
    const urlConsulta = new URL("/rest/v1/negocios", supabaseUrl);
    urlConsulta.searchParams.set("select", "id");
    urlConsulta.searchParams.set("limit", "1");
    const consulta = await fetch(urlConsulta, {
      headers: { ...cabecerasBase, "Accept-Profile": "public" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!consulta.ok) throw new Error(`consulta_${consulta.status}`);

    const limiteRetencion = restarMeses(new Date(), MESES_RETENCION).toISOString();
    const urlRetencion = new URL("/rest/v1/pedidos", supabaseUrl);
    urlRetencion.searchParams.set("estado", "in.(confirmado,cancelado,expirado)");
    urlRetencion.searchParams.set("creado_en", `lt.${limiteRetencion}`);
    urlRetencion.searchParams.set(
      "or",
      "(cliente_nombre.not.is.null,cliente_telefono.not.is.null)",
    );
    const retencion = await fetch(urlRetencion, {
      method: "PATCH",
      headers: {
        ...cabecerasBase,
        "Content-Profile": "public",
        "Content-Type": "application/json",
        Prefer: "count=exact,return=minimal",
      },
      body: JSON.stringify({ cliente_nombre: null, cliente_telefono: null }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!retencion.ok) throw new Error(`retencion_${retencion.status}`);

    return responder(200, {
      estado: "ok",
      consultadoEn: new Date().toISOString(),
      pedidosAnonimizados: obtenerCantidad(retencion.headers.get("content-range")),
      retencionMeses: MESES_RETENCION,
    });
  } catch (error) {
    console.error(
      "mipuesto_keepalive_error",
      error instanceof Error ? error.message : "error_desconocido",
    );
    return responder(503, { estado: "servicio_no_disponible" });
  }
}

Deno.serve(manejarKeepalive);
