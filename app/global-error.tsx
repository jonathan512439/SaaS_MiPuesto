"use client";

/* Se usa solo cuando falla el layout raíz, y por eso trae su propio `<html>`:
   en ese caso el de la aplicación no llegó a renderizarse. Tampoco puede usar
   hojas de estilo con módulos ni tipografías, así que va con estilos en línea a
   propósito, sin tokens: es la última red y tiene que funcionar aunque no cargue
   nada más. */
export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          display: "grid",
          minHeight: "100dvh",
          placeItems: "center",
          margin: 0,
          padding: "2rem",
          background: "#f7f6f3",
          color: "#1b1a17",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>MiPuesto no pudo cargar</h1>
          <p>Volvé a intentar en unos segundos.</p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.75rem 1.5rem",
              border: 0,
              borderRadius: "0.5rem",
              background: "#1b1a17",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
            }}
            type="button"
          >
            Volver a intentar
          </button>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", opacity: 0.7 }}>Referencia: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
