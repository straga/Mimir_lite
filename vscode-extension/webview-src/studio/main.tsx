import React from 'react';
import ReactDOM from 'react-dom/client';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Studio } from './Studio';
import './styles.css';

// VSCode API singleton
declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

// Make VSCode API available globally
(window as any).vscode = vscode;

console.log('🚀 Mimir Studio webview initializing...');

// Render Studio app
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <DndProvider backend={HTML5Backend}>
        <Studio />
      </DndProvider>
    </React.StrictMode>
  );
  console.log('✅ Mimir Studio webview mounted');
} else {
  console.error('❌ Root element not found');
}
