"use client";

/**
 * Root error boundary that replaces the whole document.
 *
 * Owner D. Only reached when the root layout itself fails, so it has to render
 * its own `<html>`/`<body>` and cannot rely on any shared chrome or styles.
 */

export default function ErrorBoundary(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
        }}
      >
        <main style={{ maxWidth: "24rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem" }}>Taskflow is temporarily down</h1>
          <p style={{ color: "#475569", fontSize: "0.875rem" }}>
            The application shell failed to load.
            {error.digest !== undefined ? ` Reference ${error.digest}.` : ""}
          </p>
          <button type="button" onClick={reset}>
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
