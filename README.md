## Prompt Craft (VS Code Extension)

Prompt Craft generates concise, AI-ready prompts from your codebase. It converts diagnostics and project context into high-signal prompts designed to work well with Copilot, Cursor, and ChatGPT.

### Install

- VS Code Marketplace: `mohitmishra.prompt-craft`
  - https://marketplace.visualstudio.com/items?itemName=mohitmishra.prompt-craft
- From file: install `prompt-craft-0.0.1.vsix` (Extensions → … → Install from VSIX)

### What it does

- Error prompts: transforms Problems (Diagnostics) or a pasted stack trace into a structured prompt with Context, Error Details, Code Snippet (when resolvable), Goal, and Constraints.
- Project prompts: scans `package.json`, `README.md`, and up to ~100 code/text files to infer tech stack, dependencies, and architecture signals; emits domain-aware tasks under a shared Project Context header.
- LLM enhancement (optional): integrates Groq (`llama3-8b-8192`) to condense context and produce 4–6 tailored tasks. Falls back to templates if the key is missing or requests time out.

### Commands

- Prompt Craft: Analyze Project and Generate Prompts
- Prompt Craft: Generate Error Prompt

### Quick start (development host)

1) Open this folder in VS Code
2) `npm install`
3) `npm run compile`
4) F5 to start the Extension Development Host

In the Dev Host, open a workspace to analyze (e.g., `demo/ecom-backend`), then run the commands from the Command Palette.

### LLM setup (optional)

- Get a Groq API key from https://groq.com
- Set in VS Code Settings:
  - `promptCraft.groqApiKey`
  - `promptCraft.requestTimeoutMs` (default 5000)
- Or export before launching VS Code: `GROQ_API_KEY=...`

The Output shows “Generation: LLM-enhanced” when the model is used; otherwise “Generation: Template”.

### Demo workspace

- `demo/ecom-backend`: minimal Express + MongoDB project with an intentional error in `src/app.js` and a crash route at `/boom`.
- Try both flows:
  - Diagnostics-based error prompt: uncomment `const broken = ;` → Problems shows an error → run Generate Error Prompt.
  - Stack-based error prompt: run the app, hit `/boom`, copy the stack → run Generate Error Prompt and paste.

### Architecture and heuristics

- Tech stack detection via `package.json` (TypeScript vs JavaScript)
- Architecture signals from folder layout (`src/`, `controllers/`, `models/`, `routes/`)
- Domain inference (e.g., e-commerce) from README and filenames
- Lightweight extraction of controller function exports and model/schema fields

### Security and privacy

- No hard-coded keys. Keys are stored in user/workspace settings or read from the environment.
- No `eval` or arbitrary code execution.
- Reads only within the open workspace.
- When LLM is enabled, requests include a compact analysis JSON (tech stack, dependencies, README summary, architecture summary, limited controller/model summaries). Do not include sensitive content in README or code if this is a concern.

### Troubleshooting

- Commands don’t appear: ensure you are in the Extension Development Host; open a workspace with a `README.md` or run the command explicitly.
- LLM not used: set `promptCraft.groqApiKey` in the Dev Host Settings, or launch VS Code from a shell with `GROQ_API_KEY`; check for “Generation: LLM-enhanced”.
- Snippet missing: paste a stack trace that includes a resolvable path and line.

### Development

- Code: TypeScript in `src/`, compiled to `out/`
- Key files:
  - `src/extension.ts`: activation, commands, output
  - `src/analyzer.ts`: workspace scanning and heuristics
  - `src/templates.ts`: templates and helper builders
  - `src/llm.ts`: Groq wrapper and prompts
  - `src/domain.ts`: domain inference and simple code extraction

### Distribution

- Marketplace: https://marketplace.visualstudio.com/items?itemName=mohitmishra.prompt-craft
- Local VSIX: `npx vsce package` → install the generated `.vsix`

### License

See `LICENSE`.

