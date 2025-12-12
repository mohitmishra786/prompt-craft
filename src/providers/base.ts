/**
 * Base LLM Provider Interface and Abstract Class
 * Defines the contract that all LLM providers must implement
 */

export interface LLMRequest {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  timeout: number;
  [key: string]: any; // Provider-specific configuration
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastChecked: Date;
  responseTime?: number;
  errorMessage?: string;
}

export enum ProviderType {
  GROQ = 'groq',
  OPENAI = 'openai',
  AZURE_OPENAI = 'azure-openai',
  CLAUDE = 'claude',
  OLLAMA = 'ollama',
  CUSTOM = 'custom'
}

/**
 * Abstract base class for all LLM providers
 */
export abstract class LLMProvider {
  protected config: ProviderConfig;
  protected health: ProviderHealth;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.health = {
      status: 'unknown',
      lastChecked: new Date()
    };
  }

  /**
   * Get the provider type identifier
   */
  abstract getType(): ProviderType;

  /**
   * Get the provider display name
   */
  abstract getName(): string;

  /**
   * Check if the provider is properly configured
   */
  abstract isConfigured(): boolean;

  /**
   * Complete a chat request and return JSON-formatted response
   */
  abstract completeJSON(request: LLMRequest): Promise<string>;

  /**
   * Complete a chat request and return full response
   */
  abstract complete(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Stream a chat completion (optional, for future use)
   */
  async *streamComplete(request: LLMRequest): AsyncGenerator<string, void, unknown> {
    // Default implementation: fall back to non-streaming
    const response = await this.completeJSON(request);
    yield response;
  }

  /**
   * Test the provider connection and update health status
   */
  async checkHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const testRequest: LLMRequest = {
        model: this.getDefaultModel(),
        system: 'You are a test assistant.',
        user: 'Respond with "OK" if you can read this.',
        maxTokens: 10,
        temperature: 0
      };

      await this.completeJSON(testRequest);

      const responseTime = Date.now() - startTime;
      this.health = {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime
      };
    } catch (error) {
      this.health = {
        status: 'unhealthy',
        lastChecked: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }

    return this.health;
  }

  /**
   * Get the current health status
   */
  getHealth(): ProviderHealth {
    return { ...this.health };
  }

  /**
   * Get the provider configuration
   */
  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the default model for this provider
   */
  abstract getDefaultModel(): string;

  /**
   * Get available models for this provider
   */
  abstract getAvailableModels(): string[];

  /**
   * Validate provider-specific configuration
   */
  protected abstract validateConfig(): void;

  /**
   * Handle provider-specific errors
   */
  protected handleError(error: unknown, context?: string): never {
    const message = error instanceof Error ? error.message : String(error);
    const errorContext = context ? `${context}: ` : '';
    throw new Error(`${this.getName()} - ${errorContext}${message}`);
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return {
      streaming: false,
      functionCalling: false,
      vision: false,
      embeddings: false
    };
  }
}

export interface ProviderCapabilities {
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  embeddings: boolean;
}

