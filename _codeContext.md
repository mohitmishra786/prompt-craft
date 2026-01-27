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


Latest changes before v0.0.1 tag:
- Integrated optional Groq LLM (`llama3-8b-8192`) via `src/llm.ts`; settings `promptCraft.groqApiKey`, `promptCraft.requestTimeoutMs` added in `package.json`.
- Fallback to `GROQ_API_KEY` env var if setting is empty.
- Project prompts: when LLM is used, output shows shared header + refined content only (no duplicated context, no numbering). Added "Generation: LLM-enhanced" marker.
- Error prompts: added LLM refinement path and marker; templates still used on failure.
- Analyzer: added `sampleQueries` collection for additional context to LLM.

Phase 2 & 3 Completion (v0.0.5 Candidate):
- **Phase 2 (Quality of Life):**
    - **Security:** Added `sanitizePrompt` regex to redact API keys and passwords from prompts (Issue #24).
    - **Context:** Added ASCII directory tree generation in `analyzer.ts` via `generateAsciiTree` (Issue #25).
    - **UI:** Implemented `SidebarProvider` (Webview) to display prompts. Prompts now appear in a dedicated "Prompt Assistant" sidebar instead of just the Output panel (Issue #23).
- **Phase 3 (Production Readiness):**
    - **Multi-Language:** Added detection and stack trace parsing for Python, Java, and Go (Issue #27).
    - **Testing:** Added `mocha` test infrastructure, `runTest.ts`, and unit tests for `sanitizer.ts`. Configured `npm test` (Issue #26).
    - **Telemetry:** Added `TelemetryService` interface for event logging (currently logs to Output Channel for privacy/MVP) (Issue #28).

Analysis & Roadmap (Current State):
- **Status:** Feature Complete for planned MVP enhancements.
- **Test Coverage:** Basic unit tests for sanitizer. Need to expand to `analyzer` and `extension` logic.
- **UI:** Functional Webview sidebar replacing raw text output.
- **Next Steps:** Polish UI CSS, add "Send to API" button directly in Sidebar (if API key present), and comprehensive integration tests.


