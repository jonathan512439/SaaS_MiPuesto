# 02 — Backend, API y el camino del dinero

## 1. La arquitectura que ya existe y no cambia

```
Navegador
   │  fetch a /api/... con la sesión en cookie
   ▼
Ruta de Next (Cloudflare Worker)
   │  1. obtenerContextoAdminCatalogo()  → sesión + negocio + suspensión
   │  2. validar<Entidad>(cuerpo)        → forma, tipos y techos
   │  3. validaciones cruzadas contra la base
   │  4. escritura, o llamada a función security definer
   ▼
Supabase (Postgres 17)
   │  RLS decide si la fila es del negocio
   ▼
Respuesta JSON
```

Tres reglas heredadas que se mantienen tal cual:

1. **Todo acceso a datos pasa por `lib/supabase/`.** Nunca `fetch` directo a PostgREST.
2. **Todo dato del cliente se valida en el servidor.** La validación del navegador es
   comodidad, no control.
3. **Las listas de columnas viven en `lib/catalogo/columnas.ts`.** Nunca `select *`. Con
   variantes y atributos entrando en juego, esto pasa de conveniencia a necesidad: una
   columna de más en la consulta pública es un dato del negocio en el HTML servido.

## 2. Lo que sí cambia: la consulta pública deja de ser una consulta

Hoy el catálogo público sale de un `select` con paginación. Con atributos, variantes,
escalas, modificadores y relaciones serían **seis consultas por página**, y en un Worker
cada ida y vuelta a Supabase cuesta latencia real.

La solución no es un ORM ni un join gigante: es **una función `security definer` que
devuelve el catálogo armado en un `jsonb`**.

```sql
create or replace function public.catalogo_publico(
  p_slug text,
  p_pagina integer default 1,
  p_por_pagina integer default 24,
  p_categoria uuid default null,
  p_busqueda text default null,
  p_filtros jsonb default '{}'::jsonb,
  p_orden text default 'orden'
) returns jsonb
language sql stable security definer set search_path = ''
as $$ ... $$;
```

Ventajas medibles:

| | Consultas encadenadas | Una función |
|---|---|---|
| Idas y vueltas por página | 6 | **1** |
| Filtrado por atributo | En el Worker, sobre datos ya traídos | **En el índice GIN** |
| Riesgo de traer columnas de más | Alto, seis listas que mantener | **Una lista, dentro de la función** |
| Auditable | Seis lugares | **Un archivo de migración** |

**El riesgo de esta decisión** es que la lógica de presentación migre a SQL, que es
donde peor se prueba y peor se lee. La contención es explícita: la función **devuelve
datos, no decide qué se dibuja**. Ordena, filtra, pagina y arma; no calcula precios
finales, no aplica promociones y no decide qué insignia va. Eso queda en TypeScript,
donde ya está probado.

### El contrato de salida

```ts
export type CatalogoPublico = {
  negocio: { /* … lo de hoy … */ sucursales: Sucursal[]; zonas: ZonaEntrega[] };
  categorias: Array<{
    id: string; nombre: string;
    campos: CampoCategoria[];   // las definiciones, para armar los filtros
  }>;
  productos: ProductoPublico[];
  total: number;                // para la paginación
  facetas: Record<string, Array<{ valor: string; cuantos: number }>>;
};

export type ProductoPublico = {
  /* … lo de hoy … */
  marca: string | null;
  atributos: Record<string, string | number | boolean | string[]>;
  unidadPrecio: UnidadPrecio;
  moneda: "BOB" | "USD";
  cantidadMinima: number;
  pasoCantidad: number;
  variantes: VariantePublica[];      // vacío si tiene_variantes = false
  ejesVariante: EjeVariante[];
  escalas: Array<{ desde: number; precio: number }>;
  modificadores: GrupoModificador[];
  duracionMinutos: number | null;
  requiereTurno: boolean;
  fichaUrl: string | null;
};
```

### Las facetas, y por qué van en la misma llamada

Un filtro que no dice cuántos resultados tiene cada opción obliga al comprador a probar
una por una y encontrarse con listas vacías. `facetas` son los conteos por valor, y salen
de la misma pasada: pedirlos aparte duplicaría el trabajo del motor.

**Techo declarado:** las facetas se calculan sobre el catálogo del negocio filtrado por
categoría, no sobre los 300 productos sin filtrar. Con más de 500 productos visibles la
función devuelve `facetas: {}` y la interfaz muestra los filtros sin conteo. Es
degradación explícita, no un cuelgue.

## 3. El camino del dinero

Este es el único lugar del sistema donde un error cuesta plata real, así que se describe
entero.

### Un solo resolvedor

```ts
// lib/precios.ts — el archivo crece, no se multiplica.
export type EntradaPrecio = {
  producto: { precio: number; unidadPrecio: UnidadPrecio; moneda: Moneda;
              cantidadMinima: number; pasoCantidad: number };
  variante: { precio: number | null } | null;
  escalas: Array<{ desde: number; precio: number }>;
  modificadores: Array<{ delta: number }>;
  promocion: Promocion | null;
  cantidad: number;
};

export type PrecioResuelto = {
  precioUnitario: number;     // ya con variante, escala y promoción
  extras: number;             // suma de modificadores, por unidad
  cantidadEfectiva: number;   // redondeada al paso y al mínimo
  subtotal: number;
  moneda: Moneda;
  motivo: "base" | "variante" | "escala" | "promocion";
};

export function resolverPrecio(entrada: EntradaPrecio): PrecioResuelto;
```

### El orden de resolución, que es una decisión y no un detalle

```
1. Cantidad efectiva  = max(cantidadMinima, ceil(cantidad / paso) * paso)
2. Precio base        = variante.precio ?? producto.precio
3. Escala             = si hay escala aplicable, REEMPLAZA el precio base
4. Promoción          = se aplica sobre el resultado de 3
5. Extras             = suma de modificadores, por unidad
6. Subtotal           = (precio + extras) * cantidadEfectiva
```

Tres decisiones que hay que poder defender:

- **La escala reemplaza, no descuenta.** Un mayorista publica «20+ a Bs 168»; ese es el
  precio, no un porcentaje sobre otro.
- **La promoción se aplica después de la escala.** Si no, una promoción del 20 % sobre el
  precio de lista terminaría más barata que el precio mayorista, y el negocio pierde en
  su venta más grande.
- **Los extras no entran en la promoción.** «2×1 en pizzas» no regala el queso extra.

Cada una de las tres tiene un caso de prueba con ese nombre.

### Lo que el navegador manda y lo que el servidor cree

| Dato | ¿Se cree? |
|---|---|
| `producto_id`, `variante_id` | Sí, y se verifica que existan y sean del negocio |
| `cantidad` | Sí, y se acota al máximo y al paso |
| Ids de opciones de modificador | Sí, y se verifica que pertenezcan a un grupo del producto |
| **Precios, deltas, subtotales, total** | **Nunca.** Se recalculan |
| `zona_entrega_id` | Sí, y su costo se lee de la base |

Si el total recalculado difiere del que mandó el navegador, **el pedido se crea igual con
el total del servidor** y se anota la diferencia en la bitácora. Fallar acá castiga al
comprador por un precio que cambió mientras miraba.

## 4. Rutas nuevas

Convención vigente: una carpeta por recurso, `route.ts` con los verbos.

| Ruta | Verbos | Fase | Notas |
|---|---|---|---|
| `/api/catalogo/campos` | GET POST PATCH DELETE | 2 | Campos de una categoría. `DELETE` **no** borra los valores de los productos |
| `/api/catalogo/variantes` | GET POST PATCH DELETE | 3 | `POST` con `{ generar: true }` arma la matriz desde los ejes |
| `/api/catalogo/variantes/stock` | PATCH | 3 | Carga en lote de existencias por variante |
| `/api/catalogo/escalas` | PUT | 5 | Reemplaza el juego completo de escalas de un producto |
| `/api/catalogo/modificadores` | GET POST PATCH DELETE | 5 | |
| `/api/catalogo/relaciones` | PUT | 8 | Reemplaza el juego completo |
| `/api/agenda/recursos` | GET POST PATCH DELETE | 6 | |
| `/api/agenda/disponibilidad` | GET | 6 | **Pública.** Solo franjas libres, nunca quién ocupa las demás |
| `/api/agenda/turnos` | POST | 6 | **Pública**, con límite por IP |
| `/api/agenda/turnos/[id]/estado` | PATCH | 6 | Solo el dueño |
| `/api/negocios/sucursales` | GET POST PATCH DELETE | 8 | |
| `/api/negocios/zonas` | PUT | 8 | |
| `/api/negocios/preset` | POST | 7 | Aplica el preset del rubro. **Idempotente y no destructivo** |

### Verbos, con criterio

- `PUT` donde el recurso es **un juego completo** —escalas, zonas, relaciones—: reemplazar
  el conjunto evita el baile de altas y bajas y hace la operación idempotente.
- `PATCH` donde se corrige **una fila**.
- `DELETE` nunca borra datos del comprador ni valores ya cargados: quita definiciones.

## 5. Validación

### Dónde vive

```
lib/catalogo/validacion.ts       ← productos, categorías (ya existe, crece)
lib/catalogo/campos.ts           ← definiciones y valores de atributos   [fase 2]
lib/catalogo/variantes.ts        ← ejes, matriz, opciones                [fase 3]
lib/precios.ts                   ← escalas y modificadores               [fase 5]
lib/agenda/validacion.ts         ← recursos, franjas, turnos             [fase 6]
```

Cada uno exporta funciones puras `validarX(entrada: unknown): Resultado<X>`, sin tocar la
base. Eso es lo que las hace probables con `vitest` sin levantar nada.

### El validador de atributos, que es el más delicado

```ts
export function validarAtributos(
  campos: CampoCategoria[],
  entrada: unknown,
): Resultado<Record<string, ValorAtributo>>;
```

Lo que comprueba, en orden:

1. Que la entrada sea un objeto plano. Nada de anidamiento.
2. Que **toda clave presente tenga definición hoy**. Las que no, se descartan de la
   escritura pero **no se borran de lo ya guardado**: la ruta hace `atributos_viejos ||
   atributos_nuevos_validados`, no un reemplazo.
3. Por tipo:
   - `lista`: el valor está en `valores`. Si `multiple`, es un arreglo sin repetidos y de
     hasta 12 elementos.
   - `numero`: es finito, no es `NaN`, cabe en `numeric(12,3)`.
   - `texto`: hasta 120 caracteres, recortado.
   - `booleano`: es `true` o `false`, nunca `"true"`.
4. Que los `obligatorio` estén presentes.
5. Que el objeto resultante no supere **2 KB serializado**. Ese es el techo que impide
   que alguien use `atributos` como depósito.

### Errores, con forma estable

```jsonc
{ "error": "Revisa los datos del producto.",
  "errores": { "atributos.potencia": "Elegí un valor de la lista." } }
```

La clave con punto permite que el formulario marque el campo exacto. Es la forma que ya
usan las rutas de hoy, extendida con notación de camino.

## 6. Límites y abuso

Lo que ya existe: límite de eventos de analítica por IP, límite de pedidos por IP, tope
diario de llamadas a la IA, tope de productos por negocio.

Lo que suma este plan:

| Superficie | Límite | Dónde se aplica |
|---|---|---|
| Turnos por IP | 5 por hora, 15 por día | Tabla `limites_turnos_ip`, mismo patrón que `limites_pedidos_ip` |
| Campos por categoría | 8, y 2 destacados | Disparador en la base |
| Variantes por producto | 50 | Disparador en la base |
| Escalas por producto | 5 | Disparador en la base |
| Grupos de modificador por producto | 5, con 15 opciones cada uno | Disparador en la base |
| Recursos por negocio | 20 | Ruta, y `check` contra el conteo |
| Tamaño de `atributos` | 2 KB serializado | Validador y `check` en la base |
| Filtros simultáneos en la consulta pública | 6 | Ruta pública; el séptimo se ignora |

**Por qué los techos van en la base y no solo en la ruta:** la ruta se puede saltar con la
clave privilegiada, y esa clave la usan los scripts de operación. Un tope en disparador
protege también de un script mal escrito, que es el escenario realista acá.

## 7. Cómo consume el frontend

### Público: servidor, sin excepción

El catálogo público se arma **en el servidor** con una sola llamada a
`catalogo_publico()`. No hay `fetch` desde el navegador para pintar el catálogo. Motivos:
la primera pintura llega con datos, el HTML es indexable, y el comprador con red lenta no
ve un esqueleto girando.

Lo único que va por `fetch` desde el público:

- Filtros y paginación → **navegación con parámetros de búsqueda**, que recarga en el
  servidor. Ver `03-FRONTEND.md`, sección de estado.
- Disponibilidad de la agenda → `GET /api/agenda/disponibilidad`, porque depende de la
  fecha que el comprador elige.
- Analítica → `POST /api/analitica`, como hoy.

### Panel: mutaciones por ruta, lecturas por servidor

Las pantallas del panel se sirven con sus datos ya cargados. Las mutaciones van por
`fetch` a las rutas y, al volver, **se revalida la ruta del servidor** en vez de parchear
el estado local. Es más lento en apariencia y elimina de raíz la clase de error donde la
pantalla dice una cosa y la base otra.

Excepción declarada: la carga de existencias por variante, que es una tabla de hasta 50
filas. Ahí sí hay estado local con guardado en lote y un indicador de «sin guardar», o el
dueño hace cincuenta idas y vueltas.

## 8. Compatibilidad

**Regla:** ninguna respuesta de API cambia de forma sin que las pantallas viejas sigan
funcionando durante la fase.

- Los campos nuevos se agregan **opcionales** al tipo público.
- `variantes: []` y `atributos: {}` son estados válidos y significan «este producto no
  usa el mecanismo», no «faltan datos».
- Las plantillas viejas ignoran lo que no conocen. Ninguna hace `Object.keys` sobre la
  respuesta.

Esto es lo que permite desplegar cada fase a producción para validarla, que es la
restricción de trabajo del proyecto.
