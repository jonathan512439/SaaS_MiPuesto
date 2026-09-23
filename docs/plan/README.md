# Plan de MiPuesto — catálogos por rubro

Este es el plan vigente. Reemplaza por completo al anterior, que se borró el
10 de septiembre de 2026.

## Qué cambió y por qué

El plan anterior partía de que el dueño del negocio arma su catálogo eligiendo
piezas: una plantilla entre cinco, una forma de tarjeta entre seis, una paleta
entre siete. Trescientas combinaciones posibles, y el dueño de una ferretería
decidiendo cuál de las cinco estructuras le queda mejor a un tornillo.

El plan nuevo invierte esa carga: **el rubro decide casi todo y el dueño
confirma**. Hay un solo diseño de catálogo —el que está en `Catalogos_Ejemplo/`—
y lo que cambia entre una veterinaria y una distribuidora no es la estructura de
la página, son sus categorías, sus campos y sus acciones.

## Orden de lectura

| Archivo | De qué trata |
|---|---|
| [`00-VISION.md`](00-VISION.md) | Qué se construye, qué se retira, qué queda intacto |
| [`01-MODELO-DE-DATOS.md`](01-MODELO-DE-DATOS.md) | Tablas, columnas, restricciones, migraciones |
| [`02-BACKEND-Y-API.md`](02-BACKEND-Y-API.md) | Endpoints, validación, IA, Google Places |
| [`03-FRONTEND.md`](03-FRONTEND.md) | Anatomía del catálogo, bloque por bloque |
| [`04-PANEL.md`](04-PANEL.md) | El alta guiada y las siete correcciones de usabilidad |
| [`05-RUBROS.md`](05-RUBROS.md) | Los seis rubros con sus categorías y campos precargados |
| [`06-FASES.md`](06-FASES.md) | Doce fases con criterio de salida verificable |
| [`07-PRUEBAS.md`](07-PRUEBAS.md) | Qué se prueba, con qué, y las guardias del build |
| [`08-VOCABULARIO.md`](08-VOCABULARIO.md) | Cómo escribe el sistema. Lista de palabras prohibidas |
| [`09-DIRECTORIO-Y-FORMAS.md`](09-DIRECTORIO-Y-FORMAS.md) | Fases 10 a 12: tres formas de tarjeta, ubicación y rubro público, y el directorio buscable |

## Las reglas que no se rompen

1. **El rubro se elige una vez.** Cambiarlo borra el catálogo y empieza de cero.
2. **La categoría declara sus campos.** No hay atributos globales.
3. **Nada se muestra si no es cierto.** Ninguna calificación, cantidad ni reseña
   inventada aparece en pantalla.
4. **El aislamiento entre negocios lo sostiene el motor**, con clave foránea
   compuesta `(id, negocio_id)`. Nunca un disparador, nunca la aplicación.
5. **Cada fase se despliega a producción** antes de empezar la siguiente.
