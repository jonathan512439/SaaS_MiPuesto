import { NextResponse, type NextRequest } from "next/server";

import { crearClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import { sesionDePlataforma } from "../../../../lib/plataforma/sesion-de-plataforma";
import { obtenerUrlBaseSitio } from "../../../../lib/url-sitio";

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Este es el único lugar del panel de plataforma que toca la clave de servicio,
 * y conviene decir por qué: invitar a alguien crea un usuario en el sistema de
 * autenticación, y eso no se puede expresar con políticas de RLS. No hay forma
 * de hacerlo con la sesión del administrador.
 *
 * La diferencia con «el panel corre sobre la clave de servicio» es que acá la
 * clave hace **una** cosa acotada, y solo después de comprobar que quien pide
 * administra la plataforma **con segundo factor**. Un fallo de autorización no
 * abre la base: abre la posibilidad de mandar una invitación de más.
 *
 * Hasta el 2026-10-21 solo se preguntaba si estaba en la lista: con la
 * contraseña sola se podía invitar, porque la clave de servicio no pasa por
 * ninguna política que pida el segundo factor.
 */
export async function POST(solicitud: NextRequest) {
  const sesion = await sesionDePlataforma();
  if (sesion.rechazo) return sesion.rechazo;

  let entrada: unknown;
  try {
    entrada = await solicitud.json();
  } catch {
    return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
  }

  const correo =
    typeof (entrada as Record<string, unknown>)?.correo === "string"
      ? ((entrada as Record<string, unknown>).correo as string).trim().toLowerCase()
      : "";
  if (!PATRON_CORREO.test(correo) || correo.length > 200) {
    return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
  }

  let admin;
  try {
    admin = crearClienteSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "Las invitaciones no están habilitadas en este entorno." },
      { status: 503 },
    );
  }

  const destino = new URL("/actualizar-clave", obtenerUrlBaseSitio()).toString();
  const { error } = await admin.auth.admin.inviteUserByEmail(correo, {
    redirectTo: destino,
  });

  if (error) {
    /* El caso más común es «ya existe»: decirlo con esas palabras evita que se
       reintente tres veces pensando que falló el envío. */
    const yaExiste = error.message.toLowerCase().includes("already");
    return NextResponse.json(
      {
        error: yaExiste
          ? "Ese correo ya tiene una cuenta."
          : "No se pudo enviar la invitación.",
      },
      { status: yaExiste ? 409 : 502 },
    );
  }

  /* La bitácora la escriben solo funciones, nunca la aplicación: así ninguna
     fila puede aparecer sin pasar por un control de quién la escribe. */
  await sesion.supabase.rpc("admin_registrar_invitacion", { p_correo: correo });

  return NextResponse.json({ invitado: correo });
}
