# Políticas RLS y cobertura de pruebas

MiPuesto es multi-tenant. La autorización definitiva vive en PostgreSQL; las comprobaciones de interfaz y servidor son capas adicionales, no sustitutos de RLS.

| Tabla | Acceso público | Acceso de administrador | Cobertura |
|---|---|---|---|
| `negocios` | Solo negocios activos, sin `admin_user_id`. | Solo su propio negocio; crea uno vinculado a `auth.uid()`. | `test-rls-multitenant.mjs` bloquea lectura, actualización y borrado ajenos. |
| `categorias` | Solo si pertenecen a un negocio activo. | Solo las de su negocio. | La prueba bloquea CRUD contra la categoría de B. |
| `subcategorias` | Solo si su categoría pertenece a un negocio activo. | Solo las derivadas de categorías propias. | La prueba bloquea CRUD contra la subcategoría de B. |
| `productos` | Solo visibles y de negocio activo. | Solo los de su negocio. | La prueba bloquea CRUD contra el producto de B. |
| `promociones` | Solo activas, vigentes y de negocio activo. | Solo las de su negocio. | La prueba bloquea CRUD contra la promoción de B. |
| `pedidos` | Sin lectura pública. | Solo los de su negocio. | La prueba bloquea CRUD contra el pedido de B. |
| `eventos_analitica` | Inserción anónima limitada a negocios activos; sin lectura pública. | Solo los de su negocio. | La prueba bloquea CRUD contra el evento de B. |

## Slugs

`public.slug_disponible(text)` es una función `SECURITY DEFINER` mínima: recibe un slug y devuelve solamente un booleano. Exige `auth.uid()`, no expone filas, ids ni propietarios, no puede ser ejecutada por `anon` y permite que un administrador conserve su propio slug al editar. Sus restricciones también existen en `negocios`: formato, longitud, lista reservada y un administrador por negocio.

## Cómo ejecutar la auditoría

```powershell
npm run test:rls:linked
```

El comando primero verifica estructura, permisos y seed; después crea dos usuarios temporales confirmados con su negocio y datos en las siete tablas. La CLI autenticada obtiene la clave administrativa únicamente en memoria, revoca las sesiones temporales y elimina sus filas antes de terminar. No se guarda ninguna clave en el repositorio ni en `.env.local`.
