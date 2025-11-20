import * as vscode from 'vscode';
import * as path from 'path';

export class NodeManagerPanel {
  public static currentPanel: NodeManagerPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.ViewColumn.One;

    // If we already have a panel, show it
    if (NodeManagerPanel.currentPanel) {
      NodeManagerPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'mimirNodeManager',
      'Node Manager',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist')
        ]
      }
    );

    NodeManagerPanel.currentPanel = new NodeManagerPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'ready':
            // Send configuration when webview is ready
            this._panel.webview.postMessage({
              command: 'config',
              config: {
                apiUrl: vscode.workspace.getConfiguration('mimir').get('apiUrl', 'http://localhost:9042')
              }
            });
            break;

          case 'confirmDelete': {
            // Show native confirmation dialog
            const result = await vscode.window.showWarningMessage(
              `Are you sure you want to delete this node?\n\nType: ${message.nodeType}\nID: ${message.nodeId}\n\nThis will also delete all edges connected to this node.`,
              { modal: true },
              'Delete'
            );

            if (result === 'Delete') {
              this._panel.webview.postMessage({
                command: 'deleteConfirmed',
                nodeId: message.nodeId
              });
            }
            break;
          }

          case 'showError':
            vscode.window.showErrorMessage(message.message);
            break;

          case 'showInfo':
            vscode.window.showInformationMessage(message.message);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'nodeManager.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src http://localhost:* http://127.0.0.1:*;">
      <title>Node Manager</title>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }

  public dispose() {
    NodeManagerPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
