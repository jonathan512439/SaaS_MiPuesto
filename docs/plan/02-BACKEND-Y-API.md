# 02 · Backend y API

## 1. La forma que ya tiene el sistema

No se inventa un estilo nuevo. Toda ruta nueva sigue el que ya existe:

1. `obtenerContextoAdminCatalogo()` resuelve sesión, negocio y cliente.
2. `leerJson()` parsea y devuelve un error legible si no es JSON.
3. Un **validador puro** de `lib/` decide si los datos sirven. No sabe de
   sesiones, y por eso se puede probar sin base.
4. La comprobación de pertenencia va en la ruta, no en el validador: el
   validador no sabe de quién es la sesión.
5. Los errores vuelven con clave por campo (`atributos.3.opciones`) para que el
   formulario marque el campo exacto.

## 2. Rutas nuevas

### 2.1 Alta guiada

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/alta/nombre` | Guarda el nombre del dueño y el del negocio. **Devuelve el slug propuesto y si está libre** |
| `POST` | `/api/alta/rubro` | Fija el rubro, siembra categorías y campos, marca `rubro_bloqueado_en` |
| `GET` | `/api/alta/estado` | Qué pasos faltan. Alimenta la lista de «lo que falta para publicar» |

El slug se calcula en `lib/negocios/slug.ts`: minúsculas, sin tildes, guiones,
sin palabras reservadas (`admin`, `api`, `panel`, `plataforma`, `www`). Si está
ocupado se propone con sufijo numérico y **el dueño lo aprueba antes de seguir**.

**El slug se genera una vez y después no cambia solo.** Si el dueño corrige el
nombre del negocio a los tres meses, la dirección sigue igual: cambiarla rompe
todo QR impreso y todo enlace ya compartido. Cambiarlo es potestad del
SuperAdmin.

### 2.2 Campos por categoría

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/catalogo/categorias/[id]/atributos` | Las definiciones, ordenadas |
| `PUT` | `/api/catalogo/categorias/[id]/atributos` | Reemplaza el conjunto entero |

Reemplaza el conjunto y no parchea de a uno por la misma razón que los banners:
**el orden es la posición**, y mandar «el campo 3» cuando el 2 no existe deja un
hueco. Además evita el problema de renombrar una `clave`: al llegar el conjunto
entero, el servidor ve qué claves desaparecieron y puede decidir qué hacer con
los valores que las usaban.

Qué pasa al borrar un campo que tenía valores cargados:

```
El campo «Casquillo» tiene valor en 23 productos.
Si lo borrás, ese dato se pierde.
[ Cancelar ]  [ Borrar el campo y su dato ]
```

No se borra en silencio y no se conserva escondido. Un valor sin definición no
se puede mostrar ni editar: sería basura invisible que aparece años después.

### 2.3 Variantes

| Método | Ruta | Qué hace |
|---|---|---|
| `PUT` | `/api/catalogo/productos/[id]/variantes` | Reemplaza el conjunto |

Rechaza si la categoría del producto tiene `vende = 'tiempo'`. Un servicio no
tiene presentaciones: tiene horarios, y esos los da la agenda.

### 2.4 Agenda y citas

| Método | Ruta | Qué hace |
|---|---|---|
| `PUT` | `/api/catalogo/categorias/[id]/agenda` | Días, horas, duración, cupo |
| `GET` | `/api/publico/[slug]/horarios?producto=…&desde=…` | **Horarios libres calculados** |
| `POST` | `/api/publico/[slug]/citas` | Toma una franja |

El endpoint de horarios es el que sustituye al `variants: ['10:00', …]` del
diseño de referencia. Devuelve, por día:

```json
{ "fecha": "2026-09-15",
  "franjas": [{ "hora": "08:30", "libres": 2 }, { "hora": "09:00", "libres": 0 }] }
```

`libres: 0` se devuelve igual, no se omite: el cliente ve que las 9:00 existen y
están tomadas, que es información. Omitirlas haría parecer que el negocio no
atiende a esa hora.

**El `POST` de citas confía en la restricción de exclusión, no en una consulta
previa.** Intenta insertar; si Postgres rechaza por solapamiento, responde 409
con «ese horario se acaba de ocupar» y los horarios actualizados. Preguntar
antes y escribir después deja una ventana donde dos personas ganan.

Es idempotente por `idempotencia uuid`, igual que los pedidos: un doble toque en
un teléfono lento no genera dos citas.

### 2.5 Google Maps

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/negocios/maps/resolver` | Del enlace pegado a la ficha confirmada |
| `PATCH` | `/api/negocios/maps` | Activa o desactiva el botón |

El flujo completo está en la sección 4.

### 2.6 Exportar el catálogo

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/catalogo/exportar` | El catálogo entero en un Excel de una hoja |

Sirve para tres cosas distintas y por eso vale la pena: respaldo del dueño,
edición en masa fuera de línea, y rescate antes de un cambio de rubro.

Una hoja, una fila por producto. Las columnas fijas primero —categoría, nombre,
descripción, precio, stock— y después **una columna por cada campo definido**,
con el nombre visible como encabezado. Es el mismo formato que acepta la
importación, así que **lo que se baja se puede volver a subir**. Si no fuera el
mismo formato, la exportación sería un callejón sin salida.

### 2.7 Cambio de rubro (SuperAdmin)

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/plataforma/negocios/[id]/rubro` | Cambia el rubro y reinicia el catálogo |

En orden, y el orden importa:

1. Genera el Excel del catálogo actual y lo guarda en el depósito.
2. Borra categorías, atributos, productos, variantes, agenda y citas.
3. Fija el rubro nuevo y siembra sus categorías y campos.
4. Anota en la bitácora de plataforma quién lo hizo y cuándo.

El paso 1 va antes que el 2 y **si falla, nada se borra**. El dueño recibe el
enlace de descarga en el mismo aviso que le dice que su catálogo se reinició.

## 3. La importación con IA

Es lo que más cambia, y para mejor.

### 3.1 La categoría es el esquema

Hoy se le pide a Gemini «extraé los productos de esta imagen» y se ve qué
devuelve. Ahora se le pasa **la definición de la categoría como esquema de
salida**: los campos, sus tipos, sus unidades y sus opciones válidas.

Un modelo que sabe que «Casquillo» solo admite E27, E14, GU10 o B22 acierta
mucho más que uno que inventa el formato. Y lo que devuelva fuera de esas
opciones se puede rechazar antes de escribir, no después.

### 3.2 El informe de cobertura

Esto es requisito, no adorno. Al terminar, la respuesta dice **campo por campo
qué pudo llenar y qué no**:

```
27 productos leídos.

Completos ......... 12
Con faltantes ..... 15

No encontré:
  Existencias ..... 27 productos    [ Completar ahora ]
  Potencia ........ 12 productos    [ Completar ahora ]
  Casquillo ........ 4 productos    [ Completar ahora ]
```

El motivo es concreto: una foto de lista de precios casi nunca trae el stock.
Sin el informe, el dueño se queda con 27 productos a medias y lo descubre cuando
un cliente le pregunta. Con el informe, toca «Completar ahora» y llena esa
columna sola, para los 27, en una pantalla.

La estructura de la respuesta:

```ts
type ResultadoImportacion = {
  productos: ProductoImportado[];
  cobertura: { clave: string; nombre: string; faltan: number }[];
  descartados: { fila: number; motivo: string }[];
};
```

`descartados` ya existe en el importador de Excel y se mantiene igual.

### 3.3 Lo que no cambia

El registro de llamadas, el tope diario, el crédito por negocio y la devolución
del crédito cuando la llamada se rechaza siguen exactamente como están. La
importación nueva **usa** ese sistema, no lo reemplaza.

## 4. Google Places, en detalle

### 4.1 La clave es una sola y es nuestra

`GOOGLE_PLACES_API_KEY` vive como secreto del Worker y en `.env.local`. **Nunca
la ve el dueño del negocio, nunca lleva prefijo `NEXT_PUBLIC_`, nunca aparece en
código de cliente.** Vale la misma regla que para `GEMINI_API_KEY`, y la misma
guardia (`scripts/check-client-secrets.mjs`) la vigila.

Pedirle al dueño de una ferretería que cree un proyecto en Google Cloud mataría
la función. Y guardar la clave de cada dueño sería guardar credenciales ajenas
que cobran a su tarjeta.

### 4.2 Resolver el enlace, una vez por negocio

El enlace que comparte Maps (`maps.app.goo.gl/…`) no trae identificador de
lugar. El servidor lo sigue, extrae nombre y coordenadas, y busca la ficha. El
dueño confirma:

```
¿Es este tu negocio?

  Ferretería El Sol
  Av. Banzer 2200, Santa Cruz
  4,7 ★ · 128 opiniones

[ No es este ]  [ Sí, es mi negocio ]
```

Se guarda el `place_id`. **Esa resolución ocurre una sola vez en la vida del
negocio.**

### 4.3 Una consulta por semana

Un trabajo de `pg_cron` refresca calificación y cantidad de opiniones **una vez
por semana por negocio**.

| | Consultas al mes |
|---|---|
| Una por visitante | 6 negocios por 500 visitas = 3.000 |
| Una por negocio por día | 6 por 30 = 180 |
| **Una por negocio por semana** | **6 por 4 = 24** |

Con 500 negocios serían 2.000 consultas al mes, todavía dentro del tramo
gratuito. La calificación de un negocio de barrio no se mueve en una semana.

Se agrega a `tareas_programadas` y queda cubierto por la guardia
`check-tareas-programadas.mjs`, que ya exige que toda tarea de `pg_cron` esté
declarada.

### 4.4 Tope duro y degradación

Un contador mensual en la base. Al llegar al tope configurado, **deja de
consultar y sigue mostrando el último valor guardado**. Igual que el tope diario
de IA. Nunca puede haber una factura sorpresa.

Y si la clave no está configurada, el botón aparece igual y lleva a la ficha de
Google, sin número. Es el mismo componente y la misma pantalla:

| Estado | Qué muestra |
|---|---|
| Sin clave en la plataforma | «Mirá nuestras opiniones en Google» |
| Con clave, ficha resuelta | «4,7 ★ · 128 opiniones» |
| Dirección manual | El botón no se ofrece |

Nunca se muestra un número que no vino de Google. El «5.0 ★★★★★» escrito a mano
del diseño de referencia no se copia.

## 5. Validadores nuevos en `lib/`

| Archivo | Qué valida |
|---|---|
| `lib/catalogo/atributos.ts` | Definiciones: tipo, unidad, opciones, topes, claves |
| `lib/catalogo/valores.ts` | Valores contra su definición. Se usa en formulario, importación e IA |
| `lib/catalogo/variantes.ts` | Nombre único, precio, stock coherente |
| `lib/agenda/franjas.ts` | Semana válida, sin franjas solapadas |
| `lib/agenda/horarios.ts` | **De la semana a los horarios concretos.** Función pura |
| `lib/negocios/slug.ts` | Slug desde el nombre, palabras reservadas |
| `lib/negocios/maps.ts` | Enlace válido, forma de la ficha |
| `lib/iconos.ts` | Que el nombre de icono exista en el juego permitido |

`lib/agenda/horarios.ts` es el más importante de la lista y el más fácil de
probar: entra una semana, una duración, un cupo y las citas ya tomadas; sale una
lista de horarios con sus lugares libres. Sin base de datos, sin red, sin reloj
—la fecha entra como parámetro— y por eso se puede probar el cambio de horario,
el feriado y el turno que cruza el mediodía sin montar nada.
