Changes made on this iteration:

- Added VS Code extension scaffold and implementation per `context.md`.
- Created `package.json` with commands and activation events, dev dependencies for TypeScript and VS Code typings.
- Added `tsconfig.json` for building TypeScript to `out/`.
- Implemented `src/extension.ts` with two commands:
  - `prompt-craft.generateErrorPrompt`: builds an error prompt from Diagnostics or pasted error output.
  - `prompt-craft.analyzeProject`: analyzes the project and generates 3–5 prompts.
- Implemented `src/analyzer.ts` for project scanning (up to 100 files), dependency detection, architecture heuristics, and code snippet extraction.
- Implemented `src/templates.ts` containing prompt templates and default task ideas.
- Added `README.md` with usage, development steps, and notes/TODOs.
- Added `.vscode/launch.json` for debugging the extension.

Notes/TODO:
- Terminal streaming capture is not implemented due to API limitations; prototype uses Diagnostics and manual paste for errors.
- No external dependencies used (kept self-contained). If needed later, we can add minimal libs.

Applied fixes A–E:
- A: Improved stack trace parsing to handle Windows paths and file:// URLs in `src/extension.ts`.
- B: Enriched architecture heuristics (entrypoints, counts) in `src/analyzer.ts`.
- C: Filtered scanned files to code/text extensions in `src/analyzer.ts` for performance.
- D: Clearer separators in project prompts output in `src/extension.ts`.
- E: Activation events simplified to `workspaceContains:README.md` in `package.json`; commands still activate lazily via contributes.

New iteration improvements:
- Added `src/domain.ts` for lightweight domain inference and simple controller/model extraction.
- Extended `ProjectPromptInput` with `contextHeader` in `src/templates.ts` to reduce repeated context.
- Added `ecommerceTaskIdeas` in `src/templates.ts` to generate domain-specific tasks.
- Updated `src/analyzer.ts` to return `domain`, `controllers`, and `models` summaries.
- Updated `src/extension.ts` to build a shared context header and emit 3–6 varied prompts combining domain-specific and generic tasks.
- Added `demo/` sample workspace (`demo/ecom-backend`).

Repo housekeeping:
- Added `.gitignore` (Node/VS Code/macOS artifacts, build outputs).
- Added `TODO.md` with prioritized next steps and scope.


Added file: `TODO.md` with a prioritized, prototype-focused backlog (domain-aware prompts, deeper code insights, error integration, UX settings, multi-language groundwork, packaging/QA).

