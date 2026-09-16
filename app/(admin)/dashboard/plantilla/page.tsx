import { redirect } from "next/navigation";

import { RUTAS_PANEL } from "../../../../lib/panel/rutas";

/* La pantalla se llama «Apariencia» desde la reorganización del panel. Esto
   queda por lo que el dueño guardó en favoritos y por lo que quedó escrito en
   los chats de soporte: sin esto, esas direcciones dan 404 y parece que el panel
   se rompió. Está en `RUTAS_MUDADAS`, y una prueba comprueba que siga acá. */
export default function PaginaPlantillaMudada() {
  redirect(RUTAS_PANEL.apariencia);
}
