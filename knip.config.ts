import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["src/domain/**/*.ts"],
  project: ["src/**/*.{ts,tsx}"],
  ignore: ["test/**"],
};

export default config;
