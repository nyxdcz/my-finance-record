import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                window: "readonly",
                document: "readonly",
                localStorage: "readonly",
                sessionStorage: "readonly",
                fetch: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                navigator: "readonly",
                crypto: "readonly",
                TextEncoder: "readonly",
                TextDecoder: "readonly",
                URL: "readonly",
                Blob: "readonly",
                File: "readonly",
                FileReader: "readonly",
                location: "readonly",
                process: "readonly",
                module: "readonly",
                globalThis: "readonly",
                btoa: "readonly",
                atob: "readonly",
                import: "readonly",
                alert: "readonly",
                confirm: "readonly",
                prompt: "readonly",
                Worker: "readonly",
                ServiceWorker: "readonly",
                indexedDB: "readonly",
                Event: "readonly",
                CustomEvent: "readonly",
                AbortController: "readonly"
            },
            ecmaVersion: 2022,
            sourceType: "module"
        },
        rules: {
            "no-undef": "error",
            "no-unused-vars": "warn"
        }
    }
];
