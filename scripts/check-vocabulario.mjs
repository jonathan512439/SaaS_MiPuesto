/* Cómo escribe el sistema: español neutro, con vos, sin jerga rioplatense.
 *
 * Es la guardia de `docs/plan/08-VOCABULARIO.md`, sección 5, más una regla que
 * el plan no tenía y que hizo falta: **nada de tuteo**. Durante unas semanas los
 * textos nuevos se escribieron con «elige», «tienes», «escríbenos» por una regla
 * equivocada, y quedaron mezclados con el voseo del resto. Decisión del dueño
 * del proyecto, 2026-09-24: voseo, español neutro y algo de jerga boliviana.
 *
 * Qué revisa: el texto que llega a la pantalla —cadenas y texto de JSX— en
 * `app/`, `components/` y `lib/`. Qué no: comentarios, nombres de variables,
 * pruebas y los tipos generados.
 *
 * Cómo busca: palabra completa, sin tildes y sin distinguir mayúsculas. Nunca
 * por pedazo: «plata» dentro de «plataforma» no es jerga (sección 2 del plan).
 *
 * Cuando falla, dice el archivo, la línea, la palabra y qué usar. Se corre con
 * `npm test`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const CARPETAS = ["app", "components", "lib"];

/* ---------------------------------------------------------------------------
   Las listas.
   --------------------------------------------------------------------------- */

/* Sección 4 del plan: palabra o giro → qué usar. */
const PROHIBIDAS = new Map([
  ...[
    "che", "dale", "boludo", "pibe", "mina", "guita", "laburo", "laburar", "quilombo", "posta",
    "joya", "copado", "zafar", "chamuyo", "bardo", "morfar", "pilcha", "bondi", "birra", "fiaca",
  ].map((palabra) => [palabra, "jerga rioplatense: decilo con palabras neutras"]),
  ...["un toque", "al toque", "ni ahi", "obvio", "basicamente", "re bueno"].map((giro) => [
    giro,
    "muletilla: sacala o decilo directo",
  ]),
  ["plata", "dinero, monto o precio"],
  ["celu", "celular o teléfono"],
  ["compu", "computadora"],
  ["foto de perfil", "logo"],
  ["tips", "consejos"],
  ["ok", "listo o de acuerdo"],
  ["link", "enlace"],
  ["upload", "subir"],
  ["loading", "cargando"],
  ["default", "predeterminado"],
  ...["ups", "uy", "genial", "increible", "fantastico", "wow", "felicitaciones"].map((palabra) => [
    palabra,
    "tono de festejo: decí qué pasó, sin festejar",
  ]),
]);

/* Muletillas que también son español corriente: «de una vez», «de una sola
   forma», «se escribe tal cual», «texto literal», «ahora sí se puede». Solo
   son muletilla **sueltas**, como frase entera: «¡De una!», «Tal cual.».
   Buscarlas en cualquier lugar marcaba «de una moneda» y hasta «de uña», que
   sin tilde se escribe igual. */
const MULETILLAS_SUELTAS = new Map([
  ["de una", "muletilla: decí «ahora mismo» o sacala"],
  ["tal cual", "muletilla: decí «exacto» o sacala"],
  ["literal", "muletilla: sacala"],
  ["ahora si", "muletilla: sacala"],
]);

/* El tuteo que no se confunde con otra cosa: la segunda persona del presente
   —«tienes»— y los imperativos con pronombre pegado, que con tú llevan tilde
   —«escríbenos»— y con vos no —«escribinos»—. Con su forma en vos. */
const TUTEO = new Map(
  Object.entries({
    tu: "vos",
    tienes: "tenés", puedes: "podés", quieres: "querés", eres: "sos", necesitas: "necesitás",
    prefieres: "preferís", sabes: "sabés", vendes: "vendés", cobras: "cobrás", guardas: "guardás",
    haces: "hacés", agregas: "agregás", escribes: "escribís", eliges: "elegís", buscas: "buscás",
    subes: "subís", vuelves: "volvés", pagas: "pagás", recibes: "recibís", llevas: "llevás",
    tardas: "tardás", ofreces: "ofrecés", atiendes: "atendés", pides: "pedís", usas: "usás",
    cargas: "cargás", quedas: "quedás", importas: "importás", encargas: "encargás",
    escribenos: "escribinos", escribelo: "escribilo", subela: "subila", subelo: "subilo",
    llenala: "llenala", marcalo: "marcalo", marcala: "marcala", borralas: "borralas",
    borralo: "borralo", agregalas: "agregalas", agregalo: "agregalo", cancelalo: "cancelalo",
    cancelalos: "cancelalos", revisalas: "revisalas", revisalo: "revisalo", guardalo: "guardalo",
    sacale: "sacale", elegilo: "elegilo", eligelo: "elegilo", eligela: "elegila", dimelo: "decímelo",
    avisame: "avisame", pidenos: "pedinos", cambialo: "cambialo", activalo: "activalo",
    ocultala: "ocultala", ocultalo: "ocultalo", intentalo: "intentalo", encargala: "encargala",
    fotografialo: "fotografialo", completalos: "completalos", completalo: "completalo",
    dejala: "dejala", dejalo: "dejalo", dilo: "decilo", hazlo: "hacelo", ponlo: "ponelo",
    ponle: "ponele", dime: "decime", comunicate: "comunicate",
    /* Imperativos irregulares que nunca son tercera persona: sirven en
       cualquier lugar de la frase. */
    pon: "poné", haz: "hacé",
  }),
);
/* Las de arriba sin tilde coinciden con el voseo («marcalo»): lo que las hace
   tuteo es la tilde. Esas se buscan con tilde; las demás, sin. */
const TUTEO_CON_TILDE = new Set([
  "tú", "escríbenos", "escríbelo", "súbela", "súbelo", "llénala", "márcalo", "márcala", "bórralas",
  "bórralo", "agrégalas", "agrégalo", "cancélalo", "cancélalos", "revísalas", "revísalo",
  "guárdalo", "sácale", "elígelo", "elígela", "dímelo", "avísame", "pídenos", "cámbialo",
  "actívalo", "ocúltala", "ocúltalo", "inténtalo", "encárgala", "fotografíalo", "complétalos",
  "complétalo", "déjala", "déjalo", "dilo", "hazlo", "ponlo", "ponle", "dime", "comunícate",
]);

/* Imperativos de tú al comienzo de una frase. En medio de una frase son
   tercera persona —«el cliente elige»— y están bien; al principio, con
   mayúscula, son una orden: «Elige tu número» → «Elegí tu número». «Abre» no
   está: casi siempre es el negocio —«Abre el lunes a las 09:00»—. */
const IMPERATIVOS_TU = new Map(
  Object.entries({
    Elige: "Elegí", Escribe: "Escribí", Revisa: "Revisá", Intenta: "Intentá", Vuelve: "Volvé",
    Recarga: "Recargá", Agrega: "Agregá", Usa: "Usá", Pon: "Poné", Borra: "Borrá", Guarda: "Guardá",
    Completa: "Completá", Descarga: "Descargá", Sube: "Subí", Llena: "Llená", Cancela: "Cancelá",
    Toca: "Tocá", Busca: "Buscá", Mira: "Mirá", Cambia: "Cambiá", Activa: "Activá",
    Crea: "Creá", Deja: "Dejá", Haz: "Hacé", Empieza: "Empezá", Indica: "Indicá", Agrupa: "Agrupá",
    Actualiza: "Actualizá", Elimina: "Eliminá", Confirma: "Confirmá", Selecciona: "Seleccioná",
    Comparte: "Compartí", Imprime: "Imprimí", Escoge: "Escogé", Pide: "Pedí", Sigue: "Seguí",
    Espera: "Esperá", Llama: "Llamá", Envía: "Enviá", Encarga: "Encargá", Ponle: "Ponele",
    Fíjate: "Fijate", Asegúrate: "Asegurate", Guárdalo: "Guardalo", Describe: "Describí",
    Déjala: "Dejala", Déjalo: "Dejalo", Dilo: "Decilo", Hazlo: "Hacelo", Ponlo: "Ponelo",
  }),
);

/* Usted, que el plan descarta: «Elija su rubro» → «Elegí tu rubro». Solo al
   comienzo de una frase, como los de tú: a mitad de frase son subjuntivo de
   tercera persona —«cuando un casero haga su pedido»—, y están bien. */
const USTED = new Map(
  Object.entries({
    Elija: "Elegí", Suba: "Subí", Guarde: "Guardá", Ingrese: "Ingresá", Seleccione: "Seleccioná",
    Escriba: "Escribí", Intente: "Intentá", Verifique: "Verificá", Presione: "Tocá", Haga: "Hacé",
  }),
);

/* Lo que se permite a propósito, con su motivo: archivo → palabras. */
const PERMITIDAS = {
  /* El estado que lee un vigilante externo, no una persona. */
  "app/api/salud/route.ts": ["ok"],
  "app/api/salud/supabase/route.ts": ["ok"],
  /* La plata es el metal: «Collar de plata», «Plata 950». */
  "lib/catalogo/guias-por-rubro.ts": ["plata", "joya"],
  "lib/importacion/plantillas.ts": ["plata"],
  /* Palabras con que se busca un ícono, no texto que se vea: quien escribe
     «joya» encuentra el anillo, y quien escribe «birra», la cerveza. */
  "components/iconos/catalogo.ts": ["joya", "birra"],
  "components/directorio/iconos-rubro.ts": ["joya"],
  /* XML de Excel: `<Default Extension=…>` es parte del formato. */
  "lib/exportacion/xlsx.ts": ["default"],
};

/* ---------------------------------------------------------------------------
   Sacar el texto visible de un archivo.
   --------------------------------------------------------------------------- */

/* Recorre el archivo carácter por carácter y devuelve las cadenas y el texto
   de JSX con su línea, sin comentarios. No es un analizador de TypeScript y no
   lo necesita: distinguir comentario, cadena y código alcanza. */
function textosVisibles(fuente, esTsx) {
  const textos = [];
  let linea = 1;
  let i = 0;
  const n = fuente.length;

  const agregar = (texto, lineaInicio) => {
    if (/[a-záéíóúñ]{2,}/i.test(texto)) textos.push({ texto, linea: lineaInicio });
  };

  while (i < n) {
    const c = fuente[i];
    const siguiente = fuente[i + 1];

    if (c === "\n") {
      linea += 1;
      i += 1;
      continue;
    }
    // Comentario de línea.
    if (c === "/" && siguiente === "/") {
      while (i < n && fuente[i] !== "\n") i += 1;
      continue;
    }
    // Comentario de bloque, también `{/* ... */}` en JSX.
    if (c === "/" && siguiente === "*") {
      i += 2;
      while (i < n && !(fuente[i] === "*" && fuente[i + 1] === "/")) {
        if (fuente[i] === "\n") linea += 1;
        i += 1;
      }
      i += 2;
      continue;
    }
    // Cadenas: '...', "...", `...` (las partes de texto, no las ${}).
    if (c === "'" || c === '"' || c === "`") {
      const comilla = c;
      const inicio = linea;
      let texto = "";
      i += 1;
      while (i < n && fuente[i] !== comilla) {
        if (fuente[i] === "\\") {
          texto += " ";
          i += 2;
          continue;
        }
        if (comilla === "`" && fuente[i] === "$" && fuente[i + 1] === "{") {
          let profundidad = 1;
          i += 2;
          texto += " ";
          while (i < n && profundidad > 0) {
            if (fuente[i] === "{") profundidad += 1;
            if (fuente[i] === "}") profundidad -= 1;
            if (fuente[i] === "\n") linea += 1;
            i += 1;
          }
          continue;
        }
        if (fuente[i] === "\n") linea += 1;
        texto += fuente[i];
        i += 1;
      }
      i += 1;
      agregar(texto, inicio);
      continue;
    }
    // Texto de JSX: lo que va entre `>` y `<` o `{`, si parece prosa.
    if (esTsx && c === ">") {
      const inicio = linea;
      let j = i + 1;
      let texto = "";
      while (j < n && fuente[j] !== "<" && fuente[j] !== "{" && fuente[j] !== ">") {
        texto += fuente[j];
        j += 1;
      }
      if (!/[;=()]|=>|&&|\|\|/.test(texto) && /[a-záéíóúñ]{2,}\s+[a-záéíóúñ]/i.test(texto)) {
        agregar(texto, inicio);
      }
      i += 1;
      continue;
    }
    i += 1;
  }
  return textos;
}

/* ---------------------------------------------------------------------------
   Buscar.
   --------------------------------------------------------------------------- */

function sinTildes(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function escapar(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Límites de palabra que entienden tildes: `\b` de JavaScript no las cuenta
   como letras (lo mostró la guardia de voseo de las guías). */
function buscar(texto, palabra, { distinguirTildes = false, mayusculaInicial = false } = {}) {
  const donde = distinguirTildes || mayusculaInicial ? texto : sinTildes(texto);
  const que = distinguirTildes || mayusculaInicial ? palabra : sinTildes(palabra);
  const antes = mayusculaInicial ? "(?:^|[.:!?¡¿«]\\s*|\\n\\s*)" : "(?<![\\p{L}\\p{N}_])";
  const bandera = mayusculaInicial ? "u" : "iu";
  return new RegExp(`${antes}${escapar(que)}(?![\\p{L}\\p{N}_])`, bandera).test(donde.trim());
}

function archivos(carpeta) {
  const salida = [];
  for (const nombre of readdirSync(carpeta)) {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) {
      if (nombre === "node_modules") continue;
      salida.push(...archivos(ruta));
    } else if (/\.(ts|tsx)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) && !nombre.endsWith(".d.ts")) {
      if (nombre === "database.types.ts") continue;
      salida.push(ruta);
    }
  }
  return salida;
}

const hallazgos = [];
for (const carpeta of CARPETAS) {
  for (const archivo of archivos(join(raiz, carpeta))) {
    const ruta = relative(raiz, archivo).replaceAll("\\", "/");
    const permitidas = new Set(PERMITIDAS[ruta] ?? []);
    const fuente = readFileSync(archivo, "utf8");
    for (const { texto, linea } of textosVisibles(fuente, archivo.endsWith(".tsx"))) {
      /* Rutas, clases y claves no son texto de pantalla: llevan barras,
         puntos, guiones, guiones bajos o mayúsculas en el medio. Una palabra
         sola y común —«Listo», «Ok»— sí se revisa: puede ser un botón. */
      const limpio = texto.trim();
      if (/^[\w./@:#?&=%-]*$/.test(limpio) && (/[./@:#?&=%_-]/.test(limpio) || /[a-z][A-Z]/.test(limpio))) continue;
      const anotar = (palabra, uso) => {
        if (!permitidas.has(palabra)) hallazgos.push({ ruta, linea, palabra, uso, texto: texto.trim() });
      };
      for (const [palabra, uso] of PROHIBIDAS) if (buscar(texto, palabra)) anotar(palabra, uso);
      for (const [giro, uso] of MULETILLAS_SUELTAS) {
        const suelta = new RegExp(`(?:^|[.!?¡¿…,;:«]\\s*)${escapar(giro)}\\s*(?:[.!?…»]|$)`, "iu");
        if (suelta.test(sinTildes(texto).trim())) anotar(giro, uso);
      }
      for (const [palabra, uso] of TUTEO) {
        const conTilde = [...TUTEO_CON_TILDE].find((forma) => sinTildes(forma) === palabra);
        /* Con tilde, siempre: «vendes» es tuteo y «vendés» es voseo, y lo único
           que las distingue es la tilde. Compararlas sin tildes marcaba el voseo
           como error. */
        if (buscar(texto, conTilde ?? palabra, { distinguirTildes: true })) {
          anotar(conTilde ?? palabra, `tuteo: «${uso}»`);
        }
      }
      for (const [palabra, uso] of IMPERATIVOS_TU) {
        if (buscar(texto, palabra, { mayusculaInicial: true })) anotar(palabra, `tuteo: «${uso}»`);
      }
      for (const [palabra, uso] of USTED) {
        if (buscar(texto, palabra, { mayusculaInicial: true })) anotar(palabra, `usted: «${uso}»`);
      }
    }
  }
}

/* `--auditar`: los imperativos de tú **a mitad de frase** —«si sigue pasando,
   recarga la página»—, que la guardia no puede rechazar sola porque ahí
   también cabe la tercera persona —«el cliente entra, elige y pide»—. Se
   listan para revisarlos a mano; no hacen fallar nada. */
if (process.argv.includes("--auditar")) {
  const verbos =
    "elige|escribe|revisa|intenta|vuelve|recarga|agrega|usa|pon|borra|guarda|completa|descarga|sube|llena|cancela|abre|toca|busca|mira|cambia|activa|crea|deja|haz|empieza|indica|agrupa|actualiza|elimina|confirma|selecciona|comparte|imprime|pide|sigue|espera|llama|envía|encarga|fotografía|describe|prueba|carga|marca|dilo|hazlo|ponlo|ponle|déjala|déjalo|dime|mándanos|avisa|decide|piensa|recuerda|evita|anota|agrégala|agrégalo|revísala|súbelas";
  const patron = new RegExp(`(?:[,;:—]\\s*|\\s(?:y|o|luego|después|mejor)\\s+)(${verbos})(?![\\p{L}])`, "iu");
  for (const carpeta of CARPETAS) {
    for (const archivo of archivos(join(raiz, carpeta))) {
      const ruta = relative(raiz, archivo).replaceAll("\\", "/");
      for (const { texto, linea } of textosVisibles(readFileSync(archivo, "utf8"), archivo.endsWith(".tsx"))) {
        const hallado = patron.exec(texto);
        if (hallado) console.log(`${ruta}:${linea}  «${hallado[1]}»  ${texto.trim().slice(0, 150)}`);
      }
    }
  }
  process.exit(0);
}

if (hallazgos.length > 0) {
  console.error(`Vocabulario: ${hallazgos.length} texto(s) para corregir (docs/plan/08-VOCABULARIO.md).\n`);
  for (const { ruta, linea, palabra, uso, texto } of hallazgos) {
    console.error(`${ruta}:${linea}  «${palabra}» → ${uso}`);
    console.error(`    ${texto.slice(0, 140)}`);
  }
  process.exit(1);
}

console.log("Vocabulario: todo el texto visible va con vos y sin jerga prohibida.");
