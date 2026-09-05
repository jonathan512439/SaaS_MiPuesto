import type { ReactNode } from "react";

import { ProveedorAvisos } from "../../../components/ui/proveedor-avisos";
import { ProveedorConfirmacion } from "../../../components/ui/proveedor-confirmacion";
import { PieSitio } from "../../../components/sitio/pie-sitio";

/* Monta los mismos proveedores que el panel del negocio en vez de volver a los
   diálogos del navegador: `window.confirm` se sacó del proyecto entero en la
   fase 10 porque no se puede enfocar la salida segura ni traducir sus botones. */
export default function LayoutPlataforma({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ProveedorAvisos>
      <ProveedorConfirmacion>
        {children}
        <PieSitio />
      </ProveedorConfirmacion>
    </ProveedorAvisos>
  );
}
