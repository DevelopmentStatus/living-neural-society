import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': './src',
      '@/core': './src/core',
      '@/agents': './src/agents',
      '@/world': './src/world',
      '@/social': './src/social',
      '@/civilization': './src/civilization',
      '@/conflict': './src/conflict',
      '@/evolution': './src/evolution',
      '@/utils': './src/utils',
      '@/types': './src/types',
      '@/constants': './src/constants',
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
      external: [
        '@tensorflow/tfjs-layers',
        '@tensorflow/tfjs-converter',
        '@tensorflow/tfjs-data',
        '@tensorflow/tfjs-backend-cpu',
        '@tensorflow/tfjs-backend-webgl',
      ],
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
      'brain.js',
      'three',
      'd3',
      'lodash',
      'ramda',
    ],
    exclude: ['@tensorflow/tfjs'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    global: 'globalThis',
  },
  worker: {
    format: 'es',
  },
}); 