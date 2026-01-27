import * as vscode from "vscode";
import { sanitizePrompt } from "./sanitizer";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
        case "copyToClipboard": {
            await vscode.env.clipboard.writeText(data.value);
            vscode.window.showInformationMessage("Prompt copied to clipboard!");
            break;
        }
      }
    });
  }

  public isReady(): boolean {
    return !!this._view;
  }

  public showPrompt(title: string, content: string) {
      if (this._view) {
          this._view.show?.(true); // Focus the view
          const sanitized = sanitizePrompt(content);
          this._view.webview.postMessage({
              type: "show-prompt",
              value: { title, content: sanitized }
          });
      } else {
          vscode.window.showErrorMessage("Prompt Craft Sidebar is not open. Please open it from the Activity Bar.");
      }
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "media", "sidebar.js")
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				
				<title>Prompt Craft</title>
                <style>
                    body { padding: 10px; font-family: var(--vscode-font-family); }
                    .card {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        padding: 10px;
                        margin-bottom: 10px;
                    }
                    h2 { font-size: 14px; margin-top: 0; }
                    textarea {
                        width: 100%;
                        height: 300px;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        font-family: monospace;
                        font-size: 12px;
                        resize: vertical;
                    }
                    button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 12px;
                        cursor: pointer;
                        margin-top: 5px;
                        width: 100%;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .hidden { display: none; }
                </style>
			</head>
			<body>
                <div id="placeholder" style="text-align: center; margin-top: 20px; color: var(--vscode-descriptionForeground);">
                    Run "Analyze Project" or "Generate Error Prompt" to see results here.
                </div>

                <div id="prompt-container" class="hidden">
                    <h2 id="prompt-title">Prompt</h2>
                    <textarea id="prompt-content"></textarea>
                    <button id="copy-btn">Copy to Clipboard</button>
                </div>

				<script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    
                    window.addEventListener('message', event => {
                        const message = event.data; // The JSON data our extension sent
                        
                        switch (message.type) {
                            case 'show-prompt':
                                document.getElementById('placeholder').classList.add('hidden');
                                document.getElementById('prompt-container').classList.remove('hidden');
                                document.getElementById('prompt-title').innerText = message.value.title;
                                document.getElementById('prompt-content').value = message.value.content;
                                break;
                        }
                    });

                    document.getElementById('copy-btn').addEventListener('click', () => {
                        const content = document.getElementById('prompt-content').value;
                        vscode.postMessage({
                            type: 'copyToClipboard',
                            value: content
                        });
                    });
                </script>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
