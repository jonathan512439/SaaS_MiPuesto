/* Los dos techos del plan gratuito de Supabase, que son distintos y se llenan
   por caminos distintos: las fotografías van a los baldes y todo lo demás
   —productos, pedidos, analítica— engorda la base. Estar cómodo en uno no dice
   nada del otro, y por eso se miden por separado.

   Al pasar al plan pago hay que cambiar estos dos números y nada más: 100 GB de
   archivos y 8 GB de base. */
export const LIMITE_ARCHIVOS_BYTES = 1024 * 1024 * 1024;
export const LIMITE_BASE_BYTES = 500 * 1024 * 1024;

/* Se avisa a la mitad y no al 90 %: mudarse de plan, o limpiar, lleva días, y
   enterarse con el disco lleno es enterarse tarde. */
const UMBRAL_ATENCION = 0.5;
const UMBRAL_CRITICO = 0.8;

export type NivelUso = "holgado" | "atencion" | "critico";

export type UsoNegocio = {
  negocio_id: string;
  nombre: string;
  slug: string;
  activo: boolean;
  bytes: number;
  archivos: number;
};

export type UsoAlmacenamiento = {
  negocios: UsoNegocio[];
  bytes_totales: number;
  archivos_totales: number;
  archivos_huerfanos: number;
  bytes_base_datos: number;
  medido_en: string;
};

const UNIDADES = ["B", "KB", "MB", "GB", "TB"];

export function formatearBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const escala = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNIDADES.length - 1);
  const valor = bytes / 1024 ** escala;
  /* Sin decimales a partir de los megabytes: «812 MB» se lee de un vistazo y
     «811,7 MB» no agrega nada para decidir si hay que mudarse de plan. */
  const decimales = escala >= 2 && valor < 10 ? 1 : 0;
  return `${valor.toFixed(escala === 0 ? 0 : decimales)} ${UNIDADES[escala]}`;
}

export function calcularPorcentaje(bytes: number, limite: number): number {
  if (limite <= 0) return 0;
  return Math.min(100, Math.round((bytes / limite) * 1000) / 10);
}

export function nivelDeUso(bytes: number, limite: number): NivelUso {
  if (limite <= 0) return "holgado";
  const proporcion = bytes / limite;
  if (proporcion >= UMBRAL_CRITICO) return "critico";
  if (proporcion >= UMBRAL_ATENCION) return "atencion";
  return "holgado";
}

/* Con la ocupación de hoy y la cantidad de negocios, cuántos más entran antes
   de llenar el balde. Es la pregunta que de verdad se hace al vender: «¿puedo
   sumar diez clientes este mes?». */
export function negociosQueTodaviaEntran(
  bytesTotales: number,
  negociosConArchivos: number,
  limite: number = LIMITE_ARCHIVOS_BYTES,
): number | null {
  if (negociosConArchivos <= 0 || bytesTotales <= 0) return null;
  const promedio = bytesTotales / negociosConArchivos;
  return Math.max(0, Math.floor((limite - bytesTotales) / promedio));
}
