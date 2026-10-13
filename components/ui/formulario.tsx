"use client";

import { useSyncExternalStore, type ComponentPropsWithRef } from "react";

/* El formulario del proyecto: se envía por POST y no se deja tocar hasta que
 * la página cargó.
 *
 * Un formulario llega dibujado desde el servidor y recién después React toma
 * el control. En ese rato —segundos en un celular lento— los campos ya se ven y
 * se pueden tocar, pero lo que se toca **no llega al estado de React**: el
 * campo muestra lo elegido y al guardar se manda lo de antes. Pasó con la
 * modalidad: Huellitas se creó eligiendo «Tienda con carrito» y quedó en
 * «Catálogo para mostrar», y se reprodujo el 2026-10-13 eligiendo antes de que
 * cargara el JavaScript. Un nombre vacío lo frena la validación; una modalidad,
 * un precio o un teléfono cambiados se pierden sin aviso.
 *
 * `inert` deja el formulario entero sin tocar, escribir ni enfocar hasta que
 * carga, sin cambiar cómo se ve: no hay campos grises que parpadeen en cada
 * carga. Y `method="post"` por si igual se envía antes: los datos van en el
 * cuerpo, nunca en la dirección (`components/formularios-por-post.test.ts`).
 */

const sinSuscripcion = () => () => {};

export function Formulario(propiedades: Omit<ComponentPropsWithRef<"form">, "method">) {
  const listo = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  return <form {...propiedades} method="post" inert={!listo} />;
}
