/**
 * OpenAI Provider Implementation
 * Supports GPT-4, GPT-4 Turbo, and GPT-3.5 Turbo models
 */

import axios, { AxiosInstance } from 'axios';
import { LLMProvider, LLMRequest, LLMResponse, ProviderType, ProviderConfig, ProviderCapabilities } from './base';

export interface OpenAIProviderConfig extends ProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class OpenAIProvider extends LLMProvider {
  private http: AxiosInstance;
  private apiKey: string;
  private defaultModel: string;

  constructor(config: OpenAIProviderConfig) {
    super(config);
    this.apiKey = config.apiKey || (process.env.OPENAI_API_KEY as string) || '';
    this.defaultModel = (config as any).model || 'gpt-4-turbo';
    
    // Validate configuration
    this.validateConfig();

    const baseURL = (config as any).baseUrl || 'https://api.openai.com/v1';
    this.http = axios.create({
      baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  getType(): ProviderType {
    return ProviderType.OPENAI;
  }

  getName(): string {
    return 'OpenAI';
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0;
  }

  protected validateConfig(): void {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      // Don't throw, just mark as not configured
      return;
    }
    
    // Validate model
    const validModels = this.getAvailableModels();
    if (this.defaultModel && !validModels.includes(this.defaultModel)) {
      throw new Error(`Invalid OpenAI model: ${this.defaultModel}. Must be one of: ${validModels.join(', ')}`);
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  getAvailableModels(): string[] {
    return [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4-0125-preview',
      'gpt-4-1106-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-0125',
      'gpt-3.5-turbo-1106'
    ];
  }

  async completeJSON(request: LLMRequest): Promise<string> {
    try {
      const response = await this.http.post('/chat/completions', {
        model: request.model || this.defaultModel,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user }
        ],
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 1000,
        response_format: { type: 'text' }
      });

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI API');
      }

      return content;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await this.http.post('/chat/completions', {
        model: request.model || this.defaultModel,
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
        throw new Error('Empty response from OpenAI API');
      }

      return {
        content: message.content,
        model: data.model || request.model || this.defaultModel,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined,
        finishReason: data.choices?.[0]?.finish_reason
      };
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  private handleAxiosError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.message;
        const errorType = error.response.data?.error?.type;
        
        if (status === 401) {
          this.handleError(new Error('Invalid API key or authentication failed'), 'Authentication');
        } else if (status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const msg = retryAfter 
            ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
            : 'Rate limit exceeded. Please try again later.';
          this.handleError(new Error(msg), 'Rate Limit');
        } else if (status === 400 && errorType === 'invalid_request_error') {
          this.handleError(new Error(`Invalid request: ${message}`), 'Validation');
        } else if (status === 503) {
          this.handleError(new Error('OpenAI service temporarily unavailable'), 'Service');
        } else if (status >= 500) {
          this.handleError(new Error('OpenAI server error'), 'Server');
        } else {
          this.handleError(new Error(message), 'API Error');
        }
      } else if (error.code === 'ECONNABORTED') {
        this.handleError(new Error('Request timeout'), 'Timeout');
      } else if (error.code === 'ECONNREFUSED') {
        this.handleError(new Error('Connection refused - check network'), 'Network');
      } else {
        this.handleError(new Error('Network error'), 'Network');
      }
    }
    this.handleError(error);
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: true,
      vision: this.defaultModel.includes('gpt-4'),
      embeddings: false
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate cost in USD
   */
  estimateCost(promptTokens: number, completionTokens: number): number {
    // Pricing as of 2024 (per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 30.00, output: 60.00 },
      'gpt-4-turbo': { input: 10.00, output: 30.00 },
      'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
      'gpt-3.5-turbo': { input: 0.50, output: 1.50 }
    };

    const modelPricing = pricing[this.defaultModel] || pricing['gpt-4-turbo'];
    const inputCost = (promptTokens / 1000000) * modelPricing.input;
    const outputCost = (completionTokens / 1000000) * modelPricing.output;

    return inputCost + outputCost;
  }
}

/**
 * Build OpenAI provider from VS Code settings
 */
export function buildOpenAIProviderFromSettings(
  apiKey: string | undefined,
  model: string | undefined,
  timeout: number | undefined
): OpenAIProvider | undefined {
  const effectiveApiKey = apiKey && apiKey.trim().length > 0 ? apiKey : process.env.OPENAI_API_KEY as string;
  
  if (!effectiveApiKey || effectiveApiKey.trim().length === 0) {
    return undefined;
  }

  const config = {
    name: 'OpenAI',
    enabled: true,
    timeout: Math.max(1000, Math.min(60000, timeout ?? 30000)),
    apiKey: effectiveApiKey.trim(),
    model: model || 'gpt-4-turbo'
  };

  return new OpenAIProvider(config);
}

