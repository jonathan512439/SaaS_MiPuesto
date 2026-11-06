import { describe, expect, it } from "vitest";

import { leerPorTandas } from "./lectura-por-tandas";

const sinPausa = async () => undefined;

describe("leer por tandas", () => {
  it("devuelve cada resultado en el lugar de su tanda, aunque terminen desordenadas", async () => {
    const leer = async (tanda: number) => {
      await new Promise((resolver) => setTimeout(resolver, (4 - tanda) * 3));
      return { correcto: true, tanda };
    };
    const resultados = await leerPorTandas([1, 2, 3], leer, sinPausa);
    expect(resultados.map(({ tanda }) => tanda)).toEqual([1, 2, 3]);
  });

  it("no pide más de dos a la vez", async () => {
    let enCurso = 0;
    let maximo = 0;
    const leer = async () => {
      enCurso += 1;
      maximo = Math.max(maximo, enCurso);
      await new Promise((resolver) => setTimeout(resolver, 2));
      enCurso -= 1;
      return { correcto: true };
    };
    await leerPorTandas([1, 2, 3, 4, 5], leer, sinPausa);
    expect(maximo).toBe(2);
  });

  it("vuelve a intentar la que falló, al final y con una pausa", async () => {
    const pedidos: number[] = [];
    const pausas: number[] = [];
    const leer = async (tanda: number) => {
      pedidos.push(tanda);
      return { correcto: !(tanda === 2 && pedidos.filter((una) => una === 2).length === 1) };
    };
    const resultados = await leerPorTandas([1, 2, 3], leer, async (ms) => void pausas.push(ms));
    expect(resultados.every(({ correcto }) => correcto)).toBe(true);
    expect(pedidos.at(-1)).toBe(2);
    expect(pedidos).toHaveLength(4);
    expect(pausas).toEqual([3000]);
  });

  it("si sigue fallando, entrega lo demás y deja marcada la perdida", async () => {
    const resultados = await leerPorTandas([1, 2, 3], async (tanda) => ({ correcto: tanda !== 2 }), sinPausa);
    expect(resultados.map(({ correcto }) => correcto)).toEqual([true, false, true]);
  });

  it("una sola tanda no se reintenta acá: ya lo hace la llamada al modelo", async () => {
    let pedidos = 0;
    await leerPorTandas(
      [1],
      async () => {
        pedidos += 1;
        return { correcto: false };
      },
      sinPausa,
    );
    expect(pedidos).toBe(1);
  });
});
