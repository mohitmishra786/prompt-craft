import * as vscode from "vscode";
import * as path from "path";
import { analyzeProject, getCodeSnippetAround } from "./analyzer";
import { buildErrorPrompt, buildProjectPrompt, defaultProjectTaskIdeas, ecommerceTaskIdeas } from "./templates";

let output: vscode.OutputChannel | undefined;

export async function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("Prompt Craft");

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

  context.subscriptions.push(generateErrorPromptCmd, analyzeProjectCmd, output);

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

  showPromptToUser("Error Prompt", prompt);
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

  const prompts = ideas.map((idea) =>
    buildProjectPrompt({
      techStack: analysis.techStack,
      dependencies: analysis.dependencies,
      taskIdea: idea,
      contextHeader: contextHeaderLines
    })
  );

  const techExtras: string[] = [];
  if (analysis.detection.usesExpress) techExtras.push("Express");
  if (analysis.detection.usesMongo) techExtras.push("MongoDB");
  if (analysis.detection.usesReact) techExtras.push("React");

  const header = `Project Analysis for ${path.basename(analysis.rootPath)}\n` +
    `Tech Stack: ${analysis.techStack}${techExtras.length ? ` (+ ${techExtras.join(', ')})` : ''}\n` +
    `Architecture: ${analysis.architectureSummary}\n` +
    `Dependencies: ${analysis.dependencies.slice(0, 25).join(", ")}\n` +
    (analysis.readmeSummary ? `README (summary): ${analysis.readmeSummary}\n` : "");

  const combined = [header, ...prompts.map((p, i) => `===== Prompt ${i + 1} =====\n${p}`)].join("\n\n\n");
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

