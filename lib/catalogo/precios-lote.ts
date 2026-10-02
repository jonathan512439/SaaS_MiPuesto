export const AJUSTE_MINIMO = -50;
export const AJUSTE_MAXIMO = 50;
export const PRECIO_MAXIMO = 999999.99;

export type AjustePrecios = {
  categoria_id: string | null;
  porcentaje: number;
};

export type ResultadoValidacionAjuste =
  | { correcto: true; datos: AjustePrecios }
  | { correcto: false; error: string };

/* El redondeo va a dos decimales y hacia arriba desde la mitad, que es como se
   redondea un precio en el mostrador. Sin fijar esto, subir 10 % dejaría
   precios de tres decimales que la base recorta de otra manera. */
export function aplicarPorcentaje(precio: number, porcentaje: number): number {
  const ajustado = precio * (1 + porcentaje / 100);
  const redondeado = Math.round((ajustado + Number.EPSILON) * 100) / 100;
  /* Un precio no puede quedar en cero: sería regalar el producto por un error
     de tipeo. Se sostiene en el centavo mínimo y el dueño decide qué hacer. */
  return Math.min(PRECIO_MAXIMO, Math.max(0.01, redondeado));
}

/* La lista de cambios de un ajuste, para `aplicar_ajuste_de_precios`: cada
   producto con el precio que se leyó y el nuevo. La base ajusta solo los que
   siguen teniendo el precio leído, y todos o ninguno. Los que no cambian no
   viajan. */
export type CambioDePrecio = { id: string; precio_actual: number; precio_nuevo: number };

export function cambiosDeAjuste(
  productos: ReadonlyArray<{ id: string; precio: number | string }>,
  porcentaje: number,
): CambioDePrecio[] {
  return productos.flatMap(({ id, precio }) => {
    const actual = Number(precio);
    const nuevo = aplicarPorcentaje(actual, porcentaje);
    return nuevo === actual ? [] : [{ id, precio_actual: actual, precio_nuevo: nuevo }];
  });
}

export function validarAjustePrecios(entrada: unknown): ResultadoValidacionAjuste {
  if (typeof entrada !== "object" || entrada === null) {
    return { correcto: false, error: "Los datos enviados no son válidos." };
  }

  const valor = entrada as Record<string, unknown>;
  const porcentaje = Number(valor.porcentaje);

  if (!Number.isFinite(porcentaje) || porcentaje === 0) {
    return { correcto: false, error: "Escribe un porcentaje distinto de cero." };
  }
  if (porcentaje < AJUSTE_MINIMO || porcentaje > AJUSTE_MAXIMO) {
    return {
      correcto: false,
      error: `El ajuste debe estar entre ${AJUSTE_MINIMO} % y ${AJUSTE_MAXIMO} %.`,
    };
  }
  if (Math.round(porcentaje * 10) !== porcentaje * 10) {
    return { correcto: false, error: "Usa como máximo un decimal." };
  }

  const categoria = valor.categoria_id;
  if (categoria !== null && categoria !== undefined && typeof categoria !== "string") {
    return { correcto: false, error: "La categoría no es válida." };
  }

  return {
    correcto: true,
    datos: {
      categoria_id: typeof categoria === "string" && categoria ? categoria : null,
      porcentaje,
    },
  };
}
