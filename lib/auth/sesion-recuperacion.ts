/* Una sesión de recuperación es la que se abre al hacer clic en el enlace del
   correo. Prueba que la persona controla ese buzón, y con eso alcanza para
   cambiar la contraseña —es lo mismo que puede hacer de todas formas—, pero no
   debería alcanzar para entrar al panel sin haberla cambiado.

   El problema real que resuelve esto: al fallar el cambio de contraseña y tocar
   «Solicitar otro enlace», el sistema veía una sesión válida y mandaba al
   panel. El dueño quedaba adentro creyendo que su contraseña era la nueva, y
   después no podía entrar con ninguna de las dos.

   `amr` viene firmado dentro del token, así que no se puede falsear desde el
   navegador. Puede llegar como lista de textos o de objetos según la versión, y
   se contemplan las dos. **Si no viene, se asume sesión completa**: equivocarse
   para el otro lado dejaría a gente afuera de su propio panel. */
type EntradaAmr = string | { method?: string };

export function esSesionDeRecuperacion(claims: unknown): boolean {
  if (typeof claims !== "object" || claims === null) return false;
  const amr = (claims as { amr?: EntradaAmr[] }).amr;
  if (!Array.isArray(amr) || amr.length === 0) return false;

  const metodos = amr
    .map((entrada) => (typeof entrada === "string" ? entrada : entrada?.method))
    .filter((metodo): metodo is string => typeof metodo === "string");
  if (metodos.length === 0) return false;

  /* Basta con que haya iniciado sesión de cualquier otra forma para considerarla
     completa: quien puso su contraseña ya demostró más que el correo. */
  const soloRecuperacion = metodos.every(
    (metodo) => metodo === "recovery" || metodo === "otp",
  );
  return soloRecuperacion && metodos.includes("recovery");
}
