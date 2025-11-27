The `gemini-cli` and `codex-cli` providers are wired to use user authentication tokens through OAuth-based authentication rather than traditional API keys. Both providers are designed to leverage existing CLI tool authentication that users set up independently.

## Provider Registration

Both providers are registered in the main provider registry in `ai-services-unified.js` [1](#0-0)  and classified as providers that don't require API keys [2](#0-1) .

## Gemini CLI Authentication

The `GeminiCliProvider` handles authentication through its `getClient()` method [3](#0-2) :

- **Primary path**: Uses `authType: 'oauth-personal'` when no API key is provided
- **Fallback**: Supports API key authentication for compatibility
- The `createGeminiProvider` SDK handles OAuth token management internally
- `validateAuth()` is overridden to perform no validation since the SDK manages authentication [4](#0-3)

## Codex CLI Authentication

The `CodexCliProvider` implements OAuth authentication through the CLI tool [5](#0-4) :

- **isRequiredApiKey()** returns `false` [6](#0-5)
- **getClient()** creates a client using `createCodexCli` with optional API key injection
- OAuth authentication is handled by the Codex CLI tool after users run `codex login`
- The provider validates CLI availability but not authentication status [7](#0-6)

## Authentication Flow

Both providers follow this authentication pattern:

1. **User Setup**: Users authenticate via CLI tools (`gemini` for Gemini CLI, `codex login` for Codex CLI)
2. **Provider Detection**: Task Master detects these as "no API key required" providers [8](#0-7)
3. **Token Usage**: The underlying SDK packages (`ai-sdk-provider-gemini-cli`, `ai-sdk-provider-codex-cli`) handle token retrieval and usage
4. **Configuration**: Users configure these providers in `.taskmaster/config.json` without needing to set API keys

## Notes

- Both providers are codebase-capable and automatically enable codebase analysis features [9](#0-8)
- OAuth authentication is the primary and recommended method for both providers
- API key support exists for compatibility but is not the intended usage pattern
- The providers rely on users having previously authenticated with the respective CLI tools

Wiki pages you might want to explore:

- [AI Integration (eyaltoledano/claude-task-master)](/wiki/eyaltoledano/claude-task-master#7)
- [Configuration Management (eyaltoledano/claude-task-master)](/wiki/eyaltoledano/claude-task-master#8)

### Citations

**File:** scripts/modules/ai-services-unified.js (L85-87)

```javascript
 'codex-cli': new CodexCliProvider(),
 'gemini-cli': new GeminiCliProvider(),
 'grok-cli': new GrokCliProvider()
```

**File:** scripts/modules/config-manager.js (L578-583)

```javascript
 return (
  currentProvider === CUSTOM_PROVIDERS.CLAUDE_CODE ||
  currentProvider === CUSTOM_PROVIDERS.GEMINI_CLI ||
  currentProvider === CUSTOM_PROVIDERS.GROK_CLI ||
  currentProvider === CUSTOM_PROVIDERS.CODEX_CLI
 );
```

**File:** scripts/modules/config-manager.js (L807-814)

```javascript
 const providersWithoutApiKeys = [
  CUSTOM_PROVIDERS.OLLAMA,
  CUSTOM_PROVIDERS.BEDROCK,
  CUSTOM_PROVIDERS.MCP,
  CUSTOM_PROVIDERS.GEMINI_CLI,
  CUSTOM_PROVIDERS.GROK_CLI,
  CUSTOM_PROVIDERS.CODEX_CLI
 ];
```

**File:** scripts/modules/config-manager.js (L825-828)

```javascript
 // Codex CLI supports OAuth via codex login; API key optional
 if (providerName?.toLowerCase() === 'codex-cli') {
  return true; // Treat as OK even without key
 }
```

**File:** src/ai-providers/gemini-cli.js (L28-35)

```javascript
 validateAuth(params) {
  // Gemini CLI is designed to use pre-configured OAuth authentication
  // Users choose gemini-cli specifically to leverage their existing
  // gemini auth login credentials, not to use API keys.
  // We support API keys for compatibility, but the expected usage
  // is through CLI authentication (no API key required).
  // No validation needed - the SDK will handle auth internally
 }
```

**File:** src/ai-providers/gemini-cli.js (L45-74)

```javascript
 async getClient(params) {
  try {
   // Primary use case: Use existing gemini CLI authentication
   // Secondary use case: Direct API key (for compatibility)
   let authOptions = {};

   if (params.apiKey && params.apiKey !== 'gemini-cli-no-key-required') {
    // API key provided - use it for compatibility
    authOptions = {
     authType: 'api-key',
     apiKey: params.apiKey
    };
   } else {
    // Expected case: Use gemini CLI authentication via OAuth
    authOptions = {
     authType: 'oauth-personal'
    };
   }

   // Add baseURL if provided (for custom endpoints)
   if (params.baseURL) {
    authOptions.baseURL = params.baseURL;
   }

   // Create and return the provider
   return createGeminiProvider(authOptions);
  } catch (error) {
   this.handleError('client initialization', error);
  }
 }
```

**File:** src/ai-providers/codex-cli.js (L46-48)

```javascript
 isRequiredApiKey() {
  return false;
 }
```

**File:** src/ai-providers/codex-cli.js (L64-81)

```javascript
 validateAuth() {
  if (process.env.NODE_ENV === 'test') return;

  if (!this._codexCliChecked) {
   try {
    execSync('codex --version', { stdio: 'pipe', timeout: 1000 });
    this._codexCliAvailable = true;
   } catch (error) {
    this._codexCliAvailable = false;
    log(
     'warn',
     'Codex CLI not detected. Install with: npm i -g @openai/codex or enable fallback with allowNpx.'
    );
   } finally {
    this._codexCliChecked = true;
   }
  }
 }
```

**File:** src/ai-providers/codex-cli.js (L90-117)

```javascript
 getClient(params = {}) {
  try {
   // Merge global + command-specific settings from config
   const settings = getCodexCliSettingsForCommand(params.commandName) || {};

   // Inject API key only if explicitly provided; OAuth is the primary path
   const defaultSettings = {
    ...settings,
    ...(params.apiKey
     ? { env: { ...(settings.env || {}), OPENAI_API_KEY: params.apiKey } }
     : {})
   };

   return createCodexCli({ defaultSettings });
  } catch (error) {
   const msg = String(error?.message || '');
   const code = error?.code;
   if (code === 'ENOENT' || /codex/i.test(msg)) {
    const enhancedError = new Error(
     `Codex CLI not available. Please install Codex CLI first. Original error: ${error.message}`
    );
    enhancedError.cause = error;
    this.handleError('Codex CLI initialization', enhancedError);
   } else {
    this.handleError('client initialization', error);
   }
  }
 }
```
