import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { TOPE_FOTOS_POR_DIA, TOPE_FOTOS_POR_MES } from "../ia/limites";

/* La página de privacidad enumera dónde viven los datos. Cuando se sumó la
   lectura de fotos, Google pasó a procesar fotografías de los clientes y la
   página siguió nombrando solo a Supabase y a Cloudflare durante días.
   Nada falla cuando eso pasa: el sitio compila, las pruebas pasan y el texto
   publicado queda incompleto.

   **Al sumar un proveedor externo hay que sumarlo también a esta lista y a la
   página.** Esta prueba no puede descubrir uno nuevo por su cuenta; lo que hace
   es impedir que se caiga uno de los que ya están declarados. */
const PROCESADORES = ["Supabase", "Cloudflare", "Google"];

const RAIZ = join(import.meta.dirname, "..", "..", "app", "(legal)");
const privacidad = readFileSync(join(RAIZ, "privacidad", "page.tsx"), "utf8");
const terminos = readFileSync(join(RAIZ, "terminos", "page.tsx"), "utf8");

describe("páginas legales", () => {
  /* Se mira la sección que enumera, no el archivo entero. Buscar el nombre en
     cualquier parte deja pasar el caso real: que el proveedor se mencione de
     pasada en otro párrafo y falte justo en la lista de dónde viven los datos,
     que es la que alguien lee para saberlo. */
  it("la sección «dónde viven los datos» nombra a todos los proveedores", () => {
    const desde = privacidad.indexOf("<h2>Dónde viven los datos</h2>");
    expect(desde, "no se encontró la sección de dónde viven los datos").toBeGreaterThan(-1);
    const seccion = privacidad.slice(desde, privacidad.indexOf("</section>", desde));

    for (const procesador of PROCESADORES) {
      expect(seccion, `la lista de dónde viven los datos no nombra a ${procesador}`).toContain(
        procesador,
      );
    }
  });

  /* Antes esta prueba **exigía** hablar del nivel gratuito, porque el texto lo
     hacía y había que obligarlo a decir qué implicaba. El nivel dejó de
     nombrarse al pasar al plan de pago, así que lo que queda por vigilar es lo
     de siempre pero al revés: que la página no prometa de más.
     «Google no usa tus fotos para entrenar» es exactamente la frase que alguien
     querría escribir y que nosotros no podemos sostener: depende del plan
     contratado y de los términos de un tercero, las dos cosas fuera de este
     repositorio. Lo que sí podemos sostener —y la página dice— es qué se envía,
     qué no, y que se pueden apagar las herramientas. */
  it("la privacidad no promete lo que no podemos sostener", () => {
    for (const promesa of [/no (?:se )?usan? .{0,40}entrenar/i, /nunca .{0,30}entrenar/i]) {
      expect(privacidad, `la página promete algo que depende de un tercero: ${promesa}`).not.toMatch(
        promesa,
      );
    }
  });

  /* Si algún día el texto vuelve a nombrar el nivel gratuito, tiene que volver a
     decir qué implica: decir «gratuito» sin la consecuencia es la mitad del
     dato, que es peor que no decirlo. */
  it("si nombra el nivel gratuito, dice qué implica", () => {
    if (privacidad.includes("nivel gratuito")) {
      expect(privacidad).toContain("mejorar sus");
    }
  });

  /* Los topes se importan del código en vez de escribirse. Si alguien los
     reemplazara por un número a mano, la página podría prometer una cifra que el
     sistema no cumple. */
  it("los términos citan los topes desde el código", () => {
    expect(terminos).toContain("TOPE_FOTOS_POR_DIA");
    expect(terminos).toContain("TOPE_FOTOS_POR_MES");
    expect(terminos).not.toContain(`${TOPE_FOTOS_POR_DIA} fotografías por día`);
    expect(terminos).not.toContain(`${TOPE_FOTOS_POR_MES} por mes`);
  });

  it("los términos avisan que la lectura la hace un proveedor externo", () => {
    expect(terminos).toContain("proveedor externo");
    expect(terminos).toContain("Google");
  });
});
