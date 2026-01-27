import * as vscode from "vscode";
import * as path from "path";
import { analyzeProject, getCodeSnippetAround } from "./analyzer";
import { buildErrorPrompt, buildProjectPrompt, defaultProjectTaskIdeas, ecommerceTaskIdeas, buildLLMUserProjectMessage, buildLLMUserErrorMessage } from "./templates";
import { buildGroqClientFromSettings, buildErrorSystemPrompt, buildProjectSystemPrompt } from "./llm";
import { ProviderFactory, ProviderRegistry } from "./providers/factory";
import { sanitizePrompt } from "./sanitizer";
import { TelemetryService } from "./telemetry";
import { SidebarProvider } from "./sidebar";

let output: vscode.OutputChannel | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let sidebarProvider: SidebarProvider | undefined;

export async function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("Prompt Craft");

  // Register Sidebar
  sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "promptCraft.sidebar",
      sidebarProvider
    )
  );

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

  // Initialize telemetry
  TelemetryService.getInstance().sendEvent("EXTENSION_ACTIVATED");

  const generateErrorPromptCmd = vscode.commands.registerCommand(
    "prompt-craft.generateErrorPrompt",
    async () => {
      try {
        await handleGenerateErrorPrompt();
      } catch (err) {
        log(`Failed to generate error prompt: ${toErrorMessage(err)}`);
        void vscode.window.showErrorMessage("Prompt Craft: Failed to generate error prompt.");
        const sanitizedError = sanitizePrompt(toErrorMessage(err));
        TelemetryService.getInstance().sendEvent("ERROR_PROMPT_FAILED", { error: sanitizedError });
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

async function completeWithFallback(
  request: { system: string; user: string },
  generationType: "error" | "project"
): Promise<{ content: string; providerName: string } | undefined> {
  const registry = ProviderRegistry.getInstance();
  const chain = registry.getFallbackChain();

  for (const provider of chain) {
    try {
      log(`Attempting generation with ${provider.getName()} (${generationType})...`);
      const content = await provider.completeJSON({
        model: provider.getDefaultModel(),
        system: request.system,
        user: request.user
      });
      
      if (content) {
        log(`Successfully generated ${generationType} prompt with ${provider.getName()}`);
        return { content, providerName: provider.getName() };
      }
    } catch (err) {
      log(`Warning: Provider ${provider.getName()} failed: ${toErrorMessage(err)}`);
      // Continue to next provider
    }
  }

  return undefined;
}

async function handleGenerateErrorPrompt(): Promise<void> {
  const root = getWorkspaceRoot();
  const analysis = root ? await analyzeProject(root.uri.fsPath) : undefined;

  const errorInfo = await findErrorFromDiagnostics();
  let errorMessage = errorInfo?.message ?? "";
  let filePath = errorInfo?.filePath;
  let line = errorInfo?.line;
  let stackTrace = errorInfo?.stack;

  let useClipboard = false; // Hoist for telemetry

  if (!errorMessage) {
    // Enhance UX: Check clipboard for stack traces to avoid manual pasting
    const clipboardText = await vscode.env.clipboard.readText();
    const hasStackPattern = /Error:|Exception:|Traceback|at\s+[\w\.]+\s+\(|:\d+:\d+/i.test(clipboardText);
    const parsedClipboard = parseStackForFileAndLine(clipboardText, root?.uri.fsPath);

    if (hasStackPattern || parsedClipboard) {
      const selection = await vscode.window.showQuickPick(
        [
          { 
            label: "$(clippy) Use Clipboard Content", 
            description: "Detected potential error/stack trace", 
            detail: clipboardText.trim().slice(0, 120) + (clipboardText.length > 120 ? "..." : "") 
          },
          { 
            label: "$(edit) Paste Manually", 
            description: "Ignore clipboard and paste different error" 
          }
        ],
        { placeHolder: "Error details detected in clipboard. Use them?" }
      );

      if (selection?.label.includes("Use Clipboard")) {
        errorMessage = clipboardText.split("\n")[0]?.slice(0, 500) ?? clipboardText;
        stackTrace = clipboardText;
        filePath = parsedClipboard?.filePath;
        line = parsedClipboard?.line;
        useClipboard = true;
      }
    }

    if (!useClipboard) {
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
  }

  let snippet: string | undefined;
  let symbolDef: string | undefined;
  if (filePath && line) {
    // Run parallel for speed
    const [s, d] = await Promise.all([
      getCodeSnippetAround(filePath, line, 12),
      resolveSymbolDefinition(filePath, line)
    ]);
    snippet = s;
    symbolDef = d;
  }

  const language = analysis?.techStack?.includes("TypeScript") ? "TypeScript" : "JavaScript";

  const templatePrompt = buildErrorPrompt({
    language,
    dependencies: analysis?.dependencies ?? [],
    errorMessage,
    stackTrace,
    filePath,
    line,
    codeSnippet: snippet,
    symbolDefinition: symbolDef,
    architectureSummary: analysis?.architectureSummary
  });

  let finalPrompt = templatePrompt;
  let errorLlmUsed = false;
  let providerUsedName = "Template";

  const system = buildErrorSystemPrompt();
  const user = buildLLMUserErrorMessage(templatePrompt);
  
  const result = await completeWithFallback({ system, user }, "error");
  if (result) {
    finalPrompt = result.content.trim();
    errorLlmUsed = true;
    providerUsedName = result.providerName;
  }

  showPromptToUser("Error Prompt", `Generation: ${errorLlmUsed ? `LLM-enhanced (${providerUsedName})` : "Template"}\n\n${finalPrompt}`);
  
  TelemetryService.getInstance().sendEvent("ERROR_PROMPT_GENERATED", {
    language,
    generationType: errorLlmUsed ? "llm" : "template",
    provider: providerUsedName,
    hasClipboard: useClipboard ? "yes" : "no"
  });
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
      contextHeader: contextHeaderLines,
      fileTree: analysis.fileTree,
      securityFindings: analysis.securityFindings
    })
  );

  // Optional LLM enhancement for project prompts with fallback
  let projectLlmUsed = false;
  let providerUsedName = "Template";

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

  const result = await completeWithFallback({ system, user }, "project");
  if (result) {
    prompts = [result.content.trim()];
    projectLlmUsed = true;
    providerUsedName = result.providerName;
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
    `Generation: ${projectLlmUsed ? `LLM-enhanced (${providerUsedName})` : "Template"}`;

  const combined = projectLlmUsed
    ? [header, prompts[0]].join("\n\n")
    : [header, ...prompts.map((p, i) => `===== Prompt ${i + 1} =====\n${p}`)].join("\n\n\n");
  showPromptToUser("Project Prompts", combined);

  TelemetryService.getInstance().sendEvent("PROJECT_ANALYSIS_COMPLETED", {
    techStack: analysis.techStack,
    domain: analysis.domain.domain,
    generationType: projectLlmUsed ? "llm" : "template"
  }, {
    fileCount: analysis.fileTree ? analysis.fileTree.split("\n").length : 0,
    dependencyCount: analysis.dependencies.length
  });
}

function getWorkspaceRoot(): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;
  return folders[0];
}

function showPromptToUser(title: string, text: string) {
  const sanitized = sanitizePrompt(text);

  // Always show in sidebar if it's available (it handles its own visibility/errors)
  if (sidebarProvider) {
      sidebarProvider.showPrompt(title, sanitized);
      if (sidebarProvider.isReady()) {
          vscode.commands.executeCommand('promptCraft.sidebar.focus');
      }
  }

  // Always show in output channel as backup/history
  output?.clear();
  output?.appendLine(`# ${title}`);
  output?.appendLine("");
  output?.appendLine(sanitized);
  output?.show(true);

  void vscode.env.clipboard.writeText(sanitized);
  void vscode.window.showInformationMessage(
    `${title} generated and copied to clipboard.`,
    "Copy again"
  ).then((action) => {
    if (action === "Copy again") void vscode.env.clipboard.writeText(sanitized);
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

interface StackPattern {
  regex: RegExp;
  extract: (match: RegExpMatchArray) => { path: string; line: string } | null;
}

const stackPatterns: StackPattern[] = [
  {
    // Windows paths: C:\\path\\to\\file.ts:10:5
    regex: /(\(|\s)([A-Za-z]:\\\\[^\s)]+\.(?:ts|js|tsx|jsx)):(\d+):(\d+)(\))?/,
    extract: (m) => ({ path: m[2], line: m[3] })
  },
  {
    // POSIX paths: /path/to/file.ts:10:5
    regex: /(\(|\s)([\/A-Za-z0-9_.:\\-]+\.(?:ts|js|tsx|jsx)):(\d+):(\d+)(\))?/,
    extract: (m) => ({ path: m[2], line: m[3] })
  },
  {
    // file URLs: file:///.../file.ts:10:5
    regex: /file:\/\/(.+\.(?:ts|js|tsx|jsx)):(\d+):(\d+)/,
    extract: (m) => ({ path: m[1], line: m[2] })
  },
  {
    // Python: File "path/to/file.py", line 10
    regex: /File "([^"]+)", line (\d+)/,
    extract: (m) => ({ path: m[1], line: m[2] })
  },
  {
    // Java: at com.pkg.Cls.method(File.java:10)
    regex: /at\s+[\w\.]+\(([^:]+\.java):(\d+)\)/,
    extract: (m) => ({ path: m[1], line: m[2] })
  },
  {
    // Go: path/to/file.go:10
    regex: /([\/A-Za-z0-9_.:\\-]+\.go):(\d+)/,
    extract: (m) => ({ path: m[1], line: m[2] })
  }
];

function parseStackForFileAndLine(stack: string, rootPath?: string): { filePath: string; line: number } | undefined {
  const lines = stack.split(/\r?\n/);
  for (const currentLine of lines) {
    for (const { regex, extract } of stackPatterns) {
      const match = currentLine.match(regex);
      if (match) {
        const result = extract(match);
        if (result && result.path && result.line) {
          const lineNumber = parseInt(result.line, 10);
          let resolved = result.path;
          if (rootPath && !path.isAbsolute(resolved)) {
            resolved = path.join(rootPath, resolved);
          }
          return { filePath: resolved, line: lineNumber };
        }
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

async function resolveSymbolDefinition(filePath: string, line: number): Promise<string | undefined> {
  try {
    const uri = vscode.Uri.file(filePath);
    // Open document to read line text
    const document = await vscode.workspace.openTextDocument(uri);
    // line is 1-based, VS Code is 0-based
    if (line - 1 >= document.lineCount) return undefined;
    
    const lineText = document.lineAt(line - 1).text;
    
    // Simple tokenizer to find identifiers
    const reserved = new Set([
      "const", "let", "var", "function", "class", "import", "export", "from", 
      "return", "if", "else", "await", "async", "try", "catch", "new", "this", 
      "throw", "console", "log", "void", "null", "undefined", "true", "false"
    ]);
    
    const regex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    const candidates: { word: string; range: vscode.Range }[] = [];
    let match;
    
    while ((match = regex.exec(lineText)) !== null) {
      const word = match[0];
      // Filter out reserved words and short variables (often loop counters like i, j)
      if (!reserved.has(word) && word.length > 2) { 
         candidates.push({ 
           word, 
           range: new vscode.Range(line - 1, match.index, line - 1, match.index + word.length) 
         });
      }
    }

    // Limit to first 3 candidates to avoid performance hit
    const results: string[] = [];
    for (const cand of candidates.slice(0, 3)) {
      try {
        const locations = await vscode.commands.executeCommand<vscode.Location[] | vscode.LocationLink[]>(
          "vscode.executeDefinitionProvider",
          uri,
          cand.range.start
        );
        
        if (locations && locations.length > 0) {
          // Take the first location
          const loc = locations[0];
          let targetUri: vscode.Uri;
          let targetRange: vscode.Range;
          
          if ("targetUri" in loc) { // LocationLink
             targetUri = loc.targetUri;
             targetRange = loc.targetRange;
          } else { // Location
             targetUri = loc.uri;
             targetRange = loc.range;
          }
          
          // Don't include if it's the same file and very close (redundant context)
          const isSameFile = targetUri.fsPath === filePath;
          const isClose = Math.abs(targetRange.start.line - (line - 1)) < 5;
          if (isSameFile && isClose) continue;

          // Read the definition source (5 lines of context)
          const defSnippet = await getCodeSnippetAround(targetUri.fsPath, targetRange.start.line + 1, 5); 
          if (defSnippet) {
             results.push(`Definition of '${cand.word}' in ${path.basename(targetUri.fsPath)}:\n${defSnippet}`);
          }
        }
      } catch {
        // Ignore individual symbol resolution failures
      }
    }
    
    return results.length > 0 ? results.join("\n\n") : undefined;
  } catch (err) {
    log(`Symbol resolution failed: ${toErrorMessage(err)}`);
    return undefined;
  }
}

