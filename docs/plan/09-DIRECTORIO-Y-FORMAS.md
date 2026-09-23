# 09 · Formas de tarjeta y directorio buscable

Tres fases nuevas, pedidas por el dueño del proyecto el 22 de septiembre de 2026:

| # | Fase | Días | Deja funcionando |
|---|---|---|---|
| 10 | Tres formas de tarjeta | 2 | Cuadrícula, fila y lista de precios, elegibles desde Apariencia |
| 11 | Dónde está y qué vende | 3½ | Ubicación con pin, zona automática, rubro público y el permiso de aparecer |
| 12 | El directorio buscable | 5 | Buscar un producto o un negocio por ciudad, zona y rubro |

**10½ días.** La 10 no depende de nada. La 12 depende de la 11. Ninguna depende
del dominio, pero la caché del directorio y sus páginas para Google rinden
recién con él (ver la fase 12).

---

## Qué se quiere lograr

Dos recorridos de alguien que **no conoce a ningún negocio** y llega a MiPuesto:

> **Busca el menú de los restaurantes de su zona.** Entra al directorio, elige
> Oruro, elige su zona, toca «Restaurantes» y ve los que están cerca, con sus
> catálogos.

> **Quiere comprar juguetes en Oruro.** Escribe «juguetes», elige Oruro y su
> zona, y ve los negocios que venden juguetes. Toca uno y su catálogo se abre
> **ya filtrado** en los juguetes.

Hoy ninguno de los dos funciona, y **no por el código: por los datos**. Medido
en producción el 22 de septiembre de 2026:

| Negocio | Ciudad | Lo guardado en `zona` |
|---|---|---|
| brasaurbana | Oruro | `6 de Octubre #2255` |
| broaster-saolito | Oruro | `Av Tacna, entre San Felipe y Arce` |
| prueba-negocio | Oruro | `Centro` |
| tienda-kantuta, barberia-central, sabor-camba | — | — |

La zona se está usando como dirección, así que no agrupa nada. La mitad de los
negocios no tiene ciudad, así que no aparecería en ningún filtro. Y «juguetes»
no es un rubro: una juguetería hoy queda como «tienda» u «otro». Por eso la
fase 11 va antes que el buscador: **sin datos confiables, el mejor buscador
devuelve vacío**.

## Decisiones tomadas

Acordadas con el dueño del proyecto el 22 de septiembre de 2026.

| Tema | Decisión | Por qué |
|---|---|---|
| Formas de tarjeta | Tres: `cuadricula` (la actual), `fila` y `lista_precios` | Maximizar el uso de estilos sin volver a los tres ejes que se podaron en la fase 6 |
| Ubicación | **Pin en un mapa**, que arranca en el enlace de Google Maps que el dueño ya haya pegado, o en su GPS si toca «Estoy en mi local», o en el centro de su ciudad. El dueño siempre confirma el punto | El GPS solo, al crear el catálogo, guarda la casa del dueño cuando hace el alta desde ahí |
| Zona | **Lista curada por la plataforma**, ciudad por ciudad, cada zona con su punto central. El pin asigna la zona solo y el dueño la confirma. «Mi zona no está» llega a Plataforma para aprobar | Filtros limpios sin duplicados, y el dueño no tiene que saber cómo se llama su barrio en el sistema |
| Privacidad | **El punto exacto nunca se publica.** Se usa para asignar la zona y para medir distancias; al visitante le llega la zona y una distancia redondeada | En Bolivia es común vender desde la casa |
| Rubro | **Dos capas.** Un rubro público (~25, lo que ve el cliente) que sabe qué siembra usar. Hasta 2 rubros secundarios, solo para filtrar | El dueño elige una vez y en su idioma; sumar un rubro público es una línea, no una siembra nueva |
| Aparecer en el buscador | **Pregunta obligatoria en el alta**, sin respuesta marcada por omisión, y modificable después en «Mi negocio» | Pedido del dueño: cada negocio decide si quiere ser encontrado |
| Búsqueda | Niveles 1 (léxica en español, sin tildes, tolerante a errores) y 2 (sinónimos curados). El nivel 3 (vectores) queda afuera hasta que los datos lo pidan | Una juguetería casi siempre tiene la palabra «juguete» en algún lado |
| Sencillez del panel | **Ninguna pantalla nueva para el dueño.** Todo entra en el paso 2 del alta y en «Mi negocio» | Pedido del dueño: «sin aumentar la complejidad» |

---

## Fase 10 — Tres formas de tarjeta

> **Desplegada el 22 de septiembre de 2026** (marca `fase-10-formas-de-tarjeta`).
> Verificado en producción sobre `prueba-negocio`, cambiando la forma con la
> clave de servicio y volviéndola a `cuadricula`: las tres dibujan las 12
> tarjetas; la lista de precios baja una sola imagen (la portada) contra 11 de
> las otras dos, y los botones de acción son los mismos en las tres.
> **Queda para el dueño:** cambiar la forma desde Apariencia con su sesión, y
> mirar las tres en un teléfono a 360 px. Ninguna de las dos cosas se puede
> comprobar desde acá.
>
> AGENTS.md ya dice cuándo corresponden las pruebas de dibujo, así que la
> excepción de abajo dejó de serlo.
>
> **La lista de precios se reemplazó por la vitrina el mismo día.** El dueño la
> vio y pidió una tercera forma que llevara la foto, presentada de otra manera:
> la foto ocupa la tarjeta, vertical, con el nombre, el precio y el botón encima
> sobre la cortina de la paleta. Migración `20261012120000`. La tabla y las
> reglas de abajo describen el diseño original; donde dicen `lista_precios`,
> hoy es `vitrina`, y la regla 3 (sugerir la lista a los catálogos de solo
> lectura) se retiró con ella.

**Objetivo:** que el dueño elija cómo se ven sus productos, sin que el catálogo
deje de ser uno solo.

### Las tres formas

| Forma | Cómo se ve | Para quién |
|---|---|---|
| `cuadricula` | La de hoy: dos por fila en el teléfono, foto arriba | Ropa, tiendas: lo que se elige mirando |
| `fila` | **Una por fila.** Miniatura a la izquierda, nombre, descripción en dos líneas, atributos, y precio con su botón | Ferretería, repuestos, distribuidora: lo que se elige leyendo |
| ~~`lista_precios`~~ → **`vitrina`** | **La foto es la tarjeta**, vertical, con nombre, precio y botón encima. La descripción y los atributos se leen en la página del producto | Pastelería, ropa, comida: lo que se vende por los ojos |

`fila` lleva miniatura y no una foto a lo ancho **a propósito**: a lo ancho,
cada visita bajaría el doble o el triple de imagen, y el tráfico de fotos es el
primer techo del sistema (fase 9). Con miniatura baja menos que la cuadrícula.
`lista_precios` no baja ninguna.

### Las reglas que evitan repetir la fase 6

La fase 6 podó tres ejes de apariencia —plantilla × tarjeta × paleta— porque
las combinaciones rompían: formas que devolvían `li` en contenedores de `dl`,
pares que había que prohibir uno por uno. Esto es **un solo eje dentro de la
única plantilla**, y se sostiene con cuatro reglas:

1. **Un solo componente.** `TarjetaMipuesto` devuelve siempre el mismo `li` con
   `data-forma`, y la hoja de estilos decide la disposición. No hay tres
   componentes.
2. **La forma decide cómo se ve; la modalidad, qué se puede hacer.** Un negocio
   con carrito que elige `lista_precios` conserva su botón de agregar. La forma
   nunca esconde una acción.
3. **La forma se sugiere, no se impone.** Un negocio `catalogo_estatico`
   (solo lectura) ve `lista_precios` sugerida; puede elegir otra.
4. **Cada forma declara su `sizes`**, para que el navegador baje la foto del
   tamaño que va a mostrar.

La ficha del producto (`/{negocio}/p/{codigo}`) no cambia: es una página
aparte y ya tiene su forma.

### Modelo

```sql
alter table public.negocios
  add column forma_tarjeta text not null default 'cuadricula'
    check (forma_tarjeta in ('cuadricula', 'fila', 'lista_precios'));

grant select (forma_tarjeta) on table public.negocios to anon, authenticated;
grant update (forma_tarjeta) on table public.negocios to authenticated;
```

**Los dos `grant` de lectura no son opcionales.** Una columna nueva sin
`grant select` a `anon` tumbó el catálogo público entero en la fase 7, y una sin
`grant select` a `authenticated` tumbó «Productos» en la fase 9. La columna entra
en `CAMPOS` de `lib/catalogo/negocio-publico.ts` y en `DEL_DUENO` de
`scripts/check-permisos-columnas.mjs` en el mismo commit.

### Entregables

- La migración, con sus permisos y los tipos regenerados.
- `FORMAS_TARJETA` en `lib/apariencia.ts`, con nombre y descripción de cada una.
- `TarjetaMipuesto` con `data-forma`, y las dos disposiciones nuevas en
  `plantilla-mipuesto.module.css`, probadas a 360 px.
- En **Apariencia**, un paso «Cómo se ven tus productos» entre la paleta y el
  fondo, con las tres opciones y la vista previa que ya existe.
- `PATCH /api/negocios/plantilla` guarda la forma junto con la paleta.

### Pruebas

- **Prueba de dibujo: 3 formas × 3 modalidades.** Cada combinación dibuja un
  `li` y muestra el botón que corresponde a su modalidad; `lista_precios` no
  dibuja ninguna imagen.

  **Es una excepción a AGENTS.md**, que dice «sin pruebas de render de
  componentes». La excepción ya se hizo una vez, con
  `gestor-catalogo.render.test.ts`, cuando «Productos» se cayó entero por un
  error que ni TypeScript ni el lint podían ver. Esta es la misma clase de
  riesgo —nueve combinaciones que nadie va a abrir a mano— y **conviene
  actualizar AGENTS.md** para que la regla diga cuándo sí.
- La lista de `FORMAS_TARJETA` es la misma que la restricción de la base: se lee
  la migración y se comparan, como ya se hace con la proporción del banner.
- La guardia de permisos por columna, en verde contra la base real.
- La guardia de contraste sigue en verde con las 16 paletas: las formas no
  cambian colores.

**Criterio de salida:** un negocio real cambia de forma desde Apariencia, recarga
su catálogo en producción y ve la forma nueva. Las tres formas, a 360 px, sin
desborde horizontal.

---

## Fase 11 — Dónde está y qué vende

**Objetivo:** que cada negocio tenga datos con los que se lo pueda encontrar, y
que haya decidido si quiere serlo.

### Modelo

**Zonas.** Una tabla de la plataforma, no de un negocio:

```sql
create table public.zonas (
  id uuid primary key default gen_random_uuid(),
  ciudad text not null check (ciudad in (/* los valores de CIUDADES */)),
  nombre text not null check (char_length(trim(nombre)) between 2 and 60),
  latitud numeric(9, 6) not null,
  longitud numeric(9, 6) not null,
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);
create unique index zonas_nombre_por_ciudad on public.zonas (ciudad, lower(nombre));
```

**No lleva `negocio_id`, y es una excepción a AGENTS.md dicha en voz alta:** es
un dato de la plataforma que comparten todos los negocios, como
`plataforma_admins`. La lee cualquiera (`select` para `anon` y `authenticated`,
solo las activas) y la escribe solo la plataforma
(`public.es_admin_plataforma()`).

**El negocio** suma:

```sql
alter table public.negocios
  -- Nulo = todavía no decidió. Por omisión no aparece nadie.
  add column aparece_en_directorio boolean,
  add column ubicacion_lat numeric(9, 6),
  add column ubicacion_lng numeric(9, 6),
  add column zona_id uuid references public.zonas (id) on delete set null,
  -- «Mi zona no está»: la escribe el dueño y la resuelve la plataforma.
  add column zona_propuesta text check (zona_propuesta is null or char_length(zona_propuesta) <= 60),
  add column rubro_publico text check (rubro_publico in (/* RUBROS_PUBLICOS */)),
  add column rubros_secundarios text[] not null default '{}'
    check (cardinality(rubros_secundarios) <= 2),

  -- Dentro de Bolivia, con margen: un pin en el océano es un dedo que resbaló.
  add constraint negocios_ubicacion_en_bolivia check (
    (ubicacion_lat is null and ubicacion_lng is null)
    or (ubicacion_lat between -23.0 and -9.5 and ubicacion_lng between -69.8 and -57.3)
  ),
  -- Aparecer exige estar ubicado.
  add constraint negocios_aparecer_exige_ubicacion check (
    aparece_en_directorio is not true
    or (ciudad is not null and ubicacion_lat is not null)
  );
```

**Permisos, y el más importante es el que no se da:**

| Columna | `anon` | `authenticated` |
|---|---|---|
| `aparece_en_directorio`, `zona_id`, `rubro_publico`, `rubros_secundarios` | `select` | `select`, `update` |
| `zona_propuesta` | — | `select`, `update` |
| **`ubicacion_lat`, `ubicacion_lng`** | **nunca** | `select`, `update` |

Las coordenadas **no se conceden a `anon` y no entran en `CAMPOS`**. La
distancia se calcula dentro de la función del directorio (fase 12), que
devuelve una cifra redondeada y nunca el punto. Una guardia nueva lo vigila.

**`zona` y `direccion_manual`.** La columna `zona` no se borra: se deja de
leer. Lo que tiene hoy —direcciones escritas— se copia a `direccion_manual`
donde esté vacía, que es la columna que el modelo ya tenía para eso. Asignar
`zona_id` a los seis negocios actuales se hace a mano desde Plataforma: son
seis.

**Los negocios existentes empiezan con `aparece_en_directorio` nulo.** No se
les decide por ellos: el directorio actual los lista a todos, pero ninguno eligió
aparecer en un buscador de productos. Mientras no decidan, «Inicio» les muestra
una línea en «Lo que te falta», y el directorio no los lista. Con seis negocios
y sin tráfico en el directorio, el costo es nulo.

### Los rubros públicos

`lib/negocios/rubros-publicos.ts`: cada rubro público sabe qué siembra usar.
**Propuesta inicial, para ajustar antes de la migración:**

| Grupo | Rubro público | Siembra |
|---|---|---|
| Comida | Restaurante, Pollería y broaster, Comida rápida, Salteñería y empanadas, Cafetería y heladería, Panadería y pastelería | `restaurante` |
| Tiendas | Tienda de barrio, Minimarket y abarrotes, Licorería, Juguetería, Librería y papelería, Regalos y cotillón, Celulares y electrónica, Muebles y hogar, Artesanías | `tienda_barrio` |
| Ropa | Ropa y calzado, Accesorios y bisutería | `ropa_y_calzado` |
| Construcción | Ferretería y materiales | `ferreteria` |
| Por mayor | Distribuidora | `distribuidora` |
| Vehículos | Repuestos de auto y moto | `repuestos` |
| Vehículos | Taller mecánico | `servicios` |
| Belleza | Barbería y peluquería, Salón de belleza y uñas | `belleza` |
| Servicios | Consultorio, Clases y cursos, Otros servicios | `servicios` |
| Mascotas | Veterinaria, Tienda de mascotas | `veterinaria` |
| — | Otro | `otro` |

«Farmacia» queda afuera a propósito: vender medicamentos por catálogo tiene
reglas propias que el sistema no conoce.

**El rubro de siembra sigue siendo el de siempre**: `rubro`, interno, que se fija
al terminar el alta (regla 1 del [README](README.md)). El público es una
etiqueta: **cambiarlo en «Mi negocio» no toca el catálogo**, porque la siembra
ya ocurrió. Esa es la ventaja de separarlos.

### El alta: el paso 2 pasa a ser «Qué vendés y dónde»

Sin pasos nuevos. En el paso que ya elige el rubro:

1. **¿Qué vendés?** Un desplegable con los rubros públicos agrupados. Debajo,
   opcional: «También vendo…», hasta dos más.
2. **¿Querés que te encuentren en el buscador de MiPuesto?** Con esta
   explicación, a la vista:

   > Si alguien busca en MiPuesto algo que vendés —por ejemplo, «juguetes en
   > Oruro»— puede encontrar tu catálogo. Para eso necesitamos tu ciudad y
   > dónde está tu local. **Tu dirección exacta no se publica: se muestra solo
   > tu zona.**

   Dos opciones y **ninguna marcada**: no se puede seguir sin elegir.

   - **«Sí, quiero aparecer»** → aparecen la ciudad y el mapa. El pin arranca en
     su enlace de Google Maps si ya lo tiene, o en su GPS si toca «Estoy en mi
     local», o en el centro de la ciudad. Al soltarlo: *«Tu local queda en Zona
     Centro. ¿Es así?»* → **Sí** / elegir otra / «Mi zona no está».
   - **«No, por ahora»** → *«Tu catálogo funciona igual, con tu enlace y tu QR.
     Podés cambiarlo cuando quieras en Mi negocio.»*

El mapa **solo se carga si elige «Sí»**. Quien dice que no, no baja ni un byte
de él.

### El panel

- **«Mi negocio»:** los campos actuales de ciudad y zona se reemplazan por el
  mismo bloque del alta —rubro público, secundarios, la pregunta y el mapa—, que
  es un solo componente usado en los dos lugares. Ninguna pantalla nueva.
- **«Inicio»:** si `aparece_en_directorio` es nulo, una línea en «Lo que te
  falta». No bloquea la publicación.
- **Plataforma, pestaña «Zonas»:** las zonas de cada ciudad, con alta, edición y
  el punto central marcado en el mismo mapa. Arriba, los negocios que
  escribieron «Mi zona no está», para asignarles una existente o crear la
  nueva.

### Lo técnico

- **Leer coordenadas del enlace de Google Maps**, en
  `lib/negocios/coordenadas.ts`: los formatos `@lat,lng`, `?q=lat,lng` y
  `!3dlat!4dlng`. Los enlaces cortos (`maps.app.goo.gl`) se resuelven en el
  servidor siguiendo la redirección, **solo** para esos dominios, solo por
  `https`, con tres saltos como máximo y tres segundos de espera. Sin esa lista
  cerrada, la función sería una puerta para que el servidor pida cualquier
  dirección que alguien le pase.
- **Zona automática**: la zona activa de la misma ciudad con el punto central
  más cercano, si está a menos de 3 km. Si no hay ninguna tan cerca, se pregunta.
- **El mapa: Leaflet con mosaicos de OpenStreetMap.** **Dependencia nueva,
  justificada acá como exige AGENTS.md:** es la única forma de poner un pin sin
  clave ni facturación. La API de Google Maps exige una cuenta con tarjeta, y
  MapLibre pesa cinco veces más. Leaflet son ~40 KB, licencia BSD, sin clave, y
  se carga con importación dinámica **solo en el alta y en «Mi negocio»**, nunca
  en el catálogo público.
- **CSP:** `img-src` suma el dominio de los mosaicos.
- **Política de permisos:** hoy es `geolocation=()` en todo el sitio. Pasa a
  `geolocation=(self)` **solo** en `/alta/*`, `/dashboard/negocio` y
  `/directorio`, con cabeceras por ruta en `next.config.ts`.

### Pruebas

- Las coordenadas se leen bien de cada formato de enlace, y un enlace de otro
  dominio se rechaza sin pedirlo.
- La zona automática: la más cercana, la de otra ciudad no, y a más de 3 km
  pregunta.
- En la base: aparecer sin ubicación se rechaza, y un punto fuera de Bolivia
  también.
- **`anon` no puede leer `ubicacion_lat` ni `ubicacion_lng`**: se suma a
  `test:rls:multitenant`, contra la base real.
- Guardia nueva: las coordenadas no aparecen en `CAMPOS` ni en ningún
  `grant ... to anon` de las migraciones. **Se prueba rompiéndola.**
- Cada rubro público apunta a una siembra que existe, y la lista es la misma que
  la restricción de la base.
- El alta rechaza el paso 2 sin respuesta a «¿Querés que te encuentren?».

**Criterio de salida:** alguien ajeno al proyecto completa el paso 2 en un
teléfono eligiendo «Sí» y poniendo el pin, sin ayuda. Los seis negocios actuales
con su zona asignada y su dirección en `direccion_manual`. Una petición de `anon`
por las coordenadas, rechazada en producción.

---

## Fase 12 — El directorio buscable

**Objetivo:** los dos recorridos del principio, funcionando en un teléfono.

### Cómo lo usa el cliente

```
/directorio
  ¿Qué buscás?  [ juguetes            ]
  Ciudad [Oruro ▾]  Zona [Centro ▾]  Rubro [Todos ▾]   (Cerca de mí)

  Juguetería Pepito · Zona Centro · Abierta ahora
    4 productos coinciden: Muñeca articulada, Peluche oso…   [miniaturas]
    → /jugueteria-pepito?buscar=juguetes
```

- **Todo va en la dirección**: `/directorio?q=juguetes&ciudad=oruro&zona=…&rubro=…`.
  Se comparte, y el botón «atrás» funciona (AGENTS.md: los filtros viven en la
  URL).
- **El formulario es un `GET` común**, sin JavaScript. El único componente de
  cliente es el botón «Cerca de mí».
- **Tocar un resultado abre su catálogo ya filtrado**, con el `?buscar=` que el
  catálogo acepta desde hace fases.
- **Páginas para Google:** `/directorio/oruro` y `/directorio/oruro/restaurante`,
  con título y descripción propios, y en el mapa del sitio solo las
  combinaciones que tienen al menos un negocio. Es probablemente lo que más
  clientes traiga: quien busca «restaurantes en Oruro» en Google llega sin
  conocer MiPuesto.
- **Sin resultados, nunca una pantalla vacía:** *«En Oruro no encontramos
  "juguetes". Estos negocios de Oruro sí están:»* y la lista. Al pie: *«¿Tenés
  un negocio que vende esto? Sumalo a MiPuesto»*, que es el embudo de la
  portada funcionando al revés.
- **Solo se ofrecen ciudades y zonas con negocios.** Un filtro que lleva a cero
  resultados es una trampa.

### La búsqueda

**Nivel 1, léxica en español.** La columna generada `productos.texto_busqueda`
pasa a llevar `unaccent`, para que «muneca» encuentre «muñeca», y se le suma un
`tsvector` en español, para que «juguetes» encuentre «juguete». Se consulta con
las dos cosas: el `tsvector` (singular y plural) **o** la similitud de
trigramas, que ya tiene índice (errores de tipeo).

**Nivel 2, sinónimos curados.** Tabla de la plataforma
`sinonimos_busqueda (termino, equivalentes text[])`: «juguetes» → muñeca,
peluche, lego; «menú» → restaurante. La búsqueda se expande antes de consultar.
La escribe solo la plataforma.

**Lo que no se encuentra, se anota.** Tabla
`busquedas_sin_resultado (termino, ciudad, cantidad, ultima_vez)`: el término
normalizado y un contador. **Sin IP ni nada de quien buscó.** Plataforma muestra
los veinte más buscados sin resultado, y es el dato que dice qué sinónimo falta
y, algún día, si hace falta el nivel 3. Se purga a los 90 días con una tarea
programada que **entra en `estado_tareas()` y en el postámbulo de
restauración**, o la guardia de tareas no deja pasar el commit.

**Una sola función:** `public.buscar_en_directorio(p_texto, p_ciudad,
p_zona_id, p_rubro, p_lat, p_lng, p_pagina)`, `security definer` con
`set search_path = ''`.

- Solo negocios `activo` **y** `aparece_en_directorio = true`. Solo productos y
  categorías visibles.
- Busca en el nombre, subnombre y descripción del negocio, en sus rubros, en los
  nombres de sus categorías y en sus productos.
- Ordena: coincide el negocio > coincide una categoría > coincide un producto;
  a igualdad, abierto ahora primero y, con «cerca de mí», el más cercano.
- Devuelve por negocio: slug, nombre, logo, zona, rubro, horario (el «abierto
  ahora» lo calcula `evaluarHorario`, que ya existe), cantidad de coincidencias,
  hasta tres productos con foto, y la distancia **redondeada a medio kilómetro**.
  **Nunca las coordenadas.**
- El texto se acota a 60 caracteres, como el buscador del catálogo. Doce
  negocios por página.

**«Cerca de mí».** El permiso de ubicación se pide **al tocar el botón**, nunca
al entrar. La ubicación del visitante se redondea a dos decimales (~1 km) antes
de salir del navegador y **no se guarda**. Redondeada, además, es cacheable:
dos vecinos piden la misma dirección.

### Carga y caché

Una búsqueda es **una** consulta, contra las siete de una visita a un catálogo.
Con 100 búsquedas simultáneas, una función con índices anda holgada. Igual se
mide antes de cerrar la fase.

Es además la única pantalla pública que se puede cachear sin riesgo: es igual
para todos y no muestra precios de nadie. Lleva
`Cache-Control: s-maxage=60, stale-while-revalidate=300`. **Rinde recién con el
dominio**: en `*.workers.dev` Cloudflare no cachea las respuestas del Worker
(medido en la fase 9). Hasta entonces funciona sin caché, y la carga medida lo
aguanta.

### Entregables

- Las migraciones: `unaccent`, el `tsvector` y su índice, las dos tablas de la
  plataforma, la función, y la tarea de purga con su vigilancia.
- `/directorio` rehecho: buscador, filtros en cascada, resultados con productos
  que coinciden, «Cerca de mí», y la pantalla sin resultados.
- `/directorio/[ciudad]` y `/directorio/[ciudad]/[rubro]`, con sus metadatos y
  su entrada en el mapa del sitio.
- En Plataforma, en la pestaña «Zonas» de la fase 11: los sinónimos y las
  búsquedas sin resultado.

### Pruebas

- **Aislamiento, contra la base real:** la función nunca devuelve un negocio
  inactivo, uno que no eligió aparecer, un producto oculto ni una coordenada.
  Se suma a `test:rls:multitenant`.
- El orden de los resultados, la expansión de sinónimos, y la búsqueda sin tildes
  y en plural.
- La guardia de tareas programadas, en verde con la purga nueva.
- **Carga:** 100 búsquedas simultáneas en producción, 100 respuestas en 200 y
  p95 por debajo de 2 segundos, igual que se midió el catálogo el 22 de
  septiembre.

**Criterio de salida:** en un teléfono y en producción, «restaurantes en Oruro,
zona Centro» y «juguetes en Oruro» llegan cada uno a un catálogo ya filtrado. Para
el segundo hace falta un negocio que venda juguetes: si todavía no hay uno real,
un negocio de demostración, marcado como tal y fuera del directorio después.

---

## Lo que queda afuera, a propósito

| Qué | Cuándo entra |
|---|---|
| **Búsqueda semántica con vectores** (nivel 3) | Cuando las búsquedas sin resultado muestren patrones que los sinónimos no cubren. Cuesta una llamada a Gemini por búsqueda —compartida con la cuota de las lecturas de fotos— y ~1 KB por producto en una base de 500 MB |
| **Un mapa de resultados para el cliente** | Nunca por ahora: cada visitante bajaría mosaicos, y la política de OpenStreetMap no está pensada para eso |
| **Ordenar por popularidad** | Cuando haya métricas en las que se pueda confiar. Ordenar por un número inventado choca con la regla 3 del [README](README.md) |
| **Calificaciones propias** | No. La calificación vive en Google Maps, y la tarjeta de acrílico lleva hasta ahí |

## Riesgos

| Riesgo | Cómo se contiene |
|---|---|
| **El directorio sale vacío.** Con seis negocios, casi cualquier búsqueda devuelve nada | Se lanza fuerte en una ciudad —Oruro, donde ya están los clientes— y no en diez vacías. Solo se ofrecen ciudades y zonas con negocios, y la pantalla sin resultados siempre ofrece algo |
| **Pocos eligen aparecer** | La pregunta del alta dice qué ganan, con un ejemplo concreto. Y «Inicio» se lo recuerda a quien no decidió |
| **El dueño pone mal el pin** | Confirma la zona antes de guardar, y el punto exacto nunca se publica: un pin mal puesto no expone a nadie |
| **La política de OpenStreetMap** | El uso es chico —solo al ubicar el negocio— y va con atribución. Si crece, la dirección de los mosaicos es una constante y se cambia a otro proveedor con un plan gratuito |
| **Una columna nueva sin su `grant`** | La guardia de permisos por columna, contra la base real, en cada fase |
| **La excepción a AGENTS.md sobre pruebas de dibujo** | Se escribe en AGENTS.md cuándo sí corresponde, en vez de seguir haciéndola por excepción |
