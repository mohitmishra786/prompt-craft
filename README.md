## Prompt Craft (VS Code Extension)

Generate detailed prompts for AI coding tools (Copilot, Cursor, ChatGPT) from your project's context. It supports two workflows:

- Error detection and prompt generation
- New project analysis and prompt generation

### Features

- Commands:
  - "Prompt Craft: Generate Error Prompt"
  - "Prompt Craft: Analyze Project and Generate Prompts"
- Scans Problems (Diagnostics) to identify errors and build a context-rich prompt
- Analyzes project structure, dependencies (from `package.json`), and README to create 3–5 starting prompts
- Outputs to a dedicated Output Channel and auto-copies to clipboard

### Quick Start

1. Open this folder in VS Code.
2. Install dependencies:
   - Run: `npm install` (devDependencies include TypeScript typings)
3. Build the extension:
   - Run: `npm run compile`
4. Launch the extension in a new Extension Development Host:
   - Press F5 (or use the provided launch configuration)

### Commands

- Generate Error Prompt: Attempts to read the first error from VS Code Problems. If none found, you'll be prompted to paste error output. It then extracts file/line (when available), grabs a code snippet, and generates a detailed prompt.

- Analyze Project and Generate Prompts: Reads `package.json`, `README.md` (if present), and scans up to 100 files to infer a simple architecture summary. It then emits 3–6 tailored prompts. The output now uses a shared "Project Context" header to avoid repetition and includes domain inference (e.g., e-commerce) and simple controller/model summaries.

### Notes and Limitations

- Terminal output capture is not part of the stable API. This prototype reads Diagnostics and accepts pasted error output. TODO: Explore optional proposed APIs or task events for richer automation.
- Scope focuses on JavaScript/TypeScript Node.js projects to keep the prototype simple and fast. Domain inference and code summaries use simple regexes (no heavy parsers) and may miss complex patterns.
- No external LLM calls; all prompts are template-based.

### Development

- Source in `src/` (TypeScript), compiled to `out/`.
- Key files:
  - `src/extension.ts`: Activation, commands, and UI
  - `src/analyzer.ts`: Project scanning and heuristics
  - `src/templates.ts`: Prompt templates
  - `src/domain.ts`: Domain inference and simple controller/model extractors

### Security

- No `eval` or arbitrary code execution.
- Reads files only from the open workspace.

