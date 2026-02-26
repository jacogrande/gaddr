"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Something went wrong</title>
      </head>
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          background: "#f9fafb",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "28rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.5rem",
            background: "white",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: "0.75rem", color: "#4b5563", fontSize: "0.875rem" }}>
            An unexpected error occurred.
          </p>
          <button
            type="button"
            onClick={() => {
              reset();
            }}
            style={{
              marginTop: "1rem",
              border: "1px solid #9ca3af",
              borderRadius: "0.375rem",
              background: "white",
              padding: "0.5rem 0.75rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
