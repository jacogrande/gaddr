import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client";
import { isE2ETesting } from "../env";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET environment variable is required");
}
if (!process.env.BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_URL environment variable is required");
}
if (!isE2ETesting() && !process.env.GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID environment variable is required");
}
if (!isE2ETesting() && !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_SECRET environment variable is required");
}
if (process.env.GITHUB_CLIENT_ID && !process.env.GITHUB_CLIENT_SECRET) {
  throw new Error("GITHUB_CLIENT_SECRET is required when GITHUB_CLIENT_ID is set");
}

export const auth = betterAuth({
  appName: "Microblogger",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: isE2ETesting(),
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
  },
  session: {
    expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
    updateAge: 24 * 60 * 60, // refresh every 24h
  },
  trustedOrigins: [
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],
});
