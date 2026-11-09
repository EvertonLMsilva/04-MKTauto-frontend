import type { ApiConfig } from '../../config/env'
import type { ApiErrorKind, HttpClient } from './contracts'

const messages: Record<ApiErrorKind, string> = {
  configuration: 'Configure uma URL HTTP válida para a API.',
  request: 'O caminho da requisição não pertence à API configurada.',
  http: 'A API não conseguiu atender à requisição.',
  network: 'Não foi possível conectar à API.',
  aborted: 'A requisição foi cancelada.',
  response: 'A API retornou uma resposta JSON inválida.',
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: string | null

  constructor(kind: ApiErrorKind, status: number | null = null, code: string | null = null) {
    super(messages[kind])
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.code = code
  }
}

function isAborted(error: unknown, signal: AbortSignal | null | undefined) {
  return signal?.aborted || (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
}

function requestUrl(config: ApiConfig, path: string) {
  if (config.status !== 'configured') throw new ApiError('configuration')
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) throw new ApiError('request')
  const base = new URL(config.baseUrl)
  const url = new URL(config.baseUrl + path)
  const prefix = base.pathname.replace(/\/+$/, '') + '/'
  if (url.origin !== base.origin || !url.pathname.startsWith(prefix)) throw new ApiError('request')
  return url.href
}

export function createHttpClient(config: ApiConfig): HttpClient {
  return {
    async request(path, options = {}) {
      const url = requestUrl(config, path)
      const headers = new Headers(options.headers)
      if (!headers.has('Accept')) headers.set('Accept', 'application/json')
      let response: Response
      try {
        response = await fetch(url, { credentials: 'omit', ...options, headers })
      } catch (error) {
        throw new ApiError(isAborted(error, options.signal) ? 'aborted' : 'network')
      }
      if (!response.ok) {
        let code: string | null = null
        try {
          const payload: unknown = await response.json()
          if (typeof payload === 'object' && payload !== null && 'code' in payload && typeof payload.code === 'string' && /^[A-Z0-9_]{1,100}$/.test(payload.code)) code = payload.code
        } catch {
          // Erros sem JSON continuam sendo erros HTTP; detalhes privados não são exibidos.
        }
        throw new ApiError('http', response.status, code)
      }
      if (response.status === 204) return undefined
      try {
        return await response.json() as unknown
      } catch (error) {
        throw new ApiError(isAborted(error, options.signal) ? 'aborted' : 'response')
      }
    },
  }
}
