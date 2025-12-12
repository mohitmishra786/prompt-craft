# Project Structure

## New Provider Architecture (v0.2.0)

```
prompt-craft/
├── src/
│   ├── providers/                    # NEW: Provider system
│   │   ├── base.ts                   # Abstract provider interface (174 lines)
│   │   ├── factory.ts                # Provider factory & registry (233 lines)
│   │   ├── groq.ts                   # Groq provider (191 lines)
│   │   ├── openai.ts                 # OpenAI provider (238 lines)
│   │   └── azure-openai.ts           # Azure OpenAI provider (492 lines)
│   ├── extension.ts                  # Main extension (420 lines) - ENHANCED
│   ├── llm.ts                        # Legacy compatibility (37 lines) - REFACTORED
│   ├── analyzer.ts                   # Project analysis
│   ├── domain.ts                     # Domain inference
│   └── templates.ts                  # Prompt templates
├── out/                              # Compiled JavaScript
│   └── providers/                    # NEW: Compiled providers
├── docs/                             # NEW: Documentation
│   ├── ENHANCEMENTS.md               # Complete enhancement plan (500+ lines)
│   ├── PROVIDER_SETUP_GUIDE.md       # Provider setup guide (600+ lines)
│   ├── IMPLEMENTATION_STATUS.md      # Project tracking
│   ├── PHASE1_SUMMARY.md             # Phase 1 details
│   └── COMPLETION_SUMMARY.md         # This release summary
├── demo/
│   └── ecom-backend/                 # Demo workspace
├── README.md                         # Updated with new features
├── CHANGELOG.md                      # Version 0.2.0 release notes
├── package.json                      # Enhanced with new settings & commands
└── tsconfig.json                     # TypeScript configuration

```

## Code Organization

### Core Provider System (`src/providers/`)

```
base.ts
├── LLMProvider (abstract class)
│   ├── completeJSON()
│   ├── complete()
│   ├── streamComplete()
│   ├── checkHealth()
│   ├── getHealth()
│   ├── isConfigured()
│   ├── getDefaultModel()
│   └── getAvailableModels()
├── Interfaces
│   ├── LLMRequest
│   ├── LLMResponse
│   ├── ProviderConfig
│   ├── ProviderHealth
│   └── ProviderCapabilities
└── Enums
    └── ProviderType

factory.ts
├── ProviderRegistry (singleton)
│   ├── register()
│   ├── get()
│   ├── getAll()
│   ├── getConfigured()
│   ├── setActive()
│   └── getActive()
└── ProviderFactory
    ├── initializeFromSettings()
    ├── createProvider()
    ├── getRegistry()
    ├── getActiveProvider()
    └── reload()

groq.ts
└── GroqProvider extends LLMProvider
    ├── Models: llama3-8b-8192, llama3-70b-8192, mixtral-8x7b-32768
    └── Authentication: API Key

openai.ts
└── OpenAIProvider extends LLMProvider
    ├── Models: gpt-4, gpt-4-turbo, gpt-3.5-turbo
    ├── Authentication: API Key
    └── Features: Token counting, Cost estimation

azure-openai.ts
└── AzureOpenAIProvider extends LLMProvider
    ├── Authentication Methods:
    │   ├── API Key
    │   ├── Azure CLI (token-based)
    │   └── Managed Identity (RBAC)
    ├── Token Management
    │   ├── Automatic caching
    │   ├── Expiration tracking
    │   └── Refresh logic
    └── Utilities:
        ├── isAzureCliAvailable()
        ├── isAzureCliAuthenticated()
        ├── isAzureEnvironment()
        └── getAuthStatus()
```

### Extension Integration (`src/extension.ts`)

```
extension.ts
├── activate()
│   ├── Initialize provider system
│   ├── Create status bar item
│   └── Register commands
├── Commands
│   ├── generateErrorPrompt (existing)
│   ├── analyzeProject (existing)
│   ├── selectProvider (NEW)
│   ├── testProvider (NEW)
│   ├── reloadProviders (NEW)
│   └── showProviderStatus (NEW)
├── Handlers
│   ├── handleGenerateErrorPrompt()
│   ├── handleAnalyzeProjectAndGeneratePrompts()
│   ├── handleSelectProvider()          # NEW
│   ├── handleTestProvider()            # NEW
│   ├── handleReloadProviders()         # NEW
│   └── handleShowProviderStatus()      # NEW
└── UI
    ├── Status bar integration
    └── updateStatusBar()
```

## Configuration Schema

### Provider Settings

```json
{
  // General
  "promptCraft.activeProvider": "groq | openai | azure-openai",
  
  // Groq
  "promptCraft.groqApiKey": "string",
  "promptCraft.requestTimeoutMs": "number (1000-20000)",
  
  // OpenAI
  "promptCraft.openai.apiKey": "string",
  "promptCraft.openai.model": "gpt-4 | gpt-4-turbo | gpt-3.5-turbo",
  "promptCraft.openai.timeout": "number (1000-60000)",
  
  // Azure OpenAI
  "promptCraft.azureOpenAI.endpoint": "string (URL)",
  "promptCraft.azureOpenAI.apiKey": "string",
  "promptCraft.azureOpenAI.deploymentName": "string",
  "promptCraft.azureOpenAI.apiVersion": "string (default: 2024-02-01)",
  "promptCraft.azureOpenAI.authMethod": "apiKey | azureCli | managedIdentity",
  "promptCraft.azureOpenAI.timeout": "number (1000-60000)"
}
```

## Commands

### Existing Commands (v0.0.1)
- `prompt-craft.generateErrorPrompt` - Generate error prompts
- `prompt-craft.analyzeProject` - Analyze project and generate prompts

### New Commands (v0.2.0)
- `prompt-craft.selectProvider` - Select active LLM provider
- `prompt-craft.testProvider` - Test provider connection
- `prompt-craft.showProviderStatus` - Show provider status panel
- `prompt-craft.reloadProviders` - Reload providers from settings

## File Statistics

### TypeScript Source Files
```
src/providers/base.ts          174 lines
src/providers/factory.ts        233 lines
src/providers/groq.ts           191 lines
src/providers/openai.ts         238 lines
src/providers/azure-openai.ts   492 lines
src/extension.ts                420 lines (150+ new)
src/llm.ts                       37 lines (refactored)
-------------------------------------------
Total New/Modified:            ~1,785 lines
```

### Documentation Files
```
ENHANCEMENTS.md                 500+ lines
PROVIDER_SETUP_GUIDE.md         600+ lines
IMPLEMENTATION_STATUS.md        400+ lines
PHASE1_SUMMARY.md               200+ lines
COMPLETION_SUMMARY.md           300+ lines
README.md (updates)             100+ lines
CHANGELOG.md (updates)           50+ lines
-------------------------------------------
Total Documentation:           ~2,150 lines
```

### Configuration
```
package.json (enhanced)         87 lines (50+ new)
```

## Data Flow

### Provider Selection Flow
```
User Action (Status Bar Click)
    ↓
selectProvider Command
    ↓
handleSelectProvider()
    ↓
ProviderRegistry.getAll()
    ↓
QuickPick Menu (Shows all providers)
    ↓
User Selects Provider
    ↓
ProviderRegistry.setActive(type)
    ↓
updateStatusBar()
    ↓
Visual Feedback to User
```

### LLM Request Flow
```
Prompt Generation Request
    ↓
ProviderFactory.getActiveProvider()
    ↓
Active Provider Retrieved
    ↓
provider.completeJSON(request)
    ↓
Authentication (Provider-Specific)
    ├─ Groq: API Key Header
    ├─ OpenAI: API Key Header
    └─ Azure: API Key | CLI Token | Managed Identity Token
    ↓
HTTP Request to Provider API
    ↓
Response Handling
    ├─ Success: Return content
    └─ Error: Provider-specific error handling
    ↓
Result to User
```

### Azure CLI Authentication Flow
```
Request with authMethod: "azureCli"
    ↓
Check cached token
    ├─ Valid → Use cached token
    └─ Expired/None → Continue
        ↓
        Check Azure CLI installed
            ├─ Not installed → Error with installation guide
            └─ Installed → Continue
                ↓
                Check Azure CLI logged in
                    ├─ Not logged in → Error: "Run az login"
                    └─ Logged in → Continue
                        ↓
                        Execute: az account get-access-token
                        ↓
                        Parse access token
                        ↓
                        Cache token with expiration
                        ↓
                        Use token in request
```

## Extension Points

### Adding a New Provider

1. Create new provider file: `src/providers/[name].ts`
2. Implement `LLMProvider` abstract class:
   ```typescript
   export class MyProvider extends LLMProvider {
     getType() { return ProviderType.MY_PROVIDER; }
     getName() { return 'My Provider'; }
     isConfigured() { /* check config */ }
     completeJSON(request) { /* implementation */ }
     complete(request) { /* implementation */ }
     // ... other methods
   }
   ```
3. Add to `ProviderType` enum in `base.ts`
4. Add to factory in `factory.ts`:
   ```typescript
   case ProviderType.MY_PROVIDER:
     return new MyProvider(config);
   ```
5. Add settings to `package.json`
6. Add initialization in `factory.ts` `initializeFromSettings()`
7. Document in `PROVIDER_SETUP_GUIDE.md`

### Estimated Effort for New Provider
- Simple provider (API key only): 2-3 hours
- Complex provider (multiple auth): 4-6 hours
- Documentation and testing: 2-3 hours

## Dependencies

### Runtime Dependencies
```json
{
  "axios": "^1.7.2"
}
```

### Development Dependencies
```json
{
  "@types/node": "^18.19.0",
  "@types/vscode": "^1.84.0",
  "typescript": "^5.5.0"
}
```

## Build Artifacts

### Compilation Output (`out/`)
```
out/
├── providers/
│   ├── base.js
│   ├── factory.js
│   ├── groq.js
│   ├── openai.js
│   └── azure-openai.js
├── extension.js
├── llm.js
├── analyzer.js
├── domain.js
└── templates.js
```

## Version History

### v0.0.1 (Initial Release)
- Single provider (Groq)
- Basic error and project prompts
- Demo workspace

### v0.2.0 (Current)
- Multi-provider architecture
- 3 LLM providers (Groq, OpenAI, Azure OpenAI)
- 5 authentication methods
- Enhanced UI with status bar
- Comprehensive documentation
- 4 new commands

### Future (Planned)
- v0.3.0: Claude, Ollama, provider fallback
- v0.4.0: Enhanced analysis, templates, caching
- v0.5.0: Testing, polish, marketplace release

---

**Architecture Status**: Production Ready
**Code Quality**: Clean (0 errors, 0 warnings)
**Documentation**: Comprehensive
**Testing**: Manual (automated tests pending)

