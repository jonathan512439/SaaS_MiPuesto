import type { ReactNode } from "react";

import { PieSitio } from "../../components/sitio/pie-sitio";

/* El catálogo de un negocio lleva la firma de MiPuesto y no la del estudio que
   lo construyó: quien mira una vitrina puede querer la suya, y ese es el único
   mensaje que le sirve. El crédito al desarrollador vive en las páginas propias. */
export default function LayoutPublico({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      {children}
      <PieSitio variante="catalogo" />
    </>
  );
}
