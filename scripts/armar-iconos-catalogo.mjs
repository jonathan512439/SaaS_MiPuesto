/* Arma el juego de íconos que el dueño elige para sus categorías.
 *
 * Son **dos juegos con propósitos distintos**, no una excepción a la regla del
 * otro script:
 *
 *   `components/iconos/trazos.ts`    interfaz: guardar, borrar, volver.
 *                                    Solo los que las pantallas usan.
 *   `components/iconos/catalogo.ts`  las categorías del negocio. Ciento y pico,
 *                                    agrupados por oficio y con términos de
 *                                    búsqueda en español.
 *
 * Meter estos en `trazos.ts` rompería su regla —que contenga solo lo usado—,
 * porque acá la mayoría no se usa en ninguna pantalla: están para que un dueño
 * de ferretería encuentre el suyo.
 *
 * El resultado se versiona: en producción no se depende de la librería.
 * `lucide-static` queda como dependencia de desarrollo para rehacerlo.
 *
 * Uso: node scripts/armar-iconos-catalogo.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const iconos = join(raiz, "node_modules", "lucide-static", "icons");
const destino = join(raiz, "components", "iconos", "catalogo.ts");

/* Cada entrada es `nombre: [ícono de Lucide, términos de búsqueda]`.
 *
 * El nombre va sin tildes y en minúsculas porque viaja a la base, donde una
 * restricción lo exige: es un identificador, no un rótulo. Lo que se lee en
 * pantalla son los términos, que sí llevan tilde y sí admiten varias formas de
 * decir lo mismo —«foco», «bombilla», «lámpara»— porque el dueño no tiene por
 * qué adivinar cómo lo llamamos nosotros. */
const GRUPOS = [
  {
    id: "comida",
    titulo: "Comida y bebida",
    iconos: {
      cubiertos: ["utensils", "cubiertos almuerzo plato comida"],
      "gorro-chef": ["chef-hat", "chef cocina gorro plato del día"],
      vaso: ["cup-soda", "vaso refresco gaseosa bebida"],
      torta: ["cake-slice", "torta pastel postre porción"],
      pizza: ["pizza", "pizza porción italiana"],
      sandwich: ["sandwich", "sándwich hamburguesa pan"],
      sopa: ["soup", "sopa caldo entrada"],
      ensalada: ["salad", "ensalada verdura vegetariano"],
      carne: ["beef", "carne res parrilla asado"],
      pollo: ["drumstick", "pollo presa pierna"],
      pescado: ["fish", "pescado marisco"],
      huevo: ["egg", "huevo desayuno"],
      medialuna: ["croissant", "medialuna factura panadería pan dulce"],
      helado: ["ice-cream-cone", "helado postre frío"],
      cafe: ["coffee", "café té caliente desayuno"],
      vino: ["wine", "vino copa licor"],
      cerveza: ["beer", "cerveza chop birra"],
      leche: ["milk", "leche lácteo yogur"],
      manzana: ["apple", "manzana fruta"],
      zanahoria: ["carrot", "zanahoria verdura hortaliza"],
      trigo: ["wheat", "trigo harina cereal grano"],
      palomitas: ["popcorn", "palomitas pipocas snack"],
      galleta: ["cookie", "galleta dulce snack"],
      jamon: ["ham", "jamón fiambre embutido"],
      bandeja: ["hand-platter", "bandeja servicio mesa mozo"],
      botella: ["bottle-wine", "botella licor bebida"],
    },
  },
  {
    id: "ferreteria",
    titulo: "Ferretería y construcción",
    iconos: {
      martillo: ["hammer", "martillo herramienta clavo"],
      llave: ["wrench", "llave inglesa herramienta tuerca"],
      taladro: ["drill", "taladro herramienta eléctrica"],
      foco: ["lightbulb", "foco bombilla lámpara luz led"],
      rodillo: ["paint-roller", "rodillo pintura pared"],
      pincel: ["paintbrush", "pincel brocha pintura"],
      tornillo: ["bolt", "tornillo perno tornillería"],
      tuerca: ["nut", "tuerca arandela tornillería"],
      regla: ["ruler", "regla medida metro"],
      casco: ["hard-hat", "casco obra seguridad construcción"],
      pico: ["pickaxe", "pico herramienta obra"],
      hacha: ["axe", "hacha herramienta"],
      pala: ["shovel", "pala herramienta obra"],
      ladrillo: ["brick-wall", "ladrillo pared cemento obra"],
      obra: ["construction", "obra construcción barrera"],
      cerco: ["fence", "cerco alambrado reja"],
      puerta: ["door-open", "puerta marco carpintería"],
      llavin: ["key", "llave cerradura llavín"],
      candado: ["lock", "candado cerradura seguridad"],
      enchufe: ["plug", "enchufe tomacorriente eléctrico"],
      electricidad: ["zap", "electricidad corriente rayo"],
      cable: ["cable", "cable alambre eléctrico"],
      lampara: ["lamp-ceiling", "lámpara techo colgante luz"],
      ducha: ["shower-head", "ducha plomería sanitario baño"],
      gota: ["droplet", "gota agua plomería líquido"],
      agua: ["droplets", "agua plomería cañería"],
      fuego: ["flame", "fuego gas soldadura calor"],
      yunque: ["anvil", "yunque herrería metal"],
      bloque: ["toy-brick", "bloque material pieza"],
      capas: ["layers", "capas planchas láminas"],
    },
  },
  {
    id: "ropa",
    titulo: "Ropa y accesorios",
    iconos: {
      remera: ["shirt", "remera polera camiseta ropa"],
      calzado: ["footprints", "calzado zapato zapatilla"],
      reloj: ["watch", "reloj accesorio pulsera"],
      lentes: ["glasses", "lentes anteojos gafas"],
      joya: ["gem", "joya anillo bisutería"],
      corona: ["crown", "corona premium exclusivo"],
      bolso: ["shopping-bag", "bolso cartera bolsa"],
      mochila: ["backpack", "mochila escolar bolso"],
      paraguas: ["umbrella", "paraguas lluvia"],
      bebe: ["baby", "bebé infantil niño"],
      costura: ["pen-tool", "costura sastre arreglo"],
    },
  },
  {
    id: "distribuidora",
    titulo: "Distribución y depósito",
    iconos: {
      canasta: ["shopping-basket", "canasta abarrotes compras"],
      carrito: ["shopping-cart", "carrito compras supermercado"],
      caja: ["package", "caja paquete bulto"],
      "caja-abierta": ["package-open", "caja abierta desembalar"],
      cajas: ["boxes", "cajas lote mayoreo"],
      camion: ["truck", "camión reparto envío"],
      deposito: ["warehouse", "depósito almacén bodega"],
      contenedor: ["container", "contenedor carga importación"],
      montacargas: ["forklift", "montacargas depósito carga"],
      aerosol: ["spray-can", "aerosol limpieza spray"],
      basura: ["trash-2", "basura desechable bolsa"],
      heladera: ["refrigerator", "heladera refrigerador frío"],
      microondas: ["microwave", "microondas electrodoméstico"],
      balanza: ["scale", "balanza peso kilo"],
    },
  },
  {
    id: "repuestos",
    titulo: "Repuestos y vehículos",
    iconos: {
      engranaje: ["cog", "engranaje motor mecánica"],
      "disco-de-freno": ["disc", "disco freno pastilla"],
      auto: ["car-front", "auto coche carro vehículo"],
      camioneta: ["car", "camioneta vehículo auto"],
      moto: ["bike", "moto motocicleta bicicleta"],
      bateria: ["battery-charging", "batería acumulador eléctrico"],
      combustible: ["fuel", "combustible gasolina nafta diésel"],
      tablero: ["gauge", "tablero medidor presión"],
      rueda: ["circle-dot", "rueda llanta neumático aro"],
      aire: ["wind", "aire filtro ventilación"],
      "sin-luz": ["lightbulb-off", "luz apagada falla"],
      estacionamiento: ["circle-parking", "estacionamiento parqueo"],
    },
  },
  {
    id: "veterinaria",
    titulo: "Mascotas y salud",
    iconos: {
      hueso: ["bone", "hueso perro alimento premio"],
      perro: ["dog", "perro can mascota"],
      gato: ["cat", "gato felino mascota"],
      ave: ["bird", "ave pájaro loro"],
      pez: ["fish-symbol", "pez acuario pecera"],
      tina: ["bath", "tina baño peluquería"],
      pastilla: ["pill", "pastilla medicamento remedio"],
      jeringa: ["syringe", "jeringa vacuna inyección"],
      estetoscopio: ["stethoscope", "estetoscopio consulta médico"],
      pulso: ["heart-pulse", "pulso salud control"],
      pipeta: ["pipette", "pipeta antipulgas gotero"],
      escudo: ["shield", "escudo protección desparasitar"],
      tijeras: ["scissors", "tijeras corte peluquería"],
      hoja: ["leaf", "hoja natural orgánico"],
      flor: ["flower-2", "flor planta vivero"],
      pino: ["tree-pine", "árbol pino planta"],
      brote: ["sprout", "brote semilla planta"],
    },
  },
  {
    id: "servicios",
    titulo: "Servicios y oficios",
    iconos: {
      brocha: ["brush", "brocha estética maquillaje"],
      paleta: ["palette", "paleta arte diseño color"],
      camara: ["camera", "cámara foto fotografía"],
      musica: ["music", "música audio sonido"],
      auriculares: ["headphones", "auriculares audio soporte"],
      juego: ["gamepad-2", "juego consola gaming"],
      libro: ["book", "libro lectura"],
      "libro-abierto": ["book-open", "libro abierto curso manual"],
      titulo: ["graduation-cap", "título curso educación clase"],
      maletin: ["briefcase", "maletín oficina profesional"],
      notebook: ["laptop", "notebook computadora laptop"],
      celular: ["smartphone", "celular teléfono móvil"],
      monitor: ["monitor", "monitor pantalla computadora"],
      impresora: ["printer", "impresora imprenta copia"],
      wifi: ["wifi", "wifi internet red"],
      chispas: ["sparkles", "limpieza brillo nuevo"],
      sofa: ["sofa", "sofá mueble living"],
      cama: ["bed", "cama colchón dormitorio"],
      "sin-humo": ["cigarette-off", "libre de humo prohibido fumar"],
    },
  },
  {
    id: "general",
    titulo: "General",
    iconos: {
      casa: ["home", "casa inicio hogar"],
      tienda: ["store", "tienda negocio local"],
      edificio: ["building-2", "edificio empresa oficina"],
      ubicacion: ["map-pin", "ubicación dirección mapa"],
      telefono: ["phone", "teléfono llamada contacto"],
      correo: ["mail", "correo email mensaje"],
      calendario: ["calendar", "calendario fecha agenda"],
      "reloj-pared": ["clock", "hora horario tiempo"],
      personas: ["users", "personas grupo equipo"],
      persona: ["user", "persona cliente usuario"],
      corazon: ["heart", "corazón favorito me gusta"],
      estrella: ["star", "estrella destacado premium"],
      etiqueta: ["tag", "etiqueta marca categoría"],
      descuento: ["percent", "descuento oferta promoción"],
      regalo: ["gift", "regalo obsequio combo"],
      entrada: ["ticket", "entrada ticket cupón"],
      tarjeta: ["credit-card", "tarjeta pago débito crédito"],
      billete: ["banknote", "billete dinero efectivo"],
      billetera: ["wallet", "billetera dinero pago"],
      recibo: ["receipt", "recibo factura comprobante"],
      lista: ["clipboard-list", "lista pedido planilla"],
      buscar: ["search", "buscar lupa encontrar"],
      "caja-general": ["boxes", "varios surtido general"],
    },
  },
];

/* Misma lectura que `armar-iconos.mjs`, y por las mismas razones. Se duplica en
   vez de compartirse porque los dos scripts se corren a mano y de tanto en
   tanto; un módulo común entre dos generadores agrega un archivo que hay que
   entender antes de tocar cualquiera de los dos. Si aparece un tercero, se
   extrae. */
function contenidoDelIcono(nombreLucide) {
  const svg = readFileSync(join(iconos, `${nombreLucide}.svg`), "utf8");
  const aperturaSvg = svg.indexOf("<svg");
  const adentro = svg.slice(svg.indexOf(">", aperturaSvg) + 1, svg.lastIndexOf("</svg>"));
  const limpio = adentro.replace(/\s+/g, " ").replace(/> </g, "><").trim();

  if (limpio.length === 0) throw new Error(`El ícono ${nombreLucide} salió vacío.`);
  if (limpio.includes("<svg")) {
    throw new Error(`El ícono ${nombreLucide} se llevó su propia etiqueta svg.`);
  }
  const colorPropio = [...limpio.matchAll(/(?:fill|stroke)="([^"]*)"/g)].find(
    ([, valor]) => valor !== "none" && valor !== "currentColor",
  );
  if (colorPropio) {
    throw new Error(`El ícono ${nombreLucide} trae un color propio: ${colorPropio[0]}`);
  }
  return limpio;
}

/* El nombre viaja a la base, donde `categorias_icono_formato` lo exige así. Se
   comprueba acá, al generar, y no al guardar una categoría: un nombre mal
   escrito en este archivo rompería **todas** las categorías que lo eligieron, y
   eso se descubre mejor en un commit que en producción. */
const FORMATO = /^[a-z][a-z0-9-]{1,39}$/;

const vistos = new Set();
const entradas = [];
const grupos = [];

for (const grupo of GRUPOS) {
  const nombres = Object.keys(grupo.iconos);
  for (const nombre of nombres) {
    if (!FORMATO.test(nombre)) {
      throw new Error(`El nombre «${nombre}» no cumple el formato que exige la base.`);
    }
    if (vistos.has(nombre)) {
      throw new Error(`El nombre «${nombre}» está dos veces.`);
    }
    vistos.add(nombre);
    const [lucide, terminos] = grupo.iconos[nombre];
    entradas.push(`  ${JSON.stringify(nombre)}: \`${contenidoDelIcono(lucide)}\`,`);
    grupos.push({ nombre, grupo: grupo.id, terminos });
  }
}

const lineasDeTrazos = entradas.join("\n");

const porGrupo = GRUPOS.map((grupo) => {
  const nombres = Object.keys(grupo.iconos)
    .map((nombre) => JSON.stringify(nombre))
    .join(", ");
  return `  { id: ${JSON.stringify(grupo.id)}, titulo: ${JSON.stringify(
    grupo.titulo,
  )}, iconos: [${nombres}] },`;
}).join("\n");

const terminos = grupos
  .map(({ nombre, terminos }) => `  ${JSON.stringify(nombre)}: ${JSON.stringify(terminos)},`)
  .join("\n");

const archivo = `/* GENERADO por scripts/armar-iconos-catalogo.mjs. No se edita a mano.

   Para agregar uno: sumalo a la lista de ese script y volvé a correrlo con
   \`npm run iconos:catalogo\`. Los trazos vienen de Lucide (licencia ISC).

   Este es el juego que el dueño elige para sus categorías. El de la interfaz
   —guardar, borrar, volver— es \`trazos.ts\`, y tiene solo lo que las pantallas
   usan. Son dos juegos con propósitos distintos. */

export const TRAZOS_CATALOGO = {
${lineasDeTrazos}
} as const;

export type NombreIconoCatalogo = keyof typeof TRAZOS_CATALOGO;

/* Los términos con los que se busca cada uno. Llevan tilde y varias formas de
   decir lo mismo —«foco», «bombilla», «lámpara»— porque el dueño no tiene por
   qué adivinar cómo lo llamamos nosotros. */
export const TERMINOS_ICONOS: Record<NombreIconoCatalogo, string> = {
${terminos}
};

export const GRUPOS_ICONOS: ReadonlyArray<{
  id: string;
  titulo: string;
  iconos: ReadonlyArray<NombreIconoCatalogo>;
}> = [
${porGrupo}
];
`;

writeFileSync(destino, archivo, "utf8");
console.log(
  `Íconos de catálogo generados: ${vistos.size} en ${GRUPOS.length} grupos, en components/iconos/catalogo.ts`,
);
