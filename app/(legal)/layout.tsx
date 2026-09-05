import type { ReactNode } from "react";

import { PieSitio } from "../../components/sitio/pie-sitio";

export default function LayoutLegal({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      {children}
      <PieSitio />
    </>
  );
}
