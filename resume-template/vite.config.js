import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/zwpsummary/',
    plugins: [vue()],
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: ["mixed-decls", "color-functions", "global-builtin", "import"],
            },
        },
    },
    server:{
        port:30011,
        allowedHosts:['www.zwpsite.icu']
    }
})