# 05 — Pruebas, guardias y calidad

## 1. La premisa

No hay QA. No hay revisor. **Las pruebas son el único mecanismo de verificación que existe
en este proyecto**, y por eso no son negociables ni «para después».

Eso no significa cubrirlo todo: significa cubrir bien **lo que duele**. Este documento
dice qué duele y con qué se cubre.

## 2. Las cinco capas

```
┌─ 5. Piloto ────────────── una semana, un negocio real, sin tocar la base
├─ 4. Manual ────────────── checklist en producción, antes de cerrar cada fase
├─ 3. Base ──────────────── SQL contra la base enlazada y la de ensayo
├─ 2. Guardias ──────────── scripts que fallan el build
└─ 1. Unitaria ──────────── vitest, funciones puras, sin red ni base
```

Cada capa atrapa lo que la de abajo no puede. Ninguna reemplaza a otra.

## 3. Capa 1 — Unitaria

**Qué va acá:** toda función pura. Precios, validación, firmas, horarios, filtros,
disponibilidad, importación.

**Qué no va:** nada que necesite base o red. Si una función necesita la base para
probarse, casi siempre está mal partida — ese fue el motivo por el que
`lib/ia/archivos.ts` se separó de `servidor.ts`.

### Lo que este plan agrega

| Archivo | Qué prueba |
|---|---|
| `lib/catalogo/campos.test.ts` | Definiciones, tipos, techos, valores fuera de lista |
| `lib/catalogo/variantes.test.ts` | Ejes, matriz, opciones contra ejes, tope de 50 |
| `lib/precios.test.ts` *(crece)* | **Las tres reglas del orden de resolución**, escalas, modificadores, paso y mínimo |
| `lib/carrito/firma.test.ts` | `firmaLinea` separa y funde correctamente |
| `lib/agenda/disponibilidad.test.ts` | Franjas, horarios heredados, feriados, duración |
| `lib/agenda/validacion.test.ts` | Turno en el pasado, fuera de horario, sobre el cierre |
| `lib/rubros/presets.test.ts` | Los 44 presets cumplen los topes y apuntan a combinaciones válidas |
| `lib/apariencia.test.ts` | Armazones, tarjetas y sus combinaciones válidas |

### Las pruebas que se escriben antes que el código

Tres, y son las tres donde un error se descubre tarde y caro:

1. **`resolverPrecio`** — se escriben los casos del orden de resolución, con los nombres
   textuales de `04-FASES.md` fase 5, y recién después la función.
2. **`firmaLinea`** — la identidad de una línea del carrito. El error de fundir dos tallas
   distintas se ve en el pedido de un cliente, no en la pantalla.
3. **`disponibilidad_recurso`** — la parte pura del cálculo de franjas. Un error acá
   entrega un turno a dos personas.

## 4. Capa 2 — Guardias

Scripts que **fallan el build**. Un control que no falla no controla.

| Guardia | Qué evita | Estado |
|---|---|---|
| `check-client-secrets.mjs` | Un secreto de servidor en el paquete del navegador | Existe |
| `check-design-tokens.mjs` | Color, tamaño o espaciado escrito a mano | Existe |
| `check-design-contrast.mjs` | Una plantilla o paleta a medias en alguno de sus cuatro sitios | Existe, **se extiende** a 6 armazones y 6 tarjetas |
| `check-repository-secrets.mjs` | Un secreto en un archivo versionado | Existe |
| **`check-rubros.mjs`** | Un rubro a medias: sin preset, sin familia, sin baldosa o sin `check` en la base | **Nuevo, fase 7** |
| **`check-peso-cliente.mjs`** | Que el paquete del catálogo público pase los 90 KB | **Nuevo, fase 9** |
| **`check-columnas.mjs`** | Un `select *` o una lista de columnas escrita fuera de `columnas.ts` | **Nuevo, fase 2** |

### Por qué `check-columnas.mjs`

Con atributos y variantes, una columna de más en la consulta pública es un dato del
negocio servido en el HTML a cualquiera. Hoy las listas están centralizadas por
convención; a partir de la fase 2 lo están por guardia.

### La lección que estas guardias ya enseñaron

Tres errores reales del proyecto vinieron de un control mal hecho, no de la falta de
control:

- Un bucle que revocaba permisos **y no revocaba nada**, porque el rol no era el dueño.
  Se borró en vez de dejarlo: un control que no controla es peor que ninguno.
- Una lista de tareas vigiladas que **no incluía a las dos tareas del vigilante**.
- Un control de tokens que rechazaba `calc(var(--spacing-1) * -1)`, legítimo.

**Toda guardia nueva se prueba rompiéndola a propósito** antes de darla por hecha. Es un
paso del criterio de aceptación, no una buena costumbre.

## 5. Capa 3 — Base

### Los tres comandos

```
npm run test:rls              # local, con Docker
npm run test:rls:linked       # estructura + aislamiento, contra la base real
npm run test:rls:ensayo       # lo mismo, contra la base de ensayo   [fase 0]
```

`test:rls:linked` se corre **al cierre de cada fase, sin excepción**. Ya es regla vigente.

### Archivos nuevos, uno por fase

```
supabase/tests/remote/
  fase1-tarjetas.sql        cada negocio conserva su aspecto tras la migración
  fase2-campos.sql          topes, borrado no destructivo, clave compuesta
  fase3-variantes.sql       una sola fuente de stock, tope 50, expiración
  fase4-consulta.sql        filtros, facetas, ocultos y papelera
  fase5-precios.sql         total del servidor gana, bitácora de diferencia
  fase6-agenda.sql          exclusión, conteo, anon no lee turnos
  fase7-presets.sql         idempotencia y no destrucción
  fase8-logistica.sql       costo de entrega, relaciones, topes de fotos
  fase9-endurecimiento.sql  topes contra la clave privilegiada
```

### Las dos pruebas de concurrencia

Son distintas de todo lo demás y por eso van aparte: necesitan **dos sesiones
simultáneas** y por eso corren con un script de Node, no con un `.sql`.

```
scripts/test-concurrencia.mjs   [fase 3]
```

| Escenario | Resultado esperado |
|---|---|
| Dos pedidos por la última talla 40, al mismo tiempo | Uno crea el pedido; el otro recibe un error de existencias. Nunca los dos |
| Dos reservas por el último lugar de un tour de 12 | Igual |

Corren **contra la base de ensayo**, nunca contra producción, y su resultado se anota en
`docs/AVANCE.md` con la fecha. Sin esa anotación la fase no cierra.

## 6. Capa 4 — Manual

`docs/PRUEBAS-LANZAMIENTO.md` es el checklist y se reescribe en la fase 9. Hasta entonces
crece con cada fase.

**La regla que no se afloja:** ninguna fase se cierra sin que **una persona** haya abierto
la pantalla **en producción**, en un teléfono real. Ya hubo un momento en este proyecto en
que ninguna de las pantallas construidas en cinco días había sido abierta por nadie, y de
ahí salieron cuatro correcciones que ninguna prueba automática habría encontrado: un
carrito que no se vaciaba, botones que parecían texto, un aviso que faltaba.

Lo que solo encuentra una persona:

- Un botón que parece texto
- Un flujo que técnicamente funciona y no se entiende
- Un mensaje de error que dice la verdad y no ayuda
- Algo que se ve bien en el navegador de escritorio y mal con el pulgar al sol

## 7. Capa 5 — Piloto

Un negocio real, una semana, sin que nadie toque la base a mano. Es el criterio de salida
de la fase 9 y de todo el plan.

Qué se mira durante esa semana:

| Señal | Dónde |
|---|---|
| Errores del servidor | `/api/salud` y el vigilante de ntfy |
| Pedidos que no llegaron a WhatsApp | Comparación entre `pedidos` y lo que dice el dueño |
| Reservas que expiraron sin devolver stock | Consulta directa |
| Preguntas del dueño sobre cómo hacer algo | **Cada una es un defecto de interfaz**, y se anota |

La última fila es la más valiosa y la que más fácil se descarta.

## 8. Cobertura: lo que se mide y lo que no

**No hay meta de porcentaje.** Un porcentaje alto con las pruebas equivocadas es peor que
uno bajo con las correctas, porque da confianza falsa.

Lo que sí es obligatorio:

| Superficie | Cobertura exigida |
|---|---|
| `lib/precios.ts` | **Todas** las ramas. Es el camino del dinero |
| Validadores (`campos`, `variantes`, `agenda`) | Todo caso de rechazo tiene su prueba |
| Funciones `security definer` que escriben | Un caso feliz y un caso de rechazo por fila |
| Políticas RLS | Toda tabla nueva, en `test-rls-multitenant.mjs` |
| Componentes | **Ninguna prueba de render.** Se validan a mano y con el contraste |

La última fila es deliberada: probar que un componente dibuja lo que dibuja no atrapa
ningún error que este proyecto haya tenido, y cuesta mantenimiento en cada cambio visual.

## 9. Antes de dar algo por terminado

```
npm run typecheck
npm run lint
npm test                 # incluye contraste, tokens y, desde la fase 7, rubros
npm run build:vinext
npm run test:rls:linked  # al cierre de cada fase, sin excepción
```

Y después, siempre: **abrirlo en el teléfono**.

## 10. Trampas conocidas, que siguen vigentes

- `npm run supabase:push` aplica migraciones a la base real. `supabase:seed:local` es lo
  único que lleva `--include-seed`, y solo apunta a la local. **Nunca correr el seed
  contra la enlazada.**
- Antes de `npm run build:vinext`, cerrar cualquier `wrangler dev`: mantiene tomado
  `dist/client` y el build falla con `EBUSY`.
- Después de cualquier migración, `npm run types:db:linked`.
- Las herramientas automáticas de limpieza de CSS han destruido directivas `@reference`.
  Después de cualquier reorganización de hojas, verificar que las ocho la conserven.
