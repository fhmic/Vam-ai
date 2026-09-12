"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Stage 5.4 — Observability.
 *
 * `global-error.tsx` is the one error boundary Next's App Router
 * invokes for errors thrown in the root layout itself — every other
 * segment already has its own recoverable UI, so this is deliberately
 * the last resort, not a replacement for per-route error handling.
 * Because it replaces the root layout while active, it must render
 * its own <html>/<body>.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
          <h1>Something went wrong</h1>
          <p>We&apos;ve been notified and are looking into it. Please try refreshing the page.</p>
        </div>
      </body>
    </html>
  );
}
