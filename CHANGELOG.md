# Changelog

## v0.2.0 - 2025-12-13

### Major Release: Multi-Provider Support

#### Added
- **Multi-Provider Architecture**: Support for Groq, OpenAI, and Azure OpenAI
- **OpenAI Integration**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo support
- **Azure OpenAI**: Three authentication methods (API Key, Azure CLI, Managed Identity)
- **Provider UI**: Status bar, provider selection, health checks, status panel
- **New Commands**:
  - Select LLM Provider
  - Test Provider Connection
  - Show Provider Status
  - Reload Providers from Settings

#### Enhanced
- Provider-specific configuration and error handling
- Automatic token management for Azure authentication
- Real-time health monitoring
- Comprehensive documentation and setup guides

#### Technical
- Abstract provider interface and factory pattern
- Type-safe provider implementations
- Full backward compatibility with v0.0.1
- Enhanced logging and diagnostics

---

## v0.0.1 - Initial Release
- Initial prototype release
- Error and project prompt generation
- Demo workspace (`demo/ecom-backend`)
- Optional Groq LLM enhancement (project + error)
- Domain inference and simple controller/model summaries
- Shared context header to reduce repetition