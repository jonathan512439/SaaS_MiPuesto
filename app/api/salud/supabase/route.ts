import { NextResponse } from "next/server";

import { crearClienteSupabaseServidor } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await crearClienteSupabaseServidor();
    const { error } = await supabase
      .from("negocios")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { estado: "error", servicio: "supabase" },
        { status: 503 },
      );
    }

    return NextResponse.json({ estado: "ok", servicio: "supabase" });
  } catch {
    return NextResponse.json(
      { estado: "sin_configurar", servicio: "supabase" },
      { status: 503 },
    );
  }
}
