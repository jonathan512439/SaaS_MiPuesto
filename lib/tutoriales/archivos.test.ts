import { describe, expect, it } from "vitest";

import {
  type BaldeTutoriales,
  type ObjetoR2,
  type RangoR2,
  claveEnBalde,
  entregarArchivo,
  guardarEnBalde,
  leerRango,
  tipoDeArchivo,
} from "./archivos";

const VIDEO = "01-0123456789abcdef0123456789abcdef.mp4";
const CONTENIDO = Uint8Array.from({ length: 100 }, (_, i) => i);

/* Un balde en memoria que se porta como R2: recorta el rango al tamaño y
   rechaza uno que empieza después del final. */
function baldeEnMemoria(archivos: Record<string, Uint8Array<ArrayBuffer>>): BaldeTutoriales & { pedidos: string[] } {
  const pedidos: string[] = [];
  const objeto = (datos: Uint8Array<ArrayBuffer>): ObjetoR2 => ({ size: datos.length, httpEtag: `"${datos.length}"` });
  return {
    pedidos,
    async head(clave) {
      pedidos.push(`head ${clave}`);
      return archivos[clave] ? objeto(archivos[clave]) : null;
    },
    async get(clave, opciones) {
      pedidos.push(`get ${clave}`);
      const datos = archivos[clave];
      if (!datos) return null;
      const rango: RangoR2 | undefined = opciones?.range;
      let trozo = datos;
      if (rango && "suffix" in rango) trozo = datos.slice(Math.max(0, datos.length - rango.suffix));
      else if (rango) {
        if (rango.offset >= datos.length) throw new Error("InvalidRange");
        trozo = datos.slice(rango.offset, rango.length === undefined ? undefined : rango.offset + rango.length);
      }
      return { ...objeto(datos), range: rango, body: new Blob([trozo]).stream() };
    },
    async put() {
      throw new Error("no se usa");
    },
    async delete() {},
  };
}

const pedir = (cabeceras: Record<string, string> = {}, metodo = "GET") =>
  new Request("https://mi-puesto.com/api/tutoriales/x", { method: metodo, headers: cabeceras });

/* Lo que hace `FixedLengthStream` en Workers: deja pasar y corta si llega otra
   cantidad que la declarada. */
const largoFijo = (largo: number) => {
  let llegados = 0;
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(trozo, controlador) {
      llegados += trozo.length;
      if (llegados > largo) throw new Error("llegó de más");
      controlador.enqueue(trozo);
    },
    flush() {
      if (llegados !== largo) throw new Error("llegó de menos");
    },
  });
};

/* Un cuerpo que llega en trozos chicos, como por la red. */
const enTrozos = (datos: Uint8Array, tamano = 5) =>
  new ReadableStream<Uint8Array>({
    start(controlador) {
      for (let i = 0; i < datos.length; i += tamano) controlador.enqueue(datos.slice(i, i + tamano));
      controlador.close();
    },
  });

function baldeQueGuarda() {
  const guardados: Record<string, { datos: Uint8Array; tipo?: string }> = {};
  const balde: BaldeTutoriales = {
    async head() {
      return null;
    },
    async get() {
      return null;
    },
    async put(clave, valor, opciones) {
      const datos = new Uint8Array(await new Response(valor as ReadableStream<Uint8Array>).arrayBuffer());
      guardados[clave] = { datos, tipo: opciones?.httpMetadata?.contentType };
      return { size: datos.length, httpEtag: '"x"' };
    },
    async delete() {},
  };
  return { balde, guardados };
}

describe("guardarEnBalde", () => {
  const MP4 = Uint8Array.from([0, 0, 0, 16, ...new TextEncoder().encode("ftypisom"), ...new Array(40).fill(7)]);
  const esMp4 = (comienzo: Uint8Array) => new TextDecoder().decode(comienzo.subarray(4, 8)) === "ftyp";

  it("guarda el archivo entero aunque llegue en trozos, con su tipo", async () => {
    const { balde, guardados } = baldeQueGuarda();
    expect(await guardarEnBalde(balde, VIDEO, enTrozos(MP4), MP4.length, esMp4, largoFijo)).toBe("guardado");
    expect(guardados[`tutoriales/${VIDEO}`]).toEqual({ datos: MP4, tipo: "video/mp4" });
  });

  it("no guarda nada si el comienzo no es del formato", async () => {
    const { balde, guardados } = baldeQueGuarda();
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect(await guardarEnBalde(balde, VIDEO, enTrozos(html), html.length, esMp4, largoFijo)).toBe("formato");
    expect(guardados).toEqual({});
  });

  it("no guarda nada si llega otra cantidad que la declarada", async () => {
    const { balde, guardados } = baldeQueGuarda();
    await expect(guardarEnBalde(balde, VIDEO, enTrozos(MP4), MP4.length + 10, esMp4, largoFijo)).rejects.toThrow();
    await expect(guardarEnBalde(balde, VIDEO, enTrozos(MP4), MP4.length - 10, esMp4, largoFijo)).rejects.toThrow();
    expect(guardados).toEqual({});
  });

  it("no acepta un nombre fuera de forma", async () => {
    const { balde } = baldeQueGuarda();
    await expect(guardarEnBalde(balde, "../x.mp4", enTrozos(MP4), MP4.length, esMp4, largoFijo)).rejects.toThrow();
  });
});

describe("nombres de archivo", () => {
  it("acepta solo NN-<32 hex>.mp4 o .jpg", () => {
    expect(tipoDeArchivo(VIDEO)).toBe("video/mp4");
    expect(tipoDeArchivo("16-ffffffffffffffffffffffffffffffff.jpg")).toBe("image/jpeg");
    for (const malo of [
      "../negocios/foto.jpg",
      "01-0123456789abcdef0123456789abcdef.mp4.exe",
      "1-0123456789abcdef0123456789abcdef.mp4",
      "01-0123456789ABCDEF0123456789ABCDEF.mp4",
      "01-0123456789abcdef0123456789abcdef.webm",
      "tutoriales%2F01-0123456789abcdef0123456789abcdef.mp4",
    ]) {
      expect(tipoDeArchivo(malo), malo).toBeNull();
    }
  });

  it("guarda todo dentro de la carpeta de tutoriales", () => {
    expect(claveEnBalde(VIDEO)).toBe(`tutoriales/${VIDEO}`);
  });
});

describe("leerRango", () => {
  it("entiende las tres formas de una sola parte", () => {
    expect(leerRango("bytes=0-")).toEqual({ offset: 0 });
    expect(leerRango("bytes=10-19")).toEqual({ offset: 10, length: 10 });
    expect(leerRango("bytes=-30")).toEqual({ suffix: 30 });
  });

  it("ignora lo que no entiende, para entregar el archivo entero", () => {
    for (const raro of [null, "", "bytes=", "bytes=-", "bytes=-0", "bytes=20-10", "items=0-5", "bytes=0-5,10-15"]) {
      expect(leerRango(raro), String(raro)).toBeNull();
    }
  });
});

describe("entregarArchivo", () => {
  const balde = () => baldeEnMemoria({ [claveEnBalde(VIDEO)]: CONTENIDO });

  it("entrega el archivo entero, para guardar en caché para siempre", async () => {
    const respuesta = await entregarArchivo(balde(), VIDEO, pedir());
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe("video/mp4");
    expect(respuesta.headers.get("Content-Length")).toBe("100");
    expect(respuesta.headers.get("Accept-Ranges")).toBe("bytes");
    expect(respuesta.headers.get("Cache-Control")).toContain("immutable");
    expect(new Uint8Array(await respuesta.arrayBuffer())).toEqual(CONTENIDO);
  });

  it("entrega una parte con 206 y dice cuál", async () => {
    const respuesta = await entregarArchivo(balde(), VIDEO, pedir({ Range: "bytes=10-19" }));
    expect(respuesta.status).toBe(206);
    expect(respuesta.headers.get("Content-Range")).toBe("bytes 10-19/100");
    expect(respuesta.headers.get("Content-Length")).toBe("10");
    expect(respuesta.headers.get("Cache-Control")).toBe("no-store");
    expect(new Uint8Array(await respuesta.arrayBuffer())).toEqual(CONTENIDO.slice(10, 20));
  });

  it("recorta una parte que se pasa del final", async () => {
    const respuesta = await entregarArchivo(balde(), VIDEO, pedir({ Range: "bytes=90-500" }));
    expect(respuesta.status).toBe(206);
    expect(respuesta.headers.get("Content-Range")).toBe("bytes 90-99/100");
    expect(respuesta.headers.get("Content-Length")).toBe("10");
  });

  it("entrega los últimos bytes", async () => {
    const respuesta = await entregarArchivo(balde(), VIDEO, pedir({ Range: "bytes=-30" }));
    expect(respuesta.headers.get("Content-Range")).toBe("bytes 70-99/100");
    expect(new Uint8Array(await respuesta.arrayBuffer())).toEqual(CONTENIDO.slice(70));
  });

  it("responde 416 con el tamaño a una parte que empieza después del final", async () => {
    const respuesta = await entregarArchivo(balde(), VIDEO, pedir({ Range: "bytes=100-" }));
    expect(respuesta.status).toBe(416);
    expect(respuesta.headers.get("Content-Range")).toBe("bytes */100");
  });

  it("no vuelve a mandar lo que el navegador ya tiene", async () => {
    const respuesta = await entregarArchivo(balde(), VIDEO, pedir({ "If-None-Match": '"100"' }));
    expect(respuesta.status).toBe(304);
    expect(respuesta.body).toBeNull();
  });

  it("a HEAD le dice el tamaño sin bajar el archivo", async () => {
    const enMemoria = balde();
    const respuesta = await entregarArchivo(enMemoria, VIDEO, pedir({}, "HEAD"));
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Length")).toBe("100");
    expect(enMemoria.pedidos).toEqual([`head tutoriales/${VIDEO}`]);
  });

  it("un nombre fuera de forma no llega al balde", async () => {
    const enMemoria = balde();
    const respuesta = await entregarArchivo(enMemoria, "../respaldos/base.sql.gz", pedir());
    expect(respuesta.status).toBe(404);
    expect(enMemoria.pedidos).toEqual([]);
  });

  it("un archivo que no está es 404", async () => {
    const otro = "02-0123456789abcdef0123456789abcdef.mp4";
    expect((await entregarArchivo(balde(), otro, pedir())).status).toBe(404);
    expect((await entregarArchivo(balde(), otro, pedir({}, "HEAD"))).status).toBe(404);
  });
});
