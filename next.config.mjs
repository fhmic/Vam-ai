import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

// Stage 5.4 — Observability. `withSentryConfig` injects the client init
// file into the browser bundle and, when `SENTRY_AUTH_TOKEN` is present
// (CI/production only — never set locally), uploads readable source
// maps for this build so stack traces in Sentry show real file/line
// info instead of minified output. With no auth token (local dev, a
// fresh checkout, this sandbox) it silently skips the upload step and
// the app builds and runs exactly as it did before Sentry was added.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,

  // Route Sentry's browser ingest calls through our own domain, so ad
  // blockers that target sentry.io directly don't silently drop error
  // reports for real users.
  tunnelRoute: "/monitoring",

  widenClientFileUpload: true,

  webpack: {
    // Keeps the build's own logs (not application logs) out of Sentry —
    // this project already has request_id-correlated error logging.
    treeshake: { removeDebugLogging: true },
    reactComponentAnnotation: { enabled: true },
  },
});
