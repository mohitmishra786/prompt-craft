# What To Be Done (Prompt Craft)

Prototype-focused backlog to improve usefulness without adding heavy deps.

- Domain-aware prompts
  - Expand domain keywords (payments, shipping, inventory); add domain task sets.
  - Keep shared Project Context header; compress with bullets when long.

- Deeper code insights (lightweight)
  - Extract controller route handlers and HTTP verbs from `controllers/` and `routes/`.
  - Detect Mongoose indexes/fields to tailor optimization tasks.
  - Identify entrypoints from files and npm scripts.

- Error handling integration
  - Correlate Problems diagnostics with analysis; generate a dedicated "Fix the bug" task when present.
  - Optional: parse task outputs for common error patterns.

- Settings & UX
  - Settings: number of prompts, focus area (security/perf/testing).
  - Webview panel with per-prompt Copy buttons and "Copy All".

- Multi-language groundwork
  - Detect Python/Java/Go files and adjust tech stack labels and prompts.

- Packaging & QA
  - Add icon and marketplace metadata; simple unit tests for template builders and regex helpers.

Notes:
- Keep dependency footprint minimal (VS Code API + Node built-ins).
- Prefer simple heuristics over heavy parsing for speed.