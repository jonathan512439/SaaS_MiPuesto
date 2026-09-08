import { leerPrecio } from "./valores";

/* Adivinar qué columna es cuál, y no acertar siempre.

   Una planilla de un comerciante no tiene un formato: tiene el que le quedó.
   Puede empezar con una fila de títulos o no; los títulos pueden decir
   «Precio», «PVP», «Bs» o «Venta»; el nombre puede estar en la primera columna
   o en la tercera, después de un código interno.

   Por eso esto **propone** y la pantalla deja cambiarlo. Una adivinanza que no
   se puede corregir es peor que ninguna: el dueño no tiene forma de saber por
   qué su planilla se importó al revés. */

export type Mapeo = {
  nombre: number;
  precio: number;
  descripcion: number | null;
  categoria: number | null;
  /* Solo se usa si el negocio lleva control de existencias. Se busca siempre,
     porque encontrarla es lo que permite proponerle al dueño que lo active en
     vez de esperar a que se acuerde de decirlo. */
  cantidad: number | null;
};

export type Planilla = {
  cabeceras: string[] | null;
  filas: string[][];
  mapeo: Mapeo;
};

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim();
}

/* Las palabras van de la más específica a la más genérica dentro de cada campo,
   y el campo entero se resuelve antes de pasar al siguiente. Importa el orden:
   una columna llamada «Detalle del precio» tiene que caer en precio, no en
   descripción, y sin orden gana el que se evalúe primero. */
const PALABRAS: Record<keyof Mapeo, string[]> = {
  precio: ["precio", "pvp", "p unit", "precio unitario", "venta", "importe", "costo", "bs", "price"],
  nombre: ["producto", "nombre", "articulo", "item", "descripcion del producto", "denominacion"],
  descripcion: ["descripcion", "detalle", "observacion", "comentario", "caracteristicas"],
  categoria: ["categoria", "rubro", "seccion", "grupo", "familia", "linea", "tipo"],
  cantidad: ["cantidad", "stock", "existencia", "existencias", "inventario", "unidades", "saldo"],
};

/* Se compara por palabra entera y no por pedazo de texto. Con `includes` a
   secas, la palabra corta «bs» —que existe porque hay planillas cuya columna de
   precios se llama solo así— aparecería dentro de cualquier título que la
   contenga por casualidad, y esa columna se importaría como precio. */
function contienePalabra(titulo: string, palabra: string): boolean {
  return ` ${titulo} `.includes(` ${palabra} `);
}

function buscarPorTitulo(cabeceras: string[], campo: keyof Mapeo, tomadas: Set<number>): number | null {
  const normalizadas = cabeceras.map(normalizar);
  for (const palabra of PALABRAS[campo]) {
    const indice = normalizadas.findIndex(
      (titulo, posicion) => !tomadas.has(posicion) && contienePalabra(titulo, palabra),
    );
    if (indice > -1) return indice;
  }
  return null;
}

/* Una fila de títulos no trae precios. Si la primera fila no tiene ningún
   número que se pueda leer como precio y alguna de las siguientes sí, es una
   cabecera. Es la misma señal que usa una persona al mirar la planilla. */
function pareceCabecera(filas: string[][]): boolean {
  if (filas.length < 2) return false;
  const conPrecio = (fila: string[]) => fila.some((celda) => (leerPrecio(celda) ?? 0) > 0);
  return !conPrecio(filas[0]) && filas.slice(1, 8).some(conPrecio);
}

/* Cuando no hay títulos hay que mirar el contenido. La columna de precios es la
   que más celdas tiene que se leen como número; la del nombre, la primera que
   tiene texto que no es número. Se miran hasta veinte filas: alcanza para
   decidir y no cuesta nada en una planilla de mil renglones. */
function buscarPorContenido(filas: string[][]): { nombre: number; precio: number } {
  const muestra = filas.slice(0, 20);
  const columnas = Math.max(...muestra.map((fila) => fila.length), 1);
  const numericas: number[] = [];
  const textuales: number[] = [];

  for (let columna = 0; columna < columnas; columna += 1) {
    let numeros = 0;
    let textos = 0;
    for (const fila of muestra) {
      const celda = (fila[columna] ?? "").trim();
      if (celda === "") continue;
      if ((leerPrecio(celda) ?? 0) > 0) numeros += 1;
      else textos += 1;
    }
    numericas.push(numeros);
    textuales.push(textos);
  }

  let precio = 0;
  for (let columna = 1; columna < columnas; columna += 1) {
    if (numericas[columna] > numericas[precio]) precio = columna;
  }

  let nombre = precio === 0 ? 1 : 0;
  for (let columna = 0; columna < columnas; columna += 1) {
    if (columna !== precio && textuales[columna] > (textuales[nombre] ?? -1)) nombre = columna;
  }

  return { nombre, precio };
}

export function analizarPlanilla(filas: string[][]): Planilla {
  if (filas.length === 0) {
    return {
      cabeceras: null,
      filas: [],
      mapeo: { nombre: 0, precio: 1, descripcion: null, categoria: null, cantidad: null },
    };
  }

  const hayCabecera = pareceCabecera(filas);
  const cabeceras = hayCabecera ? filas[0] : null;
  const datos = hayCabecera ? filas.slice(1) : filas;

  if (!cabeceras) {
    const { nombre, precio } = buscarPorContenido(datos);
    return {
      cabeceras: null,
      filas: datos,
      mapeo: { nombre, precio, descripcion: null, categoria: null, cantidad: null },
    };
  }

  /* Una columna no puede ser dos cosas. Sin esto, una planilla con «Producto» y
     «Descripción del producto» usaría la misma columna para las dos y la
     descripción repetiría el nombre en cada renglón. */
  const tomadas = new Set<number>();
  const porTitulo = (campo: keyof Mapeo) => {
    const indice = buscarPorTitulo(cabeceras, campo, tomadas);
    if (indice !== null) tomadas.add(indice);
    return indice;
  };

  /* La cantidad se resuelve justo después del precio y antes que el nombre:
     las dos son columnas de números y la reserva impide que la misma caiga en
     los dos campos. */
  const precio = porTitulo("precio");
  const cantidad = porTitulo("cantidad");
  const nombre = porTitulo("nombre");
  const descripcion = porTitulo("descripcion");
  const categoria = porTitulo("categoria");

  /* Si los títulos no dijeron nada útil se cae al contenido, que siempre
     contesta algo. Un título en otro idioma o inventado es común, y sin esta
     salida la pantalla arrancaría con las dos columnas que importan en cero. */
  const respaldo = nombre === null || precio === null ? buscarPorContenido(datos) : null;

  return {
    cabeceras,
    filas: datos,
    mapeo: {
      nombre: nombre ?? respaldo!.nombre,
      precio: precio ?? respaldo!.precio,
      descripcion,
      categoria,
      cantidad,
    },
  };
}
