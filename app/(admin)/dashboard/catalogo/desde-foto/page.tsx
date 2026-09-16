import { redirect } from "next/navigation";

import { RUTAS_PANEL } from "../../../../../lib/panel/rutas";

/* La herramienta se mudó a «Herramientas» en la reorganización del panel. Esto
   queda por lo que el dueño guardó en favoritos. Está en `RUTAS_MUDADAS`, y una
   prueba comprueba que siga acá. */
export default function PaginaDesdeFotoMudada() {
  redirect(RUTAS_PANEL.desdeFoto);
}
