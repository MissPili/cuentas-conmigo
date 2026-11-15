import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Shown in the app so it is easy to tell which version is open (Amplify provides the commit).
  define: { __BUILD__: JSON.stringify((process.env.AWS_COMMIT_ID ?? '').slice(0, 7) || 'local') },
})
