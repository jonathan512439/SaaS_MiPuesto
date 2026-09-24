/* La IP no se guarda nunca: se guarda su firma. Sirve igual para contar cuántas
   veces vino el mismo visitante, y deja de ser un dato personal que custodiar.

   Vive acá y no dentro de una ruta porque ahora la usan dos —los pedidos y la
   analítica— y dos copias de un cálculo criptográfico terminan divergiendo. */
export function obtenerIpSolicitud(solicitud: Request): string {
  const ipCloudflare = solicitud.headers.get("cf-connecting-ip")?.trim();
  if (ipCloudflare) return ipCloudflare.slice(0, 64);
  const primeraIp = solicitud.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (primeraIp || "entorno-local").slice(0, 64);
}

/* La clave HMAC importada, guardada mientras viva el isolate. Importarla en
   cada pedido costaba un cuarto de milisegundo de CPU, y en el plan gratuito de
   Cloudflare cada pedido tiene diez. Se guarda junto con el secreto del que
   salió: si el secreto cambia, se vuelve a importar. */
let claveGuardada: { secreto: string; clave: Promise<CryptoKey> } | null = null;

function claveHmac(secreto: string): Promise<CryptoKey> {
  if (claveGuardada?.secreto !== secreto) {
    const clave = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secreto),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    /* Una importación que falla no se queda guardada. */
    clave.catch(() => {
      if (claveGuardada?.clave === clave) claveGuardada = null;
    });
    claveGuardada = { secreto, clave };
  }
  return claveGuardada.clave;
}

export async function crearHuellaIp(ip: string, secreto: string): Promise<string> {
  const clave = await claveHmac(secreto);
  const firma = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(firma), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/* El secreto de la firma es **propio** y no la clave de servicio de Supabase,
   que era lo que se usaba hasta el 2026-09-24. Mezclar los dos usos tenía dos
   costos: rotar la clave de Supabase —lo primero que se hace si se filtra—
   cambiaba todas las firmas y reiniciaba los topes por IP, y la clave más
   poderosa del sistema circulaba por un camino que no la necesita.

   Si falta, se falla en vez de firmar con algo débil: una firma con clave
   vacía la puede calcular cualquiera y el tope por IP deja de valer. Las rutas
   lo convierten en «no disponible en este entorno». `wrangler.jsonc` lo declara
   obligatorio, así que una publicación sin él no llega a producción. Se
   configura con `npm run cloudflare:secret:huella`. */
export const LARGO_MINIMO_SECRETO_HUELLA = 32;

export function leerSecretoHuella(): string {
  const secreto = process.env.HUELLA_IP_SECRETO ?? "";
  if (secreto.length < LARGO_MINIMO_SECRETO_HUELLA) {
    throw new Error("Falta HUELLA_IP_SECRETO, o es demasiado corto.");
  }
  return secreto;
}
