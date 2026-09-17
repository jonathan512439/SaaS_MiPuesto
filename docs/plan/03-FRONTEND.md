# 03 · Frontend

Un solo diseño de catálogo. Lo que cambia entre una veterinaria y una
distribuidora no es la estructura de la página: son sus categorías, sus campos y
sus acciones.

## 1. La portada, bloque por bloque

Este es el orden del diseño de referencia, con lo que cada bloque toma del
sistema y quién lo controla.

| # | Bloque | De dónde sale | Lo controla |
|---|---|---|---|
| 1 | Patrón de fondo | Iconos de las categorías | Dueño: visible y opacidad |
| 2 | Cabecera | Logo, nombre, subnombre, carrito | Dueño: los tres primeros |
| 3 | Botón de Google | `maps_*` | Dueño: aparece o no |
| 4 | Buscador | Nombre, código y atributos | Siempre |
| 5 | Esferas de categoría | `categorias` con `visible` | Dueño: cuáles muestra |
| 6 | Portada | Imagen, título, bajada, botón | Dueño |
| 7 | Franja de horario | `horario` del negocio | Automático |
| 8 | Productos | `productos` | Dueño: orden y visibilidad |
| 9 | Banner inferior | `banners[1]` | Dueño: **opcional** |
| ~~10~~ | ~~Franja de confianza~~ | **Nunca se construyó**: descartada en la fase 9, ver [`06-FASES.md`](06-FASES.md) | — |
| 11 | Barra inferior | Según modalidad | Automático |

### 1.1 Lo que se retira del diseño de referencia

| Se va | Motivo |
|---|---|
| Calificación por producto y «(128 reseñas)» | Están inventados en la maqueta. El sistema no tiene reseñas y no muestra números falsos |
| «5.0 ★★★★★» escrito a mano | Idem. El número, si aparece, viene de Google |
| Pestañas «Pedidos» y «Perfil» | Necesitan cuenta de comprador. El sistema no la tiene por decisión |
| Corte en 6 esferas (`slice(1, 7)`) | Las esferas son las categorías reales. Si hay 12, hay 12 |
| Corte en 4 productos | La portada muestra los destacados; el resto vive en su categoría |

### 1.2 La barra inferior, corregida

Muestra solo lo que la modalidad tiene:

| Modalidad | Barra |
|---|---|
| Solo mostrar | Inicio · Categorías · Ubicación |
| Pedidos y reservas por WhatsApp | Inicio · Categorías · Ofertas · WhatsApp |
| Tienda con carrito | Inicio · Categorías · Ofertas · Carrito |

**Ofertas aparece solo si hay promociones activas.** Una pestaña que lleva a una
lista vacía le enseña al comprador que los botones no sirven, y eso le quita
confianza a los que sí sirven.

### 1.3 Sobre la saturación de la portada

Queda anotado desde ahora, aunque se refine al final: **la portada de referencia
muestra demasiado a la vez**. Once bloques antes del primer producto es mucho
para un teléfono con datos móviles.

El plan lo prepara así, sin resolverlo todavía:

- Cada bloque opcional **de verdad se puede apagar**, y apagado no deja hueco ni
  margen. Nada de bloques vacíos con altura.
- El orden de los bloques vive en una lista, no repartido por el JSX. Reordenar
  o recortar en la Fase 9 es cambiar una lista, no rehacer la página.
- ~~La franja de confianza y la de horario son candidatas a fundirse en una
  sola.~~ La de confianza nunca llegó a existir, así que no hubo qué fundir. El
  bloque que de verdad sobraba era el nombre del negocio, repetido entre la
  cabecera y el hero.
- La portada carga los primeros productos y **el resto al desplazar**.

## 2. La tarjeta de producto

Una sola forma, y lo que varía es qué datos trae:

```
┌──────────────────────┐
│      foto        ♥   │   insignia arriba a la izquierda si hay promoción
├──────────────────────┤
│ Nombre               │
│ Subtítulo            │
│ 9 W · E27 · Cálida   │   hasta 6 atributos con en_tarjeta
│ Bs 45   [ + ]        │
└──────────────────────┘
```

La línea de atributos es lo que hace que la ferretería se vea como una
ferretería y la veterinaria como una veterinaria, sin cambiar una sola regla de
estilo. Es lo que reemplaza a las seis formas de tarjeta que se retiran.

El botón de la esquina cambia con la modalidad y con `vende`:

| | Solo mostrar | WhatsApp | Carrito |
|---|---|---|---|
| `vende = cosas` | sin botón | Pedir | Agregar |
| `vende = tiempo` | sin botón | Agendar | Agendar |

## 3. La ficha de producto

| Bloque | Qué muestra |
|---|---|
| Galería | Hasta 4 fotos con miniaturas |
| Nombre, subtítulo, precio | Con precio anterior tachado si hay promoción |
| Disponibilidad | Stock si lo controla, «Consultar» si no |
| Variantes | Si la categoría vende cosas y el producto tiene |
| **Calendario** | Si la categoría vende tiempo. Días con horarios libres |
| Especificaciones | Los atributos, en dos columnas, de 1 a 10 |
| Cantidad | Solo si vende cosas |
| Acciones | La primaria según modalidad, más WhatsApp |
| Ubicación | «Ver mapa» con el enlace del negocio |

**El bloque de especificaciones no tiene número fijo.** El diseño de referencia
trae exactamente seis pares; acá muestra los que la categoría definió, y la
rejilla se acomoda de uno a diez.

## 4. El resumen que llega por WhatsApp

Es donde el trabajo del dueño se vuelve visible, y el motivo por el que los
campos valen la pena:

```
Pedido PED-A1B2C3D4 — Ferretería El Sol

2 × Foco LED 9 W
    Potencia: 9 W · Casquillo: E27 · Color: Cálida
    Bs 45 c/u

1 × Cinta aislante negra
    Bs 12

Total: Bs 102
```

Y para una cita:

```
Cita CITA-9F8E7D6C — Veterinaria Patitas

Consulta general
Sábado 15 de septiembre, 10:00
Bs 80

A nombre de: Ana Rojas
```

Van los atributos marcados con `en_resumen`. La pantalla de confirmación de
reserva que ya existe **no se reemplaza**: se le suman estos datos.

## 5. Iconos

Iconos de trazo en todo el sistema. Ningún emoji.

El proyecto ya tiene resuelto esto y **la convención se respeta**:
`scripts/armar-iconos.mjs` genera `components/iconos/trazos.ts` a partir de
Lucide (ISC), con **nombre en español** y solo los que se usan. El archivo se
versiona, así que en producción no se depende de la librería.

Pero ese juego es de interfaz: tiene los pocos iconos que las pantallas usan.
Un selector de categoría necesita cientos, y meterlos ahí rompería su regla —que
solo contenga lo usado—.

Por eso se genera un **segundo archivo**, `components/iconos/catalogo.ts`, con el
mismo script y la misma disciplina: nombres en español, versionado, y unos 150
iconos de oficio agrupados por rubro. Son dos juegos con propósitos distintos, no
una excepción a la regla:

| Archivo | Para qué | Cuántos |
|---|---|---|
| `trazos.ts` | Interfaz: guardar, borrar, volver | Los que se usan |
| `catalogo.ts` | Categorías del negocio | ~150, curados por rubro |

| Dónde | Cuál |
|---|---|
| Esferas de categoría | El que eligió el dueño al crear la categoría |
| Patrón de fondo | Los de sus categorías |
| Opciones del panel | Uno por opción, fijo |
| Junto al nombre del negocio | **Ninguno: va el logo que sube el dueño** |

El selector es un buscador: se escribe «martillo» y aparece el martillo. Se
ofrece un subconjunto curado por rubro primero —la ferretería ve herramientas—
con acceso al juego completo.

**Por qué iconos y no emoji:** los emoji no se pueden pintar ni cambiar de
opacidad, y el dueño controla la opacidad del patrón. Además cada teléfono los
dibuja distinto, así que el mismo catálogo se vería diferente en Android y en
iPhone.

## 6. El patrón de fondo

Ya existe: `patronDeRubro()`, la columna `patron_fondo`, las baldosas en
`public/patrones/` y la máscara CSS que las pinta con el color de la paleta.

Cambia el origen de los dibujos: **dejan de ser fijos por rubro y pasan a
armarse con los iconos de las categorías del negocio**. Dos ferreterías con
categorías distintas tienen fondos distintos.

Se agrega `patron_opacidad`, de 0 a 30 por ciento, como variable CSS. El tope de
30 no es arbitrario: por encima, el patrón compite con el texto y el catálogo
deja de pasar la guardia de contraste.

Si el negocio no tiene categorías todavía, cae al patrón del rubro. El dueño
recién dado de alta no ve un fondo vacío.

## 7. Paletas

Cerradas y verificadas. **No hay elección libre de color**: es la única forma de
garantizar el contraste, porque un dueño en algún momento va a elegir gris sobre
gris y no hay guardia que lo salve.

Las siete que ya existen se mantienen —Mercado, Tierra, Océano, Noche,
Altiplano, Jazmín, Grafito— y se suman tres populares:

| Nueva | Descripción |
|---|---|
| Índigo | Azul profundo con acento ámbar. El más neutro, sirve a casi todo rubro |
| Bosque | Verde oscuro con acento lima. Veterinaria, vivero, orgánico |
| Coral | Blanco cálido con acento coral. Ropa, belleza, pastelería |

Diez paletas. Cada una alcanza:

- El fondo de la cabecera, donde van el logo y el nombre.
- El fondo del catálogo.
- Las tarjetas de producto y sus bordes.

**No alcanza a los banners ni a las fotos.** El banner es la publicidad del
dueño y su imagen manda; teñirla sería arruinarla.

Cada paleta pasa por `check-design-contrast.mjs` **en los tres lugares** antes de
publicarse. La guardia ya existe; lo que se agrega es que corra sobre las diez
paletas en sus tres superficies, no solo sobre los tokens sueltos.

Nota heredada del análisis: de los 45 pares de color de `Catalogos_Ejemplo/`,
cuatro no pasan AA (`calzado` 4,07:1 con texto blanco; `consultoria` 3,74:1,
`streaming` 4,35:1 y `educacion` 4,40:1 sobre el acento). Con paletas cerradas
el problema no llega a existir.

## 8. Componentes

| Componente | Reemplaza a |
|---|---|
| `CabeceraCatalogo` | Las cuatro cabeceras de plantilla |
| `EsferasCategoria` | — |
| `BotonGoogle` | — |
| `TarjetaProducto` | **Las seis formas de tarjeta** |
| `LineaAtributos` | — |
| `FichaProducto` | Las fichas de cada plantilla |
| `Especificaciones` | — |
| `SelectorDeFecha` | — |
| `BannerCatalogo` | El banner simple actual |
| `BarraInferior` | — |
| `SelectorDeIcono` | — |

Se borran, con sus hojas de estilo: `components/templates/tarjetas/` completo,
las cinco plantillas, `VISTAS_PLANTILLA`, y de `lib/apariencia.ts` las constantes
`PLANTILLAS`, `TARJETAS`, `TARJETAS_POR_PLANTILLA`, `DEFINICIONES_TARJETAS`,
`COMBINACIONES_DE_FORMA`, `tarjetaPredeterminada`, `tarjetaValidaPara` y
`esTarjetaId`.

Queda `PALETAS`, `DEFINICIONES_PALETAS` y `esPaletaId`.

## 9. Reglas de estilo que no cambian

Las que ya rigen el proyecto y siguen rigiendo:

- CSS Modules con `@reference "globals.css"`. Nada de estilos en línea.
- **Solo tokens de diseño.** `check-design-tokens.mjs` rechaza cualquier color
  literal.
- Contraste AA verificado por `check-design-contrast.mjs`.
- Todo funciona desde 320 píxeles de ancho.
- Ninguna imagen sin `alt`.
