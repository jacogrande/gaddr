"use client";

const THEME_INIT_SCRIPT = `(() => {
  const fallbackTheme = "light";
  try {
    const storedTheme = window.localStorage.getItem("gaddr:theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : prefersDark ? "dark" : fallbackTheme;
    document.documentElement.setAttribute("data-theme", nextTheme);
  } catch {
    document.documentElement.setAttribute("data-theme", fallbackTheme);
  }
})();`;

const THEME_CSS = `
  :root {
    --app-bg: #f4e9d8;
    --app-fg: #3b2f1f;
    --app-muted: #7f5c37;
    --surface-1: #f6ead8;
    --surface-2: #f1e1cb;
    --border-soft: #d6bb98;
  }
  html[data-theme="dark"] {
    --app-bg: #1d150f;
    --app-fg: #eadfcd;
    --app-muted: #c7ad8c;
    --surface-1: #2a1f16;
    --surface-2: #33261a;
    --border-soft: #5e452c;
  }
`;

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Something went wrong</title>
        <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          background: "var(--app-bg)",
          color: "var(--app-fg)",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "28rem",
            border: "1px solid var(--border-soft)",
            borderRadius: "0.5rem",
            background: "var(--surface-1)",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: "0.75rem", color: "var(--app-muted)", fontSize: "0.875rem" }}>
            An unexpected error occurred.
          </p>
          <button
            type="button"
            onClick={() => {
              reset();
            }}
            style={{
              marginTop: "1rem",
              border: "1px solid var(--border-soft)",
              borderRadius: "0.375rem",
              background: "var(--surface-2)",
              color: "var(--app-fg)",
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
