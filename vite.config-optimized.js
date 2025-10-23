import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    root: '.',

    define: {
      'process.env.NODE_ENV': `"${mode}"`,
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      'import.meta.env.VITE_WS_URL': JSON.stringify(process.env.VITE_WS_URL || 'ws://localhost:3001'),
      global: 'globalThis',
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
        fastRefresh: !isProd,
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
        output: {
          manualChunks: (id) => {
            // Vendor chunks for better caching
            if (id.includes('node_modules')) {
              if (id.includes('react/') || id.includes('react-dom/')) {
                return 'react-vendor';
              }
              if (id.includes('@supabase/')) {
                return 'supabase-vendor';
              }
              if (id.includes('@radix-ui/')) {
                return 'ui-vendor';
              }
              if (id.includes('lucide-react')) {
                return 'icons-vendor';
              }
              if (id.includes('framer-motion')) {
                return 'motion-vendor';
              }
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'i18n-vendor';
              }
              if (id.includes('date-fns') || id.includes('lodash')) {
                return 'utils-vendor';
              }

              const packageName = id.split('node_modules/')[1]?.split('/')[0];
              if (packageName && !['clsx', 'class-variance-authority', 'tailwind-merge'].includes(packageName)) {
                return `vendor-${packageName}`;
              }
            }

            // Page-based code splitting
            if (id.includes('src/pages/')) {
              const page = id.split('src/pages/')[1]?.split('/')[0];
              if (page) {
                const heavyPages = ['Dashboard', 'CreateActivityPage', 'MeetingRoomPage', 'ReportsPage'];
                if (heavyPages.some(p => id.includes(p))) {
                  return `lazy-${page}`;
                }
                return `page-${page}`;
              }
            }
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },

        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },

        external: ['fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'zlib', 'tty', 'util', 'net', 'tls', 'child_process', 'dns'],
      },
    },

    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
        loader: {
          '.js': 'jsx',
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
        'framer-motion',
        'recharts',
        'chart.js',
        'lodash',
        'clsx',
        'class-variance-authority',
        'tailwind-merge',
        // Polyfills for Node.js modules
        'buffer',
        'stream-browserify',
        'util',
        'events'
      ],

      exclude: isProd ? ['console', 'debugger'] : [],
    },

    // Performance optimizations
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },

    // CSS optimizations
    css: {
      devSourcemap: !isProd,
    },
  }
});
