export interface ErrorPromptInput {
  language: string;
  dependencies: string[];
  errorMessage: string;
  stackTrace?: string;
  filePath?: string;
  line?: number;
  codeSnippet?: string;
  architectureSummary?: string;
}

export interface ProjectPromptInput {
  techStack: string;
  readmeSummary?: string;
  archDetails?: string;
  dependencies: string[];
  taskIdea: string;
  contextHeader?: string;
}

export function buildErrorPrompt(input: ErrorPromptInput): string {
  const deps = input.dependencies.length > 0 ? input.dependencies.join(", ") : "unknown dependencies";
  const stack = input.stackTrace ? `\nStack trace:\n${input.stackTrace}` : "";
  const fileLoc = input.filePath ? `${input.filePath}${input.line ? ":" + input.line : ""}` : "unknown location";
  const snippet = input.codeSnippet ? `\nRelevant code from ${fileLoc}:\n\n${input.codeSnippet}` : "";
  const arch = input.architectureSummary ? `\nArchitecture summary: ${input.architectureSummary}` : "";

  return [
    `Context: You are helping with a ${input.language} project using ${deps}.`,
    `Error Details: ${input.errorMessage}`,
    stack.trim(),
    snippet.trim(),
    arch.trim(),
    `Goal: Explain why this failed and propose precise code-level fixes. Provide step-by-step guidance and note any assumptions.`,
    `Constraints: Keep solutions compatible with the current dependencies and language level.`
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildProjectPrompt(input: ProjectPromptInput): string {
  const deps = input.dependencies.length > 0 ? input.dependencies.join(", ") : "unknown dependencies";
  const contextLines: string[] = [];
  if (input.contextHeader) {
    contextLines.push(input.contextHeader);
  } else {
    contextLines.push(`Analyze this ${input.techStack} project.`);
    if (input.readmeSummary) contextLines.push(`README: ${input.readmeSummary}`);
    if (input.archDetails) contextLines.push(`Architecture: ${input.archDetails}`);
    contextLines.push(`Dependencies: ${deps}`);
  }

  const body = [
    `Task: ${input.taskIdea}.`,
    `Deliverable: A concise plan with steps, code edits where relevant, and considerations for testing and DX.`,
    `Constraints: Ensure compatibility with the existing stack and avoid large refactors unless justified.`
  ].join("\n");

  return `${contextLines.join("\n")}\n\n${body}`;
}

export function defaultProjectTaskIdeas(detected: {
  hasAuthHints: boolean;
  usesExpress: boolean;
  usesReact: boolean;
  usesMongo: boolean;
  hasTests: boolean;
}): string[] {
  const ideas: string[] = [];
  if (detected.usesExpress) {
    ideas.push("Add input validation and error handling middleware to existing routes");
  }
  if (detected.usesReact) {
    ideas.push("Improve state management and component structure for better maintainability");
  }
  if (detected.usesMongo) {
    ideas.push("Optimize MongoDB queries and add indexes for slow collections");
  }
  if (detected.hasAuthHints) {
    ideas.push("Audit authentication/authorization flow and suggest security improvements");
  }
  if (!detected.hasTests) {
    ideas.push("Introduce a basic testing setup and write example tests for critical modules");
  }
  if (ideas.length < 3) {
    ideas.push("Outline steps to set up CI scripts and linting to improve code quality");
  }
  return ideas.slice(0, 5);
}

export function ecommerceTaskIdeas(extra: {
  bugMentionedInReadme: boolean;
  hasControllers: boolean;
  hasModels: boolean;
}): string[] {
  const ideas: string[] = [];
  if (extra.bugMentionedInReadme) {
    ideas.push("Investigate and fix the intentional bug described in README (src/app.js)");
  }
  ideas.push("Add user authentication for checkout with session-based cart persistence");
  if (extra.hasControllers) {
    ideas.push("Document API routes and response shapes for product-related endpoints");
  }
  if (extra.hasModels) {
    ideas.push("Define Mongoose indexes for frequently queried Product fields (e.g., sku, category)");
  }
  ideas.push("Implement basic request validation for product creation and updates");
  return ideas.slice(0, 6);
}

// LLM prompts (used by extension when API key is present)
export function buildLLMUserProjectMessage(analysis: Record<string, unknown>): string {
  return `Project analysis JSON (truncated as needed):\n\n${JSON.stringify(analysis, null, 2).slice(0, 8000)}`;
}

export function buildLLMUserErrorMessage(errorPrompt: string): string {
  return `Error prompt to refine:\n\n${errorPrompt.slice(0, 8000)}`;
}

