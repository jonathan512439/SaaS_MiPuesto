/* Cuánto pudo completar la lectura, dicho antes de que el dueño confirme.
 *
 * Una lista de precios trae nombre y precio. Los datos propios de cada categoría
 * —la marca de un repuesto, el volumen de una gaseosa— casi nunca están escritos
 * en el renglón, y cuando están, están a medias: veinte productos con marca y
 * treinta sin.
 *
 * Sin este informe, el dueño confirma cuarenta productos y descubre semanas
 * después que el buscador por marca no sirve, porque la mitad de sus repuestos
 * no tienen marca. Y no tiene forma de saber cuáles: tendría que abrirlos uno
 * por uno. **El momento de enterarse es antes de confirmar**, que es cuando
 * todavía puede completar a mano las diez que faltan o decidir que no le
 * importa.
 *
 * Lo que este informe **no** hace es impedir nada. Un catálogo con la marca a
 * medias sigue siendo un catálogo que vende; lo que no puede pasar es que el
 * dueño no sepa que quedó así.
 */

export type CampoDeCategoria = {
  clave: string;
  nombre: string;
  /* El tipo y la unidad no los usa el informe: los usa la instrucción al modelo,
     que necesita decirle «en kg» para que no devuelva «2 kilos». Viajan en el
     mismo objeto porque son el mismo campo, y separarlos en dos formas del mismo
     dato sería pedir que alguien las mantenga iguales. */
  tipo?: string;
  unidad?: string | null;
  /* Las que el dueño escribió, para un campo de tipo «opción». Sirven para
     descartar lo que el modelo devuelva fuera de la lista: agregarle una opción
     nueva sería decidir por él qué opciones tiene su campo. */
  opciones?: string[];
};

export type ProductoLeidoConDatos = {
  /* El título de sección que la lectura le asignó. Vacío cuando la lista no
     tenía títulos. */
  categoria: string;
  precio: number;
  descripcion: string;
  datos?: Array<{ clave: string; valor: string }>;
};

export type CoberturaDeCampo = {
  categoria: string;
  clave: string;
  nombre: string;
  /* Cuántos productos de esa categoría trajo la lectura. Es el denominador: sin
     él, «12 con marca» no dice si está bien o mal. */
  productos: number;
  completos: number;
};

export type InformeDeCobertura = {
  productos: number;
  conDescripcion: number;
  campos: CoberturaDeCampo[];
  /* Los campos que quedaron **sin un solo valor**. Se separan porque significan
     otra cosa: no es que la lista los traiga a medias, es que no los trae, y
     entonces lo que hay que revisar no son los productos sino si esa columna
     existe en la lista. */
  vacios: CoberturaDeCampo[];
};

function tieneValor(valor: unknown): boolean {
  return typeof valor === "string" && valor.trim() !== "";
}

/* Se compara por nombre y sin distinguir mayúsculas, igual que la pantalla de
   revisión cuando decide si «BEBIDAS» de la lista es la categoría «Bebidas» que
   el negocio ya tiene. Dos criterios distintos para el mismo emparejamiento
   darían un informe sobre categorías que no son las que se van a usar. */
function normalizar(nombre: string): string {
  return nombre.trim().toLowerCase();
}

export function informeDeCobertura(
  productos: ReadonlyArray<ProductoLeidoConDatos>,
  camposPorCategoria: ReadonlyMap<string, ReadonlyArray<CampoDeCategoria>>,
): InformeDeCobertura {
  const campos: CoberturaDeCampo[] = [];

  /* Se recorren las categorías que la lectura trajo, y no todas las del
     negocio: informar sobre una categoría de la que no se leyó ningún producto
     sería decirle al dueño que le falta algo en una lista que no importó. */
  const porCategoria = new Map<string, ProductoLeidoConDatos[]>();
  for (const producto of productos) {
    const clave = normalizar(producto.categoria);
    if (clave === "") continue;
    const actuales = porCategoria.get(clave) ?? [];
    actuales.push(producto);
    porCategoria.set(clave, actuales);
  }

  for (const [claveCategoria, productosDeCategoria] of porCategoria) {
    const definidos = camposPorCategoria.get(claveCategoria);
    /* Una categoría que el negocio todavía no tiene se va a crear vacía, sin
       campos. No hay nada que informar sobre ella. */
    if (!definidos || definidos.length === 0) continue;

    for (const campo of definidos) {
      const completos = productosDeCategoria.filter((producto) =>
        (producto.datos ?? []).some(
          (dato) => dato.clave === campo.clave && tieneValor(dato.valor),
        ),
      ).length;

      campos.push({
        categoria: productosDeCategoria[0].categoria.trim(),
        clave: campo.clave,
        nombre: campo.nombre,
        productos: productosDeCategoria.length,
        completos,
      });
    }
  }

  /* De menos completo a más: lo que más falta es lo primero que hay que mirar. */
  campos.sort((a, b) => a.completos / a.productos - b.completos / b.productos);

  return {
    productos: productos.length,
    conDescripcion: productos.filter((producto) => tieneValor(producto.descripcion)).length,
    campos: campos.filter((campo) => campo.completos > 0),
    vacios: campos.filter((campo) => campo.completos === 0),
  };
}
