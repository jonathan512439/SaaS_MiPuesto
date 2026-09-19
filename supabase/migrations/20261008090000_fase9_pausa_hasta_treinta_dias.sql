-- Una pausa de reservas puede durar días; un turno, no.
--
-- `citas_rango_razonable` decía que ninguna cita dura más de ocho horas, y
-- tenía razón para lo que había cuando se escribió: un turno de más de ocho
-- horas no es un turno. Pero una pausa —«no atiendo hasta el lunes»— es una cita
-- sin producto que tiene que poder durar hasta treinta días, y la regla la
-- rechazaba con un error que la ruta escondía detrás de «No se pudo guardar el
-- turno». El dueño tocó «Pausar» y no pasó nada explicable.
--
-- La regla se parte en dos, según lo que la cita es. Lo que la distingue es el
-- producto: una cita con producto es algo que se vendió y dura lo que dura un
-- servicio; una sin producto es un bloqueo, y dura lo que el dueño diga, con un
-- techo para que un error no cierre un negocio por un año.
alter table public.citas
  drop constraint citas_rango_razonable;

alter table public.citas
  add constraint citas_rango_razonable
  check (
    upper(rango) - lower(rango) >= interval '5 minutes'
    and (
      (producto_id is not null and upper(rango) - lower(rango) <= interval '8 hours')
      or (producto_id is null and upper(rango) - lower(rango) <= interval '30 days')
    )
  );

comment on constraint citas_rango_razonable on public.citas is
  'Un turno dura hasta ocho horas; un bloqueo —sin producto— hasta treinta días.';
