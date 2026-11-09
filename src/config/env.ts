export type ApiConfig =
  | { status: 'configured'; baseUrl: string }
  | { status: 'unconfigured' | 'invalid'; baseUrl: null }

export function readApiConfig(value: string | undefined): ApiConfig {
  if (!value?.trim()) return { status: 'unconfigured', baseUrl: null }

  try {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      return { status: 'invalid', baseUrl: null }
    }
    return { status: 'configured', baseUrl: url.href.replace(/\/+$/, '') }
  } catch {
    return { status: 'invalid', baseUrl: null }
  }
}

export const apiConfig = readApiConfig(import.meta.env.VITE_API_BASE_URL)
