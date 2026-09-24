import { expect, it } from "vitest";

/* Temporal: prueba que Cloudflare no publica si una prueba falla. */
it("falla a propósito para probar el freno de publicación", () => {
  expect(1).toBe(2);
});
