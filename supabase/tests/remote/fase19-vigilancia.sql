-- Comprueba cuándo avisa el vigilante y cuándo se calla.
--
-- Corre dentro de una transacción que se deshace al final, así que vacía la
-- tabla para armar el escenario y la deja como estaba. Sin el `rollback`, esta
-- prueba borraría el historial real de mediciones.
--
-- Lo que se prueba es lo único que puede fallar en silencio: un vigilante que
-- avisa de más se silencia a la semana, y uno que avisa de menos no sirve para
-- nada. Las dos fallas se ven igual desde afuera —nadie recibe un mensaje— y
-- por eso hay que provocarlas.
--
-- Todo termina en una sola tabla porque el cliente muestra solo el último
-- resultado de un archivo: repartir las comprobaciones en varios `select` deja
-- todas menos una sin mirar.

begin;

create temp table comprobaciones (
  orden integer,
  caso text,
  obtenido text,
  esperado text
) on commit drop;

delete from public.vigilancia_salud;

insert into comprobaciones values
  (1, 'primera medición sana, sin historia',
   coalesce(public.registrar_medicion_salud(true, 'ok'), 'nada'), 'nada');
insert into comprobaciones values
  (2, 'primera falla: puede ser un tropiezo de red',
   coalesce(public.registrar_medicion_salud(false, 'sin_respuesta'), 'nada'), 'nada');
insert into comprobaciones values
  (3, 'segunda falla seguida: ahora sí es una caída',
   coalesce(public.registrar_medicion_salud(false, 'sin_respuesta'), 'nada'), 'caido');
insert into comprobaciones values
  (4, 'tercera falla: ya se avisó, no se repite',
   coalesce(public.registrar_medicion_salud(false, 'sin_respuesta'), 'nada'), 'nada');
insert into comprobaciones values
  (5, 'vuelve después de una caída avisada',
   coalesce(public.registrar_medicion_salud(true, 'ok'), 'nada'), 'recuperado');
insert into comprobaciones values
  (6, 'sigue sana: silencio',
   coalesce(public.registrar_medicion_salud(true, 'ok'), 'nada'), 'nada');

-- El caso que más ruido genera si está mal: una falla suelta entre dos
-- mediciones sanas no tiene que decir nada, ni la caída ni la vuelta.
delete from public.vigilancia_salud;

insert into comprobaciones values
  (7, 'tropiezo suelto: la sana previa', coalesce(public.registrar_medicion_salud(true, 'ok'), 'nada'), 'nada');
insert into comprobaciones values
  (8, 'tropiezo suelto: la falla', coalesce(public.registrar_medicion_salud(false, 'sin_respuesta'), 'nada'), 'nada');
insert into comprobaciones values
  (9, 'tropiezo suelto: vuelve sin haber avisado nada',
   coalesce(public.registrar_medicion_salud(true, 'ok'), 'nada'), 'nada');

-- La extensión que sale a la red no puede quedar al alcance de quien entra con
-- la clave del navegador.
--
-- Lo que se comprueba es que **no haya ninguna función http en un esquema que la
-- API exponga**, y no que `anon` no tenga el permiso: ese permiso lo otorga
-- `supabase_admin`, dueño de la extensión, y las migraciones corren como
-- `postgres`, que no puede revocarlo. La primera versión de esta prueba exigía
-- lo segundo, salió en rojo, y así se descubrió que el control que traía la
-- migración no hacía nada.
--
-- PostgREST expone `public` y `graphql_public`. Mientras nadie envuelva
-- `http_get` en una función de ahí, la única puerta es una conexión directa a la
-- base, que pide la contraseña del servidor y no la clave del navegador.
insert into comprobaciones
select
  10,
  'ninguna función http en un esquema expuesto por la API',
  count(*)::text,
  '0'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'graphql_public')
  and p.proname like 'http%';

-- Sin las tareas programadas el vigilante existe y no corre nunca, que es la
-- forma más tranquila de no vigilar nada.
insert into comprobaciones
select 11, 'las dos tareas están programadas', count(*)::text, '2'
from cron.job
where jobname in ('mipuesto-vigilar-salud', 'mipuesto-purgar-vigilancia');

-- La tabla no puede quedar legible para cualquiera con sesión.
insert into comprobaciones
select
  12,
  'la tabla exige ser admin de plataforma',
  case when relrowsecurity then 'con rls' else 'sin rls' end,
  'con rls'
from pg_class
where oid = 'public.vigilancia_salud'::regclass;

select
  orden,
  caso,
  obtenido,
  esperado,
  case when obtenido = esperado then 'PASA' else 'FALLA' end as resultado
from comprobaciones
order by orden;

rollback;
