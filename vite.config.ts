import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    base: "",
    plugins: [vue()],
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
    },
    envPrefix: ['VITE_', 'TAURI_'],
    build: {
        minify: true,
        commonjsOptions: {
            transformMixedEsModules: true,
        }
    }
})
