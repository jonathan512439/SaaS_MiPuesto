import { resumirCliente, ordenarPorUrgencia, type FiltroClientes, type NegocioPlataforma } from "../../lib/plataforma/clientes";
import type { PestanaPlataforma } from "../../lib/plataforma/pestanas";
import type { ClientePlataforma, DatosPlataforma } from "./pantalla-plataforma";

/* Datos inventados de la plataforma, para la prueba que la dibuja: cinco
 * negocios, uno en cada estado, y algo en cada sección. Nada sale de la base. */

const AHORA = new Date("2026-10-21T12:00:00-04:00");

const NEGOCIOS: Array<NegocioPlataforma & { plan: string; fotos: number }> = [
  { id: "n-1", slug: "brasaurbana", nombre: "Brasa Urbana", activo: true, suspendido_en: null, suscripcion_vence_en: "2026-11-20T12:00:00-04:00", creado_en: "2026-09-26T12:00:00-04:00", foto_ia_habilitada: true, plan_id: "activo", rubro: "restaurante", rubro_publico: "restaurante", plan: "activo", fotos: 37 },
  { id: "n-2", slug: "kantuta-moda", nombre: "Kantuta Moda", activo: true, suspendido_en: null, suscripcion_vence_en: "2026-10-24T12:00:00-04:00", creado_en: "2026-09-02T12:00:00-04:00", foto_ia_habilitada: false, plan_id: "catalogo", rubro: "ropa_y_calzado", rubro_publico: "ropa_y_calzado", plan: "catalogo", fotos: 0 },
  { id: "n-3", slug: "huellitas-veterinaria", nombre: "Huellitas Veterinaria", activo: true, suspendido_en: null, suscripcion_vence_en: "2026-10-18T12:00:00-04:00", creado_en: "2026-09-27T12:00:00-04:00", foto_ia_habilitada: false, plan_id: "catalogo", rubro: "veterinaria", rubro_publico: "veterinaria", plan: "catalogo", fotos: 0 },
  { id: "n-4", slug: "la-esquina-del-sabor", nombre: "La Esquina del Sabor", activo: false, suspendido_en: "2026-10-05T12:00:00-04:00", suscripcion_vence_en: "2026-10-01T12:00:00-04:00", creado_en: "2026-09-05T12:00:00-04:00", foto_ia_habilitada: false, plan_id: "catalogo", rubro: "restaurante", rubro_publico: "polleria", plan: "catalogo", fotos: 0 },
  { id: "n-5", slug: "mundo-mil-cosas", nombre: "Mundo Mil Cosas", activo: false, suspendido_en: null, suscripcion_vence_en: "2026-12-01T12:00:00-04:00", creado_en: "2026-09-25T12:00:00-04:00", foto_ia_habilitada: false, plan_id: "catalogo", rubro: "otro", rubro_publico: "importados", plan: "catalogo", fotos: 0 },
];

export function datosDeMuestra(pestana: PestanaPlataforma = "negocios", filtro: FiltroClientes = "todos"): DatosPlataforma {
  const clientes: ClientePlataforma[] = ordenarPorUrgencia(NEGOCIOS.map((negocio) => resumirCliente(negocio, AHORA))).map(
    (cliente) => {
      const fila = NEGOCIOS.find(({ id }) => id === cliente.negocio.id)!;
      return {
        ...cliente,
        planId: fila.plan,
        planNombre: fila.plan === "activo" ? "Catálogo Activo" : "Catálogo",
        fotosUsadas: fila.fotos,
        topeFotos: fila.plan === "activo" ? 60 : 10,
      };
    },
  );
  const ventana = (llamadas: number) => ({ llamadas, tokens: llamadas * 1340 });

  return {
    pestana,
    filtro,
    clientes,
    resumen: { publicados: 3, atencion: 3, ingresoMensual: 400, conIa: 1 },
    consumo: {
      ia: {
        planes: Object.fromEntries(NEGOCIOS.map(({ id, plan }) => [id, plan])),
        uso: {
          minuto: ventana(0),
          hora: ventana(2),
          dia_cuota: ventana(9),
          dia_bolivia: ventana(9),
          mes: ventana(37),
          treinta_dias: ventana(41),
          pico_diario: 12,
          tokens_por_llamada: 1340,
          fallidas_hoy: 0,
          fallidas_treinta_dias: 1,
          por_herramienta: { lista: 21, producto: 16 },
          por_negocio: [
            { negocio_id: "n-1", nombre: "Brasa Urbana", hoy: 9, tokens_hoy: 12060, mes: 37, tokens_mes: 49580, cantidad_dia: 9 },
          ],
          negocios_habilitados: 1,
          ultima: "2026-10-21T11:40:00-04:00",
          reinicio_dia_cuota: "2026-10-22T03:00:00-04:00",
          medido_en: AHORA.toISOString(),
        },
      },
      almacenamiento: {
        uso: {
          negocios: NEGOCIOS.map(({ id, nombre, slug, activo }, indice) => ({
            negocio_id: id,
            nombre,
            slug,
            activo,
            bytes: (5 - indice) * 1_900_000,
            archivos: (5 - indice) * 14,
          })),
          bytes_totales: 28_500_000,
          archivos_totales: 210,
          archivos_huerfanos: 3,
          bytes_base_datos: 41_000_000,
          medido_en: AHORA.toISOString(),
        },
      },
    },
    etiquetas: {
      etiquetas: [
        { codigo: "K7XM2B", negocio_id: "n-1", nota: "Mesa 1", creado_en: "2026-10-18T12:00:00-04:00", ultimo_uso_en: "2026-10-20T19:30:00-04:00" },
        { codigo: "P4WQ9D", negocio_id: null, nota: "Lote de feria", creado_en: "2026-10-19T12:00:00-04:00", ultimo_uso_en: null },
      ],
      negocios: NEGOCIOS.map(({ id, nombre }) => ({ id, nombre })),
    },
    zonas: {
      zonas: [
        { id: "z-1", ciudad: "oruro", nombre: "Centro", latitud: -17.97, longitud: -67.11, activa: true },
        { id: "z-2", ciudad: "oruro", nombre: "Norte", latitud: -17.95, longitud: -67.11, activa: true },
      ],
      sinZona: [{ id: "n-2", nombre: "Kantuta Moda", ciudad: "oruro", zona_propuesta: "Sur" }],
    },
    buscador: {
      sinonimos: [{ termino: "polera", equivalentes: ["remera", "camiseta"] }],
      sinResultado: [{ termino: "salteñas", ciudad: "oruro", cantidad: 6, ultima_vez: "2026-10-20T10:00:00-04:00" }],
      totalSinResultado: 1,
    },
    tutoriales: {
      tutoriales: [
        { id: "t-1", numero: 1, titulo: "Tu Panel de administrador", descripcion: "Un recorrido por cada pantalla.", video: "01-a.mp4", portada: null, duracion_segundos: 95, publicado: true },
      ],
    },
  };
}
