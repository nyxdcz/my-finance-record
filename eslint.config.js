import js from "@eslint/js";
import globals from "globals";

const legacyBrowserFiles = [
  "account-ledger.js",
  "budget-planning.js",
  "cloud-sync.js",
  "expense-screenshot-detect.js",
  "expense-screenshot-parser.js",
  "privacy-lock.js",
  "productivity-tools.js",
  "projects-calendar-v13.0.20.js",
  "reminders-alerts.js",
  "reports-insights.js",
  "security-profiles.js",
  "sync-config.js",
  "sync-config.example.js"
];

export default [
  {
    ignores: [
      "node_modules/**", "vendor/**", "_site/**", "coverage/**",
      "tests/validate-v12-*.mjs", "tests/validate-v13-*.mjs"
    ]
  },
  {
    files: ["eslint.config.js", "playwright.config.mjs", "server.js", "tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }]
    }
  },
  {
    files: legacyBrowserFiles,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: globals.browser
    },
    rules: {
      ...js.configs.recommended.rules,
      // These scripts intentionally share the global scope with index.html.
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-useless-assignment": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "preserve-caught-error": "off"
    }
  },
  {
    files: ["sw.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.serviceworker
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "error"
    }
  }
];
