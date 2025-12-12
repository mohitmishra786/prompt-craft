/**
 * Azure OpenAI Provider Implementation
 * Supports multiple authentication methods:
 * - API Key authentication
 * - Azure CLI authentication (az login)
 * - Managed Identity authentication (role-based)
 */

import axios, { AxiosInstance } from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LLMProvider, LLMRequest, LLMResponse, ProviderType, ProviderConfig, ProviderCapabilities } from './base';

const execAsync = promisify(exec);

export type AzureAuthMethod = 'apiKey' | 'azureCli' | 'managedIdentity';

export interface AzureOpenAIProviderConfig extends ProviderConfig {
  endpoint: string;
  apiKey?: string;
  deploymentName: string;
  apiVersion: string;
  authMethod: AzureAuthMethod;
  subscriptionId?: string;
  tenantId?: string;
  managedIdentityClientId?: string;
}

interface AzureToken {
  accessToken: string;
  expiresOn: Date;
}

export class AzureOpenAIProvider extends LLMProvider {
  private http: AxiosInstance;
  private endpoint: string;
  private apiKey: string;
  private deploymentName: string;
  private apiVersion: string;
  private authMethod: AzureAuthMethod;
  private cachedToken: AzureToken | null = null;
  private subscriptionId?: string;
  private tenantId?: string;
  private managedIdentityClientId?: string;

  constructor(config: AzureOpenAIProviderConfig) {
    super(config);
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey || '';
    this.deploymentName = config.deploymentName;
    this.apiVersion = config.apiVersion || '2024-02-01';
    this.authMethod = config.authMethod || 'apiKey';
    this.subscriptionId = config.subscriptionId;
    this.tenantId = config.tenantId;
    this.managedIdentityClientId = config.managedIdentityClientId;
    
    // Validate configuration
    this.validateConfig();

    // Create axios instance (auth headers will be added per request)
    this.http = axios.create({
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  getType(): ProviderType {
    return ProviderType.AZURE_OPENAI;
  }

  getName(): string {
    return 'Azure OpenAI';
  }

  isConfigured(): boolean {
    if (!this.endpoint || !this.deploymentName) {
      return false;
    }

    switch (this.authMethod) {
      case 'apiKey':
        return this.apiKey.trim().length > 0;
      case 'azureCli':
        return true; // Will check at runtime
      case 'managedIdentity':
        return true; // Will check at runtime
      default:
        return false;
    }
  }

  protected validateConfig(): void {
    if (!this.endpoint || this.endpoint.trim().length === 0) {
      throw new Error('Azure OpenAI endpoint is required');
    }

    if (!this.deploymentName || this.deploymentName.trim().length === 0) {
      throw new Error('Azure OpenAI deployment name is required');
    }

    if (this.authMethod === 'apiKey' && (!this.apiKey || this.apiKey.trim().length === 0)) {
      // Don't throw, just mark as not configured
      return;
    }

    // Validate endpoint format
    try {
      new URL(this.endpoint);
    } catch {
      throw new Error('Invalid Azure OpenAI endpoint URL');
    }
  }

  getDefaultModel(): string {
    return this.deploymentName;
  }

  getAvailableModels(): string[] {
    // In Azure OpenAI, models are accessed via deployment names
    // We return the configured deployment
    return [this.deploymentName];
  }

  /**
   * Get authentication headers based on configured auth method
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    switch (this.authMethod) {
      case 'apiKey':
        return { 'api-key': this.apiKey };
      
      case 'azureCli':
        const cliToken = await this.getAzureCliToken();
        return { 'Authorization': `Bearer ${cliToken}` };
      
      case 'managedIdentity':
        const miToken = await this.getManagedIdentityToken();
        return { 'Authorization': `Bearer ${miToken}` };
      
      default:
        throw new Error(`Unsupported auth method: ${this.authMethod}`);
    }
  }

  /**
   * Get access token from Azure CLI
   */
  private async getAzureCliToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.cachedToken && this.cachedToken.expiresOn > new Date()) {
      return this.cachedToken.accessToken;
    }

    try {
      // Check if Azure CLI is installed
      try {
        await execAsync('az --version');
      } catch {
        throw new Error('Azure CLI is not installed. Please install it from https://aka.ms/azure-cli');
      }

      // Check if user is logged in
      try {
        await execAsync('az account show');
      } catch {
        throw new Error('Not logged in to Azure CLI. Please run: az login');
      }

      // Get access token for Azure Cognitive Services
      const resource = 'https://cognitiveservices.azure.com';
      const cmd = `az account get-access-token --resource ${resource} --query "accessToken" -o tsv`;
      
      const { stdout } = await execAsync(cmd);
      const accessToken = stdout.trim();

      if (!accessToken) {
        throw new Error('Failed to obtain access token from Azure CLI');
      }

      // Parse token expiration (Azure CLI tokens typically last 1 hour)
      const expiresOn = new Date();
      expiresOn.setHours(expiresOn.getHours() + 1);

      this.cachedToken = { accessToken, expiresOn };
      return accessToken;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Azure CLI authentication failed: ${String(error)}`);
    }
  }

  /**
   * Get access token from Azure Managed Identity
   */
  private async getManagedIdentityToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.cachedToken && this.cachedToken.expiresOn > new Date()) {
      return this.cachedToken.accessToken;
    }

    try {
      // Azure Instance Metadata Service (IMDS) endpoint
      const imdsEndpoint = 'http://169.254.169.254/metadata/identity/oauth2/token';
      const resource = 'https://cognitiveservices.azure.com';
      
      const params: Record<string, string> = {
        'api-version': '2018-02-01',
        resource
      };

      // Add client_id if using user-assigned managed identity
      if (this.managedIdentityClientId) {
        params.client_id = this.managedIdentityClientId;
      }

      const response = await axios.get(imdsEndpoint, {
        params,
        headers: { 'Metadata': 'true' },
        timeout: 5000
      });

      const accessToken = response.data?.access_token;
      const expiresIn = response.data?.expires_in;

      if (!accessToken) {
        throw new Error('Failed to obtain access token from Managed Identity');
      }

      // Calculate expiration time
      const expiresOn = new Date();
      expiresOn.setSeconds(expiresOn.getSeconds() + (expiresIn || 3600));

      this.cachedToken = { accessToken, expiresOn };
      return accessToken;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          throw new Error('Not running in Azure environment or Managed Identity not configured');
        }
        if (error.response?.status === 400) {
          throw new Error('Managed Identity not assigned or not authorized for Cognitive Services');
        }
      }
      throw new Error(`Managed Identity authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build the Azure OpenAI endpoint URL
   */
  private buildUrl(): string {
    const baseUrl = this.endpoint.endsWith('/') ? this.endpoint.slice(0, -1) : this.endpoint;
    return `${baseUrl}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;
  }

  async completeJSON(request: LLMRequest): Promise<string> {
    try {
      const authHeaders = await this.getAuthHeaders();
      const url = this.buildUrl();

      const response = await this.http.post(url, {
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user }
        ],
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 1000
      }, {
        headers: authHeaders
      });

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Azure OpenAI API');
      }

      return content;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    try {
      const authHeaders = await this.getAuthHeaders();
      const url = this.buildUrl();

      const response = await this.http.post(url, {
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user }
        ],
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 1000
      }, {
        headers: authHeaders
      });

      const data = response.data;
      const message = data?.choices?.[0]?.message;
      
      if (!message?.content) {
        throw new Error('Empty response from Azure OpenAI API');
      }

      return {
        content: message.content,
        model: data.model || this.deploymentName,
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
        const code = error.response.data?.error?.code;
        
        if (status === 401) {
          this.handleError(new Error('Authentication failed. Check your API key or authentication method.'), 'Authentication');
        } else if (status === 403) {
          this.handleError(new Error('Access denied. Check RBAC permissions for your identity.'), 'Authorization');
        } else if (status === 404) {
          this.handleError(new Error(`Deployment '${this.deploymentName}' not found. Check your deployment name.`), 'Not Found');
        } else if (status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const msg = retryAfter 
            ? `Rate limit exceeded. Retry after ${retryAfter} seconds.`
            : 'Rate limit exceeded. Please try again later.';
          this.handleError(new Error(msg), 'Rate Limit');
        } else if (status === 400 && code === 'content_filter') {
          this.handleError(new Error('Content filtered by Azure content policy'), 'Content Filter');
        } else if (status === 503) {
          this.handleError(new Error('Azure OpenAI service temporarily unavailable'), 'Service');
        } else if (status >= 500) {
          this.handleError(new Error('Azure OpenAI server error'), 'Server');
        } else {
          this.handleError(new Error(message), 'API Error');
        }
      } else if (error.code === 'ECONNABORTED') {
        this.handleError(new Error('Request timeout'), 'Timeout');
      } else if (error.code === 'ECONNREFUSED') {
        this.handleError(new Error('Connection refused - check endpoint URL'), 'Network');
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
      vision: true, // Depends on deployment model
      embeddings: false // Separate endpoint
    };
  }

  /**
   * Check if Azure CLI is available
   */
  static async isAzureCliAvailable(): Promise<boolean> {
    try {
      await execAsync('az --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if logged in to Azure CLI
   */
  static async isAzureCliAuthenticated(): Promise<boolean> {
    try {
      await execAsync('az account show');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if running in Azure environment (for Managed Identity)
   */
  static async isAzureEnvironment(): Promise<boolean> {
    try {
      const response = await axios.get('http://169.254.169.254/metadata/instance', {
        params: { 'api-version': '2021-02-01' },
        headers: { 'Metadata': 'true' },
        timeout: 2000
      });
      return !!response.data;
    } catch {
      return false;
    }
  }

  /**
   * Get authentication status information
   */
  async getAuthStatus(): Promise<{
    method: AzureAuthMethod;
    isAuthenticated: boolean;
    message: string;
  }> {
    switch (this.authMethod) {
      case 'apiKey':
        return {
          method: 'apiKey',
          isAuthenticated: this.apiKey.trim().length > 0,
          message: this.apiKey.trim().length > 0 ? 'API key configured' : 'API key not set'
        };
      
      case 'azureCli':
        const cliAvailable = await AzureOpenAIProvider.isAzureCliAvailable();
        if (!cliAvailable) {
          return {
            method: 'azureCli',
            isAuthenticated: false,
            message: 'Azure CLI not installed'
          };
        }
        const cliAuthenticated = await AzureOpenAIProvider.isAzureCliAuthenticated();
        return {
          method: 'azureCli',
          isAuthenticated: cliAuthenticated,
          message: cliAuthenticated ? 'Logged in via Azure CLI' : 'Not logged in to Azure CLI (run: az login)'
        };
      
      case 'managedIdentity':
        const isAzure = await AzureOpenAIProvider.isAzureEnvironment();
        return {
          method: 'managedIdentity',
          isAuthenticated: isAzure,
          message: isAzure ? 'Running in Azure with Managed Identity' : 'Not in Azure environment'
        };
      
      default:
        return {
          method: this.authMethod,
          isAuthenticated: false,
          message: 'Unknown authentication method'
        };
    }
  }

  /**
   * Clear cached token (useful for testing or forcing refresh)
   */
  clearTokenCache(): void {
    this.cachedToken = null;
  }
}

/**
 * Build Azure OpenAI provider from VS Code settings
 */
export function buildAzureOpenAIProviderFromSettings(
  endpoint: string | undefined,
  apiKey: string | undefined,
  deploymentName: string | undefined,
  apiVersion: string | undefined,
  authMethod: string | undefined,
  timeout: number | undefined
): AzureOpenAIProvider | undefined {
  if (!endpoint || endpoint.trim().length === 0) {
    return undefined;
  }

  if (!deploymentName || deploymentName.trim().length === 0) {
    return undefined;
  }

  const config: AzureOpenAIProviderConfig = {
    name: 'Azure OpenAI',
    enabled: true,
    timeout: Math.max(1000, Math.min(60000, timeout ?? 30000)),
    endpoint: endpoint.trim(),
    apiKey: apiKey?.trim() || '',
    deploymentName: deploymentName.trim(),
    apiVersion: apiVersion || '2024-02-01',
    authMethod: (authMethod as AzureAuthMethod) || 'apiKey'
  };

  return new AzureOpenAIProvider(config);
}

