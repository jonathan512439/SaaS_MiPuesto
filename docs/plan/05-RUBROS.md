# 05 · Los seis rubros

## 1. Qué significa «rubro» ahora

Antes el rubro solo encendía y apagaba pantallas: `rubroOfrece()` decidía si el
negocio veía la carta del día o el número de mesa. Ahora además **siembra el
catálogo**: sus categorías, sus iconos, sus campos y su forma de vender.

La regla vieja —«el rubro oculta interfaz, nunca datos»— sigue valiendo mientras
el negocio existe. Lo que cambia es el momento del alta, donde el rubro **crea**
datos que después son del dueño y él edita como quiera.

## 2. La lista

A los siete rubros actuales se suman tres:

| id | Nombre | Estado |
|---|---|---|
| `restaurante` | Restaurante o comida | Existe · **entra al MVP** |
| `ferreteria` | Ferretería y materiales | Existe · **entra al MVP** |
| `ropa_y_calzado` | Ropa y calzado | Existe · **entra al MVP** |
| `distribuidora` | Distribuidora y venta por mayor | **Nuevo** · entra al MVP |
| `repuestos` | Repuestos de auto y moto | **Nuevo** · entra al MVP |
| `veterinaria` | Veterinaria y mascotas | **Nuevo** · entra al MVP |
| `tienda_barrio` | Tienda de barrio | Existe · sin sembrar todavía |
| `servicios` | Servicios con turno | Existe · sin sembrar todavía |
| `belleza` | Belleza y cuidado personal | Existe · sin sembrar todavía |
| `otro` | Otro | Existe · siembra genérica |

Los negocios que ya existen **no se tocan**: conservan su rubro y su catálogo. La
siembra corre solo al elegir rubro en el alta.

Los cuatro rubros sin sembrar siguen funcionando exactamente como hoy. Se les
arma su siembra cuando llegue el primer cliente de ese rubro, no antes:
inventarle categorías a una peluquería que no existe es adivinar.

## 3. Restaurante

**Vende:** cosas · **Patrón:** comida · **Modalidad sugerida:** WhatsApp
**Funciones propias:** carta del día, menú imprimible, número de mesa

| Categoría | Icono | Vende |
|---|---|---|
| Almuerzos | `cubiertos` | cosas |
| Platos a la carta | `gorro-chef` | cosas |
| Bebidas | `vaso` | cosas |
| Postres | `torta` | cosas |

**Campos de «Almuerzos» y «Platos a la carta»:**

| Campo | Tipo | Detalle |
|---|---|---|
| Porción | opción | Personal · Para dos · Familiar |
| Acompañamiento | texto | En tarjeta |
| Picante | sí/no | En tarjeta |
| Vegetariano | sí/no | En tarjeta |

**Campos de «Bebidas»:**

| Campo | Tipo | Detalle |
|---|---|---|
| Tamaño | número | ml. En tarjeta |
| Con alcohol | sí/no | |

## 4. Ferretería

**Vende:** cosas · **Patrón:** herramientas · **Modalidad sugerida:** WhatsApp

Es el rubro que originó los campos por categoría, y el que más los usa.

| Categoría | Icono | Vende |
|---|---|---|
| Herramienta manual | `martillo` | cosas |
| Herramienta eléctrica | `taladro` | cosas |
| Eléctrico e iluminación | `foco` | cosas |
| Plomería | `llave-de-paso` | cosas |
| Pinturas | `rodillo` | cosas |
| Tornillería | `tornillo` | cosas |

**Campos de «Eléctrico e iluminación»** — el ejemplo que se discutió:

| Campo | Tipo | Detalle |
|---|---|---|
| Potencia | número | W. En tarjeta |
| Casquillo | opción | E27 · E14 · GU10 · B22 · G9. En tarjeta |
| Color de luz | opción | Cálida · Neutra · Fría. En tarjeta |
| Regulable | sí/no | |
| Vida útil | número | horas |

**Campos de «Pinturas»:**

| Campo | Tipo | Detalle |
|---|---|---|
| Contenido | número | litros. En tarjeta |
| Acabado | opción | Mate · Satinado · Brillante. En tarjeta |
| Base | opción | Agua · Aceite |
| Rendimiento | número | m² por litro |

**Campos de «Tornillería»:**

| Campo | Tipo | Detalle |
|---|---|---|
| Medida | texto | En tarjeta. Ejemplo: 1/4 x 2 |
| Material | opción | Acero · Inoxidable · Galvanizado. En tarjeta |
| Cabeza | opción | Plana · Redonda · Hexagonal |
| Se vende por | opción | Unidad · Caja · Kilo. En tarjeta |

## 5. Ropa y calzado

**Vende:** cosas · **Patrón:** vestuario · **Modalidad sugerida:** carrito

Es el rubro donde las **variantes** hacen todo el trabajo: talla y color con
stock propio.

| Categoría | Icono | Vende |
|---|---|---|
| Ropa de dama | `remera` | cosas |
| Ropa de varón | `remera` | cosas |
| Calzado | `calzado` | cosas |
| Accesorios | `reloj` | cosas |

**Campos de las tres primeras:**

| Campo | Tipo | Detalle |
|---|---|---|
| Color | texto | En tarjeta |
| Material | texto | |
| Temporada | opción | Verano · Invierno · Todo el año |

Las tallas **no son un campo**: son variantes, cada una con su stock. Es la
diferencia entre «esta remera viene en M» y «me quedan 3 en M».

## 6. Distribuidora

**Vende:** cosas · **Patrón:** abarrotes · **Modalidad sugerida:** WhatsApp

El rubro de venta por volumen. Las variantes son presentaciones **con precio
distinto**, que es el caso que el modelo tiene que sostener.

| Categoría | Icono | Vende |
|---|---|---|
| Abarrotes | `canasta` | cosas |
| Bebidas | `vaso` | cosas |
| Limpieza | `aerosol` | cosas |
| Desechables | `caja` | cosas |

**Campos comunes:**

| Campo | Tipo | Detalle |
|---|---|---|
| Presentación | texto | En tarjeta. Ejemplo: caja de 12 |
| Unidades por caja | número | unidades. En tarjeta |
| Marca | texto | En tarjeta |
| Pedido mínimo | número | cajas |

`Pedido mínimo` es el campo que separa a una distribuidora de una tienda, y es
el que hoy no se puede expresar en el sistema.

## 7. Repuestos de auto y moto

**Vende:** cosas · **Patrón:** herramientas · **Modalidad sugerida:** WhatsApp

El rubro más técnico. Acá el buscador por atributo es lo que se usa: nadie busca
«filtro», buscan «filtro para Toyota Corolla 2015».

| Categoría | Icono | Vende |
|---|---|---|
| Motor | `engranaje` | cosas |
| Frenos | `disco-de-freno` | cosas |
| Suspensión | `auto` | cosas |
| Filtros y lubricantes | `gota` | cosas |
| Eléctrico | `bateria` | cosas |
| Moto | `moto` | cosas |

**Campos comunes:**

| Campo | Tipo | Detalle |
|---|---|---|
| Marca del vehículo | texto | En tarjeta |
| Modelo | texto | En tarjeta |
| Año desde | número | |
| Año hasta | número | |
| Código de parte | texto | En tarjeta |
| Original o alternativo | opción | Original · Alternativo. En tarjeta |

`Año desde` y `Año hasta` son dos campos y no un rango porque el tipo `numero`
alcanza y un tipo `rango` nuevo se usaría en un solo rubro. Se agrega el día que
un segundo rubro lo necesite.

## 8. Veterinaria

**Vende:** cosas **y** tiempo · **Patrón:** cuidado · **Modalidad:** WhatsApp

El rubro que valida el modelo entero. Cuatro categorías de cosas y tres de
tiempo, en el mismo catálogo.

| Categoría | Icono | Vende |
|---|---|---|
| Alimento | `hueso` | cosas |
| Higiene y cuidado | `tina` | cosas |
| Medicamentos | `pastilla` | cosas |
| Accesorios | `perro` | cosas |
| **Consultas** | `estetoscopio` | **tiempo** |
| **Vacunación** | `jeringa` | **tiempo** |
| **Baño y peluquería** | `tijeras` | **tiempo** |

**Campos de «Alimento»:**

| Campo | Tipo | Detalle |
|---|---|---|
| Para | opción | Perro · Gato · Otro. En tarjeta |
| Etapa | opción | Cachorro · Adulto · Senior. En tarjeta |
| Peso | número | kg. En tarjeta |
| Raza | opción | Pequeña · Mediana · Grande |

**Campos de «Consultas»:**

| Campo | Tipo | Detalle |
|---|---|---|
| Duración | número | minutos. En tarjeta |
| Atiende | opción | Perros · Gatos · Todos. En tarjeta |
| A domicilio | sí/no | En tarjeta |

**Agenda de «Consultas»:**

```
Duración: 30 minutos
Cupo por franja: 2          (dos consultorios)
Anticipación mínima: 2 horas
Atiende hasta: 30 días adelante

Lunes a viernes: 08:30–12:00 y 14:30–18:30
Sábado: 09:00–13:00
```

Un alimento de 15 kg y una consulta de las 10:00 conviven en el mismo catálogo,
en el mismo carrito de WhatsApp, y el resumen los muestra a los dos.

## 9. Cómo se guarda la siembra

En `lib/rubros/siembra/`, un archivo por rubro, exportando datos y no código:

```ts
export const FERRETERIA: SiembraDeRubro = {
  rubro: "ferreteria",
  patron: "herramientas",
  paletaSugerida: "tierra",
  modalidadSugerida: "catalogo_cta",
  categorias: [
    { nombre: "Eléctrico e iluminación", icono: "foco", vende: "cosas",
      atributos: [
        { clave: "potencia", nombre: "Potencia", tipo: "numero", unidad: "W", enTarjeta: true },
        { clave: "casquillo", nombre: "Casquillo", tipo: "opcion",
          opciones: ["E27", "E14", "GU10", "B22", "G9"], enTarjeta: true },
      ] },
  ],
};
```

Son datos, no migraciones: la siembra corre desde el servidor al elegir el rubro,
no al desplegar. Ponerla en una migración obligaría a desplegar la base cada vez
que se corrige un nombre de categoría.

Una prueba recorre las seis siembras y verifica que cada icono exista en el juego
de Lucide, que ninguna categoría pase de 10 campos ni de 6 en tarjeta, que las
claves cumplan el formato, y que todo campo de tipo `opcion` traiga entre 2 y 24
opciones. Es barato y evita descubrir un icono mal escrito recién cuando un
cliente elige ese rubro.
