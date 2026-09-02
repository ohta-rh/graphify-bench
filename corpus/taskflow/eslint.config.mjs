import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * Flat config for ESLint 10 + eslint-config-next 16. Both entry points already
 * export flat config arrays, so no `FlatCompat` shim is needed.
 *
 * Note: `next lint` was removed in Next 16 — run `pnpm lint` (`eslint .`).
 */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "data/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // eslint-plugin-react's runtime version sniffing uses an API ESLint 10
    // removed, so pin the version explicitly instead of letting it detect.
    settings: { react: { version: "19.2.8" } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "none",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default config;
