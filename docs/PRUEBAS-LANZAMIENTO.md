# Pruebas antes del lanzamiento

Escrito el 2026-09-06. **Lo que hay acá es lo que yo no puedo verificar.**

Yo pruebo por API y por HTML servido: eso demuestra que la lógica funciona, no
que el botón se vea, ni que entre en la pantalla de un celular, ni que se
entienda sin explicación. Todo lo de esta lista necesita ojos y un pulgar.

Probá **desde el celular**, que es donde va a estar el 95 % de tu gente. Cuando
algo falle, anotá: qué tocaste, qué esperabas y qué pasó. Con eso alcanza.

Dirección de pruebas: `https://mipuesto-dev.mipuesto-app.workers.dev`

---

## Antes de empezar

Necesitás dos negocios distintos para las pruebas de aislamiento, y **no uses el
piloto real para romper cosas**. Sabor Camba quedó configurado como tienda
virtual, rubro restaurante, siempre abierto y con número de mesa activado.

---

## 1. Alta de un negocio nuevo — 20 min

| # | Qué hacer | Qué tiene que pasar |
|---|---|---|
| 1.1 | Crear cuenta con un correo tuyo | Llega el correo. **Si cae en spam, anotalo**: es el motivo por el que hace falta el dominio |
| 1.2 | Completar nombre, dirección web, descripción | La dirección avisa en el momento si está ocupada |
| 1.3 | Probar la dirección `plataforma`, `directorio`, `login`, `t` | Las cuatro se rechazan por reservadas |
| 1.4 | Elegir modalidad y rubro | Al elegir **Restaurante** aparece «Pedir el número de mesa». Con otro rubro, no |
| 1.5 | Elegir ciudad y escribir la zona | Se guarda. Ciudad es lista, zona es texto libre |
| 1.6 | Guardar y volver a entrar | Todo quedó como lo dejaste |

## 2. Catálogo — 40 min, es la parte que más se usa

| # | Qué hacer | Qué tiene que pasar |
|---|---|---|
| 2.1 | Crear 3 categorías y 1 subcategoría | Aparecen en orden |
| 2.2 | Cargar 10 productos con foto desde el celular | La foto se comprime sola. **Cronometrá cuánto tarda cada una** |
| 2.3 | Cargar un producto con 4 fotos | Al llegar a 4 no deja subir más |
| 2.4 | Intentar subir una foto de más de 5 MB | Avisa con un mensaje entendible |
| 2.5 | Editar precio, nombre y descripción | Se guarda sin recargar |
| 2.6 | Marcar «Agotado» y después «Hay de nuevo» | Cambia en un toque, sin abrir el formulario |
| 2.7 | Ocultar y mostrar un producto | Desaparece y vuelve en el catálogo público |
| 2.8 | **Duplicar** un producto | La copia trae **todo**, incluidas las fotos, y se puede editar |
| 2.9 | Buscar un producto por nombre con acento y sin acento | Encuentra las dos veces |
| 2.10 | Cambiar precios en lote por categoría | Cambian solo los de esa categoría |

## 3. Papelera — 15 min, es nueva y nadie la usó

| # | Qué hacer | Qué tiene que pasar |
|---|---|---|
| 3.1 | Borrar un producto **con fotos** | El aviso dice que va a la papelera 30 días, **no** «no se puede deshacer» |
| 3.2 | Mirar el encabezado del catálogo | Aparece «Papelera (1)». Con la papelera vacía, el enlace **no** aparece |
| 3.3 | Abrir la papelera | Se ve el producto, su foto, su precio y «Quedan 30 días para recuperarlo» |
| 3.4 | **Recuperar** el producto | Vuelve al catálogo **con sus fotos**, y el enlace de la papelera desaparece |
| 3.5 | Borrarlo otra vez y usar «Borrar ya» | Pide confirmación. Después ya no está en ninguna parte |
| 3.6 | Con un producto en la papelera, abrir el catálogo público | No se ve por ningún lado |
| 3.7 | Borrar un producto y revisar el límite del plan | El borrado **no** cuenta contra tu límite de productos |

## 4. Apariencia — 20 min

| # | Qué hacer | Qué tiene que pasar |
|---|---|---|
| 4.1 | Probar las **4 plantillas**, una por una | Cada una cambia de verdad, no solo de color |
| 4.2 | Probar las **7 paletas** en cada plantilla | 28 combinaciones. Ninguna deja texto ilegible |
| 4.3 | Subir logo y portada | Se ven bien recortados, no estirados |
| 4.4 | Guardar y abrir el catálogo público **en otro teléfono** | El cambio se ve enseguida, no a los cinco minutos |
| 4.5 | Cargar el QR de cobro | Se ve al confirmar un pedido y se puede descargar |

## 5. Carta del día y menú impreso — 15 min

| # | Qué hacer | Qué tiene que pasar |
|---|---|---|
| 5.1 | En un producto, tocar «Poner en hoy» | Avisa que se quita solo a la medianoche |
| 5.2 | Abrir el catálogo público | Aparece una sección **«Hoy» arriba de todo** |
| 5.3 | Buscar ese producto en su categoría de siempre | **No está repetido**: salió de su categoría |
| 5.4 | Tocar «Sacar de hoy» | Vuelve a su categoría |
| 5.5 | Abrir «Menú para imprimir» | Lista con precios, guía de puntos y la fecha de hoy |
| 5.6 | Imprimir o «Guardar como PDF» | Ninguna categoría se parte entre dos hojas. **Sin fotos ni colores** |
| 5.7 | Cambiar el rubro a Barbería | «Poner en hoy» y «Menú para imprimir» desaparecen, **y ningún dato se pierde** |

## 6. Horarios y promociones — 30 min, es la parte del dinero

| # | Qué hacer | Qué tiene que pasar |
|---|---|---|
| 6.1 | Crear una promoción de 20 % sobre un producto, sin horario | El catálogo muestra el precio tachado y el nuevo |
| 6.2 | Agregarle una ventana **que incluya la hora actual** | Sigue con descuento |
| 6.3 | Cambiarla a una ventana **que no incluya ahora** | Vuelve al precio lleno, y la promoción dice **«Espera su horario»**, no «Revisar» |
| 6.4 | Crear una de 22:00 a 02:00 solo viernes | Se acepta. La tarjeta muestra «De 22:00 a 02:00 · Vie» |
| 6.5 | Poner solo la hora de inicio | Avisa que faltan las dos |
| 6.6 | **Con descuento activo, hacer un pedido de verdad** | El total del pedido es **el mismo número** que muestra el catálogo |
| 6.7 | Pausar y reactivar una promoción | El precio cambia enseguida en el catálogo |
| 6.8 | Configurar horario de atención y probar fuera de él | Se puede mirar, no se puede pedir |

## 7. Pedidos, como comprador — 30 min

Hacelo desde otro teléfono, **sin sesión iniciada**, como un cliente cualquiera.

| # | Qué hacer | Qué tiene que pasar |
|---|---|---|
| 7.1 | Agregar 3 productos al carrito | La cuenta y el total dan bien |
| 7.2 | Navegar entre categorías y volver | **El carrito no se vacía** |
| 7.3 | Cerrar la pestaña y volver a abrir el catálogo | El carrito sigue ahí |
| 7.4 | Confirmar el pedido con número de mesa «Terraza» | Sale el código de reserva |
| 7.5 | Mirar el mensaje de WhatsApp que se abre | Dice **«Mesa: Terraza.»** antes del detalle |
| 7.6 | Mirar el pedido en tu panel | La mesa aparece en la primera línea |
| 7.7 | Pedir un producto con stock 2, pidiendo 3 | Avisa que no alcanza |
| 7.8 | Hacer **6 pedidos seguidos** desde el mismo teléfono | El sexto se rechaza por límite. **Esto es lo correcto** |
| 7.9 | Confirmar la venta desde el panel | El stock baja y el pedido cambia de estado |
| 7.10 | Dejar vencer una reserva sin confirmar | A los 45 min el stock vuelve solo |
| 7.11 | Después de pedir, buscar el enlace de Google | Aparece si cargaste el enlace de reseñas |

## 8. Etiquetas NFC y directorio — 15 min

| # | Qué hacer | Qué tiene que pasar |
|---|---|---|
| 8.1 | En la plataforma, crear una etiqueta | Sale un código de 6 caracteres, sin vocales ni O/0 |
| 8.2 | Apuntarla a un negocio y abrir `/t/CODIGO` | Lleva al catálogo de ese negocio |
| 8.3 | Reapuntarla a otro negocio y volver a abrirla | Ahora lleva al otro. **El código no cambió** |
| 8.4 | Dejarla «Sin asignar» y abrirla | Página de no encontrado |
| 8.5 | Abrir `/directorio` y filtrar por tu ciudad | Solo salen los de esa ciudad, con su zona |
| 8.6 | Copiar el enlace filtrado y abrirlo en otro teléfono | Llega ya filtrado |

## 9. Plataforma — 20 min, con la cuenta de administrador

| # | Qué hacer | Qué tiene que pasar |
|---|---|---|
| 9.1 | Entrar a `/plataforma` con tu cuenta común (no admin) | Dice que la página no está disponible. **No** «prohibido» |
| 9.2 | Entrar con la cuenta de administrador | Pide el código del autenticador |
| 9.3 | Escribir un código equivocado | Avisa y deja reintentar |
| 9.4 | Ver la lista de negocios | Ordenada por urgencia, no por fecha |
| 9.5 | Dar de baja un negocio | Su catálogo público deja de abrirse |
| 9.6 | Volver a publicarlo | Vuelve a abrirse |
| 9.7 | Renovar una suscripción | La fecha suma al final del período, no desde hoy |
| 9.8 | Invitar a un negocio nuevo por correo | Llega la invitación |
| 9.9 | Quedarte 20 minutos en la pantalla y después actuar | **No te echa al ingreso** |

## 10. Aislamiento — 10 min, la prueba que más importa

Con dos negocios distintos y dos cuentas distintas.

| # | Qué hacer | Qué tiene que pasar |
|---|---|---|
| 10.1 | Con la cuenta A, mirar el panel | Solo se ven los productos y pedidos de A |
| 10.2 | Copiar la dirección de un producto de B y abrirla en el panel de A | No se puede editar |
| 10.3 | Ver las estadísticas de A | Solo cuentan visitas de A |

*Ya está cubierto por una prueba automática que corre contra la base. Esto es
para confirmar que la pantalla no filtra nada por otro camino.*

## 11. Lo que se ve mal, que no es un error pero pierde ventas

Anotá cualquier cosa de esta lista:

- Texto que se corta o se sale de la pantalla en un celular chico.
- Botones a los que no le llega el pulgar, o dos botones tan juntos que se toca el equivocado.
- Fotos que tardan tanto que uno se cansa de esperar.
- Cualquier palabra que un comerciante no entendería: «plantilla», «modalidad», «slug».
- Pantallas donde no se sabe si algo se guardó o no.
- Cualquier lugar donde te preguntes «¿y ahora qué toco?».

---

## Lo que ya está verificado y no hace falta que pruebes

Para que no gastes tiempo: esto lo comprobé contra producción.

- Las siete cabeceras de seguridad, y que HTTPS se fuerza.
- Que las siete APIs de administración responden 401 sin sesión.
- Que un anónimo no puede leer pedidos, etiquetas, administradores, bitácora ni analítica.
- Que la analítica no se puede inundar ni escribir salteándose la ruta.
- Que el precio que muestra el catálogo y el que cobra el pedido coinciden, con y sin horario, incluida la ventana que cruza la medianoche.
- Que `/t/CODIGO` redirige y deja anotado el escaneo.
- Que un producto en la papelera no se puede pedir.
- Que el menú impreso sirve el catálogo con precios y fecha.

## Lo que sigue faltando y no depende de estas pruebas

- **El ensayo de restauración del respaldo.** Hasta que no se haga, «tenemos respaldos» es una creencia.
- **Las fotografías no se respaldan.** Va después del dominio.
- **El vigilante de `/api/salud` ya corre**, cada cinco minutos y desde Supabase. Falta decirle a dónde avisar: hasta entonces anota la caída y no la cuenta. Son tres minutos y están en `CONFIGURACION-MANUAL.md`.
- **El correo sale por Gmail.** Hasta el dominio, puede caer en spam.
