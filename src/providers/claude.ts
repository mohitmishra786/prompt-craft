/**
 * Anthropic Claude Provider Implementation
 * Supports Claude 3 Opus, Sonnet, and Haiku models
 */

import axios, { AxiosInstance } from 'axios';
import { LLMProvider, LLMRequest, LLMResponse, ProviderType, ProviderConfig, ProviderCapabilities } from './base';

export interface ClaudeProviderConfig extends ProviderConfig {
  apiKey: string;
  model?: string;
}

export class ClaudeProvider extends LLMProvider {
  private http: AxiosInstance;
  private apiKey: string;
  private defaultModel: string;

  constructor(config: ClaudeProviderConfig) {
    super(config);
    this.apiKey = config.apiKey || '';
    this.defaultModel = config.model || 'claude-3-sonnet-20240229';
    
    // Validate configuration
    this.validateConfig();

    this.http = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      timeout: config.timeout || 30000,
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });
  }

  getType(): ProviderType {
    return ProviderType.CLAUDE;
  }

  getName(): string {
    return 'Anthropic Claude';
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0;
  }

  protected validateConfig(): void {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      return;
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  getAvailableModels(): string[] {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0'
    ];
  }

  async completeJSON(request: LLMRequest): Promise<string> {
    try {
      const response = await this.http.post('/messages', {
        model: request.model || this.defaultModel,
        system: request.system,
        messages: [
          { role: 'user', content: request.user }
        ],
        max_tokens: request.maxTokens ?? 1000,
        temperature: request.temperature ?? 0.3
      });

      const content = response.data?.content?.[0]?.text;
      if (!content) {
        throw new Error('Empty response from Anthropic API');
      }

      return content;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await this.http.post('/messages', {
        model: request.model || this.defaultModel,
        system: request.system,
        messages: [
          { role: 'user', content: request.user }
        ],
        max_tokens: request.maxTokens ?? 1000,
        temperature: request.temperature ?? 0.3
      });

      const data = response.data;
      const text = data?.content?.[0]?.text;
      
      if (!text) {
        throw new Error('Empty response from Anthropic API');
      }

      return {
        content: text,
        model: data.model || request.model || this.defaultModel,
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        } : undefined,
        finishReason: data.stop_reason
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
        
        if (status === 401) {
          this.handleError(new Error('Invalid API key'), 'Authentication');
        } else if (status === 429) {
          this.handleError(new Error('Rate limit exceeded'), 'Rate Limit');
        } else if (status >= 500) {
          this.handleError(new Error('Anthropic server error'), 'Server');
        } else {
          this.handleError(new Error(message), 'API Error');
        }
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
      vision: true,
      embeddings: false
    };
  }
}
