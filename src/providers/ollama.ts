/**
 * Ollama Provider Implementation
 * Supports local model execution via Ollama API
 */

import axios, { AxiosInstance } from 'axios';
import { LLMProvider, LLMRequest, LLMResponse, ProviderType, ProviderConfig, ProviderCapabilities } from './base';

export interface OllamaProviderConfig extends ProviderConfig {
  baseUrl?: string;
  model?: string;
}

export class OllamaProvider extends LLMProvider {
  private http: AxiosInstance;
  private defaultModel: string;
  private baseUrl: string;

  constructor(config: OllamaProviderConfig) {
    super(config);
    this.defaultModel = config.model || 'llama3';
    this.baseUrl = config.baseUrl || 'http://localhost:11434/api';
    
    // Validate configuration
    this.validateConfig();

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: config.timeout || 60000, // Local models can be slow
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  getType(): ProviderType {
    return ProviderType.OLLAMA;
  }

  getName(): string {
    return 'Ollama (Local)';
  }

  isConfigured(): boolean {
    // Ollama is considered configured if enabled, as it usually doesn't require an API key
    return this.config.enabled;
  }

  protected validateConfig(): void {
    // Basic validation
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  getAvailableModels(): string[] {
    // In a real implementation, we could fetch these from /api/tags
    // For the prototype, we return common ones
    return [
      'llama3',
      'llama3:8b',
      'llama3:70b',
      'codellama',
      'mistral',
      'phi3',
      'gemma'
    ];
  }

  private buildRequestPayload(request: LLMRequest) {
    return {
      model: request.model || this.defaultModel,
      prompt: `${request.system}\n\nUser: ${request.user}\n\nAssistant:`,
      system: request.system,
      stream: false,
      options: {
        temperature: request.temperature ?? 0.3,
        num_predict: request.maxTokens ?? 1000
      }
    };
  }

  async completeJSON(request: LLMRequest): Promise<string> {
    try {
      const response = await this.http.post('/generate', this.buildRequestPayload(request));

      const content = response.data?.response;
      if (!content) {
        throw new Error('Empty response from Ollama API');
      }

      return content;
    } catch (error) {
      return this.handleAxiosError(error);
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await this.http.post('/generate', this.buildRequestPayload(request));

      const data = response.data;
      
      if (!data?.response) {
        throw new Error('Empty response from Ollama API');
      }

      return {
        content: data.response,
        model: data.model || request.model || this.defaultModel,
        finishReason: 'stop'
      };
    } catch (error) {
      return this.handleAxiosError(error);
    }
  }

  private handleAxiosError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const message = error.response.data?.error || error.message;
        this.handleError(new Error(message), 'API Error');
      } else if (error.code === 'ECONNABORTED') {
        this.handleError(new Error('Request timeout - local model might be slow or starting up'), 'Timeout');
      } else if (error.code === 'ECONNREFUSED') {
        this.handleError(new Error(`Connection refused - is Ollama running on ${this.baseUrl}?`), 'Network');
      } else {
        this.handleError(new Error('Network error'), 'Network');
      }
    }
    this.handleError(error);
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      functionCalling: false, // Not standard in Ollama API yet
      vision: false,
      embeddings: true
    };
  }
}

/**
 * Build Ollama provider from VS Code settings
 */
export function buildOllamaProviderFromSettings(
  baseUrl: string | undefined,
  model: string | undefined,
  timeout: number | undefined
): OllamaProvider {
  const config = {
    name: 'Ollama',
    enabled: true,
    timeout: Math.max(1000, Math.min(120000, timeout ?? 60000)),
    baseUrl: baseUrl || 'http://localhost:11434/api',
    model: model || 'llama3'
  };

  return new OllamaProvider(config);
}
