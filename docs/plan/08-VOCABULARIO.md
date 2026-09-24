# 08 · Cómo escribe el sistema

Este archivo se edita a mano. La lista de la sección 4 está pensada para que el
dueño del proyecto la ajuste; se revisa entre las últimas fases.

## 1. La precisión que hay que hacer primero

El voseo **no es argentino**. Se usa en Bolivia, sobre todo en Santa Cruz, en
Tarija y en el oriente. «Elegí», «subí», «guardá» suenan naturales en el mercado
de Santa Cruz.

Lo que suena argentino es **el vocabulario**: «laburo», «plata», «che», «dale»,
«un toque», «quilombo». Y ciertos giros: «recién» de muletilla, «ahora sí» como
cierre, «te la hacés fácil».

Así que la corrección no es cambiar de pronombre. **El voseo se queda.** Lo que
se corrige es el léxico.

## 2. Lo que se encontró al revisar el código

Se escaneó `app/`, `components/` y `lib/` buscando jerga marcada. **Casi no hay**
—los aciertos de «plata» eran «plataforma»—.

Esto importa por dos razones. La primera: el trabajo de la Fase 9 es más chico de
lo que parecía, y es más de tono que de reemplazo. La segunda, para quien escriba
la guardia: **buscar «plata» dentro de una palabra da falsos positivos**. La
guardia tiene que buscar palabras completas, con límites, o va a rechazar builds
correctos. Ya nos pasó dos veces con guardias que afirmaban de más.

## 3. Las cuatro reglas

**1. Vos, siempre. Nunca usted.**

| Sí | No |
|---|---|
| Elegí tu rubro | Elija su rubro / Elige tu rubro |
| Subí tu logo | Suba su logo |
| Guardá los cambios | Guarde los cambios |

**2. La frase dice qué pasa, no qué siente el sistema.**

| Sí | No |
|---|---|
| Tu catálogo ya está publicado | ¡Genial! Tu catálogo está listo 🎉 |
| No se pudo subir la imagen | Ups, algo salió mal |
| Te faltan 3 cosas para publicar | Estás muy cerca de terminar |

**3. Cercano no es informal.** Se puede tutear con vos y ser preciso.

| Sí | No |
|---|---|
| Este rubro se elige una sola vez | Ojo que esto no lo podés cambiar después, eh |
| Revisá los campos marcados | Che, faltan datos |

**4. Palabras del negocio, no del sistema.** La tabla completa está en
[`04-PANEL.md`](04-PANEL.md), sección 3.7.

**5. Nada de tuteo.** Agregada el 2026-09-24. Durante unas semanas los textos
nuevos se escribieron con «elige», «tienes», «escríbenos» por una regla
equivocada, y quedaron mezclados con el voseo. Decisión del dueño del proyecto:
**español neutro, con vos y algo de jerga boliviana.** Se convirtieron 180
textos en 64 archivos.

| Sí | No |
|---|---|
| Elegí tu número | Elige tu número |
| Podés cancelarlo | Puedes cancelarlo |
| Escribinos | Escríbenos |
| Poné «Talla» | Pon «Talla» |

Ojo con lo que no es una orden: «Abre el lunes a las 09:00» habla del negocio,
y «el cliente elige» es tercera persona. Esas se quedan como están.

## 3 bis. La jerga boliviana que sí va

Poca y donde suma. No es para hacerse el gracioso: es hablar como habla el
mercado.

| Palabra | Qué es | Dónde se usa |
|---|---|---|
| casero, casera | El cliente de siempre | La portada («el celular de tus caseros»), los pedidos vacíos, las promociones |
| yapa | El extra de regalo | Las promociones vacías («la yapa que hace volver a tus caseros») |
| wawa | Bebé | La guía de juguetería («Para wawas») |

Y los nombres de siempre de la comida y los productos —salteña, silpancho, pique
macho, llajua, cuñapé, api—, que no son jerga: son lo que se vende.

## 4. Palabras prohibidas

Se buscan como palabra completa, sin distinguir mayúsculas ni tildes. **Están
prohibidas en texto visible; en comentarios de código, no.**

### Jerga rioplatense

```
che          dale         boludo       pibe         mina
guita        laburo       laburar      quilombo     posta
joya         copado       zafar        chamuyo      bardo
morfar       pilcha       bondi        birra        fiaca
```

### Muletillas y giros

```
un toque     al toque     ni ahí       de una       tal cual
obvio        básicamente  literal      re bueno     ahora sí
```

### Palabras que tienen un equivalente neutro

| Prohibida | Se usa |
|---|---|
| plata | dinero, monto, precio |
| celu | celular, teléfono |
| compu | computadora |
| foto de perfil | logo |
| tips | consejos |
| ok | listo, de acuerdo |
| link | enlace |
| upload / subir archivo | subir |
| loading | cargando |
| default | predeterminado |

### Tono que no va

```
ups          uy           genial       increíble    fantástico
wow          perfecto!    excelente!   felicitaciones
```

Los signos de exclamación no están prohibidos, pero se usan una vez por pantalla
como mucho. Un sistema que se entusiasma con cada guardado cansa en el segundo
día de uso.

## 5. La guardia

**Hecha el 2026-09-24.** `scripts/check-vocabulario.mjs`, dentro de `npm test`,
que corre también antes de cada publicación en Cloudflare. Probada rompiéndola
con «Elige otro filtro, che: tienes más pedidos»: marcó las tres cosas.

Cómo quedó, además de lo que decía el plan:

- **Tuteo, con tilde.** «vendes» es tuteo y «vendés» es voseo: la tilde es lo
  único que las separa, así que estas se comparan con tilde. La primera versión
  comparaba sin tildes y marcaba el voseo como error.
- **Imperativos de tú solo al comienzo de una frase** («Elige…»). A mitad de
  frase también cabe la tercera persona, así que no se rechazan:
  `npm run vocabulario:auditar` los lista para revisarlos a mano.
- **Muletillas que son español corriente** —«de una», «tal cual», «literal»—
  solo cuando van solas («¡De una!»): buscarlas en cualquier lugar marcaba «de
  una vez» y hasta «de uña».
- **Excepciones con motivo, por archivo:** «plata» cuando es el metal, «joya» y
  «birra» como palabras para buscar un ícono, `<Default>` del XML de Excel.

Lo que decía el plan antes de hacerla:

`scripts/check-vocabulario.mjs`, en el `prebuild`, junto a las otras cinco.

Qué revisa:

- Cadenas de texto en `.tsx` y `.ts` que llegan a la pantalla.
- Los `.md` de cara al usuario.

Qué **no** revisa:

- Comentarios de código.
- Nombres de variables y funciones.
- Los archivos de `docs/plan/`, que son para el equipo.

Cómo busca: palabra completa, con límites, sin tildes y sin distinguir
mayúsculas. Nunca por subcadena, por lo que dice la sección 2.

Cuando falla, dice el archivo, la línea, la palabra y el reemplazo sugerido. Una
guardia que solo dice «hay una palabra prohibida» obliga a buscarla a mano y
termina desactivada.

## 6. Ejemplos completos

**Alta, paso 2:**

```
Elegí qué vendés

Esto define las categorías y los datos que va a tener tu catálogo.

⚠  El rubro se elige una sola vez.
   Para cambiarlo hay que pedirlo al equipo de MiPuesto, y el catálogo
   se reinicia. Antes te vas a poder descargar todo en Excel.
```

**Después de importar:**

```
Listo, cargué 27 productos.

12 quedaron completos y 15 con datos faltantes.

No encontré:
  Existencias, en 27 productos
  Potencia, en 12

Podés completarlos ahora o dejarlo para después.
```

**Un error:**

```
No se pudo guardar

La categoría «Luces» ya tiene 10 campos, que es el máximo.
Borrá uno si querés agregar otro.
```

Los tres dicen qué pasó, qué significa y qué hacer. Ninguno se disculpa ni
festeja.
