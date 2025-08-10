import axios, { AxiosInstance } from "axios";

export interface GroqConfig {
  apiKey: string;
  timeoutMs: number;
  baseUrl?: string; // allow override for testing
}

export class GroqClient {
  private http: AxiosInstance;

  constructor(private config: GroqConfig) {
    const baseURL = config.baseUrl ?? "https://api.groq.com/openai/v1";
    this.http = axios.create({
      baseURL,
      timeout: config.timeoutMs,
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      }
    });
  }

  async completeJSON<TInput extends Record<string, unknown>>(args: {
    model: string;
    system: string;
    user: string;
  }): Promise<string> {
    // Using Chat Completions API; return assistant text
    // Response format kept simple for prototype
    const { model, system, user } = args;
    const resp = await this.http.post("/chat/completions", {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });
    const content: string | undefined = resp.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Groq: empty response");
    return content;
  }
}

export function buildGroqClientFromSettings(apiKey: string | undefined, timeoutMs: number | undefined): GroqClient | undefined {
  // Fallback to environment variable if no setting provided
  if (!apiKey || apiKey.trim().length === 0) {
    apiKey = process.env.GROQ_API_KEY;
  }
  if (!apiKey || apiKey.trim().length === 0) return undefined;
  const cfg: GroqConfig = {
    apiKey: apiKey.trim(),
    timeoutMs: Math.max(1000, Math.min(20000, timeoutMs ?? 5000))
  };
  return new GroqClient(cfg);
}

export function buildProjectSystemPrompt(): string {
  return [
    "You are an expert software architect and tech writer.",
    "Given a project summary and analysis JSON, produce:",
    "1) A condensed 'Project Context' paragraph (≤ 6 lines) that avoids repetition.",
    "2) A list of 4-6 varied, tailored tasks (numbered), focused on fixes, enhancements, optimization, and testing/docs.",
    "Ensure guidance matches the detected tech stack. Keep suggestions practical; avoid sweeping rewrites."
  ].join("\n");
}

export function buildErrorSystemPrompt(): string {
  return [
    "You are an expert developer. Refine the given error details into a concise, structured prompt for an AI coding assistant.",
    "Include: Context, Error Details, Code Snippet (if provided), Goal, Constraints.",
    "Rephrase for clarity; do not invent facts."
  ].join("\n");
}

