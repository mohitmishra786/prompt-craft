You are an expert AI coding assistant tasked with generating a complete, working prototype for a Visual Studio Code (VS Code) extension. This extension will automate the generation of detailed prompts for use in external AI coding tools like GitHub Copilot, Cursor, or ChatGPT. The prompts will be based on dynamic analysis of the user's project, focusing on two main scenarios:

1. **Error Detection and Prompt Generation:**
   - When code execution or builds fail (e.g., via terminal errors, debugger events, or linter issues), the extension should capture the error details (stack trace, error message, file/line numbers, relevant code snippets).
   - It should then generate a structured, detailed prompt that describes the error in context, including surrounding code, project tech stack, and suggested goals (e.g., "fix this bug" or "explain why this failed").
   - The prompt should be optimized for AI chats: concise yet comprehensive, with sections like "Context", "Error Details", "Code Snippet", "Goal", and "Constraints" (e.g., language version, dependencies).

2. **New Project Analysis and Prompt Generation:**
   - When a new workspace or folder is opened, or on user command, the extension should analyze the codebase: parse README.md (if present) for project overview; scan key files for architecture (e.g., detect MVC patterns, main entry points); identify tech stack from files like package.json, requirements.txt, or pom.xml; summarize file structure and dependencies.
   - Based on this, generate a set of initial prompts for common tasks, such as "Outline steps to add authentication" or "Suggest improvements to the database schema", tailored to the detected architecture.

**Requirements for the Prototype:**
- **Platform:** Build this as a VS Code extension using TypeScript (Node.js runtime). Use the VS Code Extension API for integration.
- **MVP Scope (Keep it Prototypable and Functional):** Focus on JavaScript/Node.js projects initially (e.g., support package.json and JS/TS files). Limit analysis to small-to-medium codebases (<100 files) to ensure quick prototyping. No external LLM dependencies—use rule-based templates for prompt generation (e.g., string interpolation). Make it extensible for future LLM integration.
- **User Interface:**
  - Add commands to VS Code: "Generate Error Prompt" (triggered manually or on error detection) and "Analyze Project and Generate Prompts" (on workspace open or command).
  - Display generated prompts in a VS Code Output Channel or Webview panel, with a "Copy to Clipboard" button.
  - For errors: Hook into VS Code's Terminal or Problems API to detect issues automatically (e.g., listen for terminal output matching error patterns like "Error:", "Traceback", etc.).
- **Technical Details:**
  - **Error Handling Module:** Use VS Code's `vscode.window.createTerminal` or `vscode.tasks` events if possible, but for simplicity, add a command that reads the active terminal's output or parses the Problems view. Extract error info using regex (e.g., for Node.js: match "at [file]:[line]").
  - **Project Analysis Module:** Use Node.js fs module to read files; parse JSON for package.json; use simple heuristics for architecture (e.g., look for folders like 'src/controllers', 'models'); extract README content with markdown parsing if needed (use 'marked' library, but bundle it or use built-in alternatives).
  - **Prompt Templates:** Define reusable string templates, e.g.:
    - Error Prompt: "In a {language} project using {dependencies}, this error occurred: {errorMessage}. Stack trace: {stackTrace}. Relevant code from {file}:{line}: {codeSnippet}. Suggest fixes considering the {architectureSummary}."
    - Project Prompt: "Analyze this {techStack} project: {readmeSummary}. Architecture: {archDetails}. Generate steps for {taskIdea}, ensuring compatibility with {dependencies}."
    - Generate 3-5 project prompts by default, based on common patterns (e.g., if auth files detected, suggest security tasks).
  - **Dependencies:** Use only VS Code APIs and Node.js builtins. If needed, include minimal npm packages like 'glob' for file scanning (assume they can be installed during extension setup).
  - **Activation and Events:** Activate on workspace open (analyze if README exists); add event listeners for terminal creation or problem changes.
  - **Error Handling in Extension:** Graceful failures (e.g., if no error detected, show message); log to VS Code output.
  - **Testing and Demo:** Include a sample activation script and instructions for testing in VS Code (e.g., via 'Run Extension' in debug mode). Assume a simple Node.js project for demo.
- **Output Format:** Provide the full extension code structure:
  - package.json (with commands, activation events).
  - extension.ts (main logic).
  - Any helper files (e.g., templates.ts, analyzer.ts).
  - README.md for the extension itself, with installation instructions.
  - Make it self-contained: No external APIs or internet required.
- **Best Practices:** Follow VS Code extension guidelines (e.g., use async/await, dispose resources). Keep code modular, commented, and under 1000 lines for prototype. Ensure it's secure (no eval, no writing files without permission). 

also always  update the file named [_codeContext.md](_codeContext.md) with whatever changes you do this will help you understand what you already did and make sure to check this always before doing any new changes

Generate the complete code for this VS Code extension prototype. If any part can't be fully implemented without testing, note it as a TODO with explanations.