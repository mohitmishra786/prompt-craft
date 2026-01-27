import * as vscode from "vscode";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import { 
  extractControllerFunctions, 
  extractMongooseModelFields, 
  extractExpressRoutes,
  inferDomain, 
  InferredDomain 
} from "./domain";

export interface PackageJson {
  name?: string;
  version?: string;
  type?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface ProjectAnalysisResult {
  rootPath: string;
  techStack: string;
  dependencies: string[];
  architectureSummary: string;
  readmeSummary?: string;
  detection: {
    usesExpress: boolean;
    usesReact: boolean;
    usesMongo: boolean;
    hasAuthHints: boolean;
    hasTests: boolean;
  };
  domain: InferredDomain;
  controllers: { file: string; functions: string[] }[];
  models: { file: string; fields: string[] }[];
  routes: { file: string; endpoints: string[] }[];
  sampleQueries?: string[];
  fileTree?: string;
  securityFindings?: string[];
}

interface AnalysisCache {
  result: ProjectAnalysisResult;
  timestamp: number;
}

let projectAnalysisCache: AnalysisCache | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds

async function detectTechStack(rootPath: string, pkg?: PackageJson): Promise<string> {
  const exists = async (f: string) => {
    try {
      await fsp.stat(path.join(rootPath, f));
      return true;
    } catch {
      return false;
    }
  };

  if (await exists("requirements.txt") || await exists("pyproject.toml") || await exists("Pipfile")) {
    return "Python";
  }
  if (await exists("pom.xml") || await exists("build.gradle")) {
    return "Java";
  }
  if (await exists("go.mod")) {
    return "Go";
  }
  if (await exists("Cargo.toml")) {
    return "Rust";
  }

  if (!pkg) return "JavaScript/Node.js";
  const hasTS = pkg.devDependencies?.["typescript"] || pkg.dependencies?.["typescript"];
  return hasTS ? "TypeScript/Node.js" : "JavaScript/Node.js";
}

export async function analyzeProject(rootPath: string, maxFiles: number = 100): Promise<ProjectAnalysisResult> {
  // Check cache
  if (projectAnalysisCache && (Date.now() - projectAnalysisCache.timestamp < CACHE_TTL_MS)) {
    if (projectAnalysisCache.result.rootPath === rootPath) {
      return projectAnalysisCache.result;
    }
  }

  const packageJsonPath = path.join(rootPath, "package.json");
  const readmePath = path.join(rootPath, "README.md");

  const pkg = await readJsonSafe<PackageJson>(packageJsonPath);
  const dependencies = extractDependencies(pkg);
  const techStack = await detectTechStack(rootPath, pkg);
  const readmeSummary = await summarizeReadme(readmePath);

  const files = await collectFiles(rootPath, maxFiles);
  const arch = detectArchitecture(files, rootPath);
  const detection = detectHints(dependencies, files);
  const domain = await inferDomain(readmeSummary, files, rootPath);
  const controllers = await extractControllerFunctions(files, rootPath);
  const models = await extractMongooseModelFields(files, rootPath);
  const routes = await extractExpressRoutes(files, rootPath);
  const sampleQueries = await extractSampleQueries(files);

  const fileTree = generateAsciiTree(files, rootPath);
  const securityFindings = await runSecurityAnalysis(files);

  const result = {
    rootPath,
    techStack,
    dependencies,
    architectureSummary: arch,
    readmeSummary,
    detection,
    domain,
    controllers,
    models,
    routes,
    sampleQueries,
    fileTree,
    securityFindings
  };

  // Update cache
  projectAnalysisCache = {
    result,
    timestamp: Date.now()
  };

  return result;
}

export async function getCodeSnippetAround(
  absoluteFilePath: string,
  oneBasedLine: number,
  contextLines: number = 12
): Promise<string | undefined> {
  try {
    const content = await fsp.readFile(absoluteFilePath, "utf8");
    const lines = content.split(/\r?\n/);
    const idx = Math.max(0, oneBasedLine - 1);
    const start = Math.max(0, idx - contextLines);
    const end = Math.min(lines.length, idx + contextLines);
    const slice = lines.slice(start, end);
    const numbered = slice.map((l: string, i: number) => {
      const n = start + i + 1;
      return `${n.toString().padStart(4, " ")}: ${l}`;
    });
    return numbered.join("\n");
  } catch {
    return undefined;
  }
}

async function readJsonSafe<T>(filePath: string): Promise<T | undefined> {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function extractDependencies(pkg?: PackageJson): string[] {
  const deps = new Set<string>();
  const add = (o?: Record<string, string>) => {
    if (!o) return;
    Object.keys(o).forEach((k) => deps.add(k));
  };
  add(pkg?.dependencies);
  add(pkg?.devDependencies);
  return Array.from(deps).sort();
}

async function summarizeReadme(readmePath: string): Promise<string | undefined> {
  try {
    const raw = await fsp.readFile(readmePath, "utf8");
    const text = raw.replace(/\r/g, "");
    const lines = text.split("\n").slice(0, 40).join(" ");
    return truncate(lines, 500);
  } catch {
    return undefined;
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}

async function collectFiles(root: string, maxFiles: number): Promise<string[]> {
  const includePattern = new vscode.RelativePattern(
    root,
    "**/*.{js,ts,jsx,tsx,json,md,py,java,go,html,css,scss,mjs,cjs}"
  );
  const excludePattern = "**/{node_modules,.git,out,dist,build,.vscode,coverage,target,bin,obj,vendor}/**";

  try {
    const uris = await vscode.workspace.findFiles(includePattern, excludePattern, maxFiles);
    return uris.map((u) => u.fsPath);
  } catch (err) {
    console.error("Error finding files:", err);
    return [];
  }
}

function detectArchitecture(files: string[], root: string): string {
  const rel = (p: string) => path.relative(root, p);
  const indicators: string[] = [];
  const has = (frag: string) => files.some((f) => rel(f).split(path.sep).includes(frag));

  if (has("src")) indicators.push("src directory present");
  if (has("controllers")) indicators.push("controllers detected");
  if (has("models")) indicators.push("models detected");
  if (has("routes")) indicators.push("routes detected");
  if (has("components")) indicators.push("components detected");
  if (has("pages")) indicators.push("pages detected");

  const entryFiles = files.filter((f) => /\b(index|server|app)\.(js|ts)$/.test(path.basename(f)));
  if (entryFiles.length > 0) {
    indicators.push(`entrypoints: ${entryFiles.slice(0, 3).map((f) => rel(f)).join(", ")}`);
  }
  const controllerCount = files.filter((f) => /\bcontrollers\b/.test(rel(f))).length;
  const modelCount = files.filter((f) => /\bmodels\b/.test(rel(f))).length;
  if (controllerCount) indicators.push(`controller files: ~${controllerCount}`);
  if (modelCount) indicators.push(`model files: ~${modelCount}`);

  return indicators.length > 0 ? indicators.join(", ") : "No strong architecture signals found";
}

function detectHints(dependencies: string[], files: string[]) {
  const lowerDeps = new Set(dependencies.map((d) => d.toLowerCase()));
  const usesExpress = lowerDeps.has("express");
  const usesReact = lowerDeps.has("react");
  const usesMongo = lowerDeps.has("mongodb") || lowerDeps.has("mongoose");
  const hasTests = files.some((f) => /\.(test|spec)\.(js|ts|jsx|tsx)$/.test(f));
  const hasAuthHints = files.some((f) => /auth|login|signup|passport|jwt/i.test(f));
  return { usesExpress, usesReact, usesMongo, hasAuthHints, hasTests };
}

async function extractSampleQueries(files: string[]): Promise<string[]> {
  const queries: string[] = [];
  const targets = files.filter((f) => /\.(js|ts)$/i.test(f));
  for (const file of targets.slice(0, 50)) {
    try {
      const raw = await fsp.readFile(file, "utf8");
      const patterns = [
        /\.find\([^)]*\)/g,
        /\.findOne\([^)]*\)/g,
        /\.updateOne\([^)]*\)/g,
        /\.aggregate\([^)]*\)/g
      ];
      for (const rx of patterns) {
        const matches = raw.match(rx);
        if (matches) {
          for (const m of matches) {
            queries.push(m.slice(0, 140));
            if (queries.length >= 10) return queries;
          }
        }
      }
    } catch {
      // ignore
    }
  }
  return queries;
}

function generateAsciiTree(filePaths: string[], rootPath: string): string {
  const relativePaths = filePaths.map(p => path.relative(rootPath, p)).sort();
  const tree: string[] = [];
  const seenPaths = new Set<string>();

  relativePaths.forEach(filePath => {
    const parts = filePath.split(path.sep);
    let currentLevel = 0;
    
    parts.forEach((part, index) => {
      const isLastPart = index === parts.length - 1;
      const pathSoFar = parts.slice(0, index + 1).join(path.sep);
      
      if (!seenPaths.has(pathSoFar)) {
        seenPaths.add(pathSoFar);
        if (currentLevel < 4) {
             const connector = isLastPart ? "└── " : "├── ";
             tree.push(`${"  ".repeat(currentLevel)}${connector}${part}`);
        }
      }
      currentLevel++;
    });
  });

  if (tree.length > 20) {
      return tree.slice(0, 20).join("\n") + "\n  ... (truncated)";
  }

  return tree.join("\n");
}

async function runSecurityAnalysis(filePaths: string[]): Promise<string[]> {
  // Heuristic-based security pattern detection.
  // These patterns may produce false positives and are intended to
  // surface areas for manual review, not definitive vulnerability detection.
  const findings: string[] = [];
  const targets = filePaths.filter(f => /\.(js|ts|py|go|java)$/i.test(f)).slice(0, 20);

  const patterns = [
    { name: "Hardcoded Secret", regex: /(?:key|secret|token|password|passwd|auth)\s*[:=]\s*["'][a-zA-Z0-9_\-\.]{10,}["']/i },
    { name: "Potential SQL Injection", regex: /\.query\s*\(\s*["'][^?]*\$\{/i },
    { name: "Insecure Eval", regex: /\beval\s*\(/i },
    { name: "Weak Cryptography", regex: /\b(md5|sha1)\s*\(/i },
    { name: "Command Injection", regex: /\b(exec|spawn|system)\s*\(\s*(?:`|\$\{)/i }
  ];

  for (const file of targets) {
    try {
      const content = await fsp.readFile(file, "utf8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        patterns.forEach(p => {
          if (p.regex.test(line)) {
            findings.push(`${p.name} in ${path.basename(file)}:${index + 1}`);
          }
        });
      });
    } catch {
      // ignore
    }
  }

  return Array.from(new Set(findings)).slice(0, 10);
}
