# Plan MiPuesto v3 — catálogos por rubro

Este directorio **reemplaza** al planning anterior. El plan v2 (`planning-mipuesto-v2.md`)
y el plan de crecimiento (`docs/PLAN-CRECIMIENTO.md`) se cerraron y se borraron: lo
que seguía valiendo de ellos está incorporado acá, con su motivo.

## Qué cambió, en una frase

El catálogo dejó de ser **una lista de productos con foto y precio** para pasar a ser
**un catálogo que se adapta al rubro**: campos propios, variantes con existencias,
filtros, agenda y precios por unidad de medida. La evidencia que motiva el cambio son
las 44 fichas de `Catalogos_Ejemplo/`, que son un documento de requisitos, no una
referencia visual.

## Orden de lectura

| # | Archivo | Para qué |
|---|---|---|
| 0 | [00-VISION.md](00-VISION.md) | Qué se construye, qué se descarta y con qué filtro se decide |
| 1 | [01-MODELO-DE-DATOS.md](01-MODELO-DE-DATOS.md) | El esquema completo, con SQL, integridad y RLS |
| 2 | [02-BACKEND-Y-API.md](02-BACKEND-Y-API.md) | Contratos, validación, límites, errores y el camino del dinero |
| 3 | [03-FRONTEND.md](03-FRONTEND.md) | Armazones, tarjetas, estado, rendimiento y accesibilidad |
| 4 | [04-FASES.md](04-FASES.md) | **Las diez fases**, con alcance, pruebas y criterio de aceptación |
| 5 | [05-PRUEBAS.md](05-PRUEBAS.md) | Estrategia de pruebas y guardias automáticas |
| 6 | [06-RUBROS.md](06-RUBROS.md) | Los 44 rubros, sus siete familias y sus presets |

Antes de escribir código: `AGENTS.md`, `DESIGN.md` y `SECURITY.md` siguen vigentes y
mandan sobre lo que diga cualquier archivo de este directorio en materia de
convenciones, dirección visual y seguridad.

## Regla de oro de este plan

> **Ninguna fase se da por cerrada sin que una persona haya abierto la pantalla en
> producción.** Escribir el código es la mitad del trabajo; la otra mitad es
> comprobar que hace lo que dice.
