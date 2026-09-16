import { redirect } from "next/navigation";

import { RUTAS_PANEL } from "../../../../lib/panel/rutas";

/* La agenda dejó de tener pantalla propia: los turnos se ven junto con los
   pedidos, porque son el mismo trabajo. Esto queda por lo que el dueño guardó en
   favoritos. Está en `RUTAS_MUDADAS`, y una prueba comprueba que siga acá. */
export default function PaginaAgendaMudada() {
  redirect(RUTAS_PANEL.pedidos);
}
