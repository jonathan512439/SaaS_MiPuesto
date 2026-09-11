-- La categoría toma identidad.
--
-- Hasta hoy una categoría era un nombre y un orden. Con el plan nuevo pasa a ser
-- la pieza que decide cómo se ve y cómo se vende lo que contiene:
--
--   icono   el dibujo de su esfera en el catálogo, y una de las piezas del
--           patrón del fondo. Es un nombre corto, no una imagen: el trazo vive
--           en `components/iconos/catalogo.ts`, generado y versionado.
--   visible si su esfera aparece en la navegación del catálogo. **No esconde
--           los productos**: es para el negocio con doce categorías que solo
--           quiere seis accesos rápidos arriba.
--   vende   `cosas` habilita variantes y existencias; `tiempo` habilitará
--           agenda y citas en la fase 5. Es la columna que separa una bolsa de
--           3 kg de un turno de las 10:00, que en el diseño de referencia
--           venían mezclados en el mismo campo.

alter table public.categorias
  add column if not exists icono text not null default 'caja',
  add column if not exists visible boolean not null default true,
  add column if not exists vende text not null default 'cosas';

-- El formato, no la lista. Cuáles íconos existen lo sabe el archivo generado, y
-- escribir acá los ciento y pico nombres obligaría a una migración cada vez que
-- se suma uno. La base garantiza que sea un nombre corto y sin sorpresas; que
-- exista lo garantiza el validador, que lee el mismo archivo que el dibujo.
alter table public.categorias
  add constraint categorias_icono_formato check (icono ~ '^[a-z][a-z0-9-]{1,39}$');

alter table public.categorias
  add constraint categorias_vende_valido check (vende in ('cosas', 'tiempo'));

-- El único compuesto es lo que va a permitir que `atributos_categoria` y
-- `agenda_categoria` apunten acá con clave foránea compuesta en las fases 2 y 5.
-- Es redundante con la clave primaria y es a propósito: sin él, una tabla hija
-- no puede exigirle al motor que el padre sea del mismo negocio, y el
-- aislamiento quedaría en manos de la aplicación.
alter table public.categorias
  add constraint categorias_id_negocio unique (id, negocio_id);

comment on column public.categorias.icono is
  'Nombre del ícono de su esfera. El trazo vive en components/iconos/catalogo.ts.';
comment on column public.categorias.visible is
  'Si su esfera aparece en la navegación del catálogo. No oculta los productos.';
comment on column public.categorias.vende is
  'cosas: variantes y existencias. tiempo: agenda y citas.';

-- Acá no van `grant` por columna, y conviene decir por qué para que nadie los
-- agregue por costumbre: `categorias` tiene los permisos **a nivel de tabla**
-- desde el esquema inicial (`grant select on table public.categorias to anon`),
-- así que las columnas nuevas quedan cubiertas solas.
--
-- Es distinto de `negocios`, que sí los tiene por columna y donde cada columna
-- nueva necesita los suyos. Escribirlos igual acá sumaría entradas de permiso
-- por columna encima de las de tabla, y el generador de permisos del respaldo
-- las reportaría como diferencia sin que nada haya cambiado de verdad.
