# 03 — Frontend: armazones, tarjetas y rendimiento

`DESIGN.md` sigue siendo la dirección visual y manda sobre este archivo. Acá va la
**arquitectura de render**: cómo se construye un catálogo que sirva para 44 rubros sin
escribir 44 catálogos.

## 1. El problema, dicho sin rodeos

Hoy hay **4 plantillas × 7 paletas**, y la plantilla decide todo: el armazón, la tarjeta,
la ficha y el pie. Eso alcanza para 7 rubros y no alcanza para 44.

Pero la salida **no es dibujar 44 plantillas**. Al mirar las 44 fichas de
`Catalogos_Ejemplo/`, las maquetas de teléfono se repiten: hay unas seis formas de
tarjeta y unas seis formas de portada, combinadas distinto. Una ficha de repuesto con
compatibilidad, una de hotel con calendario y una de cerámica con calculadora no son la
misma pantalla con otro color — pero **sí son las mismas seis piezas ordenadas
distinto**.

## 2. La descomposición: tres ejes en vez de uno

```
            Armazón (6)        ×    Tarjeta (6)       ×   Paleta (7)
         cómo se recorre           cómo se decide         cómo se ve
```

### Armazón — cómo se recorre el catálogo

| Id | Nombre | Forma | Rubros típicos |
|---|---|---|---|
| `clasica` | Clásica | Carta editorial por categorías | Restaurante, pastelería |
| `moderna` | Moderna | Vitrina visual con acción rápida | Moda, juguetería, regalos |
| `minimal` | Mínima | Servicios y contacto directo | Consultoría, servicios del hogar |
| `feria` | Feria | Lista de precios densa | Minimarket, mayorista, librería |
| `catalogo` | **Catálogo técnico** *(nuevo)* | Buscador arriba, filtros laterales, resultados en cuadrícula | Ferretería, repuestos, electropartes, electrónica |
| `reserva` | **Reserva** *(nuevo)* | Calendario primero, catálogo después | Barbería, dental, canchas, hotel, tours |

Los dos nuevos existen porque **cambian la primera decisión del comprador**. En
`catalogo` la primera pregunta es «¿tenés esto?» y por eso el buscador va arriba de todo.
En `reserva` la primera pregunta es «¿hay lugar el jueves?» y por eso el calendario
precede al catálogo. Eso no se resuelve con estilos.

### Tarjeta — cómo se decide un producto

| Id | Forma | Qué muestra además del nombre y el precio |
|---|---|---|
| `lista` | Fila, foto chica a la izquierda | Descripción corta |
| `cuadricula` | Foto cuadrada arriba | Insignia, marca |
| `retrato` | Foto vertical 3:4 | Variantes disponibles como puntos de color o tallas |
| `ficha` | Foto chica, datos a la derecha | **Hasta 2 atributos destacados**, código |
| `servicio` | Sin foto o con foto redonda | Duración, botón *Agendar* |
| `estadia` | Foto ancha 16:9 | Precio con su unidad («Bs 590 / noche»), disponibilidad |

**Los dos atributos destacados de `ficha`** son la razón por la que `campos_categoria`
tiene la columna `destacado` con techo de 2. Tres datos técnicos en una tarjeta de
teléfono de 360 px no entran, y el techo está en la base para que la interfaz no tenga
que decidirlo en tiempo de dibujo.

### Cómo se combinan

```ts
// lib/apariencia.ts
export const ARMAZONES = ["clasica","moderna","minimal","feria","catalogo","reserva"] as const;
export const TARJETAS  = ["lista","cuadricula","retrato","ficha","servicio","estadia"] as const;

/* Cada armazón trae su tarjeta por defecto; el dueño puede cambiarla dentro de
   las que ese armazón sabe dibujar. No toda combinación existe: `feria` con
   `estadia` sería una lista de precios con fotos panorámicas, que no es un
   diseño, es un accidente. */
export const TARJETAS_POR_ARMAZON: Record<ArmazonId, readonly TarjetaId[]>;
```

**6 × 6 no son 36 combinaciones: son 18.** La tabla `TARJETAS_POR_PLANTILLA` las declara,
y una prueba verifica que cada armazón tenga al menos una tarjeta, que la primera sea la
predeterminada y que ninguna tarjeta quede sin que nadie la dibuje.

> Corregido de 19 a 18 el 2026-09-09, al definirlas en concreto. El número lo fija
> `lib/apariencia.test.ts`, no este documento. Y mientras las dos plantillas nuevas no
> existan son **doce**: el registro no declara una plantilla antes de que su componente
> exista, porque una plantilla declarada y no dibujada es una que el dueño puede elegir
> para quedarse con el catálogo en blanco. Lo protegen dos pruebas que ya existían.

## 3. Qué pasa con las cuatro plantillas de hoy

No se tiran. `clasica`, `moderna`, `minimal` y `feria` **son** cuatro de los seis
armazones, y su forma actual pasa a ser su tarjeta predeterminada:

| Plantilla hoy | Armazón | Tarjeta predeterminada |
|---|---|---|
| Clásica | `clasica` | `lista` |
| Moderna | `moderna` | `cuadricula` |
| Mínima | `minimal` | `servicio` |
| Feria | `feria` | `lista` |

Un negocio que hoy tiene `plantilla_id = 'moderna'` queda con armazón `moderna` y tarjeta
`cuadricula`, **y se ve exactamente igual que antes de la migración**. Ese es el criterio
de compatibilidad: la fase 1 no puede cambiarle el catálogo a nadie sin que lo pida.

```sql
alter table public.negocios
  add column tarjeta_id text not null default 'cuadricula' check (tarjeta_id in (
    'lista','cuadricula','retrato','ficha','servicio','estadia'
  ));

-- Se asigna la equivalente a lo que cada negocio ya tenía.
update public.negocios set tarjeta_id = case plantilla_id
  when 'clasica' then 'lista'
  when 'moderna' then 'cuadricula'
  when 'minimal' then 'servicio'
  when 'feria'   then 'lista'
end;
```

## 4. La estructura de archivos

```
components/templates/
  armazones/
    clasica/  moderna/  minimal/  feria/  catalogo/  reserva/
      armazon.tsx          ← portada, encabezado, navegación, pie
      armazon.module.css
  tarjetas/
    lista.tsx  cuadricula.tsx  retrato.tsx  ficha.tsx  servicio.tsx  estadia.tsx
    tarjetas.module.css        ← las seis comparten hoja: la mitad del CSS es común
  piezas/                      ← lo que usan todos, y por eso no vive en ninguno
    foto-producto.tsx          (ya existe)
    insignias-producto.tsx     (ya existe)
    accion-producto.tsx        (ya existe)
    accion-llamar.tsx          (ya existe)
    aviso-horario.tsx          (ya existe)
    precio.tsx                 ← precio + unidad + moneda + tachado   [fase 5]
    atributos-destacados.tsx   ← los 2 de la tarjeta                  [fase 2]
    selector-variante.tsx      ← tallas, colores                      [fase 3]
    filtros.tsx                ← facetas y rangos                     [fase 4]
    calendario.tsx             ← franjas libres                       [fase 6]
    tema-catalogo.module.css   (ya existe)
```

**La regla que sostiene esto:** una pieza de `piezas/` no sabe en qué armazón está. Recibe
datos y clases por props, igual que hace hoy `AccionLlamar`, que trae su disposición y
toma el color de la plantilla. Si una pieza necesita saber el armazón, es que son dos
piezas.

## 5. Estado: dónde vive cada cosa

Esta es la sección que decide si la interfaz «se rompe a la primera».

| Estado | Dónde vive | Por qué |
|---|---|---|
| Filtros, orden, página, categoría | **URL** (`?talla=40&orden=precio`) | Se comparte, vuelve con el botón atrás, sobrevive a recargar y se renderiza en el servidor |
| Variante elegida en la ficha | `useState` del componente | Muere con la pantalla, y así tiene que ser |
| Carrito | `localStorage` + contexto | Ya existe. No se toca su forma; se le suman `varianteId` y `modificadores` a cada ítem |
| Favoritos y comparador | `localStorage`, cada uno con su clave | Sin base de datos, decisión de `00-VISION.md` |
| Fecha elegida en la agenda | **URL** | Un enlace a «el jueves a las 10» tiene que poder mandarse por WhatsApp |
| Datos del catálogo | Servidor, sin caché en el cliente | Ver sección 7 |

**Nada de librerías de estado.** El proyecto tiene contexto de React para el carrito y con
eso alcanza. Sumar una es una dependencia nueva y hay que justificarla por escrito.

### El carrito con variantes: la trampa de la identidad

Hoy un ítem del carrito se identifica por `productoId`. Con variantes y modificadores eso
deja de alcanzar: una hamburguesa con queso extra y una sin queso son dos líneas del
mismo producto.

```ts
/* La identidad de una línea del carrito. Dos líneas se funden solo si su firma
   coincide entera. Sin esto, agregar la talla 40 sumaría a la línea de la 39. */
export function firmaLinea(item: ItemCarrito): string {
  return [
    item.productoId,
    item.varianteId ?? "",
    [...item.modificadores].sort().join(","),
  ].join("|");
}
```

Esa función se prueba con casos antes de que exista la pantalla. Es la misma clase de
error que la firma del carrito que ya resolvió `lib/pedidos/resumen-vigente.ts`.

## 6. Accesibilidad, que acá no es opcional

El comprador típico está en la calle, con una mano, con sol, en un teléfono de gama baja.

- **Objetivo táctil mínimo 44 px**, incluidos los puntos de color de las variantes. Un
  selector de talla con círculos de 24 px es inusable con el pulgar.
- **El color nunca es el único indicador.** Una variante agotada se tacha y dice
  «Agotado»; no se pone gris y ya. Lo mismo el selector de color: lleva su nombre.
- **Todo control es un botón o un enlace de verdad.** Nada de `div` con `onClick`.
- **Foco visible** con el token de contorno, sin `outline: none` en ningún lado.
- **Los filtros son un formulario** que funciona sin JavaScript: `method="get"`, y el
  botón envía. Con JavaScript se aplican al tocar; sin él, al enviar.
- El control de contraste (`npm run test:contraste`) se extiende a las combinaciones
  nuevas: **6 armazones × 7 paletas**, y falla el build si una queda sin verificar.

## 7. Rendimiento, con números y no con intenciones

Objetivos, medidos en un teléfono de gama baja con red 3G simulada:

| Medida | Techo |
|---|---|
| Primera pintura con contenido | 1,5 s |
| Interactivo | 2,5 s |
| JavaScript del catálogo público | **90 KB comprimido** |
| Consulta `catalogo_publico()` | 400 ms al percentil 95 |
| Salto de diseño acumulado | 0,05 |

Cómo se sostienen:

- **El catálogo público se arma en el servidor.** Los componentes de `armazones/` y
  `tarjetas/` son de servidor salvo los que necesitan interacción; esos son los únicos que
  llevan `"use client"`, y son cinco: carrito, filtros, selector de variante, galería y
  calendario.
- **Las fotos llevan `width` y `height` siempre.** El salto de diseño en una cuadrícula de
  24 productos es la diferencia entre un catálogo y una pantalla que salta.
- **Carga diferida por debajo del pliegue**: `loading="lazy"` desde la sexta tarjeta.
- **24 productos por página.** Ya es el valor de hoy y se conserva.
- **Nada de fuentes nuevas.** La tipografía de display ya está y es la única.
- **Presupuesto de JavaScript verificado**: una guardia nueva, `check-peso-cliente.mjs`,
  falla el build si el paquete del catálogo público pasa el techo. Sin la guardia, el
  techo es una intención.

## 8. La demostración por rubro

Hoy existe `lib/plantillas/demos-rubro.ts` con datos de muestra. Se extiende a **siete
demostraciones, una por familia de comportamiento** (`06-RUBROS.md`), cada una con:

- Categorías con sus campos ya definidos
- Productos con atributos llenos y creíbles, precios en bolivianos de verdad
- Variantes con existencias distintas, incluida una agotada
- Al menos un producto con promoción y uno con escala por volumen
- En las familias de servicio, una agenda con franjas ocupadas y libres

**Esa es la herramienta de venta.** Se abre desde la portada, se comparte por WhatsApp y
es lo que el prospecto ve antes de decidir. Tiene la misma exigencia de calidad que la
producción, y una prueba verifica que ninguna demostración tenga precios en cero, textos
de relleno ni fotos faltantes.

## 9. Lo que no se va a hacer, para que no vuelva a discutirse

| Idea | Por qué no |
|---|---|
| Un constructor visual de plantillas | Es otro producto. La combinación armazón + tarjeta + paleta da 133 catálogos distintos y eso es suficiente |
| CSS-in-JS | El proyecto usa módulos de CSS con tokens y una guardia que lo verifica. Cambiarlo tira esa guardia |
| Una plantilla por rubro | Es el error que este documento evita. 44 hojas de estilo son 44 lugares donde arreglar el mismo error |
| Animaciones de entrada | Cuestan JavaScript y batería, y `DESIGN.md` sección 3 ya las prohíbe |
| Desplazamiento infinito | Rompe el botón atrás y la posición al volver de una ficha. Paginación con números |
