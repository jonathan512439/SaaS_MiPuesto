/* Lector de CSV. Se escribe a mano porque el formato es corto y las trampas son
   conocidas, y porque las tres que importan no las resuelve `split(",")`:

   1. El separador no siempre es la coma. El Excel en español exporta con punto
      y coma, justamente porque la coma es el separador decimal.
   2. Un campo entre comillas puede contener el separador, y unas comillas
      dobles adentro representan una comilla.
   3. El archivo puede empezar con una marca de orden de bytes invisible que se
      pega al nombre de la primera columna y la vuelve irreconocible. */

/* Se cuenta cuál de los candidatos aparece más en la primera línea de verdad,
   sin mirar lo que está entre comillas. Contar sobre todo el archivo sería más
   robusto pero mucho más lento en una planilla grande, y la primera línea de un
   CSV siempre trae todas las columnas. */
function detectarSeparador(texto: string): string {
  const primera = texto.slice(0, texto.indexOf("\n") === -1 ? texto.length : texto.indexOf("\n"));
  let entreComillas = false;
  const cuenta: Record<string, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 };

  for (const caracter of primera) {
    if (caracter === '"') entreComillas = !entreComillas;
    else if (!entreComillas && caracter in cuenta) cuenta[caracter] += 1;
  }

  let mejor = ",";
  for (const candidato of Object.keys(cuenta)) {
    if (cuenta[candidato] > cuenta[mejor]) mejor = candidato;
  }
  return mejor;
}

export function leerCsv(texto: string): string[][] {
  const sinMarca = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const separador = detectarSeparador(sinMarca);

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let entreComillas = false;

  for (let posicion = 0; posicion < sinMarca.length; posicion += 1) {
    const caracter = sinMarca[posicion];

    if (entreComillas) {
      if (caracter !== '"') {
        campo += caracter;
      } else if (sinMarca[posicion + 1] === '"') {
        campo += '"';
        posicion += 1;
      } else {
        entreComillas = false;
      }
      continue;
    }

    if (caracter === '"') {
      entreComillas = true;
    } else if (caracter === separador) {
      fila.push(campo);
      campo = "";
    } else if (caracter === "\n" || caracter === "\r") {
      /* Un salto de Windows son dos caracteres y tiene que contar como uno.
         Sin esto, cada renglón vendría seguido de una fila vacía. */
      if (caracter === "\r" && sinMarca[posicion + 1] === "\n") posicion += 1;
      fila.push(campo);
      campo = "";
      filas.push(fila);
      fila = [];
    } else {
      campo += caracter;
    }
  }

  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  /* Las filas totalmente vacías se van: las planillas están llenas de renglones
     en blanco entre secciones, y cada uno sería un producto sin nombre. */
  return filas
    .map((valores) => valores.map((valor) => valor.trim()))
    .filter((valores) => valores.some((valor) => valor !== ""));
}
