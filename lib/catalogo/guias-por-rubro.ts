import type { RubroId } from "../negocios/rubros";
import {
  RUBRO_PUBLICO_POR_SIEMBRA,
  esRubroPublicoId,
  type RubroPublicoId,
} from "../negocios/rubros-publicos";
import type { TipoAtributo } from "./atributos";

/* Las ayudas del catálogo, contadas con el oficio de cada negocio.
 *
 * Un ejemplo genérico no enseña nada: «Potencia: 9 W» no le dice qué poner a
 * quien tiene una pollería, y «Ingredientes, medidas, materiales» no le dice
 * nada a quien vende repuestos. Lo que enseña es ver el campo de **su** negocio.
 *
 * Por eso cada rubro público —«Pollería y broaster», no «Restaurante»— tiene su
 * guía, y un negocio con rubros secundarios usa la del secundario en la
 * categoría que es de ese rubro: en una pollería que también vende helados, la
 * categoría «Helados» habla de sabores y tamaños, no de presas.
 *
 * Los cuatro ejemplos de campo son **uno por tipo** y van juntos: el nombre, la
 * unidad y las opciones de ejemplo del editor salen del mismo campo, así nunca
 * se ve «Porción» como nombre con «E27» como opción. Una prueba pasa cada
 * ejemplo por `validarAtributos`: lo que sugerimos, el sistema lo acepta.
 *
 * Todo el texto va en español neutro, con tuteo.
 */

export type EjemploDeCampo = {
  nombre: string;
  /* Un valor de muestra, para `texto` y `numero`. */
  muestra?: string;
  unidad?: string;
  opciones?: readonly string[];
};

export type GuiaDeRubro = {
  id: RubroPublicoId | "general";
  /* Palabras que delatan una categoría de este rubro, sin tildes y en
     singular: «helado» reconoce «Helados». */
  palabras: readonly string[];
  /* Tres categorías de ejemplo, como las buscaría el cliente. */
  categorias: readonly [string, string, string];
  campos: {
    /* Lo que el cliente pregunta antes de comprar, sin mayúscula inicial. */
    preguntas: string;
    texto: EjemploDeCampo;
    numero: EjemploDeCampo;
    opcion: EjemploDeCampo;
    si_no: EjemploDeCampo;
  };
  producto: {
    nombre: string;
    /* Cómo no nombrarlo: el nombre de inventario o de factura. */
    evitar: string;
    /* Lo que no se ve en la foto, sin mayúscula inicial. */
    queContar: string;
    descripcion: string;
    precio: string;
  };
};

const GENERAL: GuiaDeRubro = {
  id: "general",
  palabras: [],
  categorias: ["Lo más pedido", "Novedades", "Por encargo"],
  campos: {
    preguntas: "de qué está hecho, cuánto mide, en qué colores viene",
    texto: { nombre: "Material", muestra: "Madera" },
    numero: { nombre: "Medida", unidad: "cm", muestra: "30" },
    opcion: { nombre: "Color", opciones: ["Negro", "Blanco", "Azul"] },
    si_no: { nombre: "Hecho a pedido" },
  },
  producto: {
    nombre: "Mochila escolar",
    evitar: "Artículo 145",
    queContar: "de qué está hecho, qué medidas tiene, qué incluye",
    descripcion: "Tela impermeable, dos bolsillos, para laptop de 15 pulgadas.",
    precio: "120",
  },
};

const GUIAS: Record<Exclude<RubroPublicoId, "otro">, GuiaDeRubro> = {
  restaurante: {
    id: "restaurante",
    palabras: ["almuerzo", "plato", "sopa", "segundo", "parrill", "carne", "pescado", "menu", "cena", "desayuno"],
    categorias: ["Almuerzos", "Platos a la carta", "Bebidas"],
    campos: {
      preguntas: "con qué viene, qué tan grande es la porción, si pica",
      texto: { nombre: "Acompañamiento", muestra: "Arroz, papa y ensalada" },
      numero: { nombre: "Porción", unidad: "g", muestra: "350" },
      opcion: { nombre: "Picante", opciones: ["Sin picante", "Suave", "Fuerte"] },
      si_no: { nombre: "Vegetariano" },
    },
    producto: {
      nombre: "Silpancho",
      evitar: "Plato ejecutivo N.º 3",
      queContar: "con qué viene, para cuántas personas alcanza, si lleva picante",
      descripcion: "Con arroz, papa, huevo frito y ensalada. Alcanza para una persona.",
      precio: "25",
    },
  },
  polleria: {
    id: "polleria",
    palabras: ["pollo", "presa", "broaster", "combo", "alita", "ala", "brasa"],
    categorias: ["Presas", "Combos", "Bebidas"],
    campos: {
      preguntas: "qué presa es, con qué acompañamiento viene, si incluye gaseosa",
      texto: { nombre: "Acompañamiento", muestra: "Papas fritas y arroz" },
      numero: { nombre: "Cantidad de presas", muestra: "4" },
      opcion: { nombre: "Presa", opciones: ["Pecho", "Pierna", "Ala", "Encuentro"] },
      si_no: { nombre: "Incluye gaseosa" },
    },
    producto: {
      nombre: "Cuarto de pollo broaster",
      evitar: "Combo 2",
      queContar: "qué presa trae, con qué acompañamiento, si incluye bebida",
      descripcion: "Pierna o pecho con papas fritas, arroz y ensalada.",
      precio: "28",
    },
  },
  comida_rapida: {
    id: "comida_rapida",
    palabras: ["hamburguesa", "salchipapa", "pizza", "hot", "pancho", "sandwich", "lomito", "papa", "chorip"],
    categorias: ["Hamburguesas", "Salchipapas", "Bebidas"],
    campos: {
      preguntas: "qué ingredientes trae, de qué tamaño es, si viene con papas",
      texto: { nombre: "Ingredientes", muestra: "Carne, queso, lechuga y tomate" },
      numero: { nombre: "Carne", unidad: "g", muestra: "150" },
      opcion: { nombre: "Tamaño", opciones: ["Personal", "Mediana", "Familiar"] },
      si_no: { nombre: "Con papas fritas" },
    },
    producto: {
      nombre: "Hamburguesa doble con queso",
      evitar: "Combo especial",
      queContar: "qué ingredientes lleva, de qué tamaño es, si viene con papas o bebida",
      descripcion: "Doble carne, queso cheddar, tocino y papas fritas.",
      precio: "30",
    },
  },
  salteneria: {
    id: "salteneria",
    palabras: ["salteña", "saltena", "empanada", "tucumana", "pastel", "api", "cuñape"],
    categorias: ["Salteñas", "Empanadas", "Bebidas"],
    campos: {
      preguntas: "de qué es el relleno, si es dulce o picante, a qué hora sale",
      texto: { nombre: "Relleno", muestra: "Carne de res con papa y arveja" },
      numero: { nombre: "Unidades", muestra: "12" },
      opcion: { nombre: "Picante", opciones: ["Dulce", "Picante", "Muy picante"] },
      si_no: { nombre: "Por encargo" },
    },
    producto: {
      nombre: "Salteña de pollo",
      evitar: "Producto 1",
      queContar: "de qué es el relleno, si es dulce o picante, a qué hora sale",
      descripcion: "Jugosa, con pollo, papa, arveja y huevo. Sale desde las 8:00.",
      precio: "7",
    },
  },
  cafeteria: {
    id: "cafeteria",
    palabras: ["cafe", "helado", "postre", "capuchino", "batido", "jugo", "frappe", "infusion", "malteada"],
    categorias: ["Cafés", "Helados", "Postres"],
    campos: {
      preguntas: "de qué sabor es, de qué tamaño, si lleva leche o azúcar",
      texto: { nombre: "Sabor", muestra: "Chocolate con frutilla" },
      numero: { nombre: "Tamaño", unidad: "ml", muestra: "350" },
      opcion: { nombre: "Leche", opciones: ["Entera", "Deslactosada", "Sin leche"] },
      si_no: { nombre: "Sin azúcar" },
    },
    producto: {
      nombre: "Capuchino grande",
      evitar: "Bebida caliente 2",
      queContar: "de qué tamaño es, qué sabor tiene, si se sirve frío o caliente",
      descripcion: "Café espresso con leche espumada y canela. 350 ml.",
      precio: "18",
    },
  },
  panaderia: {
    id: "panaderia",
    palabras: ["pan", "torta", "masita", "galleta", "queque", "bizcocho", "reposteria", "pasteleria", "bocadito"],
    categorias: ["Panes", "Tortas", "Masitas"],
    campos: {
      preguntas: "de qué sabor es, para cuántas porciones, con cuánto tiempo se encarga",
      texto: { nombre: "Sabor", muestra: "Chocolate con dulce de leche" },
      numero: { nombre: "Porciones", muestra: "12" },
      opcion: { nombre: "Tamaño", opciones: ["Pequeña", "Mediana", "Grande"] },
      si_no: { nombre: "Por encargo" },
    },
    producto: {
      nombre: "Torta de chocolate",
      evitar: "Torta modelo 5",
      queContar: "para cuántas personas alcanza, de qué es el relleno, con cuánta anticipación se encarga",
      descripcion: "Bizcocho de chocolate con relleno de dulce de leche. Para 12 porciones; encárgala con un día.",
      precio: "90",
    },
  },
  tienda_barrio: {
    id: "tienda_barrio",
    palabras: ["abarrote", "bebida", "gaseosa", "limpieza", "lacteo", "snack", "golosina", "fideo", "arroz", "aceite"],
    categorias: ["Abarrotes", "Bebidas", "Limpieza"],
    campos: {
      preguntas: "de qué marca es, cuánto trae, en qué envase viene",
      texto: { nombre: "Marca", muestra: "Pil" },
      numero: { nombre: "Contenido", unidad: "L", muestra: "1" },
      opcion: { nombre: "Presentación", opciones: ["Botella", "Bolsa", "Caja"] },
      si_no: { nombre: "Refrigerado" },
    },
    producto: {
      nombre: "Leche entera 1 L",
      evitar: "Leche",
      queContar: "la marca, cuánto trae y en qué envase viene",
      descripcion: "Leche entera en bolsa de 1 litro. Se vende fría.",
      precio: "7,50",
    },
  },
  minimarket: {
    id: "minimarket",
    palabras: ["abarrote", "lacteo", "snack", "bebida", "limpieza", "enlatado", "congelado", "embutido", "cereal"],
    categorias: ["Abarrotes", "Lácteos", "Snacks"],
    campos: {
      preguntas: "de qué marca es, cuánto trae, si es importado",
      texto: { nombre: "Marca", muestra: "Coca-Cola" },
      numero: { nombre: "Contenido", unidad: "kg", muestra: "1" },
      opcion: { nombre: "Presentación", opciones: ["Unidad", "Paquete", "Caja"] },
      si_no: { nombre: "Importado" },
    },
    producto: {
      nombre: "Aceite de girasol 900 ml",
      evitar: "Aceite",
      queContar: "la marca, cuánto trae y en qué envase viene",
      descripcion: "Botella de 900 ml. También por caja de 12.",
      precio: "16",
    },
  },
  licoreria: {
    id: "licoreria",
    palabras: ["cerveza", "vino", "singani", "whisky", "ron", "vodka", "licor", "destilado", "espumante", "bebida"],
    categorias: ["Cervezas", "Vinos y singanis", "Destilados"],
    campos: {
      preguntas: "de qué marca y origen es, cuánto trae, si se entrega fría",
      texto: { nombre: "Origen", muestra: "Tarija" },
      numero: { nombre: "Contenido", unidad: "ml", muestra: "750" },
      opcion: { nombre: "Presentación", opciones: ["Botella", "Lata", "Caja de 6"] },
      si_no: { nombre: "Se entrega fría" },
    },
    producto: {
      nombre: "Vino tinto tarijeño 750 ml",
      evitar: "Vino 3",
      queContar: "la marca, el origen, cuánto trae y si se entrega fría",
      descripcion: "Tannat de los valles de Tarija. Botella de 750 ml.",
      precio: "65",
    },
  },
  jugueteria: {
    id: "jugueteria",
    palabras: ["juguete", "muñeca", "auto", "pista", "peluche", "juego", "rompecabeza", "didactico", "bebe"],
    categorias: ["Muñecas", "Autos y pistas", "Juegos de mesa"],
    campos: {
      preguntas: "para qué edad es, cuántas piezas trae, si necesita pilas",
      texto: { nombre: "Material", muestra: "Plástico resistente" },
      numero: { nombre: "Piezas", muestra: "500" },
      opcion: { nombre: "Edad", opciones: ["0 a 2 años", "3 a 5 años", "6 a 8 años", "9 años o más"] },
      si_no: { nombre: "Lleva pilas" },
    },
    producto: {
      nombre: "Rompecabezas de 500 piezas",
      evitar: "Juguete 12",
      queContar: "para qué edad es, qué trae la caja, si necesita pilas",
      descripcion: "Paisaje del lago Titicaca. Para 8 años o más; mide 48 × 34 cm armado.",
      precio: "60",
    },
  },
  libreria: {
    id: "libreria",
    palabras: ["util", "cuaderno", "oficina", "papel", "lapiz", "boligrafo", "mochila", "escolar", "arte", "libro"],
    categorias: ["Útiles escolares", "Cuadernos", "Oficina"],
    campos: {
      preguntas: "de qué marca es, cuántas hojas trae, qué tipo de hoja",
      texto: { nombre: "Marca", muestra: "Faber-Castell" },
      numero: { nombre: "Hojas", muestra: "100" },
      opcion: { nombre: "Tipo de hoja", opciones: ["Cuadriculada", "Rayada", "Blanca"] },
      si_no: { nombre: "Tapa dura" },
    },
    producto: {
      nombre: "Cuaderno cuadriculado 100 hojas",
      evitar: "Cuaderno",
      queContar: "la marca, cuántas hojas o piezas trae, de qué tamaño es",
      descripcion: "Tamaño carta, con espiral y tapa dura. 100 hojas cuadriculadas.",
      precio: "15",
    },
  },
  regalos: {
    id: "regalos",
    palabras: ["globo", "arreglo", "cotillon", "regalo", "fiesta", "decoracion", "sorpresa", "flor", "peluche", "detalle"],
    categorias: ["Globos", "Arreglos", "Cotillón"],
    campos: {
      preguntas: "para qué ocasión es, qué incluye, si se puede personalizar",
      texto: { nombre: "Temática", muestra: "Cumpleaños infantil" },
      numero: { nombre: "Unidades por paquete", muestra: "12" },
      opcion: { nombre: "Color", opciones: ["Dorado", "Plateado", "Multicolor"] },
      si_no: { nombre: "Personalizable" },
    },
    producto: {
      nombre: "Arreglo de globos para cumpleaños",
      evitar: "Pack 4",
      queContar: "para qué ocasión es, qué incluye, con cuánta anticipación se encarga",
      descripcion: "12 globos metálicos y un número gigante. Se personaliza con el nombre.",
      precio: "85",
    },
  },
  electronica: {
    id: "electronica",
    palabras: ["celular", "telefono", "accesorio", "audifono", "cargador", "cable", "funda", "parlante", "computadora", "tablet", "reloj"],
    categorias: ["Celulares", "Accesorios", "Audífonos"],
    campos: {
      preguntas: "qué modelo es, cuánta memoria tiene, si tiene garantía",
      texto: { nombre: "Modelo", muestra: "Galaxy A15" },
      numero: { nombre: "Almacenamiento", unidad: "GB", muestra: "128" },
      opcion: { nombre: "Color", opciones: ["Negro", "Azul", "Plateado"] },
      si_no: { nombre: "Con garantía" },
    },
    producto: {
      nombre: "Samsung Galaxy A15 128 GB",
      evitar: "Celular gama media",
      queContar: "la memoria, qué trae la caja, cuánto dura la garantía",
      descripcion: "128 GB y 4 GB de RAM. Trae cargador y funda. Garantía de 3 meses.",
      precio: "1450",
    },
  },
  muebles: {
    id: "muebles",
    palabras: ["mueble", "dormitorio", "sala", "cocina", "comedor", "cama", "ropero", "colchon", "silla", "mesa", "hogar", "decoracion"],
    categorias: ["Dormitorio", "Sala", "Cocina"],
    campos: {
      preguntas: "de qué material es, qué medidas tiene, si se entrega armado",
      texto: { nombre: "Material", muestra: "Madera de cedro" },
      numero: { nombre: "Ancho", unidad: "cm", muestra: "160" },
      opcion: { nombre: "Acabado", opciones: ["Natural", "Nogal", "Blanco"] },
      si_no: { nombre: "Se entrega armado" },
    },
    producto: {
      nombre: "Ropero de 3 puertas",
      evitar: "Mueble 7",
      queContar: "el material, las medidas, si la entrega incluye el armado",
      descripcion: "Madera de cedro, 160 × 200 × 55 cm. Te lo llevamos armado.",
      precio: "1800",
    },
  },
  artesanias: {
    id: "artesanias",
    palabras: ["tejido", "ceramica", "recuerdo", "souvenir", "aguayo", "chalina", "poncho", "plateria", "alpaca", "artesania"],
    categorias: ["Tejidos", "Cerámica", "Recuerdos"],
    campos: {
      preguntas: "de qué material es, de dónde viene, si está hecho a mano",
      texto: { nombre: "Origen", muestra: "Tarabuco, Chuquisaca" },
      numero: { nombre: "Largo", unidad: "cm", muestra: "180" },
      opcion: { nombre: "Material", opciones: ["Alpaca", "Oveja", "Algodón"] },
      si_no: { nombre: "Hecho a mano" },
    },
    producto: {
      nombre: "Chalina de alpaca",
      evitar: "Tejido 3",
      queContar: "de qué material es, dónde se hizo, qué medidas tiene",
      descripcion: "Tejida a mano en telar, 100 % alpaca. 180 × 30 cm.",
      precio: "150",
    },
  },
  ropa_y_calzado: {
    id: "ropa_y_calzado",
    palabras: ["polera", "camisa", "pantalon", "jean", "vestido", "falda", "chamarra", "zapato", "zapatilla", "calzado", "ropa", "deportivo", "buzo", "blusa", "bota"],
    categorias: ["Poleras", "Pantalones", "Zapatillas"],
    campos: {
      preguntas: "de qué material es, de qué color, cómo se cuida",
      texto: { nombre: "Material", muestra: "Algodón" },
      numero: { nombre: "Alto del taco", unidad: "cm", muestra: "7" },
      opcion: { nombre: "Color", opciones: ["Negro", "Blanco", "Azul"] },
      si_no: { nombre: "Unisex" },
    },
    producto: {
      nombre: "Polera de algodón cuello redondo",
      evitar: "Polera modelo 12",
      queContar: "el material, si es ajustada u holgada, cómo se lava",
      descripcion: "100 % algodón, corte recto. Lavar con agua fría.",
      precio: "70",
    },
  },
  accesorios: {
    id: "accesorios",
    palabras: ["arete", "collar", "pulsera", "anillo", "cartera", "bolso", "reloj", "lente", "gorra", "bisuteria", "joya", "accesorio", "cinturon"],
    categorias: ["Aretes", "Collares", "Carteras"],
    campos: {
      preguntas: "de qué material es, qué largo tiene, si es hipoalergénico",
      texto: { nombre: "Material", muestra: "Plata 950" },
      numero: { nombre: "Largo", unidad: "cm", muestra: "45" },
      opcion: { nombre: "Color", opciones: ["Dorado", "Plateado", "Rosado"] },
      si_no: { nombre: "Hipoalergénico" },
    },
    producto: {
      nombre: "Collar de plata con dije de corazón",
      evitar: "Collar 8",
      queContar: "el material, el largo o la medida, cómo se cuida",
      descripcion: "Plata 950, cadena de 45 cm con dije de 1 cm.",
      precio: "120",
    },
  },
  ferreteria: {
    id: "ferreteria",
    palabras: ["herramienta", "electricidad", "electrico", "plomeria", "pintura", "construccion", "cemento", "fierro", "foco", "tuberia", "tornillo", "clavo", "cerrajeria", "material"],
    categorias: ["Herramientas", "Electricidad", "Plomería"],
    campos: {
      preguntas: "de qué material es, qué medida o potencia tiene, con qué es compatible",
      texto: { nombre: "Material", muestra: "Acero inoxidable" },
      numero: { nombre: "Potencia", unidad: "W", muestra: "9" },
      opcion: { nombre: "Casquillo", opciones: ["E27", "E14", "GU10"] },
      si_no: { nombre: "Regulable" },
    },
    producto: {
      nombre: "Foco LED 9 W luz blanca",
      evitar: "Foco",
      queContar: "la medida, la potencia o el material, para qué sirve",
      descripcion: "Casquillo E27, luz blanca fría. Equivale a un foco de 60 W.",
      precio: "15",
    },
  },
  distribuidora: {
    id: "distribuidora",
    palabras: ["caja", "mayor", "mayorista", "gaseosa", "abarrote", "limpieza", "bebida", "fardo", "saco", "quintal", "arroba", "paquete"],
    categorias: ["Gaseosas", "Abarrotes por mayor", "Limpieza"],
    campos: {
      preguntas: "cuántas unidades trae la caja, desde cuántas hay precio por mayor, si se entrega",
      texto: { nombre: "Marca", muestra: "Coca-Cola" },
      numero: { nombre: "Unidades por caja", muestra: "24" },
      opcion: { nombre: "Venta", opciones: ["Por unidad", "Por caja", "Por fardo"] },
      si_no: { nombre: "Precio por mayor" },
    },
    producto: {
      nombre: "Gaseosa 2 L, caja de 6",
      evitar: "Gaseosa caja",
      queContar: "cuántas unidades trae, desde cuántas cajas baja el precio, si incluye la entrega",
      descripcion: "Caja de 6 botellas de 2 L. Desde 10 cajas, precio por mayor.",
      precio: "72",
    },
  },
  repuestos: {
    id: "repuestos",
    palabras: ["freno", "motor", "suspension", "filtro", "aceite", "llanta", "bateria", "embrague", "repuesto", "moto", "luz", "electrico", "carroceria"],
    categorias: ["Frenos", "Motor", "Suspensión"],
    campos: {
      preguntas: "para qué vehículo y año es, qué código tiene, si es original o alternativo",
      texto: { nombre: "Código del fabricante", muestra: "04465-02220" },
      numero: { nombre: "Diámetro", unidad: "mm", muestra: "16" },
      opcion: { nombre: "Compatible con", opciones: ["Toyota", "Nissan", "Suzuki"] },
      si_no: { nombre: "Original" },
    },
    producto: {
      nombre: "Pastillas de freno delanteras Corolla 2010-2015",
      evitar: "Pastillas",
      queContar: "para qué marca, modelo y años sirve, si es original o alternativo",
      descripcion: "Para Toyota Corolla del 2010 al 2015. Garantía de 3 meses.",
      precio: "180",
    },
  },
  taller_mecanico: {
    id: "taller_mecanico",
    palabras: ["mantenimiento", "diagnostico", "freno", "suspension", "alineado", "balanceo", "mecanica", "cambio", "lavado", "chaperio", "pintura", "electrico"],
    categorias: ["Mantenimiento", "Frenos y suspensión", "Diagnóstico"],
    campos: {
      preguntas: "qué incluye el trabajo, cuánto tarda, si los repuestos van aparte",
      texto: { nombre: "Incluye", muestra: "Aceite, filtro y revisión de niveles" },
      numero: { nombre: "Duración", unidad: "min", muestra: "60" },
      opcion: { nombre: "Vehículo", opciones: ["Auto", "Camioneta", "Moto"] },
      si_no: { nombre: "Incluye repuestos" },
    },
    producto: {
      nombre: "Cambio de aceite y filtro",
      evitar: "Servicio 1",
      queContar: "qué incluye el trabajo, cuánto tarda, si los repuestos van aparte",
      descripcion: "Aceite sintético y filtro nuevo, revisión de frenos y niveles. Una hora.",
      precio: "250",
    },
  },
  barberia: {
    id: "barberia",
    palabras: ["corte", "barba", "afeitado", "tinte", "peinado", "cabello", "ceja", "combo"],
    categorias: ["Cortes", "Barba", "Combos"],
    campos: {
      preguntas: "qué incluye, cuánto tarda, para quién es",
      texto: { nombre: "Incluye", muestra: "Corte, lavado y peinado" },
      numero: { nombre: "Duración", unidad: "min", muestra: "40" },
      opcion: { nombre: "Estilo", opciones: ["Degradado", "Clásico", "Con diseño"] },
      si_no: { nombre: "Para niños" },
    },
    producto: {
      nombre: "Corte degradado con barba",
      evitar: "Servicio premium",
      queContar: "qué incluye, cuánto tarda, con quién",
      descripcion: "Degradado a máquina y tijera, perfilado de barba con toalla caliente. 45 minutos.",
      precio: "50",
    },
  },
  salon_belleza: {
    id: "salon_belleza",
    palabras: ["uña", "manicure", "pedicure", "cabello", "tinte", "maquillaje", "pestaña", "ceja", "depilacion", "facial", "alisado", "keratina", "peinado"],
    categorias: ["Uñas", "Cabello", "Maquillaje"],
    campos: {
      preguntas: "qué técnica usan, cuánto tarda, cuánto dura el resultado",
      texto: { nombre: "Incluye", muestra: "Limado, esmaltado y diseño sencillo" },
      numero: { nombre: "Duración", unidad: "min", muestra: "60" },
      opcion: { nombre: "Técnica", opciones: ["Esmalte común", "Semipermanente", "Acrílico"] },
      si_no: { nombre: "Con turno" },
    },
    producto: {
      nombre: "Uñas acrílicas con diseño",
      evitar: "Paquete 3",
      queContar: "qué técnica usan, cuánto dura el resultado, cuánto tarda",
      descripcion: "Acrílico con diseño a elección. Dura tres semanas; demora una hora y media.",
      precio: "120",
    },
  },
  consultorio: {
    id: "consultorio",
    palabras: ["consulta", "tratamiento", "control", "terapia", "dental", "odontologia", "psicologia", "nutricion", "fisioterapia", "examen", "analisis", "ecografia"],
    categorias: ["Consultas", "Tratamientos", "Controles"],
    campos: {
      preguntas: "qué incluye la atención, cuánto dura, si es presencial o a distancia",
      texto: { nombre: "Incluye", muestra: "Consulta y receta" },
      numero: { nombre: "Duración", unidad: "min", muestra: "30" },
      opcion: { nombre: "Modalidad", opciones: ["Presencial", "Por videollamada"] },
      si_no: { nombre: "Incluye control" },
    },
    producto: {
      nombre: "Consulta de medicina general",
      evitar: "Atención 1",
      queContar: "qué incluye, cuánto dura, qué tiene que traer el paciente",
      descripcion: "Revisión completa y receta. Trae tus análisis anteriores si los tienes. 30 minutos.",
      precio: "150",
    },
  },
  clases: {
    id: "clases",
    palabras: ["clase", "curso", "taller", "tutoria", "nivelacion", "idioma", "ingles", "musica", "baile", "danza", "reforzamiento"],
    categorias: ["Clases particulares", "Cursos", "Talleres"],
    campos: {
      preguntas: "para qué nivel es, cuánto dura, si es presencial o virtual",
      texto: { nombre: "Incluye", muestra: "Material impreso y certificado" },
      numero: { nombre: "Duración", unidad: "min", muestra: "60" },
      opcion: { nombre: "Nivel", opciones: ["Básico", "Intermedio", "Avanzado"] },
      si_no: { nombre: "Virtual" },
    },
    producto: {
      nombre: "Clase de guitarra para principiantes",
      evitar: "Curso A",
      queContar: "para qué nivel es, cuántas clases trae, qué hay que llevar",
      descripcion: "Ocho clases de una hora, dos por semana. Si no tienes guitarra, te prestamos una.",
      precio: "300",
    },
  },
  otros_servicios: {
    id: "otros_servicios",
    palabras: ["servicio", "domicilio", "instalacion", "mantenimiento", "reparacion", "limpieza", "lavado", "fumigacion", "mudanza", "fotografia", "evento"],
    categorias: ["A domicilio", "Mantenimiento", "Instalaciones"],
    campos: {
      preguntas: "qué incluye, cuánto tarda, si atiendes a domicilio",
      texto: { nombre: "Incluye", muestra: "Lavado y secado" },
      numero: { nombre: "Duración", unidad: "min", muestra: "45" },
      opcion: { nombre: "Atención", opciones: ["A domicilio", "En el local"] },
      si_no: { nombre: "Con reserva" },
    },
    producto: {
      nombre: "Lavado de sofá de 3 cuerpos",
      evitar: "Servicio básico",
      queContar: "qué incluye, cuánto tarda, si vas a domicilio",
      descripcion: "Lavado a vapor y secado. Vamos a tu casa; demora unas dos horas.",
      precio: "200",
    },
  },
  veterinaria: {
    id: "veterinaria",
    palabras: ["consulta", "vacuna", "desparasitacion", "cirugia", "baño", "peluqueria", "medicamento", "antipulga", "esterilizacion"],
    categorias: ["Consultas", "Vacunas", "Medicamentos"],
    campos: {
      preguntas: "para qué animal es, para qué peso, si necesita receta",
      texto: { nombre: "Principio activo", muestra: "Ivermectina" },
      numero: { nombre: "Peso del animal", unidad: "kg", muestra: "10" },
      opcion: { nombre: "Para", opciones: ["Perro", "Gato", "Ave"] },
      si_no: { nombre: "Necesita receta" },
    },
    producto: {
      nombre: "Vacuna antirrábica para perro",
      evitar: "Vacuna",
      queContar: "para qué animal y peso es, cada cuánto se repite",
      descripcion: "Para perros desde los 3 meses. Refuerzo cada año; incluye el carnet.",
      precio: "60",
    },
  },
  mascotas: {
    id: "mascotas",
    palabras: ["alimento", "accesorio", "higiene", "juguete", "collar", "cama", "arena", "jaula", "pecera", "acuario", "snack", "premio", "croqueta"],
    categorias: ["Alimentos", "Accesorios", "Higiene"],
    campos: {
      preguntas: "para qué animal y etapa es, cuánto pesa la bolsa, de qué marca es",
      texto: { nombre: "Sabor", muestra: "Carne y arroz" },
      numero: { nombre: "Peso", unidad: "kg", muestra: "15" },
      opcion: { nombre: "Etapa", opciones: ["Cachorro", "Adulto", "Senior"] },
      si_no: { nombre: "Para razas pequeñas" },
    },
    producto: {
      nombre: "Alimento para perro adulto 15 kg",
      evitar: "Alimento",
      queContar: "para qué animal y etapa es, cuánto trae, de qué sabor es",
      descripcion: "Sabor carne y arroz, para perros adultos de razas medianas. Bolsa de 15 kg.",
      precio: "280",
    },
  },
};

export function guiaDeRubroPublico(id: unknown): GuiaDeRubro {
  if (!esRubroPublicoId(id) || id === "otro") return GENERAL;
  return GUIAS[id];
}

export type RubrosDelNegocio = {
  /* La siembra, para los negocios de antes de la fase 11 sin rubro público. */
  rubro?: string | null;
  rubro_publico?: string | null;
  rubros_secundarios?: ReadonlyArray<string> | null;
};

function sinTildes(texto: string): string {
  return Array.from(texto.normalize("NFD"))
    .filter((caracter) => {
      const codigo = caracter.codePointAt(0) ?? 0;
      return codigo < 0x300 || codigo > 0x36f;
    })
    .join("")
    .toLowerCase();
}

/* Cuántas palabras del nombre de la categoría son de este rubro. Se compara el
   comienzo de cada palabra y se admiten hasta tres letras más —el plural y
   poco más—: «helado» reconoce «Helados», «pan» reconoce «Panes» pero no
   «Pantalones», y «ala» no reconoce «Ensaladas». */
const LETRAS_DE_MAS = 3;

function coincidencias(guia: GuiaDeRubro, nombreCategoria: string): number {
  const palabras = sinTildes(nombreCategoria).split(/[^a-z0-9ñ]+/).filter(Boolean);
  const claves = guia.palabras.map(sinTildes);
  return palabras.filter((palabra) =>
    claves.some((clave) => palabra.startsWith(clave) && palabra.length - clave.length <= LETRAS_DE_MAS),
  ).length;
}

function rubroPrincipal(negocio: RubrosDelNegocio): string | null {
  if (negocio.rubro_publico) return negocio.rubro_publico;
  const siembra = negocio.rubro as RubroId | null | undefined;
  return siembra && siembra in RUBRO_PUBLICO_POR_SIEMBRA ? RUBRO_PUBLICO_POR_SIEMBRA[siembra] : null;
}

/* La guía que corresponde: la del rubro principal, salvo que la categoría sea
   claramente de un secundario —más palabras suyas que del principal—. En un
   empate gana el principal: es lo que el dueño eligió primero. */
export function guiaDelNegocio(negocio: RubrosDelNegocio, nombreCategoria?: string | null): GuiaDeRubro {
  const principal = guiaDeRubroPublico(rubroPrincipal(negocio));
  if (!nombreCategoria?.trim()) return principal;

  const base = coincidencias(principal, nombreCategoria);
  let elegida = principal;
  let mejor = base;
  for (const id of negocio.rubros_secundarios ?? []) {
    const secundaria = guiaDeRubroPublico(id);
    const puntos = coincidencias(secundaria, nombreCategoria);
    if (puntos > mejor) {
      elegida = secundaria;
      mejor = puntos;
    }
  }
  return elegida;
}

/* Las categorías de ejemplo del negocio: dos del principal y la primera de
   cada secundario, para que quien vende de dos rubros vea los dos. */
export function categoriasDeEjemplo(negocio: RubrosDelNegocio): string[] {
  const principal = guiaDeRubroPublico(rubroPrincipal(negocio));
  const secundarias = (negocio.rubros_secundarios ?? [])
    .map(guiaDeRubroPublico)
    .filter((guia) => guia.id !== principal.id && guia.id !== "general");
  if (secundarias.length === 0) return [...principal.categorias];
  const ejemplos = [...principal.categorias.slice(0, 2), ...secundarias.map((guia) => guia.categorias[0])];
  return [...new Set(ejemplos)];
}

/* --- Los textos que arma cada pantalla ---------------------------------- */

function lista(ejemplos: ReadonlyArray<string>): string {
  const citados = ejemplos.map((ejemplo) => `«${ejemplo}»`);
  if (citados.length <= 1) return citados.join("");
  return `${citados.slice(0, -1).join(", ")} y ${citados.at(-1)}`;
}

export function ayudaCategoria(negocio: RubrosDelNegocio): string {
  return `Agrupa como busca tu cliente, no como lo guardas tú: ${lista(categoriasDeEjemplo(negocio))}. Entre cuatro y ocho alcanzan; con veinte, el catálogo vuelve a ser una lista larga.`;
}

export function ejemploDeCategoria(negocio: RubrosDelNegocio): string {
  return `Ej.: ${categoriasDeEjemplo(negocio)[0]}`;
}

export function introDeCampos(guia: GuiaDeRubro): string {
  return `Además del nombre y el precio, lo que tu cliente pregunta antes de comprar: ${guia.campos.preguntas}. Cada dato que agregues aquí se pide en todos los productos de esta categoría.`;
}

/* «Picante: Suave · Medio · Fuerte». El ejemplo al pie del tipo de campo: se
   ve cómo va a quedar en vez de leer qué significa el tipo. */
export function ejemploDeTipo(tipo: TipoAtributo, guia: GuiaDeRubro): string {
  const ejemplo = guia.campos[tipo];
  switch (tipo) {
    case "texto":
      return `${ejemplo.nombre}: ${ejemplo.muestra ?? ""}`.trim();
    case "numero":
      return `${ejemplo.nombre}: ${[ejemplo.muestra, ejemplo.unidad].filter(Boolean).join(" ")}`;
    case "opcion":
      return `${ejemplo.nombre}: ${(ejemplo.opciones ?? []).join(" · ")}`;
    case "si_no":
      return `${ejemplo.nombre}: sí`;
  }
}

/* Los textos grises del campo mientras se edita, del mismo ejemplo que el tipo
   elegido: cambiar el tipo cambia los tres juntos. */
export function marcadoresDeCampo(tipo: TipoAtributo, guia: GuiaDeRubro) {
  return {
    nombre: guia.campos[tipo].nombre,
    /* Sin unidad en el ejemplo —«Cantidad de presas: 4»— se dice que puede
       quedar vacía, que es lo que hay que hacer. */
    unidad: guia.campos.numero.unidad ?? "Ninguna",
    opciones: (guia.campos.opcion.opciones ?? []).join("\n"),
  };
}

export function textosDeProducto(guia: GuiaDeRubro) {
  return {
    nombre: `Ej.: ${guia.producto.nombre}`,
    ayudaNombre: `Como lo pide tu cliente: «${guia.producto.nombre}» antes que «${guia.producto.evitar}».`,
    descripcion: `Ej.: ${guia.producto.descripcion}`,
    ayudaDescripcion: `Lo que no se ve en la foto: ${guia.producto.queContar}. Dos renglones bastan.`,
    precio: `Ej.: ${guia.producto.precio}`,
  };
}

/* El texto gris de un dato del producto. Si el dueño creó el campo con el
   mismo nombre que el ejemplo de su rubro, se muestra la muestra; si no, solo
   se dice qué forma tiene la respuesta. */
export function marcadorDeValor(
  atributo: { nombre: string; tipo: TipoAtributo; unidad: string | null },
  guia: GuiaDeRubro,
): string | undefined {
  const mismo = (Object.values(guia.campos).filter((valor) => typeof valor === "object") as EjemploDeCampo[]).find(
    (ejemplo) => sinTildes(ejemplo.nombre) === sinTildes(atributo.nombre.trim()) && ejemplo.muestra,
  );
  if (atributo.tipo === "numero") {
    return mismo?.muestra ? `Ej.: ${mismo.muestra}` : "Solo el número";
  }
  if (atributo.tipo === "texto" && mismo?.muestra) return `Ej.: ${mismo.muestra}`;
  return undefined;
}
