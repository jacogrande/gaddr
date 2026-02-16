import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["src/domain/**/*.ts", "src/infra/db/client.ts"],
  project: ["src/**/*.{ts,tsx}"],
  ignore: ["test/**"],
  ignoreDependencies: ["tailwindcss"],
};

export default config;
