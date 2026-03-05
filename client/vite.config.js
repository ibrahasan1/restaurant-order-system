import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    // crossorigin-Attribut aus allen Tags im Build entfernen
    {
      name: 'remove-crossorigin',
      enforce: 'post',
      transformIndexHtml(html) {
        return html.replace(/ crossorigin/g, '');
      },
    },
  ],
  server: {
    host: '0.0.0.0', // Im lokalen Netzwerk erreichbar
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    modulePreload: {
      polyfill: false,
    },
  },
});
