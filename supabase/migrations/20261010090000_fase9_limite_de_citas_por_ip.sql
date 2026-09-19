-- Las citas públicas también se cuentan por huella de IP.
--
-- Los pedidos tenían tope desde la fase 6: cinco por negocio y por huella cada
-- quince minutos, contados en `limites_pedidos_ip` dentro de la misma función
-- que reserva. Las citas nacieron después, en la fase 5 del plan nuevo, y
-- **nadie les puso el mismo tope**: la auditoría previa al MVP lo encontró. Un
-- script con idempotencias distintas podía llenar la agenda de una peluquería
-- en un minuto, y una agenda llena es un negocio que no atiende.
--
-- Se reusa la tabla y la ventana de los pedidos, no se inventa otra: para el
-- negocio es la misma pregunta —«cuántas veces me está pidiendo algo esta
-- persona»— y un pedido y una cita desde el mismo teléfono se suman. La función
-- es la cuenta sola, sin la reserva, para que la ruta de citas la llame antes
-- de intentar insertar; devuelve cuántos intentos van en la ventana y la ruta
-- decide si ya son demasiados con el mismo número que los pedidos.
--
-- Cuenta el **intento**, no la cita lograda: contar solo las que entran dejaría
-- gratis el tanteo de horarios ocupados.
create or replace function public.contar_intento_publico(
  p_negocio_id uuid,
  p_huella_ip text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cantidad integer;
begin
  if p_negocio_id is null then
    raise exception using errcode = 'P0001', message = 'NEGOCIO_INVALIDO';
  end if;
  if p_huella_ip is null or p_huella_ip !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'P0001', message = 'HUELLA_INVALIDA';
  end if;

  insert into public.limites_pedidos_ip as limite (
    negocio_id, huella_ip, ventana_inicio, cantidad
  ) values (
    p_negocio_id, p_huella_ip, now(), 1
  )
  on conflict (negocio_id, huella_ip) do update
  set
    ventana_inicio = case
      when limite.ventana_inicio <= now() - interval '15 minutes' then now()
      else limite.ventana_inicio
    end,
    cantidad = case
      when limite.ventana_inicio <= now() - interval '15 minutes' then 1
      else limite.cantidad + 1
    end
  returning cantidad into v_cantidad;

  return v_cantidad;
end;
$$;

comment on function public.contar_intento_publico(uuid, text) is
  'Suma un intento público (pedido o cita) del negocio para esa huella de IP y devuelve cuántos van en la ventana de quince minutos. La ruta decide el tope.';

-- Solo el servidor, con la clave de servicio: la huella la calcula él con un
-- secreto que el navegador no tiene, y un visitante no tiene por qué poder
-- contar intentos ajenos.
revoke all on function public.contar_intento_publico(uuid, text) from public, anon, authenticated;
grant execute on function public.contar_intento_publico(uuid, text) to service_role;
