import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The backend has no /api prefix; the proxy strips it so the app and API share one origin.
// VITE_API_TARGET points the proxy at another backend, so two checkouts can run side by side.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // not localhost: it resolves to ::1 first here, and the backend listens on IPv4
        target: process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
