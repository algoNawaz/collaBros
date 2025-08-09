import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // 1. Import the 'path' module

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: { // 2. Add the 'resolve' object
    alias: { // 3. Add the 'alias' object for module resolution
      'uuid': path.resolve(__dirname, 'node_modules/uuid'),
    },
  },
})