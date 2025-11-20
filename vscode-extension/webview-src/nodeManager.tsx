import React from 'react';
import { createRoot } from 'react-dom/client';
import { NodeManager } from './nodeManager/NodeManager';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<NodeManager />);
}
