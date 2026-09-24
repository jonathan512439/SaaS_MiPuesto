import { NextResponse, type NextRequest } from "next/server";

import { obtenerContextoAdminCatalogo } from "../../../../lib/catalogo/servidor";
import {
  armarPlantilla,
  nombreDeArchivoDePlantilla,
  rubrosConPlantilla,
} from "../../../../lib/importacion/plantillas";
import type { RubroId } from "../../../../lib/negocios/rubros";

/* La plantilla de Excel de un rubro, para llenar e importar.
 *
 * `GET` con el rubro en la dirección, como la exportación: se pide desde un
 * enlace común. No lee nada del negocio —la plantilla es la del rubro, igual
 * para todos—, pero pide sesión igual: es una herramienta del panel, no un
 * archivo público.
 */
export async function GET(solicitud: NextRequest) {
  const contexto = await obtenerContextoAdminCatalogo();
  if (!contexto.correcto) {
    return NextResponse.json({ error: contexto.error }, { status: contexto.estado });
  }

  const rubro = solicitud.nextUrl.searchParams.get("rubro") ?? "";
  if (!(rubrosConPlantilla() as string[]).includes(rubro)) {
    return NextResponse.json({ error: "Ese rubro no tiene plantilla." }, { status: 404 });
  }

  const archivo = armarPlantilla(rubro as RubroId);

  return new NextResponse(archivo as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreDeArchivoDePlantilla(rubro as RubroId)}"`,
      /* Sin guardar: si la plantilla mejora, el dueño tiene que bajarse la
         nueva, no una copia vieja. */
      "Cache-Control": "no-store",
    },
  });
}
