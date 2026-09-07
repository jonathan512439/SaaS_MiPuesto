-- El registro de llamadas se limpia solo.
--
-- Sirve para mirar ventanas de minutos y de días, así que una fila de hace un mes
-- no responde ninguna pregunta y sí ocupa lugar en una base con cuota. Treinta
-- días alcanzan para ver una tendencia y para reconstruir qué pasó en una
-- semana rara.
--
-- Viaja en la misma tarea que ya limpia la analítica vieja: una tarea más es un
-- horario más que vigilar.

create or replace function public.purgar_analitica_vieja(p_dias integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borrados integer;
begin
  delete from public.eventos_analitica
  where creado_en < now() - make_interval(days => p_dias);

  get diagnostics v_borrados = row_count;

  delete from public.limites_analitica_ip
  where ventana_inicio < now() - interval '1 day';

  delete from public.llamadas_ia
  where creado_en < now() - interval '30 days';

  return v_borrados;
end;
$$;

revoke all on function public.purgar_analitica_vieja(integer) from public, anon, authenticated;
