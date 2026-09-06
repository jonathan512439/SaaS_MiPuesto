import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { crearClienteSupabasePublico } from "../../../../lib/supabase/public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Abriendo el catálogo | MiPuesto",
  /* No se indexa: es una puerta, no una página. Lo que tiene que aparecer en
     los buscadores es el catálogo al que lleva. */
  robots: { index: false, follow: false },
};

/* La etiqueta pegada en una mesa sobrevive al negocio que la usaba: el código
   es estable y se puede reapuntar. Imprimir el slug en el plástico obligaría a
   tirar el lote entero cada vez que un local cambia de dueño o de nombre. */
export default async function PaginaEtiqueta({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const supabase = crearClienteSupabasePublico();

  const { data: slug } = await supabase.rpc("resolver_etiqueta", {
    p_codigo: codigo.toUpperCase(),
  });

  /* Un código que no existe, uno sin negocio asignado y uno de un negocio dado
     de baja se ven igual desde afuera, y está bien: quien escanea una etiqueta
     vieja no necesita saber cuál de los tres casos le tocó. */
  if (!slug) notFound();

  redirect(`/${slug}`);
}
