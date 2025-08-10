# Prompt Craft Roadmap (Checklist)

Use this as a living plan. Check items as they get done.

## Core functionality
- [x] VS Code extension scaffold (TypeScript) with commands
- [x] Error prompt generation (Diagnostics + pasted stack)
- [x] Project analysis (package.json, README, folder heuristics)
- [x] Shared Project Context header to avoid repetition
- [x] Domain inference (e.g., e-commerce) and simple controller/model summaries
- [x] Optional Groq LLM enhancement (project + error)
- [x] Settings for `promptCraft.groqApiKey` and `promptCraft.requestTimeoutMs`
- [x] Fallback to `GROQ_API_KEY` env var
- [x] Demo workspace under `demo/ecom-backend`

## LLM integration
- [x] Model: `llama3-8b-8192` via Groq
- [x] Robust timeouts and graceful fallback to templates
- [ ] Add preflight connectivity test command (e.g., "Prompt Craft: Test Groq Connection")
- [ ] Add setting to toggle categories (fixes, enhancements, performance, docs)
- [ ] Support pre-release prompts (e.g., experimental prompt styles)

## Project analysis depth
- [x] Controllers/functions scan (regex)
- [x] Models/schema fields scan (regex)
- [x] Sample queries discovery (regex)
- [ ] Detect route HTTP verbs and paths from `routes/` and controller files
- [ ] Compute basic coupling/size metrics per feature area (very lightweight)
- [ ] Detect test framework and coverage files if present
- [ ] Detect CI config (GitHub Actions), suggest prompts accordingly

## Error awareness
- [x] Diagnostics path
- [x] Pasted stack path with file/line parsing
- [ ] Surface top N recent errors from Problems as dedicated tasks
- [ ] When README mentions a bug, blend it into task generation (LLM prompt hint)
- [ ] Optional: task output/terminal parsing via `vscode.tasks` (prototype)

## UX and output
- [x] Output Channel with auto-copy
- [ ] Webview panel with per-prompt Copy buttons and "Copy All"
- [ ] QuickPick to select focus area (security/perf/testing) before generation
- [ ] Setting: number of prompts to generate (1–8)
- [ ] Command to export prompts to file (`PROMPTS.md`)

## Performance and scope
- [x] Limit scan to ~100 files and code/text extensions
- [ ] Cache analysis for session; refresh on demand
- [ ] Stream LLM output (future when API enables)

## Multi-language groundwork
- [ ] Detect Python (requirements.txt), Java (pom.xml/gradle), Go (go.mod)
- [ ] Language-aware labels and prompt snippets
- [ ] Minimal domain templates beyond e-commerce (e.g., fintech, CMS)

## Packaging and distribution
- [ ] Add extension icon and gallery banner
- [ ] Add `files` whitelist in `package.json` to keep package lean
- [ ] VSIX packaging script and GitHub Release artifact automation
- [ ] Publish to VS Code Marketplace under your publisher

## Security & privacy
- [x] No hard-coded keys; use settings/env only
- [x] No file writes without user action
- [ ] Redact secrets when echoing errors or paths
- [ ] Document data flow when LLM is enabled (what is sent)

## Testing
- [ ] Unit tests for template builders and regex helpers
- [ ] Simulated tests for analyzer on the demo workspace
- [ ] Smoke tests for LLM calls (mock responses)

## Documentation
- [x] README with setup and demo steps
- [ ] Add publishing guide to README (Marketplace + VSIX)
- [ ] Add CONTRIBUTING.md and simple code style notes

---

Notes:
- Keep dependency footprint minimal (VS Code API + Node built-ins + axios for HTTP).
- Prefer fast regex heuristics over heavy parsers.