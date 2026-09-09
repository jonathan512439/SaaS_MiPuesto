# 04 — Las diez fases

## Cómo se lee esto

Cada fase trae **alcance**, **lo que no entra**, **base**, **backend**, **frontend**,
**pruebas** y **criterio de aceptación**. El criterio de aceptación es una lista de cosas
comprobables, no una descripción. Si no se puede comprobar, no es criterio.

**Reglas de fase**, heredadas y vigentes:

1. No se empieza una fase con la anterior sin cerrar.
2. Cada fase se despliega a producción y se valida ahí. Es una restricción de trabajo del
   proyecto, no una preferencia.
3. Antes de cerrar: `npm run typecheck`, `npm run lint`, `npm test`,
   `npm run build:vinext` y `npm run test:rls:linked`. Sin excepción.
4. Después de cada migración: `npm run types:db:linked`, o TypeScript sigue viendo el
   esquema viejo.
5. Toda tabla nueva trae su RLS en la misma migración que la crea.
6. Un commit por tarea, con mensaje descriptivo.

**Estimación total: 62 días de trabajo efectivo.** No son 62 días de calendario.

| Fase | Nombre | Días | Desbloquea |
|---|---|---|---|
| 0 | Red de seguridad | 2 | Todo lo demás |
| 1 | El armazón visual nuevo | 6 | La demostración de venta |
| 2 | Atributos por categoría | 8 | Los 44 rubros |
| 3 | Variantes con existencias propias | 9 | 15 rubros |
| 4 | Descubrimiento | 5 | Los 44 rubros |
| 5 | Precio real | 6 | 14 rubros |
| 6 | Agenda | 10 | 15 rubros |
| 7 | Presets por rubro y alta guiada | 6 | El alta en 30 minutos |
| 8 | Logística y confianza | 5 | 12 rubros |
| 9 | Rendimiento, endurecimiento y piloto | 5 | El cierre |

---

# Fase 0 — Red de seguridad

**2 días. Bloquea todas las demás.**

## Por qué va primera

Este plan aplica **más de veinte migraciones** sobre una base que **nunca tuvo un
respaldo**. `docs/RESPALDOS.md` está escrito, el script existe, y el flujo nunca corrió
porque falta el secreto `SUPABASE_DB_URL`. Hacer la migración más grande de la historia
del proyecto sobre una base sin respaldo verificado no es un riesgo aceptable: es la
definición de lo que el usuario pidió evitar cuando dijo que no se rompa a la primera.

## Alcance

| Tarea | Quién |
|---|---|
| Crear el bucket de R2 para respaldos | **Dueño** |
| Cargar `SUPABASE_DB_URL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` y la variable `R2_BUCKET_RESPALDOS` | **Dueño** |
| Correr el respaldo una vez a mano y verificar que el archivo llegó | Dueño, con `npm run respaldo:verificar` |
| **Ensayo de restauración** sobre una base nueva | **Dueño**, guiado |
| Base de ensayo (`staging`) en Supabase, gratuita, con el mismo esquema | Agente |
| `npm run supabase:push:ensayo` y `npm run test:rls:ensayo` | Agente |
| Suscribirse al tema de ntfy y correr `npm run vigilancia:configurar -- --probar` | **Dueño** |

## Por qué una base de ensayo y no solo la local

La base local con Docker no reproduce dos cosas que este plan usa: las extensiones que
Supabase instala como `supabase_admin` —`http`, `pg_cron`, `btree_gist`— y el
comportamiento real de PostgREST con funciones `security definer`. La fase 2 tiene una
migración con una incógnita declarada (si `jsonb_each_text` sirve en una columna
generada), y esa incógnita **se resuelve en la base de ensayo, no en producción**.

Es un proyecto gratuito más en Supabase. Costo: Bs 0.

## Criterio de aceptación

- [ ] Existe un archivo de respaldo en R2, con fecha de hoy y tamaño mayor a cero.
- [ ] El ensayo de restauración se hizo y está anotado en `docs/AVANCE.md` con la fecha y
      el tiempo que tomó.
- [ ] `npm run supabase:push:ensayo` aplica las 47 migraciones actuales en limpio.
- [ ] `npm run test:rls:ensayo` pasa contra la base de ensayo.
- [ ] Una alerta de prueba de ntfy llegó al teléfono del dueño.

---

# Fase 1 — El armazón visual nuevo

**6 días. Sin cambios de esquema salvo una columna.**

## Alcance

Separar armazón de tarjeta y sumar los dos armazones nuevos, **con los datos que ya
existen**. Es la fase que se puede mostrar a un prospecto la semana que viene.

- Reorganizar `components/templates/` según `03-FRONTEND.md` sección 4.
- Seis tarjetas: `lista`, `cuadricula`, `retrato`, `ficha`, `servicio`, `estadia`.
  Las de la fase 1 dibujan lo que hay hoy; `ficha` deja el hueco de los atributos
  destacados listo y vacío.
- Dos armazones nuevos: `catalogo` y `reserva`. El de `reserva` muestra por ahora el
  bloque de contacto donde después irá el calendario.
- Selector de tarjeta en `dashboard/plantilla`, con vista previa.
- Extender `hoja-de-contactos.tsx` a las 19 combinaciones válidas.

## Lo que no entra

Atributos, variantes, filtros, agenda. Nada de datos nuevos. Si una tarjeta necesita un
dato que no existe, muestra el espacio vacío correctamente, no un texto de relleno.

## Base

```sql
alter table public.negocios
  add column tarjeta_id text not null default 'cuadricula' check (tarjeta_id in (
    'lista','cuadricula','retrato','ficha','servicio','estadia'));

alter table public.negocios drop constraint negocios_plantilla_id_check;
alter table public.negocios add constraint negocios_plantilla_id_check
  check (plantilla_id in ('clasica','moderna','minimal','feria','catalogo','reserva'));

update public.negocios set tarjeta_id = case plantilla_id
  when 'clasica' then 'lista' when 'moderna' then 'cuadricula'
  when 'minimal' then 'servicio' when 'feria' then 'lista'
  else 'cuadricula' end;
```

## Pruebas

| Prueba | Archivo |
|---|---|
| Cada armazón declara al menos una tarjeta, y la primera es la predeterminada | `lib/apariencia.test.ts` |
| Los seis armazones y las seis tarjetas están en el CSS, el registro, el validador y la base | `scripts/check-design-contrast.mjs`, extendido |
| Las 19 combinaciones válidas pasan el contraste con las 7 paletas | `npm run test:contraste` |
| Cada negocio existente conserva su aspecto: la migración asigna la tarjeta equivalente | `supabase/tests/remote/fase1-tarjetas.sql` |
| Ninguna tarjeta introduce color, tamaño ni espaciado fuera de los tokens | `npm run test:tokens` |

## Criterio de aceptación

- [ ] Los tres negocios de prueba se ven **igual que antes de la fase** en producción.
- [ ] Se puede cambiar la tarjeta desde el panel y el cambio se ve en el catálogo público.
- [ ] `/estilos/combinaciones` muestra las 19 combinaciones y ninguna está rota.
- [ ] El armazón `catalogo` tiene el buscador arriba y el `reserva` el bloque de contacto
      primero, comprobado en un teléfono real.
- [ ] El paquete de JavaScript del catálogo público **no creció** respecto de la medición
      previa a la fase.

---

# Fase 2 — Atributos por categoría

**8 días. El cimiento. Desbloquea los 44 rubros.**

## Alcance

- Tabla `campos_categoria` con sus techos en disparador.
- `productos.atributos jsonb` y `productos.marca`, con índice GIN.
- Clave única compuesta `(id, negocio_id)` en `productos` y `categorias` — el patrón de
  aislamiento de `01-MODELO-DE-DATOS.md` sección 2.
- Regeneración de `texto_busqueda` incluyendo código, marca y valores de atributos.
- `lib/catalogo/campos.ts`: validación de definiciones y de valores.
- `/api/catalogo/campos` con los cuatro verbos.
- En el panel: pestaña *Campos* dentro de cada categoría, y los campos correspondientes en
  el formulario de producto, agrupados y colapsados por defecto.
- En el público: bloque de ficha técnica en la ficha del producto, y hasta dos atributos
  destacados en la tarjeta `ficha`.
- Importación desde Excel: mapear columnas a campos de la categoría.

## Lo que no entra

Filtros. Se guardan los datos y se muestran; filtrar es la fase 4. Es a propósito:
separar el guardado del filtrado permite validar que los datos son correctos antes de
construir encima.

## La incógnita que se resuelve en la base de ensayo

`texto_busqueda` es una columna generada y exige funciones inmutables. Si
`jsonb_each_text` no califica en Postgres 17, la salida es un disparador
`before insert or update` sobre una columna normal. **Se prueba en la base de ensayo el
primer día de la fase**, y la migración de producción sale con la variante que funcionó.

## Pruebas

| Prueba | Tipo |
|---|---|
| Una lista sin valores se rechaza; una de 13 valores también | Unitaria |
| Un campo `multiple` de tipo texto se rechaza | Unitaria |
| El noveno campo de una categoría se rechaza con `check_violation` | Base, `fase2-campos.sql` |
| El tercer campo destacado se rechaza | Base |
| Un valor fuera de la lista se rechaza | Unitaria |
| `"true"` como texto se rechaza en un campo booleano | Unitaria |
| **Borrar un campo no borra el valor guardado en el producto** | Base |
| **Recrear el campo hace reaparecer el valor** | Base |
| Un objeto de atributos de más de 2 KB se rechaza | Unitaria y base |
| Un negocio no puede crear un campo en la categoría de otro | `test:rls:multitenant` |
| Un producto con atributos de otro negocio no se puede insertar (clave compuesta) | Base |
| La búsqueda encuentra un producto por el valor de un atributo | Base |
| La consulta pública con 300 productos y 8 campos tarda menos de 400 ms | Medición |

## Criterio de aceptación

- [ ] Una ferretería de prueba tiene la categoría *Iluminación* con *Potencia: 20 W, 50 W,
      100 W* y tres productos cargados, cada uno con su valor.
- [ ] La ficha pública muestra la ficha técnica; la tarjeta `ficha` muestra dos atributos.
- [ ] Borrar el campo *Potencia* deja los productos intactos y los quita de la ficha;
      recrearlo los devuelve. **Comprobado en producción, no en la base local.**
- [ ] Un archivo de Excel con una columna *Potencia* la mapea al campo.
- [ ] `npm run test:rls:linked` en verde.

---

# Fase 3 — Variantes con existencias propias

**9 días. La fase más riesgosa: toca el carrito, el pedido y las reservas.**

## Alcance

- `productos.ejes_variante`, `productos.tiene_variantes` con la restricción de una sola
  fuente de existencias.
- Tabla `variantes` con su tope de 50 y su índice GIN.
- `pedido_items.variante_id` y `variante_etiqueta`.
- **Reescritura de `crear_pedido_reservado()`** con las dos ramas.
- **Reescritura de `expirar_reservas_vencidas()`** para devolver al lugar correcto.
- `lib/catalogo/variantes.ts`: validación de ejes, generación de la matriz, validación de
  opciones contra los ejes.
- `firmaLinea()` en el carrito, con sus casos.
- En el panel: editor de ejes, generación de la matriz, tabla de existencias con guardado
  en lote.
- En el público: `selector-variante.tsx`, y la tarjeta `retrato` muestra las disponibles.

## Lo que no entra

Precio por variante en la carga masiva desde Excel. Se cargan las variantes a mano en
esta fase; la importación llega en la fase 8 si un cliente la pide.

## La parte que hay que hacer con miedo

`crear_pedido_reservado()` es la única función del sistema donde dos compradores pueden
pelearse por la última unidad. Hoy funciona y está probada. La reescritura:

- **Conserva el `for update`** sobre la fila de la que descuenta. Sin él, dos pedidos
  simultáneos venden la misma última talla 40.
- **Verifica dentro de la función** que un producto con `tiene_variantes = true` traiga
  `variante_id`. La ruta se puede saltar; la función no.
- **Se prueba con concurrencia real** antes de tocar producción: dos sesiones pidiendo la
  última unidad al mismo tiempo, en la base de ensayo, y exactamente una gana.

## Pruebas

| Prueba | Tipo |
|---|---|
| Dos pedidos simultáneos por la última talla 40: gana uno, el otro recibe error claro | **Concurrencia, base de ensayo** |
| Un producto con variantes y `cantidad_stock` no nulo se rechaza | Base |
| Un ítem sin `variante_id` sobre un producto con variantes se rechaza | Base |
| Una variante con opciones que no coinciden con los ejes se rechaza | Unitaria |
| La variante 51 se rechaza | Base |
| Dos variantes con las mismas opciones se rechazan | Base |
| La reserva expirada devuelve el stock **a la variante**, no al producto | Base |
| `firmaLinea` separa dos tallas del mismo producto | Unitaria |
| `firmaLinea` funde dos líneas idénticas | Unitaria |
| El precio nulo de la variante hereda el del producto | Unitaria |
| Cambiar el precio del producto cambia el de las variantes que heredan | Base |
| Una variante de otro negocio no se puede referenciar en un pedido | RLS |

## Criterio de aceptación

- [ ] Una zapatería de prueba tiene un producto con tallas 38 a 42 y dos colores, con
      existencias distintas y una agotada.
- [ ] La talla agotada aparece tachada y no se puede agregar al carrito.
- [ ] Se hace un pedido con dos tallas del mismo modelo y llegan como dos líneas al
      mensaje de WhatsApp.
- [ ] La reserva descuenta de la variante correcta y, al vencer, la devuelve.
- [ ] **La prueba de concurrencia pasó en la base de ensayo** y está anotada.
- [ ] Un negocio sin variantes sigue funcionando exactamente igual.

---

# Fase 4 — Descubrimiento

**5 días. Filtros, orden, búsqueda por código, favoritos y comparador.**

## Alcance

- Función `catalogo_publico()` con filtros, orden, paginación y facetas
  (`02-BACKEND-Y-API.md` sección 2).
- `piezas/filtros.tsx`: facetas de lista, rangos numéricos, sí/no, rango de precio.
- Orden: relevancia, precio ascendente y descendente, novedades, nombre.
- Búsqueda por código y por SKU de variante.
- Favoritos y comparador en `localStorage`.
- Chips de filtro activo, con botón de quitar y de limpiar todo.

## La decisión de estado

**Los filtros van en la URL.** Un catálogo filtrado tiene que poder mandarse por WhatsApp,
volver con el botón atrás y sobrevivir a una recarga. Además permite renderizar en el
servidor, que es lo que sostiene el presupuesto de JavaScript de `03-FRONTEND.md`.

El formulario funciona **sin JavaScript**: `method="get"` y un botón *Aplicar*. Con
JavaScript se aplica al tocar. Esa es la diferencia entre una interfaz que se degrada y
una que se rompe.

## Pruebas

| Prueba | Tipo |
|---|---|
| Un filtro por atributo devuelve solo los productos con ese valor | Base |
| Dos filtros se combinan con Y, no con O | Base |
| Un filtro por rango numérico respeta los extremos | Base |
| Las facetas cuentan bien y no cuentan los ocultos ni los de la papelera | Base |
| El séptimo filtro simultáneo se ignora sin error | Unitaria |
| Con más de 500 productos, las facetas vuelven vacías y no cuelgan | Medición |
| La búsqueda por código encuentra exacto antes que parcial | Base |
| La búsqueda por SKU de variante devuelve el producto padre | Base |
| Los filtros de la URL se leen bien con valores raros y acentos | Unitaria |
| El comparador con `localStorage` roto no rompe la pantalla | Unitaria |

## Criterio de aceptación

- [ ] En la ferretería de prueba se filtra por *Potencia: 100 W* y quedan solo esos.
- [ ] La URL filtrada, abierta en otro teléfono, muestra el mismo resultado.
- [ ] Con JavaScript desactivado, los filtros siguen funcionando con el botón *Aplicar*.
- [ ] Las facetas muestran el conteo y las opciones sin resultados aparecen deshabilitadas.
- [ ] La consulta filtrada tarda menos de 400 ms con 300 productos.

---

# Fase 5 — Precio real

**6 días. El camino del dinero.**

## Alcance

- Columnas de precio en `productos`: unidad, moneda, cantidad mínima, paso.
- Tabla `escalas_precio` con tope de 5.
- Tablas `grupos_modificador` y `opciones_modificador` con sus topes.
- `pedido_items.modificadores jsonb`.
- **`lib/precios.ts` crece con `resolverPrecio()`**, con el orden de resolución de
  `02-BACKEND-Y-API.md` sección 3.
- `piezas/precio.tsx`: precio con unidad, moneda y tachado.
- Calculadora de cantidad para unidades con paso (cerámica: metros a cajas).
- En el panel: bloques de escalas y modificadores en el formulario de producto.
- En el pedido: los modificadores viajan al mensaje de WhatsApp.

## Las tres reglas que se prueban por nombre

1. `la escala reemplaza el precio, no lo descuenta`
2. `la promocion se aplica despues de la escala`
3. `los extras no entran en la promocion`

## Pruebas

| Prueba | Tipo |
|---|---|
| Las tres reglas de arriba, una prueba con ese nombre cada una | Unitaria |
| La escala se elige por el mayor `desde_cantidad` que no supera la cantidad | Unitaria |
| Sin escala aplicable, se usa el precio base | Unitaria |
| La cantidad se redondea hacia arriba al paso y respeta el mínimo | Unitaria |
| Un delta negativo no deja el precio bajo cero | Unitaria |
| Un grupo con `minimo = 1` rechaza el ítem sin elección | Unitaria y servidor |
| Un grupo con `maximo = 2` rechaza tres opciones | Unitaria |
| Una opción de modificador de otro producto se rechaza | Servidor |
| **El total del navegador se ignora y se usa el del servidor** | Base |
| La diferencia entre ambos queda en la bitácora | Base |
| Un producto en dólares no se convierte ni se mezcla en el total | Unitaria |
| Un pedido con dos monedas se rechaza con mensaje claro | Servidor |

## Criterio de aceptación

- [ ] Un mayorista de prueba muestra las tres escalas y el total cambia al subir la
      cantidad.
- [ ] Un restaurante de prueba tiene *Extras* con *Queso extra Bs 8* y el total lo suma.
- [ ] Una cerámica de prueba pide metros y el sistema muestra cajas y el total correcto.
- [ ] Un departamento en dólares muestra `US$` y no se mezcla con bolivianos.
- [ ] Un total manipulado desde el navegador **no cambia el pedido**, comprobado a mano.

---

# Fase 6 — Agenda

**10 días. La fase más larga. Desbloquea 15 rubros de servicio.**

## Alcance

- Extensión `btree_gist`, tablas `recursos`, `recurso_producto` y `turnos`.
- **Las dos garantías de no solapamiento** de `01-MODELO-DE-DATOS.md` sección 6.
- `disponibilidad_recurso()`: franjas libres a partir del horario, la duración del
  servicio y los turnos ocupados.
- `reservar_turno()` con bloqueo de fila.
- Expiración de turnos dentro de la tarea `mipuesto-expirar-reservas` que ya corre.
- `limites_turnos_ip`, con el patrón de `limites_pedidos_ip`.
- `/api/agenda/disponibilidad` (pública) y `/api/agenda/turnos` (pública, con límite).
- `piezas/calendario.tsx`, el único componente nuevo con estado de fecha.
- Armazón `reserva` completo: calendario primero.
- En el panel: pantalla *Agenda* con la vista del día, alta y baja de recursos, y horario
  propio por recurso.

## Lo que no entra

Recordatorios automáticos por WhatsApp. Necesitan la API de negocio de WhatsApp, que
tiene costo y aprobación. El turno se confirma por el mismo camino que un pedido: el
comprador abre WhatsApp con su código.

## Lo que se reutiliza y no se reinventa

- `lib/horario.ts` decide si se atiende. **No hay un segundo motor de horarios.**
- El generador de códigos de reserva es el mismo.
- La tarea de expiración es la que ya existe, con un paso más.

## Pruebas

| Prueba | Tipo |
|---|---|
| Dos turnos que se pisan en un recurso de capacidad 1: el segundo se rechaza por la exclusión | Base |
| Trece personas en un tour de 12 lugares: la treceava se rechaza | Base |
| Dos reservas simultáneas por el último lugar: gana una | **Concurrencia, base de ensayo** |
| Un turno cancelado libera la franja | Base |
| La disponibilidad respeta el horario del recurso y, si no tiene, el del negocio | Unitaria |
| La disponibilidad respeta feriados y horarios especiales | Unitaria |
| La disponibilidad no revela quién ocupa las franjas tomadas | Base y RLS |
| `anon` no puede leer `turnos` de ninguna forma | RLS |
| Un turno que pisa el cierre del local se rechaza | Unitaria |
| Un turno en el pasado se rechaza | Unitaria |
| El sexto turno desde la misma IP en una hora se rechaza | Base |
| El turno vencido pasa a `expirado` y libera la franja | Base |
| El cambio de hora de Bolivia no existe, pero la franja se calcula en `America/La_Paz` | Unitaria |

## Criterio de aceptación

- [ ] Una barbería de prueba tiene dos barberos con horarios distintos y tres servicios de
      duración distinta.
- [ ] Se reserva un turno desde el catálogo público y llega a WhatsApp con su código.
- [ ] La franja reservada desaparece de la disponibilidad de inmediato.
- [ ] **La prueba de concurrencia pasó en la base de ensayo** y está anotada.
- [ ] Un turno no confirmado vence solo y libera la franja.
- [ ] Un hotel de prueba muestra disponibilidad por noche y una cancha por hora.
- [ ] `anon` no ve el nombre ni el teléfono de nadie, comprobado contra la API pública.

---

# Fase 7 — Presets por rubro y alta guiada

**6 días. Convierte todo lo anterior en un alta de 30 minutos.**

## Alcance

- `RUBROS` crece de 7 a **44**, agrupados en **7 familias** (`06-RUBROS.md`).
- `lib/rubros/presets/*.ts`: un archivo por rubro, en código y versionado.
- `POST /api/negocios/preset`: aplica el preset. **Idempotente y no destructivo** — crea
  lo que falta, no toca lo que ya existe, nunca borra.
- Asistente de alta: rubro, familia, armazón y tarjeta sugeridos, y el preset aplicado con
  un botón.
- Guardia `check-rubros.mjs`: verifica que cada rubro esté en las cuatro partes —
  `RUBROS`, `DEFINICIONES_RUBROS`, el `check` de la base y su baldosa de patrón — y que
  tenga un preset y una familia. Es la guardia que el plan anterior dejó anotada como
  faltante.
- Las siete demostraciones de `03-FRONTEND.md` sección 8.

## Qué trae un preset

```ts
export type PresetRubro = {
  rubro: RubroId;
  familia: FamiliaId;
  armazon: ArmazonId;
  tarjeta: TarjetaId;
  paleta: PaletaId;
  categorias: Array<{
    nombre: string;
    campos: Array<Omit<CampoCategoria, "id" | "negocio_id" | "categoria_id">>;
  }>;
  unidadPrecioSugerida: UnidadPrecio;
  mecanismos: { variantes: boolean; agenda: boolean; escalas: boolean;
                modificadores: boolean; fechaEntrega: boolean };
};
```

**Los presets van en código y no en tabla** porque son datos semilla que se aplican una
vez y se editan después: pertenecen al commit, se revisan en el diff y una guardia los
vigila. Una tabla los volvería datos de producción que hay que migrar.

## Lo que no entra

Cambiar el preset de un negocio ya dado de alta. Aplicar un preset dos veces no rompe
nada, pero tampoco reorganiza lo que el dueño ya armó.

## Pruebas

| Prueba | Tipo |
|---|---|
| Los 44 rubros están en las cuatro partes y tienen preset y familia | `check-rubros.mjs` |
| Ningún preset supera 8 campos por categoría ni 12 valores por lista | Unitaria |
| Todo preset apunta a una combinación armazón + tarjeta declarada como válida | Unitaria |
| Aplicar un preset dos veces no duplica categorías ni campos | Base |
| Aplicar un preset sobre un negocio con datos no borra nada | Base |
| Cada preset produce un catálogo que pasa el contraste con su paleta | `test:contraste` |
| Las siete demostraciones no tienen precios en cero, textos de relleno ni fotos faltantes | Unitaria |

## Criterio de aceptación

- [ ] Se da de alta un negocio de cada una de las siete familias **en menos de 30
      minutos cada uno**, cronometrado, sin tocar la base a mano.
- [ ] Las siete demostraciones se abren desde la portada y cargan en menos de dos segundos
      en un teléfono de gama baja.
- [ ] `check-rubros.mjs` falla si se agrega un rubro a medias. Comprobado a propósito.

---

# Fase 8 — Logística y confianza

**5 días.**

## Alcance

- `sucursales`, `zonas_entrega`, `relaciones_producto`.
- `pedidos`: sucursal, zona, costo de entrega, fecha y hora de entrega.
- `productos.requiere_fecha_entrega` y `productos.ficha_url`.
- Subida de ficha técnica en PDF a Storage, con su tope de peso y su borrado al eliminar
  el producto.
- Galería: de 4 a **6 fotos** por producto, con el tope por plan.
- Relacionados y combos en la ficha pública.
- Selector de sucursal en el catálogo cuando el negocio tiene más de una.
- Selector de zona de entrega en el carrito, con su costo sumado al total **en el
  servidor**.

## Pruebas

| Prueba | Tipo |
|---|---|
| El costo de entrega se lee de la base, no del navegador | Base |
| Un pedido bajo el mínimo de la zona se rechaza con mensaje claro | Servidor |
| Una zona de otro negocio no se puede referenciar | RLS |
| Una relación reflexiva se rechaza | Base |
| Una relación con un producto de otro negocio se rechaza | Base |
| Borrar un producto borra su ficha y sus fotos de Storage | Integración |
| Una fecha de entrega en el pasado se rechaza | Unitaria |
| Un PDF de más del tope se rechaza en el cliente y en el servidor | Unitaria |
| La séptima foto se rechaza | Base |

## Criterio de aceptación

- [ ] Una florería de prueba pide fecha de entrega y llega en el mensaje de WhatsApp.
- [ ] Un minimarket de prueba tiene tres zonas con costos distintos y el total los suma.
- [ ] Un negocio con dos sucursales muestra el selector y el pedido dice cuál.
- [ ] Una electropartes de prueba ofrece la ficha en PDF y se descarga.
- [ ] Borrar el producto borra el PDF de Storage, verificado en la consola de Supabase.

---

# Fase 9 — Rendimiento, endurecimiento y piloto

**5 días. La puerta de salida.**

## Alcance

- Medición contra los techos de `03-FRONTEND.md` sección 7, con un negocio cargado a
  fondo: 300 productos, 8 atributos, 50 variantes en diez de ellos, agenda con un mes de
  turnos.
- `check-peso-cliente.mjs`: guardia del presupuesto de JavaScript.
- Revisión de índices con `explain analyze` sobre la consulta pública real.
- Recorrido de seguridad completo sobre las once tablas nuevas: `anon` no lee lo que no
  debe, `authenticated` no cruza negocios, la clave privilegiada respeta los topes.
- `docs/PRUEBAS-LANZAMIENTO.md` reescrito para el modelo nuevo.
- **La semana de piloto.**

## Pruebas

| Prueba | Tipo |
|---|---|
| Las cinco medidas de rendimiento cumplen su techo | Medición, anotada |
| `explain analyze` de la consulta pública usa los índices GIN y no hace recorrido completo | Medición |
| Las once tablas nuevas pasan el recorrido de aislamiento | `test:rls:multitenant` |
| La API pública no expone `turnos`, `pedidos`, `limites_*` ni el esquema `private` | Script |
| Los topes de la base resisten a la clave privilegiada | Base |
| El respaldo del día corrió y el archivo está | `respaldo:verificar` |

## Criterio de aceptación

**El mismo que tenía la fase 9 del plan anterior, y sigue sin cumplirse:**

- [ ] Un negocio piloto opera **una semana completa** —pedidos reales, cambios de precio,
      altas y bajas— sin que nadie toque la base a mano y sin incidentes de datos.
- [ ] Las cinco medidas de rendimiento están anotadas en `docs/AVANCE.md` con su valor.
- [ ] Existe un catálogo de demostración por familia, abierto por una persona desde un
      teléfono real.
- [ ] El respaldo corre solo y hay un ensayo de restauración con fecha.

**Nada de lo construido reemplaza este criterio.**

---

## Orden y dependencias

```
0 ──▶ 1 ──▶ 2 ──▶ 3 ──▶ 4 ──▶ 5 ──▶ 6 ──▶ 7 ──▶ 8 ──▶ 9
      │      │      │      │
      │      └──────┴──────┘  4 necesita 2; con 3 es mejor pero no la exige
      └─ 1 no depende de nada: se puede mostrar a un prospecto de inmediato
```

**La 6 se puede adelantar** si el primer cliente que paga es de servicios. Depende de la
2 (para los campos del servicio) pero **no** de la 3 ni de la 5. Si eso pasa, el orden es
`0, 1, 2, 6, 7, 3, 4, 5, 8, 9` y este documento se actualiza con la fecha y el motivo.

Es la única reordenación prevista. Cualquier otra se discute antes, no durante.
