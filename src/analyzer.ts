import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import { extractControllerFunctions, extractMongooseModelFields, inferDomain, InferredDomain } from "./domain";

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
}

export async function analyzeProject(rootPath: string, maxFiles: number = 100): Promise<ProjectAnalysisResult> {
  const packageJsonPath = path.join(rootPath, "package.json");
  const readmePath = path.join(rootPath, "README.md");

  const pkg = await readJsonSafe<PackageJson>(packageJsonPath);
  const dependencies = extractDependencies(pkg);
  const techStack = detectTechStack(pkg);
  const readmeSummary = await summarizeReadme(readmePath);

  const files = await collectFiles(rootPath, maxFiles);
  const arch = detectArchitecture(files, rootPath);
  const detection = detectHints(dependencies, files);
  const domain = await inferDomain(readmeSummary, files, rootPath);
  const controllers = await extractControllerFunctions(files, rootPath);
  const models = await extractMongooseModelFields(files, rootPath);

  return {
    rootPath,
    techStack,
    dependencies,
    architectureSummary: arch,
    readmeSummary,
    detection,
    domain,
    controllers,
    models
  };
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

function detectTechStack(pkg?: PackageJson): string {
  if (!pkg) return "JavaScript/Node.js";
  const hasTS = pkg.devDependencies?.["typescript"] || pkg.dependencies?.["typescript"];
  return hasTS ? "TypeScript/Node.js" : "JavaScript/Node.js";
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
  const results: string[] = [];
  const ignored = new Set([
    "node_modules",
    ".git",
    "out",
    "dist",
    ".vscode"
  ]);

  async function walk(dir: string): Promise<void> {
    if (results.length >= maxFiles) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (ignored.has(entry.name)) continue;
        await walk(full);
      } else {
        // Only include common text/code files to keep analysis fast
        if (!/\.(md|js|ts|jsx|tsx|json|mjs|cjs)$/i.test(full)) continue;
        results.push(full);
      }
    }
  }

  await walk(root);
  return results;
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

