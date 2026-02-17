import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "src/domain/**/*.ts",
    "src/infra/db/client.ts",
    "src/infra/auth/auth.ts",
    "src/infra/auth/auth-client.ts",
  ],
  project: ["src/**/*.{ts,tsx}"],
  ignore: ["test/**"],
  ignoreDependencies: ["tailwindcss", "@axe-core/playwright"],
};

export default config;
