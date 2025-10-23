// @ts-nocheck
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Explicitly set NODE_ENV if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  
  return {
    // Configuração do diretório raiz
    root: '.',
    
    // Base URL - importante para produção
    base: '/',
    
    define: {
      'process.env.NODE_ENV': `"${mode}"`,
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '1.0.0'),
      'import.meta.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL || 'ws://localhost:3001'),
      global: 'globalThis',
      // Polyfills for Node.js modules in browser
      'process.browser': true,
      'process.version': JSON.stringify('v18.0.0'),
    },
    
    server: {
      port: 3000,
      strictPort: true,
      host: true,
      open: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        clientPort: 3000,
        overlay: true,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    
    plugins: [
      react({
        jsxRuntime: 'automatic',
        fastRefresh: true,
        babel: {
          plugins: [
            ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
            // Add any other Babel plugins you need
          ],
        },
      }),
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
    ],

    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@/shared': resolve(__dirname, './src/shared'),
        '@/features': resolve(__dirname, './src/features'),
        '@/modules': resolve(__dirname, './src/modules'),
        'url-toolkit': 'url-toolkit/src/url-toolkit.js',
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
    },
    build: {
      reportCompressedSize: true,
      target: 'es2022',
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: !isProd,
      minify: isProd ? 'esbuild' : false,
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
      modulePreload: {
        polyfill: true,
      },
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
        esmExternals: true
      },
      dynamicImportVarsOptions: {
        exclude: [/node_modules/],
      },
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        onwarn(warning, warn) {
          // Ignorar avisos específicos se necessário
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
            return;
          }
          warn(warning);
        },
        output: {
          // Deixar Vite fazer code splitting automaticamente
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
    
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
        target: 'es2022',
        treeShaking: true,
        minify: isProd,
        keepNames: true,
        sourcemap: false,
        logLevel: 'warning',
        legalComments: 'none',
      },
      
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        '@supabase/supabase-js',
        'date-fns',
        'react-hook-form',
        'zod',
        'i18next',
        'react-i18next',
        'lucide-react',
        'recharts',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-select',
        '@radix-ui/react-scroll-area',
        '@radix-ui/react-alert-dialog',
        '@radix-ui/react-tabs',
        '@radix-ui/react-checkbox',
        'uuid',
        'chart.js',
        'lodash',
        'tailwindcss',
        'tailwindcss/nesting',
        'autoprefixer',
        // Polyfills for Node.js modules
        'buffer',
        'stream-browserify',
        'util',
        'events'
      ],
      exclude: isProd ? ['console', 'debugger'] : [],
    },
  };
});
