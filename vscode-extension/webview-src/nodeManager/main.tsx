import React from 'react';
import { createRoot } from 'react-dom/client';
import { NodeManager } from './NodeManager';

// Expose VS Code API globally
declare const acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();
(window as any).vscode = vscode;

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <NodeManager />
  </React.StrictMode>
);
