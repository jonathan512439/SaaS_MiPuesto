/* Cómo escribe el sistema: español neutro, verbos de tú, «vos» de pronombre.
 *
 * Es la guardia de `docs/plan/08-VOCABULARIO.md`, sección 5. Decisión del dueño
 * del proyecto (2026-09-24, después de dos idas y vueltas): los verbos se
 * conjugan con tú —«elige», «tienes», «configura», «escríbenos»— y, donde
 * aparece el pronombre, se usa «vos» —«el precio lo pones vos»—, como se habla
 * en el occidente de Bolivia. Nada de voseo verbal —«tenés», «elegí»— ni de
 * usted, ni de jerga rioplatense. Algo de jerga boliviana sí va.
 *
 * Qué revisa: el texto que llega a la pantalla —cadenas y texto de JSX— en
 * `app/`, `components/` y `lib/`. Qué no: comentarios, nombres de variables,
 * pruebas y los tipos generados.
 *
 * Cómo busca: palabra completa. La jerga, sin tildes ni mayúsculas; el voseo,
 * **con tilde**, porque es lo único que separa «vendés» de «vendes». Nunca por
 * pedazo: «plata» dentro de «plataforma» no es jerga (sección 2 del plan).
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

/* El voseo verbal, que no va: «tenés», «podés», «elegí», «configurá»,
   «escribinos». Decisión del dueño del proyecto (2026-09-24): los verbos se
   conjugan con tú —«tienes», «elige», «configura», «escríbenos»— y, donde
   aparece el pronombre, se usa «vos»: «el precio lo pones vos», como se habla
   en el occidente de Bolivia.

   Cada forma con la que la reemplaza. Se compara **con tilde**: «vendés» es
   voseo y «vendes» no, y la tilde es lo único que las separa. */
const VOSEO = new Map(
  Object.entries({
    podés: "puedes", tenés: "tienes", vendés: "vendes", querés: "quieres", elegís: "eliges",
    revisás: "revisas", llevás: "llevas", subís: "subes", pedís: "pides", atendés: "atiendes",
    escribís: "escribes", buscás: "buscas", ponés: "pones", usás: "usas", dejás: "dejas",
    ofrecés: "ofreces", sabés: "sabes", confirmás: "confirmas", cargás: "cargas", borrás: "borras",
    aceptás: "aceptas", seguís: "sigues", decidís: "decides", renovás: "renuevas", necesitás: "necesitas",
    corregís: "corriges", resolvés: "resuelves", preferís: "prefieres", reanudás: "reanudas",
    publicás: "publicas", mandás: "mandas", aparecés: "apareces", pagás: "pagas", llamás: "llamas",
    sacás: "sacas", venís: "vienes", acabás: "acabas", agregás: "agregas", guardás: "guardas",
    cobrás: "cobras", mirás: "miras", dudás: "dudas", reconocés: "reconoces", leés: "lees",
    aclarás: "aclaras", decís: "dices", hacés: "haces", entendés: "entiendes", conocés: "conoces",
    empezás: "empiezas", volvés: "vuelves", recibís: "recibes", vivís: "vives", pensás: "piensas",
    sos: "eres", agregués: "agregues", reutilicés: "reutilices",
    elegí: "elige", revisá: "revisa", intentá: "intenta", escribí: "escribe", probá: "prueba",
    usá: "usa", volvé: "vuelve", indicá: "indica", devolvé: "devuelve", pedí: "pide", marcá: "marca",
    poné: "pon", cargá: "carga", subí: "sube", buscá: "busca", seleccioná: "selecciona",
    esperá: "espera", tocá: "toca", abrí: "abre", recargá: "recarga", empezá: "empieza",
    completá: "completa", actualizá: "actualiza", pegá: "pega", guardá: "guarda", borrá: "borra",
    mirá: "mira", dejá: "deja", ingresá: "ingresa", confirmá: "confirma", compará: "compara",
    fotografiá: "fotografía", creá: "crea", definí: "define", escaneá: "escanea", agregá: "agrega",
    consultá: "consulta", copiá: "copia", bajá: "baja", sacá: "saca", decidí: "decide", hacé: "haz",
    activá: "activa", administrá: "administra", configurá: "configura", gestioná: "gestiona",
    mantené: "mantén", repetí: "repite", evitá: "evita", iniciá: "inicia", recuperá: "recupera",
    cuidá: "cuida", organizá: "organiza", compartí: "comparte", recibí: "recibe", acercá: "acerca",
    mandá: "manda", calificá: "califica", editá: "edita", quitá: "quita", importá: "importa",
    conocé: "conoce", describí: "describe", permití: "permite", arrastrá: "arrastra", agrupá: "agrupa",
    apoyá: "apoya", decí: "di", tené: "ten", vení: "ven", contá: "cuenta", mostrá: "muestra",
    encontrá: "encuentra", cerrá: "cierra", pensá: "piensa", registrá: "registra", cambiá: "cambia",
    llená: "llena", cancelá: "cancela", enviá: "envía", encargá: "encarga", descargá: "descarga",
    imprimí: "imprime", escogé: "escoge", seguí: "sigue", llamá: "llama", ocultá: "oculta",
    agendá: "agenda", respondé: "responde", prepará: "prepara",
    escribinos: "escríbenos", sacale: "sácale", comunicate: "comunícate", probalo: "pruébalo",
    dejala: "déjala", ocultala: "ocúltala", cancelalos: "cancélalos", subilo: "súbelo", subila: "súbela",
    abrilo: "ábrelo", avisanos: "avísanos", decilo: "dilo", cambiala: "cámbiala", decinos: "dinos",
    pedinos: "pídenos", escribilas: "escríbelas", dejalo: "déjalo", marcalo: "márcalo",
    calificanos: "califícanos", confirmalo: "confírmalo", cancelalo: "cancélalo", cargalos: "cárgalos",
    pegalo: "pégalo", elegila: "elígela", elegilo: "elígelo", hacelo: "hazlo", llenala: "llénala",
    agregales: "agrégales", agregalas: "agrégalas", pegala: "pégala", copialos: "cópialos",
    revisalos: "revísalos", centralo: "céntralo", encargala: "encárgala", devolvelos: "devuélvelos",
    leelas: "léelas", fijate: "fíjate", completalos: "complétalos", ponele: "ponle", borralas: "bórralas",
    contanos: "cuéntanos", intentalo: "inténtalo", asegurate: "asegúrate", quedate: "quédate",
    registrate: "regístrate", mostralo: "muéstralo", guardalo: "guárdalo", borralo: "bórralo",
    agregalo: "agrégalo", decime: "dime", avisame: "avísame", corregilo: "corrígelo",
  }),
);

/* Además de la lista, la forma: una palabra que termina en «-ás», «-és» o
   «-ís» con tilde casi siempre es voseo en presente —«tenés»—. Salvo el futuro
   —«podrás», que es de tú— y estas palabras de siempre. */
const TERMINAN_EN_AS_ES_IS = new Set([
  "más", "además", "atrás", "jamás", "demás", "detrás", "estás", "compás", "después", "través",
  "inglés", "francés", "interés", "japonés", "revés", "cortés", "portugués", "estrés", "país",
  "anís", "cafés", "bebés", "estés",
]);

/* El pronombre de tú no va: «vos», como se dice en Bolivia. */
const PRONOMBRE_TU = new Map([["tú", "vos"]]);

/* Usted, que el plan descarta: «Elija su rubro» → «Elige tu rubro». Solo al
   comienzo de una frase, como los de tú: a mitad de frase son subjuntivo de
   tercera persona —«cuando un casero haga su pedido»—, y están bien. */
const USTED = new Map(
  Object.entries({
    Elija: "Elige", Suba: "Sube", Guarde: "Guarda", Ingrese: "Ingresa", Seleccione: "Selecciona",
    Escriba: "Escribe", Intente: "Intenta", Verifique: "Verifica", Presione: "Toca", Haga: "Haz",
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
  /* La política de contenido: `default-src` es el nombre de la directiva. */
  "lib/seguridad/politica-contenido.ts": ["default"],
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
    // Texto de JSX: lo que va entre `>` o `}` y `<` o `{`, si parece prosa.
    // También después de `}`: el texto que sigue a una expresión —«encontramos
    // {n} fila(s). Esto es lo que…»— es tan visible como el primero, y se
    // coló un voseo por ahí. El «(s)» de los plurales no lo vuelve código.
    if (esTsx && (c === ">" || c === "}")) {
      const inicio = linea;
      let j = i + 1;
      let texto = "";
      while (j < n && fuente[j] !== "<" && fuente[j] !== "{" && fuente[j] !== ">") {
        texto += fuente[j];
        j += 1;
      }
      const sinPlurales = texto.replace(/\(s\)/g, "");
      if (!/[;=()]|=>|&&|\|\|/.test(sinPlurales) && /[a-záéíóúñ]{2,}\s+[a-záéíóúñ]/i.test(texto)) {
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
      for (const [palabra, uso] of VOSEO) {
        if (buscar(texto, palabra, { distinguirTildes: true })) anotar(palabra, `voseo: «${uso}»`);
      }
      for (const [palabra] of texto.matchAll(/[\p{L}]+/gu)) {
        const minuscula = palabra.toLowerCase();
        if (
          /[áéí]s$/.test(minuscula) &&
          !/rás$/.test(minuscula) &&
          !TERMINAN_EN_AS_ES_IS.has(minuscula) &&
          !VOSEO.has(minuscula)
        ) {
          anotar(minuscula, "voseo: conjugalo con tú (tienes, puedes, vendes)");
        }
      }
      for (const [palabra, uso] of PRONOMBRE_TU) {
        if (buscar(texto, palabra, { distinguirTildes: true })) anotar(palabra, `pronombre: «${uso}»`);
      }
      for (const [palabra, uso] of USTED) {
        if (buscar(texto, palabra, { mayusculaInicial: true })) anotar(palabra, `usted: «${uso}»`);
      }
    }
  }
}

/* `--auditar`: las palabras que terminan en «á», «é» o «í» y no son de
   siempre. Ahí se puede colar un voseo nuevo que no esté en la tabla —«mostrá»,
   «tené»—, pero la forma sola no alcanza para rechazar: «acá», «café», «aquí»,
   el futuro «podrá» y la primera persona «encontré» terminan igual. Se listan
   para revisarlas a mano; no hacen fallar nada. */
if (process.argv.includes("--auditar")) {
  const DE_SIEMPRE = new Set([
    "qué", "está", "esté", "acá", "allá", "así", "sí", "aquí", "ahí", "allí", "café", "sofá", "mí",
    "té", "bebé", "rubí", "ají", "maní", "potosí", "mié", "papá", "mamá", "menú", "perú", "quizá",
  ]);
  const conteo = new Map();
  for (const carpeta of CARPETAS) {
    for (const archivo of archivos(join(raiz, carpeta))) {
      const ruta = relative(raiz, archivo).replaceAll("\\", "/");
      for (const { texto, linea } of textosVisibles(readFileSync(archivo, "utf8"), archivo.endsWith(".tsx"))) {
        for (const [palabra] of texto.matchAll(/[\p{L}]+/gu)) {
          const minuscula = palabra.toLowerCase();
          /* El futuro —«aparecerá», «tendrá»— es de tú y va bien. */
          if (!/[áéí]$/.test(minuscula) || DE_SIEMPRE.has(minuscula) || /rá$/.test(minuscula)) continue;
          if (!conteo.has(minuscula)) conteo.set(minuscula, `${ruta}:${linea}`);
        }
      }
    }
  }
  for (const [palabra, donde] of conteo) console.log(`«${palabra}»  ${donde}`);
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

console.log("Vocabulario: verbos de tú, «vos» de pronombre y sin jerga prohibida en todo el texto visible.");
