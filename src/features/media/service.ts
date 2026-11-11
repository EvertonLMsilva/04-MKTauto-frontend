import type { ApiConfig } from '../../config/env'
import { ApiError, createHttpClient } from '../../services/http/client'
import { dashboardAccess } from '../dashboard/services/dashboardMetrics'
import { parseExecutionContent, validExecutionId } from './contracts'

function executionPath(config: ApiConfig, origin: string, id: string) {
  if (dashboardAccess(config, origin) !== 'ready' || !validExecutionId(id)) throw new ApiError('request')
  return `/operations/executions/${encodeURIComponent(id)}`
}
export async function loadExecutionContent(config: ApiConfig, origin: string, id: string, signal: AbortSignal) {
  const path = executionPath(config, origin, id)
  const response = await createHttpClient(config).request(path, { method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal })
  return parseExecutionContent(response, id)
}

/** The shared HTTP client is JSON-only/read-only in this topic. Binary GETs retain its transport policy. */
export async function loadMediaFile(config: ApiConfig, origin: string, id: string, kind: 'audio' | 'video', signal: AbortSignal, download = false): Promise<Blob> {
  const path = executionPath(config, origin, id)
  if (download && kind !== 'video') throw new ApiError('request')
  const url = `${new URL(origin).origin}${path}/${kind === 'audio' ? 'narration.wav' : 'final.mp4'}${download ? '?download=1' : ''}`
  let response: Response
  try {
    response = await fetch(url, { method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal, headers: { Accept: kind === 'audio' ? 'audio/wav' : 'video/mp4' } })
  } catch {
    throw new ApiError(signal.aborted ? 'aborted' : 'network')
  }
  if (!response.ok) {
    let code: string | null = null
    try {
      const body: unknown = await response.json()
      if (body && typeof body === 'object' && 'code' in body && typeof body.code === 'string' && /^[A-Z0-9_]{1,100}$/.test(body.code)) code = body.code
    } catch { /* HTTP status remains authoritative, including non-JSON auth errors. */ }
    throw new ApiError('http', response.status, code)
  }
  const mime = response.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase()
  if ((kind === 'audio' ? !['audio/wav', 'audio/x-wav', 'audio/wave'].includes(mime ?? '') : mime !== 'video/mp4')) {
    await response.body?.cancel()
    throw new ApiError('response')
  }
  try {
    const blob = await response.blob()
    if (!blob.size) throw new ApiError('response')
    return blob
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(signal.aborted ? 'aborted' : 'network')
  }
}

export function mediaErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Sessão QC ausente ou expirada. Autentique-se manualmente no console QC desta origem e tente novamente.'
    if (error.status === 403) return 'Acesso negado pelo backend. Sua identidade não está autorizada a consultar este recurso.'
    if (error.status === 404) return 'Recurso não encontrado (404). Confira a execução e a disponibilidade da rota no runtime.'
    if (error.status === 409) return 'Recurso bloqueado ou desatualizado no backend (409). Atualize a consulta para conferir as pendências.'
    if (error.status === 400) return 'O backend recusou os requisitos deste recurso (400). Confira as pendências da execução.'
    if (error.status === 503) return 'Serviço ou configuração indisponível no backend (503).'
    if (error.kind === 'network') return 'Falha de rede. Verifique o runtime local e tente novamente manualmente.'
    if (error.kind === 'response') return 'Resposta incompatível: o recurso não possui o formato esperado.'
    return 'Não foi possível consultar o recurso no backend.'
  }
  return 'Resposta incompatível com o contrato de conteúdo. Nenhum dado desta resposta foi exibido.'
}
