import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": "off", // 🚀 Disable unused variable errors
      "@typescript-eslint/no-explicit-any": "off", // 🚀 Allow 'any' type usage (optional)
      "@typescript-eslint/no-explicit-any": "off", // 🚀 Allow 'any' type usage (optional)
    },
  },
];

export default eslintConfig;
