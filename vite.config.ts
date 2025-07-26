import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/core': path.resolve(__dirname, './src/core'),
      '@/agents': path.resolve(__dirname, './src/agents'),
      '@/world': path.resolve(__dirname, './src/world'),
      '@/social': path.resolve(__dirname, './src/social'),
      '@/civilization': path.resolve(__dirname, './src/civilization'),
      '@/conflict': path.resolve(__dirname, './src/conflict'),
      '@/evolution': path.resolve(__dirname, './src/evolution'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/constants': path.resolve(__dirname, './src/constants'),
    },
  },
  server: {
    port: 3000,
    host: true,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ai: ['@tensorflow/tfjs', 'brain.js'],
          graphics: ['three', 'd3', 'pixi.js'],
          utils: ['lodash', 'ramda', 'date-fns'],
        },
      },
    },
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tensorflow/tfjs',
      'brain.js',
      'three',
      'd3',
      'lodash',
      'ramda',
    ],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  worker: {
    format: 'es',
  },
}); 