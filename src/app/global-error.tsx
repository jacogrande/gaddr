"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

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
          background: "#FAFAF8",
          margin: 0,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            width: "100%",
            borderRadius: "0.5rem",
            border: "2px solid #000",
            background: "#fff",
            padding: "2rem",
            textAlign: "center",
            boxShadow: "4px 4px 0 0 #000",
          }}
        >
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "#000",
              fontFamily: "ui-serif, Georgia, serif",
              margin: 0,
            }}
          >
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#57534e" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={() => { reset(); }}
            style={{
              marginTop: "1.5rem",
              borderRadius: "9999px",
              border: "2px solid #000",
              background: "#8B2500",
              paddingLeft: "1.5rem",
              paddingRight: "1.5rem",
              paddingTop: "0.5rem",
              paddingBottom: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "3px 3px 0 0 #000",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
