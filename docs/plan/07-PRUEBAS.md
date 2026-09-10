# 07 · Pruebas

## 1. La lección que ordena este documento

Durante la Fase 0, dos guardias escritas a mano rechazaron restauraciones
correctas: una exigía «al menos 20 políticas RLS» cuando hay 18, y otra exigía
que `anon` pudiera leer `negocios` cuando en realidad lee por columna. Las dos
afirmaban hechos sobre el sistema **escritos por mí, no leídos del sistema**, y
cada cambio legítimo las volvía falsas.

De ahí sale la regla que gobierna todo lo que sigue:

> **Una prueba compara contra algo generado o contra un comportamiento
> observable. No afirma un número que alguien escribió a mano.**

Con una salvedad que también se aprendió ahí: una comparación contra un
generador es ciega a lo que el generador no ve. Por eso al lado de cada
comparación va **una prueba de comportamiento**.

## 2. Las capas

| Capa | Con qué | Cuándo corre | Qué prueba |
|---|---|---|---|
| Unitaria | Vitest | Cada `npm test` | Validadores, cálculos, formato |
| Estructural | SQL contra el proyecto | Antes de desplegar | Que la base sea como dice el plan |
| Aislamiento | `test-rls-multitenant.mjs` | Antes de desplegar | Que un negocio no vea a otro |
| Concurrencia | Node contra base real | Fase 5 y después | Que dos citas no ganen la misma hora |
| Guardias | Scripts en `prebuild` | Cada build | Secretos, tokens, contraste, tareas, vocabulario |
| A mano | Un teléfono | Cierre de cada fase | Que se pueda usar |

## 3. Pruebas unitarias nuevas

Todas sobre funciones puras. Sin base, sin red, sin reloj.

| Archivo | Casos que no pueden faltar |
|---|---|
| `lib/catalogo/atributos.test.ts` | Los 4 tipos; `opcion` sin opciones; `unidad` fuera de `numero`; clave repetida; clave con mayúsculas; campo 11; séptimo en tarjeta |
| `lib/catalogo/valores.test.ts` | Valor fuera de las opciones; texto donde va número; número negativo; obligatorio vacío; llave que no existe en la categoría |
| `lib/catalogo/variantes.test.ts` | Precio nulo hereda; nombre repetido; stock mayor que el del producto; variante en categoría de tiempo |
| `lib/agenda/franjas.test.ts` | Franja invertida; dos que se solapan el mismo día; día fuera de 0–6 |
| `lib/agenda/horarios.test.ts` | Duración que no divide la franja; turno que cruza el mediodía; anticipación mínima; día sin franjas; cupo parcialmente tomado |
| `lib/negocios/slug.test.ts` | Tildes; ñ; símbolos; espacios dobles; palabra reservada; nombre repetido |
| `lib/negocios/maps.test.ts` | Enlace corto; enlace largo; enlace que no es de Maps; ficha sin calificación |
| `lib/rubros/siembra.test.ts` | **Las seis siembras**: iconos que existen, topes, claves, opciones entre 2 y 24 |

`lib/agenda/horarios.test.ts` es el más importante del proyecto después de los de
aislamiento. La fecha entra como parámetro, así que el cambio de horario, el
feriado y el turno de las 23:30 se prueban sin montar nada y sin esperar.

## 4. La prueba de concurrencia

No es opcional y no se puede reemplazar con una unitaria.

```
1. Crear una categoría de tiempo con cupo 1.
2. Disparar N inserciones simultáneas del mismo horario.
3. Verificar: exactamente 1 confirmada, N-1 con error de exclusión.
4. Repetir con cupo 2: exactamente 2 confirmadas.
5. Cancelar una y repetir: el cupo se libera.
```

Corre contra el proyecto de ensayo, que ya existe (`ENSAYO_DB_URL`, con la
validación que se niega a apuntar a producción).

**Por qué contra base real:** la garantía la da la restricción de exclusión de
Postgres. Simularla en memoria probaría el simulacro, no el sistema.

## 5. Pruebas estructurales

En `supabase/tests/remote/`, siguiendo el estilo de las auditorías que ya
existen. Verifican **lo que se puede leer de la base**, no lo que alguien
recuerda:

- Toda tabla con `negocio_id` tiene RLS activo.
- Toda clave foránea hacia una tabla con dueño es **compuesta**. Se lee de
  `pg_constraint`, no de una lista.
- Toda columna nueva tiene `grant` para los tres roles.
- `citas` tiene su restricción de exclusión y `btree_gist` está instalada.
- Ninguna función `security definer` sin `set search_path = ''`.

La segunda es la que más vale. Se consulta el catálogo del sistema y se compara
contra sí mismo: si mañana alguien agrega una tabla con clave simple, la prueba
falla sin que nadie la haya actualizado.

## 6. Guardias del build

| Guardia | Estado |
|---|---|
| `check-client-secrets.mjs` | Existe. Cubre `GOOGLE_PLACES_API_KEY` sin cambios |
| `check-repository-secrets.mjs` | Existe |
| `check-design-tokens.mjs` | Existe |
| `check-design-contrast.mjs` | **Se amplía**: las 10 paletas en cabecera, fondo y tarjeta |
| `check-tareas-programadas.mjs` | Existe. Cubre la tarea semanal de Maps |
| `check-vocabulario.mjs` | **Nuevo**. Fase 9 |

La ampliación de contraste es la única que cambia, y cambia de la manera
correcta: **recorre las paletas declaradas** en vez de tener escrita una lista.
Agregar una paleta undécima la incluye sola.

## 7. Qué se prueba a mano, y con qué

Al cerrar cada fase, en un teléfono real y con datos móviles:

| Fase | Qué se hace |
|---|---|
| 1 | Crear una categoría, elegir su icono, ocultarla |
| 2 | Definir cinco campos e intentar el once |
| 3 | Cargar un producto y **mandarse el pedido por WhatsApp** |
| 4 | Comprar una talla que queda con stock 1 |
| 5 | **Dos teléfonos pidiendo el mismo horario al mismo tiempo** |
| 6 | Abrir los seis catálogos y compararlos |
| 7 | Cambiar paleta, subir banner, activar Google |
| 8 | Darse de alta desde cero, cronometrado |
| 9 | Abrir un QR impreso viejo y ver que sigue llevando al catálogo |

La de la Fase 5 se hace con dos teléfonos de verdad, no con dos pestañas: el
punto es que las dos peticiones salgan sin coordinación.

## 8. Qué no se prueba

Escrito para que nadie lo agregue por costumbre:

- **No se prueba que Google responda.** Se prueba que el sistema funcione cuando
  no responde.
- **No se prueban las pantallas píxel por píxel.** Se prueba el contraste, que es
  lo que se puede afirmar sin que una fuente distinta lo invalide.
- **No se prueba que la IA extraiga bien.** Se prueba que lo que devuelve se
  valide antes de escribirse, y que el informe de cobertura cuente bien.

## 9. El estado hoy

461 pruebas pasando. El plan agrega alrededor de 120. Ninguna fase se cierra con
pruebas en rojo, y ninguna se cierra desactivando una prueba: si una prueba
molesta, o el código está mal o la prueba afirmaba un hecho escrito a mano —y ese
segundo caso se arregla cambiando la prueba por una comparación, no borrándola.
