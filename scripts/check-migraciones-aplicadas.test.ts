import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/* La guardia que frena un despliegue cuando a la base le falta una migración.
 *
 * El 2026-10-13 el código de la auditoría salió antes que sus migraciones y el
 * ajuste de precios y las fotos respondieron 500 hasta aplicarlas. Se prueba
 * de punta a punta: un sitio falso contesta `/api/salud` con el esquema que
 * cada caso necesita, y el script corre contra él como corre antes de
 * desplegar. */

const SCRIPT = join(import.meta.dirname, "check-migraciones-aplicadas.mjs");
let respuesta: unknown = null;
let servidor: Server;
let sitio: string;
let carpeta: string;

beforeAll(async () => {
  carpeta = mkdtempSync(join(tmpdir(), "migraciones-"));
  for (const archivo of ["20261104090000_a.sql", "20261105090000_b.sql", "20261106090000_c.sql", "notas.md"]) {
    writeFileSync(join(carpeta, archivo), "");
  }
  servidor = createServer((_pedido, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(typeof respuesta === "string" ? respuesta : JSON.stringify(respuesta));
  });
  await new Promise<void>((listo) => servidor.listen(0, "127.0.0.1", listo));
  sitio = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(() => {
  servidor.close();
  rmSync(carpeta, { recursive: true, force: true });
});

function correr(salud: unknown, entorno: Record<string, string> = {}) {
  respuesta = salud;
  return new Promise<{ codigo: number; salida: string }>((listo) => {
    execFile(
      process.execPath,
      [SCRIPT],
      { env: { ...process.env, SITIO_SALUD: sitio, MIGRACIONES_DIR: carpeta, ...entorno } },
      (error, stdout, stderr) => listo({ codigo: error ? Number(error.code ?? 1) : 0, salida: stdout + stderr }),
    );
  });
}

describe("check-migraciones-aplicadas", () => {
  it("deja desplegar con la base al día", async () => {
    const { codigo, salida } = await correr({ estado: "ok", esquema: "20261106090000" });
    expect(codigo).toBe(0);
    expect(salida).toContain("al día");
  });

  it("frena si a la base le falta una migración, y dice cuál", async () => {
    const { codigo, salida } = await correr({ estado: "ok", esquema: "20261104090000" });
    expect(codigo).toBe(1);
    expect(salida).toContain("20261105090000_b.sql");
    expect(salida).toContain("20261106090000_c.sql");
    expect(salida).not.toContain("20261104090000_a.sql");
  });

  it("deja pasar una base más nueva que el código", async () => {
    const { codigo } = await correr({ estado: "ok", esquema: "20261107090000" });
    expect(codigo).toBe(0);
  });

  it("deja pasar el código de antes de la guardia, que todavía no informa su esquema", async () => {
    const { codigo, salida } = await correr({ estado: "ok", marca: "topes-por-plan" });
    expect(codigo).toBe(0);
    expect(salida).toContain("todavía no informa");
  });

  it("frena si no puede saberlo: sitio enfermo, esquema sin leer o respuesta rota", async () => {
    for (const salud of [{ estado: "tareas_atrasadas", atrasadas: 1 }, { estado: "ok", esquema: null }, "<html>"]) {
      const { codigo } = await correr(salud);
      expect(codigo).toBe(1);
    }
  });

  it("con la variable de escape despliega sin preguntar", async () => {
    const { codigo, salida } = await correr("<html>", { DESPLEGAR_SIN_MIRAR_MIGRACIONES: "1" });
    expect(codigo).toBe(0);
    expect(salida).toContain("Quítala después");
  });
});

describe("dónde corre la guardia", () => {
  it("antes de cada despliegue, local o de Cloudflare", () => {
    const paquete = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
    expect(paquete.scripts["predeploy:vinext"]).toContain("check-migraciones-aplicadas.mjs");
  });

  it("y la salud informa el esquema aplicado", () => {
    const ruta = readFileSync(join(import.meta.dirname, "..", "app/api/salud/route.ts"), "utf8");
    expect(ruta).toMatch(/rpc\("esquema_aplicado"\)/);
    expect(ruta).toMatch(/esquema: esquema\.error \? null : esquema\.data/);
  });
});
