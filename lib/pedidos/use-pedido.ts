"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import type { ProductoPlantilla } from "../plantillas/tipos";
import { limitarCantidadReserva } from "../reservas";
import { guardarPedido, leerPedidoGuardado } from "./pedido-guardado";

/* El pedido en curso, vivo en dos pantallas.
 *
 * Vivía adentro del catálogo, que era su única casa: se agregaba desde la
 * tarjeta y se miraba en la hoja del carrito, todo sin salir de la página. Al
 * pasar la ficha del producto a una página propia eso dejó de alcanzar: quien
 * entra a ver «Pollo broaster entero», lee la descripción y quiere pedirlo tiene
 * que poder hacerlo ahí, y lo que agregue tiene que estar en el carrito al
 * volver al catálogo.
 *
 * Dos copias de esta lógica serían, tarde o temprano, dos pedidos distintos del
 * mismo cliente: alcanza con que una recorte al máximo disponible y la otra no.
 * Así que hay una sola, y las dos pantallas la usan.
 *
 * El almacén es `sessionStorage` —lo de siempre—, así que la ida y vuelta entre
 * el catálogo y la página del producto no pierde nada, ni siquiera si el
 * teléfono descarta la pestaña en el camino. */
export type Pedido = {
  cantidades: Record<string, number>;
  elegidos: Record<string, ProductoPlantilla>;
  /* `null` o `0` saca el producto del pedido. Recibe el producto entero y no su
     identificador porque el carrito guarda su propia copia: con la paginación en
     el servidor, la página que se está mirando ya no contiene necesariamente lo
     que el cliente eligió antes. */
  cambiarCantidad: (producto: ProductoPlantilla, cantidad: number) => void;
  vaciar: () => void;
  /* Falso hasta que se leyó lo guardado. El servidor no tiene `sessionStorage`,
     así que el primer dibujo es siempre un pedido vacío; sin esta señal, una
     barra de «ver pedido» parpadearía apagada antes de mostrar lo que hay. */
  leido: boolean;
};

function suscribirInmutable() {
  return () => {};
}

export function usePedido(negocioId: string): Pedido {
  /* sessionStorage no existe al renderizar en el servidor; useSyncExternalStore
     da esa distinción sin encender estado en un efecto. */
  const montado = useSyncExternalStore(suscribirInmutable, () => true, () => false);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [elegidos, setElegidos] = useState<Record<string, ProductoPlantilla>>({});
  const [negocioLeido, setNegocioLeido] = useState("");

  /* Se ajusta durante el dibujo y no en un efecto: así la primera pantalla que
     ve el cliente ya trae su pedido, sin el paso intermedio en que el carrito
     aparece vacío. */
  if (montado && negocioLeido !== negocioId) {
    const guardado = leerPedidoGuardado(negocioId);
    setNegocioLeido(negocioId);
    setCantidades(guardado.cantidades);
    setElegidos(guardado.elegidos);
  }

  const leido = negocioLeido === negocioId;

  useEffect(() => {
    /* No se guarda antes de leer: escribiría el pedido vacío del primer dibujo
       encima del que el cliente ya tenía. */
    if (!leido) return;
    guardarPedido(negocioId, { cantidades, elegidos });
  }, [cantidades, elegidos, leido, negocioId]);

  function cambiarCantidad(producto: ProductoPlantilla, cantidad: number) {
    setCantidades((actuales) => {
      const siguientes = { ...actuales };
      if (cantidad <= 0) delete siguientes[producto.id];
      else siguientes[producto.id] = limitarCantidadReserva(cantidad, producto.maximoCantidad);
      return siguientes;
    });
    setElegidos((actuales) => {
      if (cantidad <= 0) {
        const siguientes = { ...actuales };
        delete siguientes[producto.id];
        return siguientes;
      }
      return { ...actuales, [producto.id]: producto };
    });
  }

  function vaciar() {
    setCantidades({});
    setElegidos({});
  }

  return { cantidades, elegidos, cambiarCantidad, vaciar, leido };
}
