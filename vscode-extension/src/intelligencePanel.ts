import * as vscode from 'vscode';
import * as path from 'path';

export class IntelligencePanel {
  public static currentPanel: IntelligencePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _apiUrl: string;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, apiUrl: string) {
    this._panel = panel;
    this._apiUrl = apiUrl;

    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, extensionUri);
    
    // Send initial config
    this._panel.webview.postMessage({
      command: 'config',
      apiUrl: this._apiUrl
    });

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'selectFolder':
            await this._handleSelectFolder();
            break;
          case 'showMessage':
            this._showMessage(message.type, message.message);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri, apiUrl: string) {
    // If we already have a panel, show it
    if (IntelligencePanel.currentPanel) {
      IntelligencePanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'mimirIntelligence',
      '🧠 Mimir Code Intelligence',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist')
        ]
      }
    );

    IntelligencePanel.currentPanel = new IntelligencePanel(panel, extensionUri, apiUrl);
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, state: any, apiUrl: string) {
    IntelligencePanel.currentPanel = new IntelligencePanel(panel, extensionUri, apiUrl);
  }

  public static updateAllPanels(config: { apiUrl: string }) {
    if (IntelligencePanel.currentPanel) {
      IntelligencePanel.currentPanel._apiUrl = config.apiUrl;
      IntelligencePanel.currentPanel._panel.webview.postMessage({
        command: 'config',
        apiUrl: config.apiUrl
      });
    }
  }

  private async _handleSelectFolder() {
    // Get workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('❌ No workspace folder is open');
      return;
    }

    // Show folder picker
    const folderUri = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select Folder to Index',
      defaultUri: workspaceFolders[0].uri
    });

    if (!folderUri || folderUri.length === 0) {
      return; // User cancelled
    }

    const selectedPath = folderUri[0].fsPath;

    // Validate path is within workspace
    const validation = this._validateAndTranslatePath(selectedPath, workspaceFolders);
    
    if (!validation.isValid) {
      vscode.window.showErrorMessage(
        `❌ Cannot index folder: ${validation.error}\n\nFolder: ${selectedPath}\n\nOnly folders within your mounted workspace can be indexed.`,
        { modal: true }
      );
      return;
    }

    // Show progress indicator
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Indexing Folder',
      cancellable: false
    }, async (progress) => {
      progress.report({ message: 'Sending request to Mimir server...' });

      try {
        // Call API to add folder
        const response = await fetch(`${this._apiUrl}/api/index-folder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: validation.containerPath, // Use translated container path
            hostPath: selectedPath, // Also send original host path for reference
            recursive: true,
            generate_embeddings: true
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        progress.report({ message: 'Folder added successfully!' });

        vscode.window.showInformationMessage(
          `✅ Folder added to indexing:\n\nHost: ${selectedPath}\nContainer: ${validation.containerPath}\n\nIndexing will begin shortly.`
        );

        // Refresh the webview
        this._panel.webview.postMessage({ command: 'refresh' });

      } catch (error: any) {
        vscode.window.showErrorMessage(`❌ Failed to add folder: ${error.message}`);
      }
    });
  }

  private _validateAndTranslatePath(hostPath: string, workspaceFolders: readonly vscode.WorkspaceFolder[]): {
    isValid: boolean;
    error?: string;
    containerPath?: string;
  } {
    // Get environment variables for path translation
    const hostWorkspaceRoot = process.env.HOST_WORKSPACE_ROOT || '';
    const containerWorkspaceRoot = process.env.WORKSPACE_ROOT || '/workspace';

    // Normalize paths
    const normalizedHostPath = path.normalize(hostPath);

    // Check if path is within any workspace folder
    let isWithinWorkspace = false;
    let workspaceRoot = '';

    for (const folder of workspaceFolders) {
      const folderPath = path.normalize(folder.uri.fsPath);
      if (normalizedHostPath.startsWith(folderPath)) {
        isWithinWorkspace = true;
        workspaceRoot = folderPath;
        break;
      }
    }

    if (!isWithinWorkspace) {
      return {
        isValid: false,
        error: 'Selected folder is not within the current workspace'
      };
    }

    // If HOST_WORKSPACE_ROOT is set, we need to translate the path
    if (hostWorkspaceRoot) {
      const normalizedHostRoot = path.normalize(hostWorkspaceRoot);
      
      // Check if the selected path is within the mounted workspace
      if (!normalizedHostPath.startsWith(normalizedHostRoot)) {
        return {
          isValid: false,
          error: `Folder is outside the mounted workspace.\n\nMounted workspace: ${hostWorkspaceRoot}\nSelected folder: ${hostPath}\n\nOnly folders within the mounted workspace can be indexed.`
        };
      }

      // Translate path from host to container
      const relativePath = path.relative(normalizedHostRoot, normalizedHostPath);
      const containerPath = path.posix.join(containerWorkspaceRoot, relativePath.split(path.sep).join(path.posix.sep));

      return {
        isValid: true,
        containerPath
      };
    }

    // No translation needed (local development, no Docker)
    return {
      isValid: true,
      containerPath: normalizedHostPath
    };
  }

  private _showMessage(type: 'info' | 'warning' | 'error', message: string) {
    switch (type) {
      case 'info':
        vscode.window.showInformationMessage(message);
        break;
      case 'warning':
        vscode.window.showWarningMessage(message);
        break;
      case 'error':
        vscode.window.showErrorMessage(message);
        break;
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'intelligence.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
          script-src 'nonce-${nonce}' 'unsafe-eval'; 
          style-src ${webview.cspSource} 'unsafe-inline'; 
          connect-src http: https:;
          font-src ${webview.cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mimir Code Intelligence</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  public dispose() {
    IntelligencePanel.currentPanel = undefined;
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
