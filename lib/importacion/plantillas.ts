import type { AtributoSembrado, SiembraDeRubro } from "../rubros/siembra";
import { SIEMBRAS } from "../rubros/siembra";
import { DEFINICIONES_RUBROS, type RubroId } from "../negocios/rubros";
import { siembraDeRubroPublico, esRubroPublicoId } from "../negocios/rubros-publicos";
import { armarLibro, type HojaDeLibro } from "../exportacion/xlsx";
import type { TipoPresentacion } from "../catalogo/variantes";
import { MAXIMO_FILAS } from "./planilla";

/* La plantilla de Excel de cada rubro establecido: cómo listar el inventario
 * para que entre completo y sin errores.
 *
 * **Solo para los rubros con siembra** —restaurante, ferretería, ropa y
 * calzado, distribuidora, repuestos y veterinaria—, porque la plantilla se arma
 * con sus categorías y sus campos: los mismos nombres que el negocio tiene en
 * MiPuesto desde el alta, y por eso la importación los reconoce sin preguntar.
 *
 * Los títulos de las columnas son los que el importador busca
 * (`columnas.ts`), y una prueba lo comprueba armando cada plantilla, leyéndola
 * con el importador y mirando que cada ejemplo entre con su categoría, sus datos
 * y sus tallas. Si alguien cambia un título de un lado, la prueba falla.
 *
 * Las filas de ejemplo empiezan con «Ejemplo:» y el importador las deja afuera
 * solas: el dueño puede escribir debajo sin borrarlas y no se publica nada de
 * muestra.
 */

export const TITULOS_FIJOS = {
  producto: "Producto",
  categoria: "Categoría",
  precio: "Precio",
  cantidad: "Cantidad",
  seEligePor: "Se elige por",
  presentacion: "Talla, número o tamaño",
  descripcion: "Descripción",
} as const;

export const PREFIJO_EJEMPLO = "Ejemplo: ";

/* Cómo se escribe cada tipo en la columna «Se elige por». */
export const NOMBRES_DE_TIPO: Record<TipoPresentacion, string> = {
  talla: "Talla",
  numero: "Número",
  tamano: "Tamaño",
  presentacion: "Opción",
};

type FilaDeEjemplo = {
  producto: string;
  categoria: string;
  precio: string;
  cantidad?: string;
  descripcion?: string;
  seEligePor?: TipoPresentacion;
  presentacion?: string;
  /* Por el nombre del campo, tal como está en la siembra. */
  datos?: Record<string, string>;
};

type PlantillaDeRubro = {
  rubro: RubroId;
  /* Si la plantilla trae las columnas de talla, número o tamaño. Solo donde
     el rubro vende lo mismo en varias medidas con precio o existencias
     distintas; en los demás serían dos columnas vacías que confunden. */
  conPresentaciones: boolean;
  consejos: string[];
  ejemplos: FilaDeEjemplo[];
};

const PLANTILLAS: ReadonlyArray<PlantillaDeRubro> = [
  {
    rubro: "restaurante",
    conPresentaciones: true,
    consejos: [
      "«Porción», «Acompañamiento», «Picante» y «Vegetariano» describen el plato y se ven en la tarjeta: complétalos en Almuerzos y Platos a la carta.",
      "Si el mismo plato cuesta distinto según el tamaño, escribe una fila por tamaño con el mismo nombre y pon «Tamaño» en «Se elige por», como el pique macho del ejemplo. El cliente elige el tamaño al pedir.",
      "En Bebidas, el «Tamaño (ml)» es solo el número: 500, no «500 ml».",
      "Si no llevas la cuenta de cuántos platos te quedan, deja «Cantidad» vacía.",
    ],
    ejemplos: [
      {
        producto: "Silpancho",
        categoria: "Almuerzos",
        precio: "25",
        descripcion: "Con arroz, papa, huevo frito y ensalada.",
        datos: { Porción: "Personal", Acompañamiento: "Arroz, papa y ensalada", Picante: "No", Vegetariano: "No" },
      },
      {
        producto: "Almuerzo vegetariano",
        categoria: "Almuerzos",
        precio: "22",
        descripcion: "Sopa de quinua y guiso de verduras.",
        datos: { Porción: "Personal", Acompañamiento: "Arroz y ensalada", Picante: "No", Vegetariano: "Sí" },
      },
      {
        producto: "Pique macho",
        categoria: "Platos a la carta",
        precio: "70",
        seEligePor: "tamano",
        presentacion: "Para dos",
        descripcion: "Carne, salchicha, papas fritas, locoto y huevo.",
        datos: { Acompañamiento: "Papas fritas", Picante: "Sí", Vegetariano: "No" },
      },
      { producto: "Pique macho", categoria: "Platos a la carta", precio: "120", seEligePor: "tamano", presentacion: "Familiar" },
      {
        producto: "Limonada",
        categoria: "Bebidas",
        precio: "8",
        datos: { Tamaño: "500", "Con alcohol": "No" },
      },
      {
        producto: "Cerveza",
        categoria: "Bebidas",
        precio: "20",
        cantidad: "24",
        datos: { Tamaño: "620", "Con alcohol": "Sí" },
      },
      { producto: "Flan casero", categoria: "Postres", precio: "10", descripcion: "Con caramelo." },
    ],
  },
  {
    rubro: "ferreteria",
    conPresentaciones: false,
    consejos: [
      "Tu cliente busca por medida y por potencia: completa los datos de Eléctrico e iluminación, Pinturas y Tornillería, que son los que se ven en la tarjeta.",
      "Las opciones se escriben tal cual: el casquillo es E27, E14, GU10, B22 o G9.",
      "Los números van solos, sin la unidad: en «Potencia (W)» escribe 9, no «9 W».",
      "Si un tornillo se vende por caja, dilo en «Se vende por» y en el nombre: «caja de 100».",
    ],
    ejemplos: [
      { producto: "Martillo de uña 16 oz", categoria: "Herramienta manual", precio: "45", cantidad: "12", descripcion: "Mango de fibra de vidrio." },
      { producto: "Taladro percutor 650 W", categoria: "Herramienta eléctrica", precio: "380", cantidad: "4", descripcion: "Incluye maletín y 5 brocas." },
      {
        producto: "Foco LED 9 W luz blanca",
        categoria: "Eléctrico e iluminación",
        precio: "15",
        cantidad: "60",
        datos: { Potencia: "9", Casquillo: "E27", "Color de luz": "Fría", Regulable: "No", "Vida útil": "15000" },
      },
      {
        producto: "Foco dicroico LED 5 W",
        categoria: "Eléctrico e iluminación",
        precio: "18",
        cantidad: "40",
        datos: { Potencia: "5", Casquillo: "GU10", "Color de luz": "Cálida", Regulable: "No", "Vida útil": "25000" },
      },
      { producto: "Llave de paso 1/2\"", categoria: "Plomería", precio: "35", cantidad: "15" },
      {
        producto: "Pintura látex blanca 4 L",
        categoria: "Pinturas",
        precio: "120",
        cantidad: "10",
        datos: { Contenido: "4", Acabado: "Mate", Base: "Agua", Rendimiento: "10" },
      },
      {
        producto: "Tornillo autorroscante 8 x 1\" (caja de 100)",
        categoria: "Tornillería",
        precio: "25",
        cantidad: "30",
        datos: { Medida: "8 x 1\"", Material: "Galvanizado", Cabeza: "Plana", "Se vende por": "Caja" },
      },
    ],
  },
  {
    rubro: "ropa_y_calzado",
    conPresentaciones: true,
    consejos: [
      "Una fila por talla o por número, con el mismo nombre de producto: así cada talla lleva su cantidad y el cliente elige la suya al pedir.",
      "En «Se elige por» pon «Talla» para ropa (S, M, L, XL) y «Número» para calzado (38, 39, 40,5).",
      "Si una talla cuesta distinto —las grandes, por ejemplo—, ponle su precio en su fila.",
      "Si una prenda viene en varios colores, carga un producto por color: «Polera básica blanca», «Polera básica negra».",
      "El color, el material y la temporada se escriben una vez, en la primera fila del producto.",
    ],
    ejemplos: [
      {
        producto: "Polera básica blanca",
        categoria: "Ropa de dama",
        precio: "70",
        cantidad: "4",
        seEligePor: "talla",
        presentacion: "S",
        descripcion: "100 % algodón, corte recto.",
        datos: { Color: "Blanco", Material: "Algodón", Temporada: "Todo el año" },
      },
      { producto: "Polera básica blanca", categoria: "Ropa de dama", precio: "70", cantidad: "6", seEligePor: "talla", presentacion: "M" },
      { producto: "Polera básica blanca", categoria: "Ropa de dama", precio: "70", cantidad: "3", seEligePor: "talla", presentacion: "L" },
      {
        producto: "Chamarra de jean",
        categoria: "Ropa de varón",
        precio: "220",
        cantidad: "2",
        seEligePor: "talla",
        presentacion: "M",
        datos: { Color: "Azul", Material: "Jean", Temporada: "Invierno" },
      },
      { producto: "Chamarra de jean", categoria: "Ropa de varón", precio: "220", cantidad: "2", seEligePor: "talla", presentacion: "L" },
      { producto: "Chamarra de jean", categoria: "Ropa de varón", precio: "240", cantidad: "1", seEligePor: "talla", presentacion: "XL" },
      {
        producto: "Zapatilla urbana negra",
        categoria: "Calzado",
        precio: "280",
        cantidad: "2",
        seEligePor: "numero",
        presentacion: "38",
        datos: { Color: "Negro", Material: "Cuero sintético", Temporada: "Todo el año" },
      },
      { producto: "Zapatilla urbana negra", categoria: "Calzado", precio: "280", cantidad: "3", seEligePor: "numero", presentacion: "39" },
      { producto: "Zapatilla urbana negra", categoria: "Calzado", precio: "280", cantidad: "5", seEligePor: "numero", presentacion: "40" },
      { producto: "Zapatilla urbana negra", categoria: "Calzado", precio: "280", cantidad: "1", seEligePor: "numero", presentacion: "40,5" },
      { producto: "Cinturón de cuero", categoria: "Accesorios", precio: "60", cantidad: "10" },
    ],
  },
  {
    rubro: "distribuidora",
    conPresentaciones: false,
    consejos: [
      "Pon el precio de lo que vendes: si vendes por caja, el precio de la caja, y dilo en el nombre.",
      "«Unidades por caja» y «Pedido mínimo (cajas)» van solo con el número.",
      "«Presentación» y «Marca» se ven en la tarjeta: son lo primero que mira un comprador por mayor.",
    ],
    ejemplos: [
      {
        producto: "Arroz grano largo 1 kg, fardo de 25",
        categoria: "Abarrotes",
        precio: "210",
        cantidad: "40",
        datos: { Presentación: "Bolsa de 1 kg", "Unidades por caja": "25", Marca: "Grano de Oro", "Pedido mínimo": "2" },
      },
      {
        producto: "Gaseosa 2 L, caja de 6",
        categoria: "Bebidas",
        precio: "72",
        cantidad: "80",
        datos: { Presentación: "Botella de 2 L", "Unidades por caja": "6", Marca: "Coca-Cola", "Pedido mínimo": "5" },
      },
      {
        producto: "Detergente en polvo 800 g, caja de 12",
        categoria: "Limpieza",
        precio: "150",
        cantidad: "25",
        datos: { Presentación: "Bolsa de 800 g", "Unidades por caja": "12", Marca: "Omo", "Pedido mínimo": "1" },
      },
      {
        producto: "Vaso descartable 8 oz, paquete de 50",
        categoria: "Desechables",
        precio: "12",
        cantidad: "100",
        datos: { Presentación: "Paquete de 50", "Unidades por caja": "50", "Pedido mínimo": "10" },
      },
    ],
  },
  {
    rubro: "repuestos",
    conPresentaciones: false,
    consejos: [
      "Tu cliente busca por vehículo: completa siempre la marca, el modelo y los años en que sirve.",
      "El código de parte es lo que más evita errores: con él, el cliente sabe que es la pieza exacta.",
      "«Original o alternativo» se escribe tal cual: Original o Alternativo.",
      "Los años van solo con el número: 2010, no «desde 2010».",
    ],
    ejemplos: [
      {
        producto: "Pastillas de freno delanteras Corolla",
        categoria: "Frenos",
        precio: "180",
        cantidad: "6",
        datos: {
          "Marca del vehículo": "Toyota",
          Modelo: "Corolla",
          "Año desde": "2010",
          "Año hasta": "2015",
          "Código de parte": "04465-02220",
          "Original o alternativo": "Alternativo",
        },
      },
      {
        producto: "Filtro de aceite Hilux 2.5",
        categoria: "Filtros y lubricantes",
        precio: "45",
        cantidad: "20",
        datos: {
          "Marca del vehículo": "Toyota",
          Modelo: "Hilux",
          "Año desde": "2005",
          "Año hasta": "2015",
          "Código de parte": "90915-YZZD2",
          "Original o alternativo": "Original",
        },
      },
      {
        producto: "Amortiguador delantero Sentra",
        categoria: "Suspensión",
        precio: "320",
        cantidad: "4",
        datos: { "Marca del vehículo": "Nissan", Modelo: "Sentra", "Año desde": "2013", "Año hasta": "2019", "Original o alternativo": "Alternativo" },
      },
      {
        producto: "Kit de arrastre Honda CG 150",
        categoria: "Moto",
        precio: "210",
        cantidad: "5",
        datos: { "Marca del vehículo": "Honda", Modelo: "CG 150", "Original o alternativo": "Alternativo" },
      },
    ],
  },
  {
    rubro: "veterinaria",
    conPresentaciones: true,
    consejos: [
      "En Alimento, «Para», «Etapa» y «Raza» se escriben tal cual: Perro o Gato; Cachorro, Adulto o Senior; Pequeña, Mediana o Grande.",
      "Si un medicamento cambia según el peso del animal, escribe una fila por tamaño con el mismo nombre y pon «Tamaño» en «Se elige por», como la pipeta del ejemplo.",
      "Consultas, Vacunación y Baño y peluquería son servicios con cita: sin cantidad. Después de importar, en Productos eliges quién atiende cada uno.",
    ],
    ejemplos: [
      {
        producto: "Alimento perro adulto raza mediana 15 kg",
        categoria: "Alimento",
        precio: "280",
        cantidad: "8",
        descripcion: "Sabor carne y arroz.",
        datos: { Para: "Perro", Etapa: "Adulto", Peso: "15", Raza: "Mediana" },
      },
      {
        producto: "Alimento gato cachorro 1 kg",
        categoria: "Alimento",
        precio: "45",
        cantidad: "12",
        datos: { Para: "Gato", Etapa: "Cachorro", Peso: "1" },
      },
      {
        producto: "Pipeta antipulgas",
        categoria: "Medicamentos",
        precio: "35",
        cantidad: "10",
        seEligePor: "tamano",
        presentacion: "Hasta 10 kg",
        descripcion: "Protege un mes. Para perros desde las 8 semanas.",
      },
      { producto: "Pipeta antipulgas", categoria: "Medicamentos", precio: "45", cantidad: "8", seEligePor: "tamano", presentacion: "10 a 20 kg" },
      { producto: "Pipeta antipulgas", categoria: "Medicamentos", precio: "55", cantidad: "6", seEligePor: "tamano", presentacion: "20 a 40 kg" },
      { producto: "Shampoo para perro 500 ml", categoria: "Higiene y cuidado", precio: "38", cantidad: "15" },
      { producto: "Collar regulable mediano", categoria: "Accesorios", precio: "30", cantidad: "20" },
      {
        producto: "Consulta general",
        categoria: "Consultas",
        precio: "80",
        descripcion: "Revisión completa y receta.",
        datos: { Duración: "30", Atiende: "Todos", "A domicilio": "No" },
      },
      { producto: "Vacuna antirrábica", categoria: "Vacunación", precio: "60", descripcion: "Incluye el carnet." },
      { producto: "Baño perro mediano", categoria: "Baño y peluquería", precio: "70" },
    ],
  },
];

export function rubrosConPlantilla(): RubroId[] {
  return PLANTILLAS.map(({ rubro }) => rubro);
}

function plantillaDe(rubro: RubroId): PlantillaDeRubro {
  const plantilla = PLANTILLAS.find((una) => una.rubro === rubro);
  if (!plantilla) throw new Error(`El rubro ${rubro} no tiene plantilla.`);
  return plantilla;
}

function siembraDe(rubro: RubroId): SiembraDeRubro {
  const siembra = SIEMBRAS.find((una) => una.rubro === rubro);
  if (!siembra) throw new Error(`El rubro ${rubro} no tiene siembra.`);
  return siembra;
}

export function nombreDeRubro(rubro: RubroId): string {
  return DEFINICIONES_RUBROS.find(({ id }) => id === rubro)?.nombre ?? rubro;
}

/* Las plantillas que le sirven a un negocio: la de su rubro y las de sus
   rubros secundarios, sin repetir y solo las que existen. Una pollería con
   barbería ve la de restaurante; una barbería sola, ninguna. */
export function plantillasDelNegocio(negocio: {
  rubro?: string | null;
  rubro_publico?: string | null;
  rubros_secundarios?: ReadonlyArray<string> | null;
}): RubroId[] {
  const candidatos: string[] = [];
  if (esRubroPublicoId(negocio.rubro_publico)) {
    candidatos.push(siembraDeRubroPublico(negocio.rubro_publico));
  } else if (negocio.rubro) {
    candidatos.push(negocio.rubro);
  }
  for (const secundario of negocio.rubros_secundarios ?? []) {
    if (esRubroPublicoId(secundario)) candidatos.push(siembraDeRubroPublico(secundario));
  }
  const disponibles = rubrosConPlantilla() as string[];
  return [...new Set(candidatos)].filter((rubro): rubro is RubroId => disponibles.includes(rubro));
}

/* Los campos de todas las categorías, uno por nombre, en el orden en que
   aparecen: la plantilla es una sola hoja para todas las categorías. */
function camposDelRubro(siembra: SiembraDeRubro): AtributoSembrado[] {
  const vistos = new Map<string, AtributoSembrado>();
  for (const categoria of siembra.categorias) {
    for (const atributo of categoria.atributos ?? []) {
      if (!vistos.has(atributo.nombre)) vistos.set(atributo.nombre, atributo);
    }
  }
  return [...vistos.values()];
}

/* «Potencia (W)»: la unidad entre paréntesis dice qué escribir, y el
   importador la saca para reconocer el campo. */
function tituloDeCampo(atributo: AtributoSembrado): string {
  return atributo.tipo === "numero" && atributo.unidad
    ? `${atributo.nombre} (${atributo.unidad})`
    : atributo.nombre;
}

export function titulosDePlantilla(rubro: RubroId): string[] {
  const plantilla = plantillaDe(rubro);
  return [
    TITULOS_FIJOS.producto,
    TITULOS_FIJOS.categoria,
    TITULOS_FIJOS.precio,
    TITULOS_FIJOS.cantidad,
    ...(plantilla.conPresentaciones ? [TITULOS_FIJOS.seEligePor, TITULOS_FIJOS.presentacion] : []),
    TITULOS_FIJOS.descripcion,
    ...camposDelRubro(siembraDe(rubro)).map(tituloDeCampo),
  ];
}

export function filasDeProductos(rubro: RubroId): string[][] {
  const plantilla = plantillaDe(rubro);
  const campos = camposDelRubro(siembraDe(rubro));
  return [
    titulosDePlantilla(rubro),
    ...plantilla.ejemplos.map((ejemplo) => [
      `${PREFIJO_EJEMPLO}${ejemplo.producto}`,
      ejemplo.categoria,
      ejemplo.precio,
      ejemplo.cantidad ?? "",
      ...(plantilla.conPresentaciones
        ? [ejemplo.seEligePor ? NOMBRES_DE_TIPO[ejemplo.seEligePor] : "", ejemplo.presentacion ?? ""]
        : []),
      ejemplo.descripcion ?? "",
      ...campos.map((campo) => ejemplo.datos?.[campo.nombre] ?? ""),
    ]),
  ];
}

function comoSeEscribe(atributo: AtributoSembrado): string {
  switch (atributo.tipo) {
    case "opcion":
      return `Una de estas, tal cual: ${(atributo.opciones ?? []).join(", ")}`;
    case "numero":
      return atributo.unidad ? `Solo el número, en ${atributo.unidad}` : "Solo el número";
    case "si_no":
      return "Sí o No";
    default:
      return "Texto libre, hasta 80 letras";
  }
}

export function filasDeInstrucciones(rubro: RubroId): string[][] {
  const plantilla = plantillaDe(rubro);
  const siembra = siembraDe(rubro);
  const pasos = [
    "Escribe tus productos en la hoja «Productos», una fila por producto.",
    "Las filas que empiezan con «Ejemplo:» son de muestra. Bórralas o escribe debajo: al importar se dejan afuera solas.",
    "«Producto» y «Precio» son obligatorios. El precio va solo con el número, en bolivianos: 25 o 12,50.",
    "«Categoría»: el nombre de tu categoría en MiPuesto, tal cual. Así el producto cae en ella con todos sus datos.",
    "«Cantidad»: cuántas unidades tienes. Déjala vacía si no llevas la cuenta; un 0 publica el producto como agotado.",
    ...(plantilla.conPresentaciones
      ? [
          "Tallas, números y tamaños: una fila por cada uno, con el mismo nombre de producto. En «Se elige por» pon Talla, Número o Tamaño, y en «Talla, número o tamaño» la de esa fila. Cada fila lleva su precio y su cantidad.",
        ]
      : []),
    "Las columnas después de «Descripción» son los datos de cada categoría: complétalas solo en las categorías que los piden (abajo está cuáles).",
    `Hasta ${MAXIMO_FILAS} filas por vez. Guarda el archivo como .xlsx y súbelo en Herramientas, «Importar tu Excel».`,
    "Las fotos se agregan después: en la revisión antes de crear o desde Productos.",
  ];

  const porCategoria: string[][] = [];
  for (const categoria of siembra.categorias) {
    const atributos = categoria.atributos ?? [];
    if (atributos.length === 0) {
      porCategoria.push([
        categoria.nombre,
        "—",
        categoria.vende === "tiempo"
          ? "Servicio con cita, sin datos propios"
          : "Sin datos propios: nombre, precio y descripción alcanzan",
      ]);
      continue;
    }
    atributos.forEach((atributo, indice) => {
      porCategoria.push([indice === 0 ? categoria.nombre : "", tituloDeCampo(atributo), comoSeEscribe(atributo)]);
    });
  }

  return [
    [`Plantilla de ${nombreDeRubro(rubro)} para MiPuesto`],
    [],
    ["Cómo llenarla"],
    ...pasos.map((paso, indice) => [`${indice + 1}. ${paso}`]),
    [],
    [`Consejos para ${nombreDeRubro(rubro).toLowerCase()}`],
    ...plantilla.consejos.map((consejo) => [`· ${consejo}`]),
    [],
    ["Qué datos pide cada categoría"],
    ["Categoría", "Dato", "Cómo se escribe"],
    ...porCategoria,
  ];
}

/* El libro entero: «Productos» primero —el importador lee la primera hoja con
   datos— y «Cómo llenarla» después. */
export function armarPlantilla(rubro: RubroId): Uint8Array {
  const productos = filasDeProductos(rubro);
  const hojas: HojaDeLibro[] = [
    {
      nombre: "Productos",
      filas: productos,
      conTitulos: true,
      anchos: productos[0].map((titulo, indice) =>
        indice === 0 ? 42 : titulo === TITULOS_FIJOS.descripcion ? 40 : Math.max(12, titulo.length + 4),
      ),
    },
    { nombre: "Cómo llenarla", filas: filasDeInstrucciones(rubro), anchos: [34, 26, 60] },
  ];
  return armarLibro(hojas);
}

export function nombreDeArchivoDePlantilla(rubro: RubroId): string {
  return `plantilla-${rubro.replace(/_/g, "-")}-mipuesto.xlsx`;
}
