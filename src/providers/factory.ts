/**
 * Provider Factory and Registry
 * Manages provider instantiation and lifecycle
 */

import * as vscode from 'vscode';
import { LLMProvider, ProviderType, ProviderConfig } from './base';
import { GroqProvider } from './groq';
import { OpenAIProvider } from './openai';
import { AzureOpenAIProvider } from './azure-openai';

/**
 * Provider registry that manages all available providers
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<ProviderType, LLMProvider>;
  private activeProvider: ProviderType | null;

  private constructor() {
    this.providers = new Map();
    this.activeProvider = null;
  }

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Register a provider instance
   */
  register(provider: LLMProvider): void {
    this.providers.set(provider.getType(), provider);
  }

  /**
   * Get a provider by type
   */
  get(type: ProviderType): LLMProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Get all registered providers
   */
  getAll(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all configured providers (ready to use)
   */
  getConfigured(): LLMProvider[] {
    return this.getAll().filter(p => p.isConfigured());
  }

  /**
   * Set the active provider
   */
  setActive(type: ProviderType): boolean {
    const provider = this.providers.get(type);
    if (!provider) {
      return false;
    }
    if (!provider.isConfigured()) {
      return false;
    }
    this.activeProvider = type;
    return true;
  }

  /**
   * Get the active provider
   */
  getActive(): LLMProvider | null {
    if (!this.activeProvider) {
      // Try to find first configured provider
      const configured = this.getConfigured();
      if (configured.length > 0) {
        this.activeProvider = configured[0].getType();
        return configured[0];
      }
      return null;
    }
    return this.providers.get(this.activeProvider) || null;
  }

  /**
   * Get active provider type
   */
  getActiveType(): ProviderType | null {
    return this.activeProvider;
  }

  /**
   * Clear all providers (for testing)
   */
  clear(): void {
    this.providers.clear();
    this.activeProvider = null;
  }
}

/**
 * Provider Factory - creates provider instances from configuration
 */
export class ProviderFactory {
  private static registry = ProviderRegistry.getInstance();

  /**
   * Initialize all providers from VS Code settings
   */
  static async initializeFromSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration('promptCraft');
    
    // Initialize Groq provider (existing)
    const groqApiKey = config.get<string>('groqApiKey');
    const groqTimeout = config.get<number>('requestTimeoutMs') || 5000;
    if (groqApiKey && groqApiKey.trim().length > 0) {
      const groqConfig = {
        name: 'Groq',
        enabled: true,
        timeout: groqTimeout,
        apiKey: groqApiKey
      };
      const groqProvider = new GroqProvider(groqConfig);
      this.registry.register(groqProvider);
    }

    // Initialize OpenAI provider
    const openaiApiKey = config.get<string>('openai.apiKey');
    const openaiModel = config.get<string>('openai.model') || 'gpt-4-turbo';
    const openaiTimeout = config.get<number>('openai.timeout') || 30000;
    if (openaiApiKey && openaiApiKey.trim().length > 0) {
      const openaiConfig = {
        name: 'OpenAI',
        enabled: true,
        timeout: openaiTimeout,
        apiKey: openaiApiKey,
        model: openaiModel
      };
      const openaiProvider = new OpenAIProvider(openaiConfig);
      this.registry.register(openaiProvider);
    }

    // Initialize Azure OpenAI provider
    const azureEndpoint = config.get<string>('azureOpenAI.endpoint');
    const azureApiKey = config.get<string>('azureOpenAI.apiKey');
    const azureDeploymentName = config.get<string>('azureOpenAI.deploymentName');
    const azureApiVersion = config.get<string>('azureOpenAI.apiVersion') || '2024-02-01';
    const azureAuthMethod = config.get<string>('azureOpenAI.authMethod') || 'apiKey';
    const azureTimeout = config.get<number>('azureOpenAI.timeout') || 30000;
    
    if (azureEndpoint && azureEndpoint.trim().length > 0 && azureDeploymentName) {
      const azureConfig = {
        name: 'Azure OpenAI',
        enabled: true,
        timeout: azureTimeout,
        endpoint: azureEndpoint,
        apiKey: azureApiKey || '',
        deploymentName: azureDeploymentName,
        apiVersion: azureApiVersion,
        authMethod: azureAuthMethod as 'apiKey' | 'azureCli' | 'managedIdentity'
      };
      const azureProvider = new AzureOpenAIProvider(azureConfig);
      this.registry.register(azureProvider);
    }

    // Set active provider from settings or use first configured
    const activeProviderType = config.get<string>('activeProvider');
    if (activeProviderType) {
      this.registry.setActive(activeProviderType as ProviderType);
    } else {
      // Auto-select first configured provider
      const configured = this.registry.getConfigured();
      if (configured.length > 0) {
        this.registry.setActive(configured[0].getType());
      }
    }
  }

  /**
   * Create a provider instance by type
   */
  static createProvider(type: ProviderType, config: any): LLMProvider {
    switch (type) {
      case ProviderType.GROQ:
        return new GroqProvider(config);
      
      case ProviderType.OPENAI:
        return new OpenAIProvider(config);
      
      case ProviderType.AZURE_OPENAI:
        return new AzureOpenAIProvider(config);
      
      case ProviderType.CLAUDE:
        throw new Error('Claude provider not yet implemented (Phase 4)');
      
      case ProviderType.OLLAMA:
        throw new Error('Ollama provider not yet implemented (Phase 4)');
      
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Get the provider registry
   */
  static getRegistry(): ProviderRegistry {
    return this.registry;
  }

  /**
   * Get the active provider
   */
  static getActiveProvider(): LLMProvider | null {
    return this.registry.getActive();
  }

  /**
   * Reload providers from settings
   */
  static async reload(): Promise<void> {
    this.registry.clear();
    await this.initializeFromSettings();
  }
}

