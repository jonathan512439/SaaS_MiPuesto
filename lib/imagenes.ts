export const PESO_MAXIMO_ORIGINAL = 5 * 1024 * 1024;
export const PESO_MAXIMO_COMPRIMIDO = 2 * 1024 * 1024;
export const LADO_MAXIMO_IMAGEN = 1600;

export type TipoImagenPermitido = "image/webp" | "image/jpeg" | "image/png";

export function detectarTipoImagen(bytes: Uint8Array): TipoImagenPermitido | null {
  const esJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const esPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const esWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  if (esJpeg) return "image/jpeg";
  if (esPng) return "image/png";
  if (esWebp) return "image/webp";
  return null;
}

export function extensionPorTipo(tipo: TipoImagenPermitido) {
  return tipo === "image/jpeg" ? "jpg" : tipo === "image/png" ? "png" : "webp";
}

export function validarImagenBinaria(bytes: Uint8Array, pesoMaximo = PESO_MAXIMO_COMPRIMIDO) {
  if (bytes.byteLength === 0) {
    return { correcto: false as const, error: "El archivo está vacío." };
  }
  if (bytes.byteLength > pesoMaximo) {
    return {
      correcto: false as const,
      error: "La imagen comprimida supera el límite de 2 MB.",
    };
  }

  const tipo = detectarTipoImagen(bytes);
  if (!tipo) {
    return {
      correcto: false as const,
      error: "El contenido no corresponde a una imagen JPEG, PNG o WebP válida.",
    };
  }

  return { correcto: true as const, tipo };
}

function lienzoAWebp(lienzo: HTMLCanvasElement, calidad: number) {
  return new Promise<Blob>((resolver, rechazar) => {
    lienzo.toBlob(
      (blob) => (blob ? resolver(blob) : rechazar(new Error("No se pudo comprimir la imagen."))),
      "image/webp",
      calidad,
    );
  });
}

export async function prepararImagenParaSubir(archivo: File) {
  if (archivo.size > PESO_MAXIMO_ORIGINAL) {
    throw new Error("Cada imagen debe pesar como máximo 5 MB antes de comprimir.");
  }

  const cabecera = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());
  if (!detectarTipoImagen(cabecera)) {
    throw new Error("Selecciona una imagen JPEG, PNG o WebP válida.");
  }

  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, LADO_MAXIMO_IMAGEN / Math.max(imagen.width, imagen.height));
  const ancho = Math.max(1, Math.round(imagen.width * escala));
  const alto = Math.max(1, Math.round(imagen.height * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext("2d", { alpha: false });

  if (!contexto) {
    imagen.close();
    throw new Error("El navegador no pudo preparar la imagen.");
  }

  contexto.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();

  let blob = await lienzoAWebp(lienzo, 0.82);
  if (blob.size > PESO_MAXIMO_COMPRIMIDO) blob = await lienzoAWebp(lienzo, 0.68);
  if (blob.size > PESO_MAXIMO_COMPRIMIDO) {
    throw new Error("La imagen sigue superando 2 MB después de comprimirla.");
  }

  return new File([blob], "imagen-producto.webp", {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
