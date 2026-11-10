import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, process.cwd(), 'MKTAUTO_').MKTAUTO_API_PROXY_TARGET
  if (!target) return { plugins: [react()] }
  const url = new URL(target)
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('MKTAUTO_API_PROXY_TARGET deve ser uma origem HTTP loopback sem credenciais.')
  }
  return {
    plugins: [react()],
    server: { proxy: { '/operations': {
      target: url.origin, changeOrigin: false, ws: false, followRedirects: false, proxyTimeout: 5000,
    } } },
  }
})
