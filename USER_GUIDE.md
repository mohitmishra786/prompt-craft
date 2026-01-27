# Prompt Craft: User Guide & Documentation

Prompt Craft is a VS Code extension designed to streamline the generation of high-quality prompts for AI coding assistants (like ChatGPT, Claude, or Copilot) by automatically analyzing your project's context and specific errors.

## 🚀 Key Features

- **Deep Error Context:** Automatically captures file snippets and symbol definitions (interfaces/classes) related to your errors.
- **Smart Project Analysis:** Analyzes your tech stack, architecture, and domain to suggest relevant tasks.
- **Multi-Language Support:** Supports JavaScript, TypeScript, Python, Java, and Go.
- **Privacy Focused:** Support for local models via **Ollama**.
- **Interactive Sidebar:** Preview, refine, and copy prompts directly from a dedicated sidebar.
- **Secure:** Automatically redacts API keys and secrets from generated prompts.

## 🛠️ Getting Started

### Installation
1. Search for "Prompt Craft" in the VS Code Marketplace.
2. Click **Install**.

### Configuration
Go to VS Code Settings (`Cmd+,`) and search for `Prompt Craft`:
- **Active Provider:** Select your preferred LLM (Groq, OpenAI, Azure, Claude, Ollama).
- **API Keys:** Enter your keys for cloud providers.
- **Ollama:** Enable and set the base URL for local execution.

## 📖 How to Use

### 1. Fixing Errors
When you have an error in your code:
- Click the **"Generate Error Prompt"** button in the sidebar or run the command from the Command Palette (`Cmd+Shift+P`).
- If an error is detected in the "Problems" panel, it will be used automatically.
- Otherwise, the extension will check your clipboard for a stack trace.

### 2. Project Onboarding & Planning
When opening a new project:
- The extension automatically runs a brief analysis.
- Click **"Analyze Project"** to generate a set of prompts for common tasks (e.g., "Add authentication", "Optimize DB queries").

### 3. Using the Sidebar
- Preview your prompts in the **Prompt Assistant** sidebar.
- Use the **"Copy to Clipboard"** button to quickly paste the prompt into your AI chat.

## 🔒 Security & Privacy
- **Redaction:** The extension uses regex patterns to find and mask sensitive data before it ever leaves your machine.
- **Local LLMs:** Use Ollama to keep all code analysis strictly on your local hardware.

## 🐛 Troubleshooting
- **No Provider Configured:** Ensure you have added an API key in settings or enabled Ollama.
- **Analysis Fails:** Ensure your workspace has a `package.json` or equivalent for your language.
