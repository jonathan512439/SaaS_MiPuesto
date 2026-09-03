"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ComponentType } from "react";

import type { PaletaId, PlantillaId } from "../../lib/apariencia";
import type {
  DatosPlantilla,
  ProductoPlantilla,
  PropiedadesPlantilla,
} from "../../lib/plantillas/tipos";
import { limitarCantidadReserva } from "../../lib/reservas";
import { CarritoCatalogo } from "../carrito/carrito-catalogo";

type PropiedadesCatalogoInteractivo = {
  datos: DatosPlantilla;
  plantilla: PlantillaId;
  paleta: PaletaId;
};

const VISTAS: Record<PlantillaId, ComponentType<PropiedadesPlantilla>> = {
  clasica: dynamic(() =>
    import("../templates/clasica/plantilla-clasica").then(
      (modulo) => modulo.PlantillaClasica,
    ),
  ),
  moderna: dynamic(() =>
    import("../templates/moderna/plantilla-moderna").then(
      (modulo) => modulo.PlantillaModerna,
    ),
  ),
  minimal: dynamic(() =>
    import("../templates/minimal/plantilla-minimal").then(
      (modulo) => modulo.PlantillaMinimal,
    ),
  ),
};

function obtenerProductos(datos: DatosPlantilla): ProductoPlantilla[] {
  return datos.categorias.flatMap((categoria) => [
    ...categoria.productos,
    ...(categoria.subcategorias ?? []).flatMap(
      (subcategoria) => subcategoria.productos,
    ),
  ]);
}

export function CatalogoInteractivo({
  datos,
  plantilla,
  paleta,
}: PropiedadesCatalogoInteractivo) {
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const productos = useMemo(() => obtenerProductos(datos), [datos]);
  const Vista = VISTAS[plantilla];

  function cambiarCantidad(productoId: string, cantidad: number) {
    const producto = productos.find(({ id }) => id === productoId);
    if (!producto) return;
    setCantidades((actuales) => {
      const siguientes = { ...actuales };
      if (cantidad <= 0) delete siguientes[productoId];
      else siguientes[productoId] = limitarCantidadReserva(cantidad, producto.maximoCantidad);
      return siguientes;
    });
  }

  function agregarProducto(productoId: string) {
    cambiarCantidad(productoId, (cantidades[productoId] ?? 0) + 1);
  }

  return (
    <>
      <Vista
        alAgregarProducto={agregarProducto}
        cantidadesCarrito={cantidades}
        datos={datos}
        demostracion={false}
        paleta={paleta}
      />
      <CarritoCatalogo
        cantidades={cantidades}
        datos={datos}
        onCambiarCantidad={cambiarCantidad}
        paleta={paleta}
        productos={productos}
      />
    </>
  );
}
