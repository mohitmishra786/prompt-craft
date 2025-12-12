/**
 * Legacy LLM module for backward compatibility
 * This module now wraps the new provider system
 */

import { GroqProvider, buildGroqProviderFromSettings } from "./providers/groq";

// Re-export for backward compatibility
export type GroqClient = GroqProvider;
export { buildGroqProviderFromSettings as buildGroqClientFromSettings };

// Keep old type for compatibility
export interface GroqConfig {
  apiKey: string;
  timeoutMs: number;
  baseUrl?: string;
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

