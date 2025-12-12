## Prompt Craft (VS Code Extension)

Prompt Craft generates concise, AI-ready prompts from your codebase. It converts diagnostics and project context into high-signal prompts designed to work well with Copilot, Cursor, and ChatGPT.

### Install

- VS Code Marketplace: `mohitmishra.prompt-craft`
  - https://marketplace.visualstudio.com/items?itemName=mohitmishra.prompt-craft
- From file: install `prompt-craft-0.0.1.vsix` (Extensions → … → Install from VSIX)

### What it does

- **Error prompts**: Transforms Problems (Diagnostics) or pasted stack traces into structured prompts with Context, Error Details, Code Snippet, Goal, and Constraints.
- **Project prompts**: Scans `package.json`, `README.md`, and up to ~100 code/text files to infer tech stack, dependencies, and architecture signals; emits domain-aware tasks.
- **Multi-provider LLM support**: Choose from multiple AI providers:
  - **Groq** (`llama3-8b-8192`, `llama3-70b-8192`, `mixtral-8x7b-32768`)
  - **OpenAI** (`gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`)
  - **Azure OpenAI** (with API key, Azure CLI, or Managed Identity authentication)
- **Provider management**: Easy provider switching via status bar, health checks, and configuration UI

### Commands

**Core Commands:**
- `Prompt Craft: Analyze Project and Generate Prompts` - Analyze your project and generate AI prompts
- `Prompt Craft: Generate Error Prompt` - Create prompts from errors or diagnostics

**Provider Management:**
- `Prompt Craft: Select LLM Provider` - Choose your AI provider (Groq, OpenAI, Azure OpenAI)
- `Prompt Craft: Test Provider Connection` - Verify provider connectivity and health
- `Prompt Craft: Show Provider Status` - View all configured providers and their status
- `Prompt Craft: Reload Providers from Settings` - Refresh provider configuration

**Status Bar:**
- Click the provider icon in the status bar for quick provider switching
- Visual indicators show provider health (active/warning/error)

### Quick start (development host)

1) Open this folder in VS Code
2) `npm install`
3) `npm run compile`
4) F5 to start the Extension Development Host

In the Dev Host, open a workspace to analyze (e.g., `demo/ecom-backend`), then run the commands from the Command Palette.

### Provider Setup

#### Groq (Free Tier Available)
1. Get API key from [groq.com](https://groq.com)
2. Settings → `promptCraft.groqApiKey`
3. Or set environment variable: `GROQ_API_KEY`

#### OpenAI
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Settings → `promptCraft.openai.apiKey`
3. Settings → `promptCraft.openai.model` (default: `gpt-4-turbo`)

#### Azure OpenAI

**Option 1: API Key Authentication**
1. Settings → `promptCraft.azureOpenAI.endpoint` (e.g., `https://your-resource.openai.azure.com`)
2. Settings → `promptCraft.azureOpenAI.apiKey`
3. Settings → `promptCraft.azureOpenAI.deploymentName`
4. Settings → `promptCraft.azureOpenAI.authMethod` = `apiKey`

**Option 2: Azure CLI Authentication (No API Key Needed)**
1. Install [Azure CLI](https://aka.ms/azure-cli)
2. Run `az login` in terminal
3. Settings → `promptCraft.azureOpenAI.authMethod` = `azureCli`
4. Configure endpoint and deployment name

**Option 3: Managed Identity (Role-Based, Azure VMs)**
1. Assign Managed Identity to your Azure VM/App Service
2. Grant "Cognitive Services User" role
3. Settings → `promptCraft.azureOpenAI.authMethod` = `managedIdentity`
4. Configure endpoint and deployment name

The Output shows "Generation: LLM-enhanced" when a provider is used; otherwise "Generation: Template".

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

