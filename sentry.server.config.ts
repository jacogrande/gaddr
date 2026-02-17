import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.VERCEL_ENV || process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV ?? "development",
  tracesSampleRate: 1.0,
});
