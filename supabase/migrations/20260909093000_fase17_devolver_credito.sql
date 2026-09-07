-- Devolver un crédito cuando la lectura no llegó a hacerse.
--
-- El crédito se descuenta antes de llamar al modelo, porque contar y autorizar
-- tienen que ser una sola operación: comprobar el tope y después sumar deja una
-- ventana por la que se cuelan dos peticiones a la vez.
--
-- Pero si después el proveedor no responde, el dueño perdió una foto de su cupo
-- sin recibir nada. Eso se devuelve. Un cupo que se gasta en errores ajenos se
-- siente como una estafa aunque sean centavos.

create or replace function public.devolver_credito_ia(p_negocio_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mes date := (date_trunc('month', (now() at time zone 'America/La_Paz')))::date;
begin
  update public.uso_ia_negocio
  set cantidad = greatest(0, cantidad - 1)
  where negocio_id = p_negocio_id and mes = v_mes;
end;
$$;

revoke all on function public.devolver_credito_ia(uuid) from public, anon, authenticated;
grant execute on function public.devolver_credito_ia(uuid) to service_role;
