import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import orbitalSavePlugin from './scripts/orbitalSavePlugin.mjs'

export default defineConfig({ plugins: [react(), orbitalSavePlugin()], build: { target: 'es2022' } })
