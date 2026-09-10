# 00 · Visión

## El objetivo, en una frase

Tener seis catálogos reales, distintos entre sí, funcionando en producción, para
salir a buscar clientes con algo que se pueda mostrar en un teléfono.

No es «terminar el sistema». Es llegar al punto donde un dueño de ferretería ve
su catálogo y dice «eso es mi negocio».

## Los seis rubros del MVP

| Rubro | Por qué está | Lo que aporta al modelo |
|---|---|---|
| **Restaurante** | Es el rubro con más demanda y el que ya tiene funciones propias | Carta del día, menú imprimible, número de mesa |
| **Ferretería** | El caso que originó los campos por categoría | Medidas exactas, muchas categorías, poco stock controlado |
| **Distribuidora** | Vende por volumen | Presentaciones con precio distinto, precio por mayor |
| **Ropa y calzado** | Alta rotación visual | Talla y color como variantes con stock propio |
| **Repuestos de auto y moto** | El más técnico | Compatibilidad, código de parte, búsqueda por dato |
| **Veterinaria** | El más exigente | **Vende cosas y vende tiempo en el mismo catálogo** |

La veterinaria está a propósito. Vende alimento y antipulgas —cosas, con stock— y
también consulta, vacunación y baño —tiempo, con agenda—. Si el modelo la
sostiene sin trucos, sostiene a los otros cinco y a los que vengan después.

## Qué se retira

| Se va | Por qué |
|---|---|
| Las cinco plantillas (`clasica`, `moderna`, `minimal`, `feria`, `catalogo`) | Un solo diseño de catálogo. La variación la da el rubro |
| Las seis formas de tarjeta | Idem. La forma la decide qué vende la categoría |
| `TARJETAS_POR_PLANTILLA` y `COMBINACIONES_DE_FORMA` | Sin ejes que combinar, no hay combinaciones |
| Pestañas «Pedidos» y «Perfil» | Las dos necesitan cuenta de comprador, que el sistema no tiene por decisión |
| Calificación por producto y «(128 reseñas)» | El diseño de referencia los trae inventados. No se muestra lo que no es cierto |

Sobre lo primero: son cuatro días de trabajo de la Fase 1 que se retiran. El
dueño lo decidió con la información completa y tiene copia local. Queda escrito
acá para que dentro de seis meses nadie se pregunte por qué desapareció.

## Qué se queda intacto

Ninguna función existente se pierde. Se reubican dentro del diseño nuevo:

| Función | Dónde vive ahora |
|---|---|
| QR de pago | Ficha de producto y cierre de pedido |
| Carta del día | Portada del catálogo, solo restaurantes |
| Menú imprimible | Panel, sin cambios |
| Número de mesa | Formulario de pedido, sin cambios |
| Papelera de productos | Panel, sin cambios |
| Promociones con ventana horaria | Alimentan la pestaña «Ofertas» y la insignia de la tarjeta |
| Confirmación de reserva | **Sin cambios.** Se le suman los datos nuevos: medidas si el producto las tiene, fecha y hora si es una cita |
| Las tres modalidades | Solo mostrar · Pedidos y reservas por WhatsApp · Tienda con carrito |

## Las decisiones cerradas

| # | Decisión |
|---|---|
| 1 | El rubro se elige **una vez**, en el alta. Cambiarlo lo autoriza el SuperAdmin y **borra el catálogo**, previa descarga en Excel |
| 2 | Las esferas de categoría **son las categorías reales**, todas visibles, con icono elegido por el dueño |
| 3 | Cada categoría **declara sus campos**: hasta 10, hasta 6 en la tarjeta |
| 4 | La categoría declara **si vende cosas o vende tiempo**. Eso decide variantes o agenda |
| 5 | El patrón de fondo se arma con los iconos de las categorías. Visibilidad y opacidad las decide el dueño |
| 6 | Iconos en todo el sistema. Emoji en ninguna parte. El logo reemplaza al emoji junto al nombre |
| 7 | Dos banners. El de abajo es opcional y lleva texto y botón |
| 8 | Paletas cerradas y verificadas. Afectan cabecera, fondo y tarjetas. **No tocan los banners** |
| 9 | El botón de Google Maps es opcional. Con clave configurada muestra la calificación; sin clave, solo el enlace |
| 10 | La dirección es `mipuesto.com/nombre-del-negocio` durante el MVP. El subdominio llega en la fase final |
| 11 | El sistema escribe en voseo, sin jerga marcada |

## Cómo se mide que terminó

1. Los seis catálogos están publicados y se abren en un teléfono real.
2. Un dueño que nunca vio el sistema completa el alta sin ayuda.
3. La veterinaria toma una cita y **rechaza la segunda al mismo horario**.
4. La ferretería carga 30 productos desde una foto y el sistema le dice cuáles
   campos quedaron vacíos.
5. Todas las guardias del build pasan, incluida la de vocabulario.
