-- Los tutoriales de «Aprende»: los lee un dueño con sesión, los escribe la
-- plataforma y solo con segundo factor.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:tutoriales:ensayo
--
-- Un único bloque que deshace todo lo que escribe, también el administrador de
-- plataforma de prueba que da de alta.

do $prueba$
declare
  v_duenio uuid;
  v_admin uuid;
  v_vistos integer;
  v_cambiados integer;
  v_video text := '90-' || md5('tutorial de prueba') || '.mp4';
begin
  begin
    select admin_user_id into v_duenio from public.negocios
    where admin_user_id not in (select user_id from public.plataforma_admins)
    limit 1;
    select id into v_admin from auth.users where id <> v_duenio limit 1;
    if v_duenio is null or v_admin is null then
      raise exception 'FALLO: la base de ensayo necesita dos usuarios, uno dueño de un negocio.';
    end if;
    insert into public.plataforma_admins (user_id, nota) values (v_admin, 'prueba de tutoriales')
    on conflict (user_id) do nothing;

    insert into public.tutoriales (numero, titulo, video, publicado) values
      (90, 'Publicado de prueba', v_video, true),
      (91, 'Borrador de prueba', null, false);

    -- 1. Un dueño lee los publicados y no los borradores.
    perform set_config('request.jwt.claims', json_build_object('sub', v_duenio, 'role', 'authenticated', 'aal', 'aal2')::text, true);
    set local role authenticated;
    select count(*) into v_vistos from public.tutoriales where numero in (90, 91);
    if v_vistos <> 1 or not exists (select 1 from public.tutoriales where numero = 90) then
      raise exception 'FALLO: un dueño vio % tutoriales de prueba; tenía que ver solo el publicado.', v_vistos;
    end if;

    -- 2. Un dueño no crea, no cambia y no borra, ni con segundo factor.
    begin
      insert into public.tutoriales (numero, titulo) values (92, 'Del dueño');
      raise exception 'FALLO: un dueño creó un tutorial.';
    exception
      when insufficient_privilege then null;
    end;
    update public.tutoriales set titulo = 'Cambiado por el dueño' where numero = 90;
    get diagnostics v_cambiados = row_count;
    delete from public.tutoriales where numero = 90;
    if v_cambiados <> 0 or not exists (select 1 from public.tutoriales where numero = 90 and titulo = 'Publicado de prueba') then
      raise exception 'FALLO: un dueño cambió o borró un tutorial.';
    end if;
    reset role;

    -- 3. La plataforma sin segundo factor ve los borradores pero no escribe.
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal1')::text, true);
    set local role authenticated;
    select count(*) into v_vistos from public.tutoriales where numero in (90, 91);
    if v_vistos <> 2 then
      raise exception 'FALLO: la plataforma vio % de los 2 tutoriales de prueba.', v_vistos;
    end if;
    begin
      insert into public.tutoriales (numero, titulo) values (92, 'Sin segundo factor');
      raise exception 'FALLO: la plataforma creó un tutorial sin segundo factor.';
    exception
      when insufficient_privilege then null;
    end;
    update public.tutoriales set publicado = false where numero = 90;
    get diagnostics v_cambiados = row_count;
    if v_cambiados <> 0 then
      raise exception 'FALLO: la plataforma cambió un tutorial sin segundo factor.';
    end if;
    reset role;

    -- 4. Con segundo factor, escribe; y los topes los pone la base.
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal2')::text, true);
    set local role authenticated;
    insert into public.tutoriales (numero, titulo) values (92, 'Con segundo factor');
    update public.tutoriales set publicado = false where numero = 90;
    get diagnostics v_cambiados = row_count;
    if v_cambiados <> 1 then
      raise exception 'FALLO: la plataforma con segundo factor no pudo cambiar un tutorial.';
    end if;
    begin
      update public.tutoriales set publicado = true where numero = 91;
      raise exception 'FALLO: se publicó un tutorial sin video.';
    exception
      when check_violation then null;
    end;
    begin
      update public.tutoriales set video = '../negocios/otro.mp4' where numero = 91;
      raise exception 'FALLO: se aceptó un nombre de video que no es de la forma NN-<hex>.mp4.';
    exception
      when check_violation then null;
    end;
    begin
      insert into public.tutoriales (numero, titulo) values (90, 'Número repetido');
      raise exception 'FALLO: se aceptaron dos tutoriales con el mismo número.';
    exception
      when unique_violation then null;
    end;
    begin
      insert into public.tutoriales (numero, titulo) values (100, 'Fuera de rango');
      raise exception 'FALLO: se aceptó el tutorial número 100.';
    exception
      when check_violation then null;
    end;
    delete from public.tutoriales where numero = 92;
    get diagnostics v_cambiados = row_count;
    if v_cambiados <> 1 then
      raise exception 'FALLO: la plataforma con segundo factor no pudo borrar un tutorial.';
    end if;
    reset role;

    -- 5. Un visitante anónimo no lee nada.
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    set local role anon;
    begin
      perform 1 from public.tutoriales limit 1;
      raise exception 'FALLO: un visitante anónimo leyó los tutoriales.';
    exception
      when insufficient_privilege then null;
    end;
    reset role;

    raise exception using errcode = 'P0001', message = 'TUTORIALES_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'TUTORIALES_EN_VERDE' then
        raise;
      end if;
      raise notice 'los tutoriales los lee el dueño y los escribe la plataforma con segundo factor: todo en verde';
  end;
end
$prueba$;
