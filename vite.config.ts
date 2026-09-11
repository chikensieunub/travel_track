import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// STANDALONE=1 inlines everything into one .html that runs from a file on disk.
const standalone = process.env.STANDALONE === '1'

export default defineConfig({
  plugins: [react(), ...(standalone ? [viteSingleFile()] : [])],
  base: './',
  build: standalone
    ? {
        outDir: 'standalone',
        assetsInlineLimit: 100_000_000,
        cssCodeSplit: false,
        reportCompressedSize: false,
        // A classic script rather than a module: module scripts bring CORS rules
        // with them, and a page opened straight off disk has no origin to satisfy.
        rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
      }
    : {},
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
