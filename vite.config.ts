import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
        },
    },
    build: {
        // Chunk size warning limit - raised to accommodate optimized chunks
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                // Manual chunks for better code splitting
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'scheduler'],
                    'vendor-reactflow': ['reactflow', '@reactflow/core', '@reactflow/minimap', '@reactflow/controls', '@reactflow/background'],
                    'vendor-ui': [
                        '@radix-ui/react-dialog',
                        '@radix-ui/react-select',
                        '@radix-ui/react-checkbox',
                        '@radix-ui/react-label',
                        '@radix-ui/react-dropdown-menu',
                        '@radix-ui/react-accordion',
                        '@radix-ui/react-progress',
                        '@radix-ui/react-slot',
                        '@radix-ui/react-tabs',
                        '@radix-ui/react-tooltip'
                    ],
                    'vendor-icons': ['lucide-react'],
                    'vendor-charts': ['recharts'],
                    'vendor-utils': ['jose'],
                },
            },
        },
    },
})
