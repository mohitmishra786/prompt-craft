<div align="center">

# Prompt Craft Pro

*"Context is the bridge between a query and a solution."*

The Ultimate AI Prompting Companion. Generate context-aware prompts for ChatGPT, Claude, and Copilot by analyzing your code, architecture, and errors.

[![Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/mohitmishra.prompt-craft?style=flat-square&color=007acc)](https://marketplace.visualstudio.com/items?itemName=mohitmishra.prompt-craft)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Twitter Follow](https://img.shields.io/twitter/follow/chessMan786?style=social)](https://x.com/chessMan786)

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/VS_Code-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/Anthropic-D97757?style=for-the-badge&logo=anthropic&logoColor=white" />
</p>

</div>

---

Most developers spend significant time copy-pasting code snippets, environment details, and error logs into AI tools, only to receive generic or shallow advice. The AI lacks the deep context of your project's architecture, dependencies, and symbol definitions.

This is context friction. It slows down your workflow and leads to hallucinations.

**Prompt Craft Pro** eliminates this friction. It automatically gathers the relevant file snippets, project heuristics, and deep symbol definitions (interfaces/classes) to build structured, high-fidelity prompts that give AI assistants exactly what they need to provide precise solutions.

## What It Actually Does

When you trigger Prompt Craft Pro, it performs three primary actions to bridge the context gap.

First, it runs a fast, non-intrusive analysis of your workspace. It detects your tech stack, summarizes your README, maps your Express routes, and extracts Mongoose schemas. It even generates a concise ASCII tree of your source directory to give the AI spatial awareness.

Second, it captures the immediate context of your task. For errors, it identifies failing symbols and resolves their definitions across your project. For planning, it suggests tasks based on your domain (e.g., e-commerce, API, or library).

Third, it generates and sanitizes your prompt:

| Output | Purpose |
| :--- | :--- |
| **Interactive Sidebar** | Preview, edit, and refine your generated prompts before copying. |
| **Secret Redaction** | Automatically identifies and masks API keys and passwords. |
| **Provider Fallback** | Tries your preferred LLM (Groq, OpenAI, Ollama) to refine the prompt. |

## Supported Ecosystems

Prompt Craft Pro is designed for modern backend and full-stack development, with expanding support for multiple languages.

**Deep Integration** for JavaScript and TypeScript captures the nuances of Node.js environments, including framework-specific heuristics for Express and MongoDB.

**Broad Support** for Python, Java, and Go ensures that stack traces are parsed accurately and relevant configuration files (requirements.txt, pom.xml, go.mod) are included in the analysis.

**Privacy Focused** architecture includes native support for Ollama. You can run Llama 3, Mistral, or CodeLlama locally to keep your codebase entirely on your hardware while still benefiting from AI-enhanced prompt refinement.

## Security and Trust

Security is a first-class citizen. Prompt Craft Pro includes a built-in sanitization layer that scans every generated prompt for sensitive patterns.

**Automatic Masking** redacts AWS keys, OpenAI tokens, GitHub PATs, and database connection strings. This ensures you never accidentally leak credentials when pasting context into a public or shared AI chat.

**No Data Collection.** The extension operates entirely within your local VS Code environment. Analyzed code snippets and generated prompts are never stored or sent to any telemetry backend beyond basic, anonymous event counts (which you can opt-out of).

## Philosophy

*"Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away."* — Antoine de Saint-Exupéry

Prompt Craft Pro works by curation, not just collection. Instead of dumping your entire project into a prompt, it selects the essential architectural signals and specific code snippets that matter. The result is a prompt that is high-density and low-noise, respecting the context limits of your AI assistant.

---

MIT License
