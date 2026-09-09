# 06 — Los 44 rubros y sus siete familias

## 1. La idea que hace esto manejable

Un rubro **no define el esquema**. Define un **preset**: un juego de categorías con sus
campos, un armazón, una tarjeta, una paleta y qué mecanismos vienen encendidos.

```
Rubro  ──elige──▶  Familia  ──determina──▶  Mecanismos, armazón y tarjeta
  │
  └──trae──▶  Preset (categorías + campos + paleta), que el dueño edita después
```

Consecuencias directas:

- **Un rubro nuevo cuesta dos horas y cero migraciones.** Es un archivo en
  `lib/rubros/presets/`, una entrada en cuatro listas y una baldosa de patrón.
- **Cambiar de rubro no pierde datos.** Sigue vigente la regla: el rubro oculta interfaz,
  nunca datos ni permisos.
- **El dueño no llena campos vacíos: corrige campos ya cargados.** Ese es el cambio que
  hace posible el alta en treinta minutos.

## 2. Las siete familias

| Familia | Cómo se compra | Armazón | Tarjeta | Mecanismos encendidos |
|---|---|---|---|---|
| `producto_simple` | Se elige y se pide | `feria` / `clasica` | `lista` | atributos |
| `producto_variante` | Se elige talla, color o presentación | `moderna` | `retrato` | atributos, **variantes** |
| `producto_tecnico` | Se busca por dato o por código | `catalogo` | `ficha` | atributos, **filtros**, unidad de medida |
| `servicio_turno` | Se elige profesional, día y hora | `reserva` | `servicio` | atributos, **agenda** |
| `reserva_tiempo` | Se elige fecha y se paga por tiempo | `reserva` | `estadia` | **agenda**, **unidad de tiempo**, cupos |
| `pedido_a_medida` | Se cotiza y se encarga | `clasica` | `cuadricula` | atributos, **modificadores**, **fecha de entrega** |
| `suscripcion` | Se contrata por mes | `minimal` | `servicio` | atributos, **unidad mes** |

**La familia es el valor por defecto; el preset lo refina.** Un restaurante es
`producto_simple` y además enciende modificadores y variantes de tamaño. Eso no rompe la
familia: la familia decide cómo se recorre el catálogo, no la lista completa de funciones.

## 3. Los 44 rubros

### Familia `producto_simple` — 10 rubros

| Id | Nombre | Armazón / Tarjeta | Extras |
|---|---|---|---|
| `restaurante` | Restaurante y comida | `clasica` / `lista` | modificadores, variantes de tamaño, carta del día, menú impreso, número de mesa |
| `minimarket` | Minimarket y abarrotes | `feria` / `lista` | menú impreso, zonas de entrega |
| `licoreria` | Licorería y bebidas | `feria` / `cuadricula` | variantes de presentación |
| `libreria` | Librería y papelería | `feria` / `lista` | búsqueda por código |
| `mascotas` | Pet shop y alimento | `feria` / `cuadricula` | variantes de peso |
| `floreria` | Florería y regalos | `moderna` / `cuadricula` | fecha de entrega, personalización |
| `pasteleria` | Pastelería y repostería | `clasica` / `cuadricula` | fecha de entrega, modificadores |
| `jugueteria` | Juguetería y bebés | `moderna` / `cuadricula` | filtro por edad |
| `cajas_americanas` | Cajas americanas y saldos | `moderna` / `cuadricula` | novedades, unidad única |
| `mayorista` | Distribuidor mayorista | `feria` / `ficha` | **escalas por volumen**, búsqueda por código |

### Familia `producto_variante` — 5 rubros

| Id | Nombre | Armazón / Tarjeta | Extras |
|---|---|---|---|
| `moda` | Moda y boutique | `moderna` / `retrato` | guía de talles |
| `calzado` | Calzado | `moderna` / `retrato` | guía de talles |
| `optica` | Óptica | `moderna` / `retrato` | agenda de examen de vista |
| `deportes` | Deportes y fitness | `moderna` / `retrato` | |
| `muebleria` | Mueblería y decoración | `moderna` / `cuadricula` | medidas, fecha de entrega |

### Familia `producto_tecnico` — 7 rubros

| Id | Nombre | Armazón / Tarjeta | Extras |
|---|---|---|---|
| `ferreteria` | Ferretería y materiales | `catalogo` / `ficha` | unidad de venta, menú impreso |
| `construccion` | Cerámicas, pisos y construcción | `catalogo` / `ficha` | **unidad m²**, paso por caja, calculadora |
| `repuestos` | Repuestos automotrices y motos | `catalogo` / `ficha` | **compatibilidad** (atributo lista múltiple), búsqueda por código |
| `electropartes` | Partes eléctricas y electrónicas | `catalogo` / `ficha` | ficha técnica en PDF |
| `electronica` | Electrónica y tecnología | `catalogo` / `ficha` | garantía, variantes de capacidad |
| `computacion` | Computación y servicio técnico | `catalogo` / `ficha` | agenda de servicio técnico |
| `seguridad` | Seguridad, cámaras y alarmas | `catalogo` / `ficha` | agenda de instalación, combos |

### Familia `servicio_turno` — 8 rubros

| Id | Nombre | Armazón / Tarjeta | Extras |
|---|---|---|---|
| `barberia` | Barbería y belleza | `reserva` / `servicio` | profesional, duración, modificadores |
| `dental` | Clínica dental y salud | `reserva` / `servicio` | profesional, sucursales |
| `veterinaria` | Clínica veterinaria | `reserva` / `servicio` | profesional, urgencias |
| `servicios_hogar` | Servicios del hogar | `reserva` / `servicio` | zonas de cobertura, a domicilio |
| `consultoria` | Consultorías | `minimal` / `servicio` | ficha en PDF |
| `fotografia` | Fotografía, video y DJ | `reserva` / `servicio` | paquetes, fecha del evento |
| `transporte` | Transporte y mudanzas | `reserva` / `servicio` | zonas, qué incluye |
| `educacion` | Educación y cursos | `reserva` / `servicio` | **cupos**, temario en PDF |

### Familia `reserva_tiempo` — 8 rubros

| Id | Nombre | Armazón / Tarjeta | Extras |
|---|---|---|---|
| `hotel` | Hotel y alojamiento | `reserva` / `estadia` | **unidad noche**, mapa |
| `turismo` | Turismo y tours | `reserva` / `estadia` | **cupos**, itinerario, qué incluye |
| `viajes` | Agencia de viajes | `reserva` / `estadia` | cupos, moneda USD |
| `canchas` | Canchas deportivas | `reserva` / `estadia` | **unidad hora**, mapa |
| `salas_juego` | Salas de juego | `reserva` / `estadia` | unidad hora, capacidad |
| `estacionamiento` | Estacionamientos y garajes | `reserva` / `estadia` | unidad hora, sucursales, mapa |
| `alquiler_eventos` | Alquiler para fiestas y eventos | `reserva` / `estadia` | **unidad día**, fecha del evento |
| `inmobiliaria` | Inmobiliaria | `moderna` / `estadia` | **moneda USD**, agenda de visita, mapa |

### Familia `pedido_a_medida` — 4 rubros

| Id | Nombre | Armazón / Tarjeta | Extras |
|---|---|---|---|
| `imprenta` | Imprenta y publicidad | `clasica` / `cuadricula` | modificadores, cantidad mínima, fecha de entrega |
| `carpinteria` | Carpintería y metalúrgica | `clasica` / `cuadricula` | medidas, fecha de entrega |
| `artesanias` | Artesanías y personalizados | `moderna` / `cuadricula` | personalización, fecha de entrega |
| `entretenimiento_infantil` | Entretenimiento infantil | `reserva` / `servicio` | agenda, paquetes, fecha del evento |

### Familia `suscripcion` — 2 rubros

| Id | Nombre | Armazón / Tarjeta | Extras |
|---|---|---|---|
| `gimnasio` | Gimnasios | `minimal` / `servicio` | **unidad mes**, agenda de clases con cupos |
| `streaming` | Streaming y suscripciones | `minimal` / `servicio` | unidad mes, variantes de plan |

### Y uno más

| Id | Nombre | Familia | Notas |
|---|---|---|---|
| `otro` | Otro | `producto_simple` | Nada de lo anterior se parece. Todo encendido, nada precargado |

## 4. Migración de los siete rubros actuales

Ningún negocio existente cambia de aspecto ni pierde nada. La equivalencia:

| Rubro hoy | Pasa a ser | Por qué |
|---|---|---|
| `restaurante` | `restaurante` | Igual |
| `tienda_barrio` | `minimarket` | El nombre nuevo es el que usan las fichas |
| `ropa_y_calzado` | `moda` | `calzado` queda disponible para elegir |
| `ferreteria` | `ferreteria` | Igual |
| `servicios` | `servicios_hogar` | Los demás servicios ahora tienen rubro propio |
| `belleza` | `barberia` | Igual alcance, nombre más reconocible |
| `otro` | `otro` | Igual |
| *(sin rubro)* | *(sin rubro)* | **No se les adivina uno.** Regla vigente: se les ofrece todo |

```sql
update public.negocios set rubro = case rubro
  when 'tienda_barrio' then 'minimarket'
  when 'ropa_y_calzado' then 'moda'
  when 'servicios' then 'servicios_hogar'
  when 'belleza' then 'barberia'
  else rubro end
where rubro is not null;
```

**El preset no se aplica retroactivamente.** Un negocio que ya cargó sus categorías las
conserva; el preset es para el alta, y aplicarlo después es una acción explícita del
dueño con un aviso de qué va a crear.

## 5. Un preset completo, como ejemplo

`lib/rubros/presets/ferreteria.ts`:

```ts
export const FERRETERIA: PresetRubro = {
  rubro: "ferreteria",
  familia: "producto_tecnico",
  armazon: "catalogo",
  tarjeta: "ficha",
  paleta: "grafito",
  unidadPrecioSugerida: "unidad",
  mecanismos: { variantes: false, agenda: false, escalas: false,
                modificadores: false, fechaEntrega: false },
  categorias: [
    {
      nombre: "Iluminación",
      campos: [
        { clave: "potencia", nombre: "Potencia", tipo: "numero", unidad: "W",
          filtrable: true, destacado: true },
        { clave: "tipo_luz", nombre: "Tipo de luz", tipo: "lista",
          valores: ["Fría", "Cálida", "Neutra"], filtrable: true, destacado: true },
        { clave: "casquillo", nombre: "Casquillo", tipo: "lista",
          valores: ["E27", "E14", "GU10"], filtrable: true },
      ],
    },
    {
      nombre: "Cemento y áridos",
      campos: [
        { clave: "peso", nombre: "Peso", tipo: "numero", unidad: "kg",
          filtrable: true, destacado: true },
        { clave: "marca_cemento", nombre: "Marca", tipo: "lista",
          valores: ["Soboce", "Fancesa", "Itacamba", "Coboce"], filtrable: true },
      ],
    },
    {
      nombre: "Tubos y accesorios",
      campos: [
        { clave: "diametro", nombre: "Diámetro", tipo: "lista",
          valores: ['1/2"', '3/4"', '1"', '2"', '3"', '4"'],
          filtrable: true, destacado: true },
        { clave: "material", nombre: "Material", tipo: "lista",
          valores: ["PVC", "Cobre", "Galvanizado", "PPR"], filtrable: true },
        { clave: "largo", nombre: "Largo", tipo: "numero", unidad: "m", filtrable: true },
      ],
    },
    { nombre: "Tornillos y fijaciones", campos: [ /* … */ ] },
    { nombre: "Herramientas", campos: [ /* … */ ] },
  ],
};
```

Esto responde a la observación que dejó anotada el plan anterior: **una ferretería vende
focos, cemento, tubos y tornillos, y los cuatro no comparten campos.** Por eso el eje es
la categoría y no el rubro, y por eso el preset trae cinco categorías con campos
distintos en vez de cuatro campos para todo.

## 6. La trampa que hay que decir en la interfaz

«Potencia: 20 W, 50 W, 100 W» — ¿son tres valores de un producto o tres productos?

En una ferretería cada potencia tiene su precio, así que **son tres productos** y el campo
dice cuál es cuál. Pero el dueño va a esperar cargar **un** producto con tres potencias y
tres precios, y eso es una variante.

**El sistema ahora tiene las dos cosas**, y por eso el problema cambia de naturaleza: ya
no es una limitación que hay que explicar, es una elección que hay que guiar. La interfaz
del formulario dice, junto al bloque de campos:

> Si cada opción tiene su propio precio o sus propias existencias, no es un campo: es una
> variante. Usá el bloque de abajo.

Es la única frase de este plan que está redactada de antemano, porque es la que decide si
el dueño carga bien o carga mal su catálogo.

## 7. Los techos por rubro

| Concepto | Techo | Dónde |
|---|---|---|
| Categorías por preset | 8 | Prueba unitaria de presets |
| Campos por categoría | 8, y 2 destacados | Disparador en la base |
| Valores por lista | 12 | `check` en la base |
| Campos que trae un preset por categoría | **3** | Prueba unitaria |

La última fila es una restricción de producto, no técnica: **un formulario con ocho campos
por producto no lo llena nadie**. El preset trae tres, que es lo que un dueño completa sin
abandonar; los otros cinco quedan disponibles para quien los quiera.
