# Publishing Prompt Craft to the VS Code Marketplace

This guide shows how to package and publish the extension so others can install it without cloning the repo.

## 1) Prepare metadata

- Ensure `package.json` has:
  - `name`: `prompt-craft`
  - `displayName`, `description`
  - `publisher`: your Marketplace publisher (e.g., `mohitmishra786`)
  - `version`: e.g., `0.0.1`
  - `engines.vscode`: compatible VS Code version
  - `categories`, optional `keywords`
  - Optional `icon`: set path like `images/icon.png`
  - Optional `files` whitelist to keep package small

## 2) Create a publisher (one-time)

- Go to the Marketplace management portal and create a publisher:
  - https://marketplace.visualstudio.com/manage → New Publisher
- Use the publisher name in `package.json` (e.g., `mohitmishra786`).

## 3) Package a VSIX

- Build and package without installing anything globally:

```bash
npm run compile
npx vsce package
```

- This generates a `.vsix` file (e.g., `prompt-craft-0.0.1.vsix`).
- You can install it locally: VS Code → Extensions → ... menu → "Install from VSIX..."

## 4) Publish to Marketplace

- Install vsce (optional if using `npx`, but easier for repeat publishes):

```bash
npm i -g @vscode/vsce
```

- Authenticate (creates a token cache):

```bash
vsce login <your-publisher>
# follow prompts to enter your Azure DevOps Personal Access Token
```

- Publish (bumps need to be manual in `package.json`):

```bash
# For a patch bump after editing package.json version
vsce publish
# Or choose a bump type directly
vsce publish patch
vsce publish minor
vsce publish major
```

## Notes

- For Marketplace publishing, the `publisher` in `package.json` must match your publisher account.
- Do not commit API keys. The extension reads the Groq key from VS Code Settings (`promptCraft.groqApiKey`) or env var `GROQ_API_KEY`.
- The `demo/` folder can be excluded from the packaged extension if `files` is configured.