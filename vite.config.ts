import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  plugins: [
    react(),
    electron([
      {
        // Ponto de entrada do Processo Principal do Electron
        entry: 'src/main/main.ts',
        onstart(options) {
          // Inicia o Electron após a compilação do main
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron/main',
            minify: false,
            rollupOptions: {
              external: ['electron', 'bufferutil', 'utf-8-validate']
            }
          }
        }
      },
      {
        // Script Preload seguro para isolamento de contexto IPC
        entry: 'src/main/preload.ts',
        onstart(options) {
          // Recarrega o app quando o preload script for modificado
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron/main',
            minify: false,
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ]
})
