/**
 * Groq Provider Implementation
 * Refactored from original llm.ts to use the new provider interface
 */

import axios, { AxiosInstance } from 'axios';
import { LLMProvider, LLMRequest, LLMResponse, ProviderType, ProviderConfig, ProviderCapabilities } from './base';

export interface GroqProviderConfig extends ProviderConfig {
  apiKey: string;
  baseUrl?: string;
}

export class GroqProvider extends LLMProvider {
  private http: AxiosInstance;
  private apiKey: string;

  constructor(config: GroqProviderConfig) {
    super(config);
    this.apiKey = config.apiKey || (process.env.GROQ_API_KEY as string) || '';
    
    // Validate configuration
    this.validateConfig();

    const baseURL = (config as any).baseUrl || 'https://api.groq.com/openai/v1';
    this.http = axios.create({
      baseURL,
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  getType(): ProviderType {
    return ProviderType.GROQ;
  }

  getName(): string {
    return 'Groq';
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0;
  }

  protected validateConfig(): void {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      // Don't throw, just mark as not configured
      return;
    }
  }

  getDefaultModel(): string {
    return 'llama3-8b-8192';
  }

  getAvailableModels(): string[] {
    return [
      'llama3-8b-8192',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'gemma-7b-it',
      'gemma2-9b-it'
    ];
  }

  async completeJSON(request: LLMRequest): Promise<string> {
    try {
      const response = await this.http.post('/chat/completions', {
        model: request.model || this.getDefaultModel(),
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user }
        ],
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 1000
      });

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq API');
      }

      return content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.error?.message || error.message;
          
          if (status === 401) {
            this.handleError(new Error('Invalid API key'), 'Authentication');
          } else if (status === 429) {
            this.handleError(new Error('Rate limit exceeded'), 'Rate Limit');
          } else if (status === 500) {
            this.handleError(new Error('Groq service error'), 'Service');
          } else {
            this.handleError(new Error(message), 'API Error');
          }
        } else if (error.code === 'ECONNABORTED') {
          this.handleError(new Error('Request timeout'), 'Timeout');
        } else {
          this.handleError(new Error('Network error'), 'Network');
        }
      }
      this.handleError(error);
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await this.http.post('/chat/completions', {
        model: request.model || this.getDefaultModel(),
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user }
        ],
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 1000
      });

      const data = response.data;
      const message = data?.choices?.[0]?.message;
      
      if (!message?.content) {
        throw new Error('Empty response from Groq API');
      }

      return {
        content: message.content,
        model: data.model || request.model || this.getDefaultModel(),
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined,
        finishReason: data.choices?.[0]?.finish_reason
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.error?.message || error.message;
          
          if (status === 401) {
            this.handleError(new Error('Invalid API key'), 'Authentication');
          } else if (status === 429) {
            this.handleError(new Error('Rate limit exceeded'), 'Rate Limit');
          } else if (status === 500) {
            this.handleError(new Error('Groq service error'), 'Service');
          } else {
            this.handleError(new Error(message), 'API Error');
          }
        } else if (error.code === 'ECONNABORTED') {
          this.handleError(new Error('Request timeout'), 'Timeout');
        } else {
          this.handleError(new Error('Network error'), 'Network');
        }
      }
      this.handleError(error);
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: false,
      vision: false,
      embeddings: false
    };
  }
}

/**
 * Legacy function for backward compatibility
 * Builds a GroqProvider from settings
 */
export function buildGroqProviderFromSettings(apiKey: string | undefined, timeoutMs: number | undefined): GroqProvider | undefined {
  const effectiveApiKey = apiKey && apiKey.trim().length > 0 ? apiKey : process.env.GROQ_API_KEY;
  
  if (!effectiveApiKey || effectiveApiKey.trim().length === 0) {
    return undefined;
  }

  const config: GroqProviderConfig = {
    name: 'Groq',
    enabled: true,
    timeout: Math.max(1000, Math.min(20000, timeoutMs ?? 5000)),
    apiKey: effectiveApiKey.trim()
  };

  return new GroqProvider(config);
}

