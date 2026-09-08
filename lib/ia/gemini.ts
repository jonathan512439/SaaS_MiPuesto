/* Cliente de Gemini. Vive solo en el servidor: la clave se trata igual que la
   privilegiada de Supabase y el guardián de secretos la vigila.

   **El modelo va en una constante y no escrito en cada llamada.** Al probar
   esta integración, `gemini-2.5-flash` —que era el modelo estable y obvio—
   respondió «no longer available to new users»: Google retira modelos y empuja
   a los nuevos. Con el nombre en un solo lugar, mudarse es cambiar una línea.

   Se usa la variante «lite» a propósito. Medido sobre una foto de producto:
   2,5 segundos contra 22 del modelo grande, con la misma respuesta útil. Para
   leer una etiqueta o una lista de precios no hace falta razonamiento profundo,
   y veintidós segundos mirando una pantalla que no dice nada es tiempo en que
   el comerciante abandona. */
const MODELO = "gemini-3.5-flash-lite";
const TIEMPO_LIMITE_MS = 30_000;

/* Un archivo cualquiera de los que el modelo entiende: una foto o un PDF. El
   PDF no viaja distinto —el mismo `inline_data` con su mime—, y comprobado con
   una lista de dos secciones: seis productos de seis, con su categoría, en 3,4
   segundos. Cada página cuesta unos 520 tokens, que es lo mismo que una foto. */
export type ArchivoParaAnalizar = {
  base64: string;
  tipo: string;
};

export type ResultadoAnalisis<T> =
  | { correcto: true; datos: T; tokens: number }
  | { correcto: false; motivo: "sin_clave" | "sin_respuesta" | "tardo_demasiado" | "rechazada" };

export function hayGemini(): boolean {
  return (process.env.GEMINI_API_KEY ?? "").length > 20;
}

/* Un solo reintento y solo ante fallas de red o del proveedor. Reintentar una
   respuesta que llegó pero no gustó es pagar dos veces por el mismo error. */
export async function analizarArchivo<T>(
  instruccion: string,
  esquema: Record<string, unknown>,
  archivo: ArchivoParaAnalizar,
): Promise<ResultadoAnalisis<T>> {
  const clave = process.env.GEMINI_API_KEY ?? "";
  if (clave.length <= 20) return { correcto: false, motivo: "sin_clave" };

  const cuerpo = JSON.stringify({
    contents: [
      {
        parts: [
          { text: instruccion },
          { inline_data: { mime_type: archivo.tipo, data: archivo.base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: esquema,
      /* Cero temperatura: leer una lista de precios no es una tarea creativa, y
         dos lecturas de la misma foto tienen que dar lo mismo. */
      temperature: 0,
    },
  });

  for (let intento = 0; intento < 2; intento += 1) {
    const cancelar = AbortController ? new AbortController() : null;
    const reloj = setTimeout(() => cancelar?.abort(), TIEMPO_LIMITE_MS);
    try {
      const respuesta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": clave },
          body: cuerpo,
          signal: cancelar?.signal,
        },
      );

      if (respuesta.status === 429 || respuesta.status >= 500) {
        if (intento === 0) continue;
        return { correcto: false, motivo: "sin_respuesta" };
      }
      if (!respuesta.ok) return { correcto: false, motivo: "rechazada" };

      const contenido = (await respuesta.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: { totalTokenCount?: number };
      };
      const texto = contenido.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!texto) return { correcto: false, motivo: "sin_respuesta" };

      /* El esquema obliga a JSON válido, pero un modelo puede devolver algo que
         no cumple. Si no se puede leer, se trata como si no hubiera respondido:
         nunca se le muestra al dueño algo a medio interpretar. */
      try {
        return {
          correcto: true,
          datos: JSON.parse(texto) as T,
          tokens: contenido.usageMetadata?.totalTokenCount ?? 0,
        };
      } catch {
        return { correcto: false, motivo: "sin_respuesta" };
      }
    } catch (error) {
      const cancelada = error instanceof Error && error.name === "AbortError";
      /* La primera llamada del día a veces se queda esperando y la siguiente
         responde en dos segundos. Medido durante la validación: una foto agotó
         el tiempo y las dos siguientes tardaron 4 y 2,3 segundos. Por eso el
         reintento también cubre la espera, no solo el error. */
      if (intento === 0) continue;
      return {
        correcto: false,
        motivo: cancelada ? "tardo_demasiado" : "sin_respuesta",
      };
    } finally {
      clearTimeout(reloj);
    }
  }

  return { correcto: false, motivo: "sin_respuesta" };
}
