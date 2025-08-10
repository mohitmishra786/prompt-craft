import * as fsp from "fs/promises";
import * as path from "path";

export interface InferredDomain {
  domain: "ecommerce" | "blog" | "api" | "library" | "unknown";
  domainHints: string[];
}

export interface ControllerInfo {
  file: string;
  functions: string[];
}

export interface ModelInfo {
  file: string;
  fields: string[];
}

export async function inferDomain(readmeSummary: string | undefined, files: string[], root: string): Promise<InferredDomain> {
  const hints: string[] = [];
  const text = (readmeSummary ?? "") + "\n" + files.map((f) => path.basename(f)).join(" ");
  const lower = text.toLowerCase();

  if (/(e-?commerce|cart|checkout|order|product|catalog)/i.test(lower)) {
    hints.push("e-commerce keywords found (product/cart/checkout)");
    return { domain: "ecommerce", domainHints: hints };
  }
  if (/(blog|post|article|author|comment)/i.test(lower)) {
    hints.push("blog keywords found (post/article)");
    return { domain: "blog", domainHints: hints };
  }
  if (/(api|endpoint|rest|graphql)/i.test(lower)) {
    hints.push("api keywords found (endpoint/rest/graphql)");
    return { domain: "api", domainHints: hints };
  }

  return { domain: "unknown", domainHints: hints };
}

export async function extractControllerFunctions(files: string[], root: string): Promise<ControllerInfo[]> {
  const controllerFiles = files.filter((f) => /\bcontrollers\b/i.test(f));
  const results: ControllerInfo[] = [];

  for (const file of controllerFiles) {
    try {
      const raw = await fsp.readFile(file, "utf8");
      const functions = new Set<string>();
      // export function name(...)
      for (const m of raw.matchAll(/export\s+function\s+([A-Za-z0-9_]+)/g)) {
        functions.add(m[1]);
      }
      // exports.name = (req,res) => {}
      for (const m of raw.matchAll(/exports\.([A-Za-z0-9_]+)\s*=\s*\(/g)) {
        functions.add(m[1]);
      }
      // module.exports = { name, other }
      for (const m of raw.matchAll(/module\.exports\s*=\s*\{([^}]+)\}/g)) {
        const inside = m[1];
        inside.split(/,|\n/).map((s) => s.trim()).filter(Boolean).forEach((token) => {
          const name = token.split(/:\s*/)[0].trim();
          if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) functions.add(name);
        });
      }
      // named const function exports (ESM) export { name }
      for (const m of raw.matchAll(/export\s*\{([^}]+)\}/g)) {
        const inside = m[1];
        inside.split(/,|\n/).map((s) => s.trim()).filter(Boolean).forEach((token) => {
          const name = token.split(/\s+as\s+/i)[0].trim();
          if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) functions.add(name);
        });
      }

      results.push({ file: path.relative(root, file), functions: Array.from(functions).slice(0, 10) });
    } catch {
      // ignore read errors
    }
  }
  return results;
}

export async function extractMongooseModelFields(files: string[], root: string): Promise<ModelInfo[]> {
  const modelFiles = files.filter((f) => /\bmodels\b/i.test(f));
  const results: ModelInfo[] = [];

  for (const file of modelFiles) {
    try {
      const raw = await fsp.readFile(file, "utf8");
      const fields = new Set<string>();
      // new Schema({ field: Type, nested: { inner: Type } })
      for (const m of raw.matchAll(/Schema\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        for (const fm of body.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^,\n]+/g)) {
          fields.add(fm[1]);
        }
      }
      // mongoose.model('Name', { field: Type }) simple object form
      for (const m of raw.matchAll(/model\s*\(\s*['"][^'"]+['"]\s*,\s*\{([\s\S]*?)\}\s*\)/g)) {
        const body = m[1];
        for (const fm of body.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:\s*[^,\n]+/g)) {
          fields.add(fm[1]);
        }
      }

      if (fields.size > 0) results.push({ file: path.relative(root, file), fields: Array.from(fields).slice(0, 15) });
    } catch {
      // ignore read errors
    }
  }
  return results;
}