# Provider Setup Guide

Complete guide to setting up LLM providers in Prompt Craft.

## Table of Contents

1. [Groq Setup](#groq-setup)
2. [OpenAI Setup](#openai-setup)
3. [Azure OpenAI Setup](#azure-openai-setup)
   - [API Key Authentication](#azure-api-key-authentication)
   - [Azure CLI Authentication](#azure-cli-authentication)
   - [Managed Identity Authentication](#azure-managed-identity-authentication)
4. [Switching Providers](#switching-providers)
5. [Troubleshooting](#troubleshooting)

---

## Groq Setup

Groq offers fast inference with free API access.

### Steps

1. **Get API Key**
   - Visit [groq.com](https://groq.com)
   - Sign up for an account
   - Navigate to API Keys section
   - Create a new API key

2. **Configure in VS Code**
   - Open VS Code Settings (Cmd+, or Ctrl+,)
   - Search for "Prompt Craft"
   - Set `Prompt Craft: Groq Api Key` to your API key

3. **Or use Environment Variable**
   ```bash
   export GROQ_API_KEY="your-api-key-here"
   code .  # Launch VS Code from this terminal
   ```

4. **Test Connection**
   - Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
   - Run "Prompt Craft: Test Provider Connection"

### Available Models

- `llama3-8b-8192` (default)
- `llama3-70b-8192`
- `mixtral-8x7b-32768`
- `gemma-7b-it`
- `gemma2-9b-it`

### Settings

```json
{
  "promptCraft.groqApiKey": "gsk_...",
  "promptCraft.requestTimeoutMs": 5000
}
```

---

## OpenAI Setup

OpenAI provides GPT-4 and GPT-3.5 models.

### Steps

1. **Get API Key**
   - Visit [platform.openai.com](https://platform.openai.com)
   - Sign in or create account
   - Go to API Keys section
   - Create a new secret key

2. **Configure in VS Code**
   - Open VS Code Settings
   - Search for "Prompt Craft OpenAI"
   - Set `Prompt Craft › Openai: Api Key`
   - Set `Prompt Craft › Openai: Model` (optional)

3. **Or use Environment Variable**
   ```bash
   export OPENAI_API_KEY="sk-..."
   code .
   ```

4. **Test Connection**
   - Command Palette → "Prompt Craft: Test Provider Connection"

### Available Models

- `gpt-4` - Most capable model
- `gpt-4-turbo` (default) - Balanced speed and capability
- `gpt-3.5-turbo` - Faster and cheaper

### Settings

```json
{
  "promptCraft.openai.apiKey": "sk-...",
  "promptCraft.openai.model": "gpt-4-turbo",
  "promptCraft.openai.timeout": 30000
}
```

### Cost Estimation

The extension estimates costs based on token usage:
- GPT-4: $30/1M input tokens, $60/1M output tokens
- GPT-4 Turbo: $10/1M input tokens, $30/1M output tokens
- GPT-3.5 Turbo: $0.50/1M input tokens, $1.50/1M output tokens

---

## Azure OpenAI Setup

Azure OpenAI provides enterprise-grade access to OpenAI models with multiple authentication options.

### Prerequisites

- Azure subscription
- Azure OpenAI resource created
- Model deployed in Azure OpenAI Studio

### Azure API Key Authentication

Best for: Development, testing, simple setups

#### Steps

1. **Get Azure OpenAI Details**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to your Azure OpenAI resource
   - Go to "Keys and Endpoint"
   - Copy:
     - Endpoint URL (e.g., `https://your-resource.openai.azure.com`)
     - API Key (Key 1 or Key 2)

2. **Get Deployment Name**
   - Go to Azure OpenAI Studio
   - Navigate to Deployments
   - Note your deployment name (e.g., `gpt-4-deployment`)

3. **Configure in VS Code**
   ```json
   {
     "promptCraft.azureOpenAI.endpoint": "https://your-resource.openai.azure.com",
     "promptCraft.azureOpenAI.apiKey": "your-api-key",
     "promptCraft.azureOpenAI.deploymentName": "gpt-4-deployment",
     "promptCraft.azureOpenAI.apiVersion": "2024-02-01",
     "promptCraft.azureOpenAI.authMethod": "apiKey"
   }
   ```

4. **Select Provider**
   - Click status bar or run "Prompt Craft: Select LLM Provider"
   - Choose "Azure OpenAI"

5. **Test Connection**
   - Run "Prompt Craft: Test Provider Connection"

---

### Azure CLI Authentication

Best for: Local development, no need to store API keys

#### Steps

1. **Install Azure CLI**
   ```bash
   # macOS
   brew install azure-cli
   
   # Windows
   winget install Microsoft.AzureCLI
   
   # Linux
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **Login to Azure**
   ```bash
   az login
   ```
   
   This will open a browser for authentication.

3. **Verify Login**
   ```bash
   az account show
   ```

4. **Configure in VS Code**
   ```json
   {
     "promptCraft.azureOpenAI.endpoint": "https://your-resource.openai.azure.com",
     "promptCraft.azureOpenAI.deploymentName": "gpt-4-deployment",
     "promptCraft.azureOpenAI.apiVersion": "2024-02-01",
     "promptCraft.azureOpenAI.authMethod": "azureCli"
   }
   ```
   
   Note: No API key needed!

5. **Test Connection**
   - The extension will automatically obtain access tokens from Azure CLI
   - Tokens are cached and refreshed automatically

#### Troubleshooting Azure CLI

- **"Not logged in to Azure CLI"**: Run `az login`
- **Token expired**: Run `az login` again
- **Multiple subscriptions**: Set specific subscription:
  ```bash
  az account set --subscription "subscription-id"
  ```

---

### Azure Managed Identity Authentication

Best for: Production environments, Azure VMs, App Services (most secure)

#### Steps

1. **Enable Managed Identity**
   
   For Azure VM:
   ```bash
   # System-assigned identity
   az vm identity assign --name myVM --resource-group myResourceGroup
   ```
   
   For App Service:
   ```bash
   az webapp identity assign --name myApp --resource-group myResourceGroup
   ```

2. **Grant Permissions**
   
   Assign "Cognitive Services User" role:
   ```bash
   # Get the principal ID of your managed identity
   PRINCIPAL_ID=$(az vm show --name myVM --resource-group myResourceGroup --query identity.principalId -o tsv)
   
   # Get your Azure OpenAI resource ID
   OPENAI_ID=$(az cognitiveservices account show --name myOpenAI --resource-group myResourceGroup --query id -o tsv)
   
   # Assign role
   az role assignment create \
     --assignee $PRINCIPAL_ID \
     --role "Cognitive Services User" \
     --scope $OPENAI_ID
   ```

3. **Configure in VS Code**
   
   For system-assigned identity:
   ```json
   {
     "promptCraft.azureOpenAI.endpoint": "https://your-resource.openai.azure.com",
     "promptCraft.azureOpenAI.deploymentName": "gpt-4-deployment",
     "promptCraft.azureOpenAI.apiVersion": "2024-02-01",
     "promptCraft.azureOpenAI.authMethod": "managedIdentity"
   }
   ```
   
   For user-assigned identity (add client ID):
   ```json
   {
     "promptCraft.azureOpenAI.endpoint": "https://your-resource.openai.azure.com",
     "promptCraft.azureOpenAI.deploymentName": "gpt-4-deployment",
     "promptCraft.azureOpenAI.apiVersion": "2024-02-01",
     "promptCraft.azureOpenAI.authMethod": "managedIdentity",
     "promptCraft.azureOpenAI.managedIdentity.clientId": "client-id-of-user-assigned-identity"
   }
   ```

4. **Test Connection**
   - Must be running on Azure VM/App Service
   - Extension will obtain tokens from Azure Instance Metadata Service (IMDS)

#### Troubleshooting Managed Identity

- **"Not running in Azure environment"**: This auth method only works on Azure VMs/App Services
- **"Not authorized"**: Check RBAC role assignment
- **403 errors**: Verify "Cognitive Services User" role is assigned correctly

---

## Switching Providers

### Via Status Bar
- Click the provider icon in the bottom-right status bar
- Select from configured providers

### Via Command Palette
- Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
- Run "Prompt Craft: Select LLM Provider"
- Choose desired provider

### Via Settings
```json
{
  "promptCraft.activeProvider": "openai"  // or "groq", "azure-openai"
}
```

### Check Provider Status
- Run "Prompt Craft: Show Provider Status"
- View all providers, their configuration, and health status

---

## Troubleshooting

### General Issues

**Provider Not Showing Up**
- Check that API key is configured
- Run "Prompt Craft: Reload Providers from Settings"
- Check VS Code Settings for typos

**Connection Test Fails**
- Verify API key is correct
- Check internet connection
- Check firewall/proxy settings
- For Azure: Verify endpoint URL format

**"No Provider Configured" Warning**
- At least one provider must be configured
- Add an API key for any provider
- Check settings are saved correctly

### Groq Issues

**401 Unauthorized**
- API key is invalid
- Get a new key from groq.com

**429 Rate Limit**
- Free tier has rate limits
- Wait and retry
- Consider upgrading plan

### OpenAI Issues

**401 Unauthorized**
- Invalid API key
- API key doesn't have proper permissions

**429 Rate Limit**
- Exceeded usage quota
- Check billing at platform.openai.com
- Wait for rate limit reset

**Model Not Available**
- Check you have access to the model
- Some models require approval

### Azure OpenAI Issues

**Deployment Not Found (404)**
- Check deployment name spelling
- Verify deployment exists in Azure OpenAI Studio

**Authentication Failed (401)**
- API Key: Check key is correct and not rotated
- Azure CLI: Run `az login` again
- Managed Identity: Verify role assignment

**Access Denied (403)**
- Check RBAC permissions
- Need "Cognitive Services User" role minimum

**Content Filtered**
- Azure content policy blocked the request
- Modify input to comply with policy
- Check content filtering settings in Azure

**Endpoint URL Issues**
- Must be format: `https://your-resource.openai.azure.com`
- No trailing slash
- No path segments

---

## Advanced Configuration

### Multiple Workspaces

Configure different providers per workspace:

1. Open workspace settings (.vscode/settings.json)
2. Add workspace-specific provider configuration
3. Workspace settings override user settings

### Environment Variables

Priority order:
1. VS Code Settings
2. Environment Variables
3. Not configured

Supported environment variables:
- `GROQ_API_KEY`
- `OPENAI_API_KEY`

### Proxy Configuration

VS Code respects system proxy settings. For custom proxy:

```json
{
  "http.proxy": "http://proxy.company.com:8080",
  "http.proxyAuthorization": "credentials"
}
```

---

## Best Practices

### Security
- **Never commit API keys** to version control
- Use environment variables or secure vaults
- Rotate keys regularly
- Use Azure Managed Identity in production

### Cost Management
- Start with Groq (free tier)
- Monitor OpenAI usage at platform.openai.com
- Set up billing alerts
- Use GPT-3.5 Turbo for simple tasks

### Performance
- Groq: Fastest inference
- OpenAI GPT-4 Turbo: Best balance
- Azure: Enterprise reliability

### Reliability
- Configure multiple providers as fallback
- Test connections after configuration changes
- Monitor provider health in status panel

---

## Support

### Documentation
- [Groq Documentation](https://groq.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Azure OpenAI Documentation](https://learn.microsoft.com/azure/ai-services/openai/)

### Extension Issues
- [GitHub Issues](https://github.com/mohitmishra786/prompt-craft/issues)
- Check extension logs in Output panel

---

**Last Updated**: December 13, 2025

