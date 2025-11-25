import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // Important for embedded serving
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 5174,
    proxy: {
      // Proxy API requests to NornicDB server
      '/api': {
        target: 'http://localhost:7475',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/db': {
        target: 'http://localhost:7475',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:7475',
        changeOrigin: true,
      },
      '/nornicdb': {
        target: 'http://localhost:7475',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:7475',
        changeOrigin: true,
      },
    },
  },
});
