# 04 · El panel del dueño

## 1. El diagnóstico

El panel de hoy es un menú de pantallas sueltas. El dueño entra y tiene que
adivinar por dónde empezar; ninguna pantalla le dice qué falta ni en qué orden.
Un cliente real ya reportó que no encontraba cómo crear una categoría.

A eso se suma que los menús, las instrucciones y las opciones tienen poco
contraste contra el fondo, así que **ni siquiera se ve dónde termina una opción
y empieza otra**.

Las siete correcciones de abajo están aprobadas y entran en el plan.

## 2. El alta guiada

Cuatro pasos, uno por pantalla, con la barra de progreso siempre visible.

### Paso 1 — Quién sos

```
¿Cómo te llamás?
[ Jonathan                          ]

¿Cómo se llama tu negocio?
[ Ferretería El Sol                 ]

  Tu catálogo va a estar en:
  mi-puesto.com/ferreteria-el-sol  ✓ disponible
```

El slug se calcula mientras escribe y se confirma acá. De ahí en adelante el
sistema lo llama por su nombre: «Bienvenido, Jonathan», no «Bienvenido,
usuario».

### Paso 2 — Qué vendés

Desplegable con los rubros disponibles. Debajo, sin rodeos:

```
⚠  El rubro se elige una sola vez.

Para cambiarlo después hay que pedirlo al equipo de MiPuesto,
y el catálogo se reinicia: se borran categorías, productos y fotos.
Te vas a poder descargar todo en Excel antes.
```

Breve, corto y puntual, como se pidió. No se esconde en un enlace de ayuda:
está a la vista en el momento de decidir.

Al elegir, **el sistema siembra sus categorías, sus iconos y sus campos**. El
dueño no arranca de una pantalla en blanco.

### Paso 3 — Tu marca

Logo, subnombre, paleta. Con la vista previa al lado, cambiando en vivo.

### Paso 4 — Tus primeros productos

Tres caminos, en este orden:

1. **Sacale una foto a tu lista de precios** — la IA los extrae.
2. **Subí un Excel** — con la plantilla ya armada para sus categorías.
3. **Cargalos a mano** — uno por uno.

Al terminar, el informe de cobertura dice qué campos quedaron vacíos.

### Qué pasa si abandona

Cada paso guarda. Si cierra el navegador en el paso 3, vuelve al paso 3.
`alta_completada_en` marca el final, y hasta entonces el panel abre siempre en el
alta.

## 3. Las siete correcciones

### 3.1 Un asistente, no un menú

Ya descrito arriba. Es la corrección de fondo: el panel deja de ser una lista de
pantallas y pasa a ser un camino.

### 3.2 El rubro precarga y el dueño confirma

Al elegir «Ferretería» ya vienen sus categorías con sus iconos, y cada una con
sus campos. **El dueño corrige, no crea.** Es la diferencia entre media hora y
una tarde.

Lo que se siembra por rubro está en [`05-RUBROS.md`](05-RUBROS.md).

### 3.3 Vista previa siempre visible

En pantalla ancha, a la derecha. En teléfono, una pestaña «Ver» fija abajo.
Cada cambio se ve al instante, sin guardar y sin salir.

No es una pantalla aparte: es el mismo componente del catálogo público, con los
datos del formulario. Si fuera una copia, se desincronizaría en la segunda
semana.

### 3.4 «Lo que te falta para publicar»

Una lista corta y **calculada**, no escrita a mano:

```
Para publicar te falta:
  ○ Subir tu logo
  ○ Poner tu número de WhatsApp
  ● Cargar al menos un producto        ✓
  ○ Elegir la foto de portada
```

Sale de `/api/alta/estado`. Que sea calculada importa: una lista escrita a mano
miente en cuanto alguien agrega un campo obligatorio y se olvida de esta
pantalla. Es el mismo error que ya nos costó dos guardias falsas en los
respaldos.

### 3.5 Cada opción muestra su efecto

En vez de un párrafo que explica qué hace el interruptor, la miniatura al lado:

```
  Banner de abajo          [ ▮▮▮▮ imagen ]
  ( ) No mostrar
  (•) Mostrar
```

Vale para el patrón de fondo, su opacidad, la paleta y el botón de Google. **Se
ve, no se lee.**

### 3.6 Contraste, con los tokens que ya existen

El sistema ya tiene `--color-superficie`, `--color-borde-tarjeta`,
`--sombra-tarjeta` y `--color-fondo-hundido`, y el panel no los usa. Es la
corrección más barata y la más visible:

- Cada opción dentro de una superficie con borde y sombra propia.
- Los grupos separados por fondo hundido, no por un margen.
- Las instrucciones en `--color-texto-suave`, nunca en `--color-texto-tenue`,
  que está pensado para notas al pie.
- Lo que está activo, con el color de marca de fondo, no con un borde de un
  píxel.

### 3.7 Palabras del negocio

| Antes | Ahora |
|---|---|
| Plantilla | Cómo se ve tu catálogo |
| Taxonomía / Categorías | Tus categorías |
| Atributos | Los datos de esta categoría |
| Modalidad | Cómo te compran |
| Slug | Tu dirección |
| Modo de acción | Qué botón ve tu cliente |

## 4. Las pantallas del panel, después

| Pantalla | Novedad |
|---|---|
| Inicio | Lo que falta para publicar, visitas, pedidos del día |
| Mi negocio | Nombre, subnombre, logo, WhatsApp, horario, ubicación |
| Mi catálogo | Categorías con sus iconos, campos y agenda |
| Productos | Con la línea de atributos y sus variantes |
| Apariencia | Paleta, portada, banners, patrón y opacidad |
| Pedidos y citas | **Las citas del día se suman a los pedidos** |
| Herramientas | IA, importar, exportar, menú imprimible, papelera |

Las funciones que ya existen —carta del día, número de mesa, QR de pago,
papelera, promociones— no se mueven de lugar ni cambian de forma. Solo heredan el
contraste corregido.

## 5. La plataforma (SuperAdmin)

Sigue igual, con una función nueva: **cambiar el rubro de un negocio existente**.

```
Cambiar el rubro de «Ferretería El Sol»

  De: Ferretería    A: [ Distribuidora ▾ ]

  Esto borra 4 categorías, 37 productos y 52 fotos.
  Se descarga un Excel con todo antes de borrar.

  Escribí el nombre del negocio para confirmar:
  [                                   ]
```

Escribir el nombre no es ceremonia: es lo único que distingue un borrado
intencional de un clic en la fila equivocada de una lista.
