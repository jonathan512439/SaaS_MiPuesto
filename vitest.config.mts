import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    /* Las pruebas corren también en Cloudflare antes de cada publicación
       (`prebuild:vinext`), en una máquina que puede ser bastante más lenta que
       la de desarrollo. Con el límite de cinco segundos de siempre, una prueba
       lenta pero correcta bloquearía una publicación buena. Veinte alcanzan
       para eso y siguen cortando una prueba colgada. */
    testTimeout: 20_000,
  },
});
