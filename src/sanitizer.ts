/**
 * Utility to redact secrets from prompts before they are shown to the user or sent to LLMs.
 */
export function sanitizePrompt(text: string): string {
  // Common secret patterns
  const patterns = [
    // AWS Access Key ID (AKIA...)
    /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    
    // OpenAI API Keys (sk-...)
    /sk-[a-zA-Z0-9]{20,}/g,
    
    // GitHub Personal Access Tokens
    /ghp_[a-zA-Z0-9]{36}/g,
    
    // Stripe Keys
    /sk_live_[0-9a-zA-Z]{24}/g,
    
    // Generic "Bearer" tokens (naive check for long alphanumeric strings)
    /Bearer\s+[a-zA-Z0-9\-\._~\+\/]{20,}/g,
    
    // Database Connection Strings with passwords
    // postgres://user:password@host
    // mysql://user:password@host
    /((?:postgres|mysql|mongodb(?:\+srv)?|redis):\/\/[^:]+:)([^@]+)(@)/g,
    
    // Generic assignments: API_KEY = "..."
    // Matches "KEY", "SECRET", "TOKEN", "PASSWORD" followed by assignment
    /((?:api|secret|token|access|auth)[_.-]?(?:key|token|secret|id|password)?\s*[:=]\s*["']?)([^"'\s\n]{8,})(["']?)/gi
  ];

  let sanitized = text;

  // Specific replacements
  sanitized = sanitized.replace(/(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g, "<REDACTED_AWS_KEY>");
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9]{20,}/g, "<REDACTED_OPENAI_KEY>");
  sanitized = sanitized.replace(/ghp_[a-zA-Z0-9]{36}/g, "<REDACTED_GITHUB_TOKEN>");
  sanitized = sanitized.replace(/sk_live_[0-9a-zA-Z]{24}/g, "<REDACTED_STRIPE_KEY>");
  
  // Connection strings: keep protocol://user: and @host, redact password
  sanitized = sanitized.replace(/((?:postgres|mysql|mongodb(?:\+srv)?|redis):\/\/[^:]+:)([^@]+)(@)/g, "$1<REDACTED_PASSWORD>$3");

  // Generic Assignments (Aggressive)
  // We need to be careful not to redact non-secrets, so we look for specific keywords
  sanitized = sanitized.replace(
    /((?:api|secret|token|access|auth)[_.-]?(?:key|token|secret|id|password)?\s*[:=]\s*["']?)([^"'\s\n]{8,})(["']?)/gi, 
    (match, prefix, secret, suffix) => {
      // Don't redact if it looks like a placeholder or path
      if (secret.includes("/") || secret.includes("<") || secret.includes("{") || secret.length < 8) return match;
      return `${prefix}<REDACTED_SECRET>${suffix}`;
    }
  );

  return sanitized;
}
