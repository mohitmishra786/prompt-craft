import * as vscode from "vscode";
import * as path from "path";
import { analyzeProject, getCodeSnippetAround } from "./analyzer";
import { buildErrorPrompt, buildProjectPrompt, defaultProjectTaskIdeas, ecommerceTaskIdeas, buildLLMUserProjectMessage, buildLLMUserErrorMessage } from "./templates";
import { buildGroqClientFromSettings, buildErrorSystemPrompt, buildProjectSystemPrompt } from "./llm";
import { ProviderFactory, ProviderRegistry } from "./providers/factory";

let output: vscode.OutputChannel | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

export async function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("Prompt Craft");

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "prompt-craft.selectProvider";
  statusBarItem.tooltip = "Click to select LLM provider";
  context.subscriptions.push(statusBarItem);

  // Initialize provider system
  try {
    await ProviderFactory.initializeFromSettings();
    updateStatusBar();
    log("Provider system initialized");
  } catch (err) {
    log(`Warning: Provider initialization failed: ${toErrorMessage(err)}`);
    updateStatusBar();
  }

  const generateErrorPromptCmd = vscode.commands.registerCommand(
    "prompt-craft.generateErrorPrompt",
    async () => {
      try {
        await handleGenerateErrorPrompt();
      } catch (err) {
        log(`Failed to generate error prompt: ${toErrorMessage(err)}`);
        void vscode.window.showErrorMessage("Prompt Craft: Failed to generate error prompt.");
      }
    }
  );

  const analyzeProjectCmd = vscode.commands.registerCommand(
    "prompt-craft.analyzeProject",
    async () => {
      try {
        await handleAnalyzeProjectAndGeneratePrompts();
      } catch (err) {
        log(`Failed to analyze project: ${toErrorMessage(err)}`);
        void vscode.window.showErrorMessage("Prompt Craft: Failed to analyze project.");
      }
    }
  );

  // New commands for provider management
  const selectProviderCmd = vscode.commands.registerCommand(
    "prompt-craft.selectProvider",
    async () => {
      try {
        await handleSelectProvider();
      } catch (err) {
        log(`Failed to select provider: ${toErrorMessage(err)}`);
        void vscode.window.showErrorMessage("Prompt Craft: Failed to select provider.");
      }
    }
  );

  const testProviderCmd = vscode.commands.registerCommand(
    "prompt-craft.testProvider",
    async () => {
      try {
        await handleTestProvider();
      } catch (err) {
        log(`Failed to test provider: ${toErrorMessage(err)}`);
        void vscode.window.showErrorMessage("Prompt Craft: Failed to test provider.");
      }
    }
  );

  const reloadProvidersCmd = vscode.commands.registerCommand(
    "prompt-craft.reloadProviders",
    async () => {
      try {
        await handleReloadProviders();
      } catch (err) {
        log(`Failed to reload providers: ${toErrorMessage(err)}`);
        void vscode.window.showErrorMessage("Prompt Craft: Failed to reload providers.");
      }
    }
  );

  const showProviderStatusCmd = vscode.commands.registerCommand(
    "prompt-craft.showProviderStatus",
    async () => {
      try {
        await handleShowProviderStatus();
      } catch (err) {
        log(`Failed to show provider status: ${toErrorMessage(err)}`);
        void vscode.window.showErrorMessage("Prompt Craft: Failed to show provider status.");
      }
    }
  );

  context.subscriptions.push(
    generateErrorPromptCmd, 
    analyzeProjectCmd, 
    selectProviderCmd,
    testProviderCmd,
    reloadProvidersCmd,
    showProviderStatusCmd,
    output
  );

  // Auto-analyze on startup if a workspace is open and README exists
  const root = getWorkspaceRoot();
  if (root) {
    const readmeUri = vscode.Uri.joinPath(root.uri, "README.md");
    try {
      await vscode.workspace.fs.stat(readmeUri);
      // Fire and forget
      void handleAnalyzeProjectAndGeneratePrompts();
    } catch {
      // No README, skip auto-analysis
    }
  }
}

export function deactivate() {
  output?.dispose();
  statusBarItem?.dispose();
}

function updateStatusBar() {
  if (!statusBarItem) return;

  const registry = ProviderRegistry.getInstance();
  const activeProvider = registry.getActive();
  const configuredCount = registry.getConfigured().length;

  if (activeProvider) {
    statusBarItem.text = `$(zap) ${activeProvider.getName()}`;
    statusBarItem.backgroundColor = undefined;
    statusBarItem.show();
  } else if (configuredCount > 0) {
    statusBarItem.text = `$(warning) No Provider Selected`;
    statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    statusBarItem.show();
  } else {
    statusBarItem.text = `$(error) No Provider Configured`;
    statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    statusBarItem.show();
  }
}

async function handleGenerateErrorPrompt(): Promise<void> {
  const root = getWorkspaceRoot();
  const analysis = root ? await analyzeProject(root.uri.fsPath) : undefined;

  const errorInfo = await findErrorFromDiagnostics();
  let errorMessage = errorInfo?.message ?? "";
  let filePath = errorInfo?.filePath;
  let line = errorInfo?.line;
  let stackTrace = errorInfo?.stack;

  if (!errorMessage) {
    const pasted = await vscode.window.showInputBox({
      prompt: "Paste error output (stack trace)",
      ignoreFocusOut: true
    });
    if (!pasted) {
      void vscode.window.showInformationMessage("No error provided.");
      return;
    }
    errorMessage = pasted.split("\n")[0]?.slice(0, 500) ?? pasted;
    stackTrace = pasted;
    const parsed = parseStackForFileAndLine(pasted, root?.uri.fsPath);
    filePath = parsed?.filePath;
    line = parsed?.line;
  }

  let snippet: string | undefined;
  if (filePath && line) {
    snippet = await getCodeSnippetAround(filePath, line, 12);
  }

  const language = analysis?.techStack?.includes("TypeScript") ? "TypeScript" : "JavaScript";

  const prompt = buildErrorPrompt({
    language,
    dependencies: analysis?.dependencies ?? [],
    errorMessage,
    stackTrace,
    filePath,
    line,
    codeSnippet: snippet,
    architectureSummary: analysis?.architectureSummary
  });
  let finalPrompt = prompt;
  const apiKey = vscode.workspace.getConfiguration().get<string>("promptCraft.groqApiKey");
  const timeoutMs = vscode.workspace.getConfiguration().get<number>("promptCraft.requestTimeoutMs");
  const groq = buildGroqClientFromSettings(apiKey, timeoutMs);
  let errorLlmUsed = false;
  if (groq) {
    try {
      const system = buildErrorSystemPrompt();
      const user = buildLLMUserErrorMessage(prompt);
      const content = await groq.completeJSON({ model: "llama3-8b-8192", system, user });
      finalPrompt = content.trim();
      errorLlmUsed = true;
    } catch (err) {
      log(`LLM error prompt refinement failed, using template: ${toErrorMessage(err)}`);
    }
  }

  showPromptToUser("Error Prompt", `Generation: ${errorLlmUsed ? "LLM-enhanced" : "Template"}\n\n${finalPrompt}`);
}

async function handleAnalyzeProjectAndGeneratePrompts(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    void vscode.window.showInformationMessage("Open a folder to analyze the project.");
    return;
  }
  const analysis = await analyzeProject(root.uri.fsPath);
  const ideasBase = defaultProjectTaskIdeas(analysis.detection);
  const bugMention = /bug/i.test(analysis.readmeSummary ?? "");
  const domainIdeas = analysis.domain.domain === "ecommerce"
    ? ecommerceTaskIdeas({
        bugMentionedInReadme: bugMention,
        hasControllers: analysis.controllers.length > 0,
        hasModels: analysis.models.length > 0
      })
    : [];
  const ideas = Array.from(new Set([...domainIdeas, ...ideasBase])).slice(0, 6);

  // Shared project context header (avoid repetition in each prompt)
  const contextHeaderLines = [
    `Analyze this ${analysis.techStack} project.`,
    analysis.readmeSummary ? `README: ${analysis.readmeSummary}` : undefined,
    `Architecture: ${analysis.architectureSummary}`,
    `Dependencies: ${analysis.dependencies.slice(0, 25).join(", ")}`,
    analysis.domain.domain !== "unknown" ? `Domain: ${analysis.domain.domain} (${analysis.domain.domainHints.join(", ")})` : undefined,
    analysis.controllers.length ? `Controllers: ${analysis.controllers.map((c) => `${c.file} [${c.functions.slice(0,3).join(" ")}]`).join(", ")}` : undefined,
    analysis.models.length ? `Models: ${analysis.models.map((m) => `${m.file} [${m.fields.slice(0,5).join(" ")}]`).join(", ")}` : undefined
  ].filter(Boolean).join("\n");

  let prompts = ideas.map((idea) =>
    buildProjectPrompt({
      techStack: analysis.techStack,
      dependencies: analysis.dependencies,
      taskIdea: idea,
      contextHeader: contextHeaderLines
    })
  );

  // Optional LLM enhancement for project prompts
  let projectLlmUsed = false;
  const apiKey = vscode.workspace.getConfiguration().get<string>("promptCraft.groqApiKey");
  const timeoutMs = vscode.workspace.getConfiguration().get<number>("promptCraft.requestTimeoutMs");
  const groq = buildGroqClientFromSettings(apiKey, timeoutMs);
  if (groq) {
    try {
      const system = buildProjectSystemPrompt();
      const user = buildLLMUserProjectMessage({
        techStack: analysis.techStack,
        detection: analysis.detection,
        domain: analysis.domain,
        architectureSummary: analysis.architectureSummary,
        dependencies: analysis.dependencies.slice(0, 50),
        controllers: analysis.controllers,
        models: analysis.models,
        sampleQueries: analysis["sampleQueries"] ?? [],
        readmeSummary: analysis.readmeSummary ?? ""
      });
      const content = await groq.completeJSON({ model: "llama3-8b-8192", system, user });
      // Show only refined content (header already summarizes context)
      prompts = [content.trim()];
      projectLlmUsed = true;
    } catch (err) {
      log(`LLM project generation failed, falling back to templates: ${toErrorMessage(err)}`);
    }
  }

  const techExtras: string[] = [];
  if (analysis.detection.usesExpress) techExtras.push("Express");
  if (analysis.detection.usesMongo) techExtras.push("MongoDB");
  if (analysis.detection.usesReact) techExtras.push("React");

  const header = `Project Analysis for ${path.basename(analysis.rootPath)}\n` +
    `Tech Stack: ${analysis.techStack}${techExtras.length ? ` (+ ${techExtras.join(', ')})` : ''}\n` +
    `Architecture: ${analysis.architectureSummary}\n` +
    `Dependencies: ${analysis.dependencies.slice(0, 25).join(", ")}\n` +
    (analysis.readmeSummary ? `README (summary): ${analysis.readmeSummary}\n` : "") +
    `Generation: ${projectLlmUsed ? "LLM-enhanced" : "Template"}`;

  const combined = projectLlmUsed
    ? [header, prompts[0]].join("\n\n")
    : [header, ...prompts.map((p, i) => `===== Prompt ${i + 1} =====\n${p}`)].join("\n\n\n");
  showPromptToUser("Project Prompts", combined);
}

function getWorkspaceRoot(): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;
  return folders[0];
}

function showPromptToUser(title: string, text: string) {
  output?.clear();
  output?.appendLine(`# ${title}`);
  output?.appendLine("");
  output?.appendLine(text);
  output?.show(true);

  void vscode.env.clipboard.writeText(text);
  void vscode.window.showInformationMessage(
    `${title} generated and copied to clipboard.`,
    "Copy again"
  ).then((action) => {
    if (action === "Copy again") void vscode.env.clipboard.writeText(text);
  });
}

function log(msg: string) {
  output?.appendLine(`[Prompt Craft] ${msg}`);
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

async function findErrorFromDiagnostics(): Promise<{
  message: string;
  filePath?: string;
  line?: number;
  stack?: string;
} | undefined> {
  const all = vscode.languages.getDiagnostics();
  let best: { message: string; filePath?: string; line?: number } | undefined;
  for (const [uri, diags] of all) {
    for (const d of diags) {
      if (d.severity === vscode.DiagnosticSeverity.Error) {
        const filePath = uri.fsPath;
        const line = d.range.start.line + 1; // 1-based for display
        best = { message: d.message, filePath, line };
        break;
      }
    }
    if (best) break;
  }
  if (!best) return undefined;
  return { ...best, stack: best.message };
}

function parseStackForFileAndLine(stack: string, rootPath?: string): { filePath: string; line: number } | undefined {
  // Handles:
  // - /path/to/file.ts:10:5
  // - C:\\path\\to\\file.ts:10:5
  // - file:///.../file.ts:10:5
  // - at func (path:line:col)
  const regexes = [
    /(\(|\s)([A-Za-z]:\\\\[^\s)]+\.(?:ts|js|tsx|jsx)):(\d+):(\d+)(\))?/, // Windows paths
    /(\(|\s)([\/A-Za-z0-9_.:\\-]+\.(?:ts|js|tsx|jsx)):(\d+):(\d+)(\))?/, // POSIX paths
    /file:\/\/(.+\.(?:ts|js|tsx|jsx)):(\d+):(\d+)/ // file URLs
  ];
  const lines = stack.split(/\r?\n/);
  for (const currentLine of lines) {
    for (const rx of regexes) {
      const match = currentLine.match(rx);
      if (match) {
        const pathGroup = match[2] ?? match[1];
        const lineGroup = match[3] ?? match[2];
        const lineNumber = parseInt(lineGroup, 10);
        const p = pathGroup;
        const resolved = rootPath && p && !path.isAbsolute(p) ? path.join(rootPath, p) : p;
        return p ? { filePath: resolved, line: lineNumber } : undefined;
      }
    }
  }
  return undefined;
}

async function handleSelectProvider(): Promise<void> {
  const registry = ProviderRegistry.getInstance();
  const allProviders = registry.getAll();

  if (allProviders.length === 0) {
    void vscode.window.showInformationMessage(
      "No LLM providers configured. Please configure at least one provider in settings."
    );
    return;
  }

  const items = allProviders.map(provider => ({
    label: provider.getName(),
    description: provider.isConfigured() ? "Configured" : "Not configured",
    detail: `Type: ${provider.getType()} | Models: ${provider.getAvailableModels().join(", ")}`,
    provider
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select an LLM provider",
    matchOnDescription: true,
    matchOnDetail: true
  });

  if (!selected) {
    return;
  }

  if (!selected.provider.isConfigured()) {
    void vscode.window.showWarningMessage(
      `${selected.provider.getName()} is not configured. Please add your API key in settings.`
    );
    return;
  }

  const success = registry.setActive(selected.provider.getType());
  if (success) {
    updateStatusBar();
    void vscode.window.showInformationMessage(
      `Active provider set to: ${selected.provider.getName()}`
    );
    log(`Active provider changed to: ${selected.provider.getName()}`);
  } else {
    void vscode.window.showErrorMessage(
      `Failed to set active provider to: ${selected.provider.getName()}`
    );
  }
}

async function handleTestProvider(): Promise<void> {
  const registry = ProviderRegistry.getInstance();
  const activeProvider = registry.getActive();

  if (!activeProvider) {
    void vscode.window.showWarningMessage(
      "No active provider. Please configure and select a provider first."
    );
    return;
  }

  void vscode.window.showInformationMessage(
    `Testing connection to ${activeProvider.getName()}...`
  );

  log(`Testing provider: ${activeProvider.getName()}`);

  try {
    const health = await activeProvider.checkHealth();
    
    if (health.status === "healthy") {
      const message = `${activeProvider.getName()} is working correctly! Response time: ${health.responseTime}ms`;
      void vscode.window.showInformationMessage(message);
      log(message);
    } else {
      const message = `${activeProvider.getName()} health check failed: ${health.errorMessage}`;
      void vscode.window.showErrorMessage(message);
      log(message);
    }
  } catch (err) {
    const message = `Failed to test ${activeProvider.getName()}: ${toErrorMessage(err)}`;
    void vscode.window.showErrorMessage(message);
    log(message);
  }
}

async function handleReloadProviders(): Promise<void> {
  try {
    log("Reloading providers from settings...");
    await ProviderFactory.reload();
    updateStatusBar();
    
    const registry = ProviderRegistry.getInstance();
    const configured = registry.getConfigured();
    
    void vscode.window.showInformationMessage(
      `Providers reloaded. ${configured.length} provider(s) configured.`
    );
    log(`Providers reloaded: ${configured.map(p => p.getName()).join(", ")}`);
  } catch (err) {
    const message = `Failed to reload providers: ${toErrorMessage(err)}`;
    void vscode.window.showErrorMessage(message);
    log(message);
  }
}

async function handleShowProviderStatus(): Promise<void> {
  const registry = ProviderRegistry.getInstance();
  const allProviders = registry.getAll();
  const activeProvider = registry.getActive();

  if (allProviders.length === 0) {
    void vscode.window.showInformationMessage(
      "No providers configured. Please add provider settings in VS Code settings."
    );
    return;
  }

  output?.clear();
  output?.appendLine("# Provider Status\n");
  output?.appendLine(`Active Provider: ${activeProvider ? activeProvider.getName() : "None"}\n`);
  output?.appendLine("## Configured Providers\n");

  for (const provider of allProviders) {
    const isActive = activeProvider?.getType() === provider.getType();
    const health = provider.getHealth();
    const capabilities = provider.getCapabilities();
    
    output?.appendLine(`${isActive ? "* " : "  "}${provider.getName()} (${provider.getType()})`);
    output?.appendLine(`  - Configured: ${provider.isConfigured() ? "Yes" : "No"}`);
    output?.appendLine(`  - Status: ${health.status}`);
    if (health.responseTime) {
      output?.appendLine(`  - Response Time: ${health.responseTime}ms`);
    }
    if (health.errorMessage) {
      output?.appendLine(`  - Error: ${health.errorMessage}`);
    }
    output?.appendLine(`  - Models: ${provider.getAvailableModels().join(", ")}`);
    output?.appendLine(`  - Capabilities: ${Object.entries(capabilities).filter(([_, v]) => v).map(([k]) => k).join(", ")}`);
    
    // Show Azure-specific auth status
    if (provider.getType() === "azure-openai") {
      const azureProvider = provider as any;
      if (azureProvider.getAuthStatus) {
        const authStatus = await azureProvider.getAuthStatus();
        output?.appendLine(`  - Auth Method: ${authStatus.method}`);
        output?.appendLine(`  - Auth Status: ${authStatus.message}`);
      }
    }
    
    output?.appendLine("");
  }

  output?.show(true);
  void vscode.window.showInformationMessage("Provider status displayed in output panel.");
}

