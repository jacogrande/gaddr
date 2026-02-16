import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import importX from "eslint-plugin-import-x";

export default tseslint.config(
  { ignores: ["node_modules", ".next", "dist", "out", "*.config.*"] },

  // ── Base: recommended + strict type-checked ──────────────────────
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,

  // ── Type-checked parser options ──────────────────────────────────
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ── Global rules (all source files) ──────────────────────────────
  {
    plugins: { "import-x": importX },
    rules: {
      // Circular imports
      "import-x/no-cycle": "error",

      // Immutability
      "prefer-const": "error",
      "no-param-reassign": [
        "error",
        {
          props: true,
          ignorePropertyModificationsFor: ["acc", "draft"],
        },
      ],

      // Unused variables — handled here, not in tsconfig
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // Exhaustive switches — critical for Result<T, E> error handling
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        {
          allowDefaultCaseForExhaustiveSwitch: false,
          considerDefaultExhaustiveForUnions: false,
          requireDefaultForNonUnion: true,
        },
      ],

      // Strict equality
      eqeqeq: ["error", "always"],
    },
  },

  // ── Domain layer ─────────────────────────────────────────────────
  // Pure TypeScript only. No frameworks, no infra, no app, no side
  // effects. If a rule blocks you, the code belongs in another layer.
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      // ── Layer boundaries ──
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/infra", "**/infra/**"],
              message:
                "Domain must not import from infrastructure. Define a port interface instead.",
            },
            {
              group: ["**/app", "**/app/**"],
              message: "Domain must not import from the app shell.",
            },
            {
              group: ["next", "next/**", "react", "react-dom", "react/**"],
              message:
                "Domain must not import framework code. Keep domain pure.",
            },
            {
              group: [
                "drizzle-orm",
                "drizzle-orm/**",
                "@prisma/*",
                "prisma",
              ],
              message:
                "Domain must not import ORM. Database access belongs in infra/ behind a repository port.",
            },
            {
              group: ["better-auth", "better-auth/**", "@better-auth/**"],
              message:
                "Domain must not import auth library. Auth belongs in infra/.",
            },
            {
              group: [
                "openai",
                "openai/**",
                "@anthropic-ai/*",
                "ai",
                "ai/**",
              ],
              message:
                "Domain must not import LLM SDKs directly. Use a port interface in domain/, implement in infra/.",
            },
            {
              group: ["@sentry/*", "@sentry/**"],
              message:
                "Domain must not import observability SDKs. Instrument at the infra/app boundary.",
            },
          ],
        },
      ],

      // ── No throwing — return Result<T, E> instead ──
      "no-restricted-syntax": [
        "error",
        {
          selector: "ThrowStatement",
          message:
            "Domain functions must return Result<T, E>, not throw. Move throw to infra/ if truly needed.",
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message:
            "Domain must be pure. Pass timestamps as parameters instead of calling new Date().",
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message:
            "Domain must be pure. Pass timestamps as parameters instead of calling Date.now().",
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='parse']",
          message:
            "Domain must be pure. Pass parsed dates as parameters instead of calling Date.parse().",
        },
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            "Domain must not perform I/O. Define a port interface for HTTP calls.",
        },
      ],

      // ── No side-effect globals ──
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message: "Domain must not perform I/O. Use a port interface.",
        },
        {
          name: "console",
          message:
            "Domain must be pure. No logging — instrument at the infra/app boundary.",
        },
      ],

      // ── No Math.random ──
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message:
            "Domain must be pure. Pass random values as parameters or use a port.",
        },
      ],

      // ── No type assertions — fix the types, don't cast ──
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
    },
  },

  // ── Infrastructure layer ─────────────────────────────────────────
  // Implements domain ports. May import from domain/ and external
  // libraries. Must not import from app/.
  {
    files: ["src/infra/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/app", "**/app/**"],
              message:
                "Infrastructure must not import from the app shell. Dependencies point inward: app → infra → domain.",
            },
          ],
        },
      ],

      // Allow `as` syntax but ban assertions on object/array literals
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "as",
          objectLiteralTypeAssertions: "never",
        },
      ],
    },
  },

  // ── App shell layer ──────────────────────────────────────────────
  // Thin wiring: validate, call domain, return. Same assertion
  // restrictions as infra.
  {
    files: ["src/app/**/*.ts", "src/app/**/*.tsx"],
    rules: {
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        {
          assertionStyle: "as",
          objectLiteralTypeAssertions: "never",
        },
      ],
    },
  },

  // ── Unit tests ───────────────────────────────────────────────────
  // Touch domain/ only. If you need infra or app imports, you are
  // writing an integration or E2E test, not a unit test.
  {
    files: ["test/unit/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/infra", "**/infra/**"],
              message:
                "Unit tests must only import from domain. If you need infra, this is an E2E test.",
            },
            {
              group: ["**/app", "**/app/**"],
              message:
                "Unit tests must only import from domain. If you need the app shell, this is an E2E test.",
            },
          ],
        },
      ],
    },
  },

  // ── No barrel files in domain ────────────────────────────────────
  {
    files: ["src/domain/**/index.ts"],
    rules: {
      "no-restricted-exports": [
        "error",
        { restrictedNamedExportsPattern: ".*" },
      ],
    },
  },

  // ── Disable type-checked rules on JS config files ────────────────
  // Config files (eslint.config.mjs, etc.) are not part of the TS
  // project. Type-checked rules would crash on them.
  {
    files: ["**/*.mjs", "**/*.js"],
    ...tseslint.configs.disableTypeChecked,
  },
);
