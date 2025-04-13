import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    // Telegram 미니앱 테스트를 위한 HTTPS 설정
    // https: {
    //   key: fs.readFileSync('path/to/server.key'),
    //   cert: fs.readFileSync('path/to/server.crt'),
    // },
  },
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    sourcemap: false,
  },
});
