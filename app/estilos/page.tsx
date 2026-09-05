import type { Metadata } from "next";

import { PieSitio } from "../../components/sitio/pie-sitio";
import { MuestraEstilos } from "./muestra-estilos";

export const metadata: Metadata = {
  title: "Sistema de diseño | MiPuesto",
  description: "Referencia interna de tokens y componentes base de MiPuesto.",
};

export default function PaginaEstilos() {
  return (
    <>
      <MuestraEstilos />
      <PieSitio />
    </>
  );
}
