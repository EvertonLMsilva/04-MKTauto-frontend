import { useEffect, useRef, useState } from 'react'
import { apiConfig, type ApiConfig } from '../../../config/env'
import { ApiError } from '../../../services/http/client'
import { OperationalQueueContractError, operationalQueueLimit, type OperationalQueuePage } from '../contracts/operationalQueue'
import { dashboardAccess } from '../services/dashboardMetrics'
import { loadOperationalQueue } from '../services/operationalQueue'

export type OperationalQueueStatus = 'loading' | 'success' | 'empty' | 'error' | 'unauthorized' | 'incompatible' | 'unavailable'
interface State { status: OperationalQueueStatus; data: OperationalQueuePage | null; message: string }
const loading: State = { status: 'loading', data: null, message: 'Consultando fila de publicações…' }
function failure(error: unknown): State {
  if (error instanceof ApiError && [401, 403].includes(error.status ?? 0)) return { status: 'unauthorized', data: null, message: 'Sessão não autorizada. Autentique-se no console existente desta origem e atualize a fila.' }
  if (error instanceof OperationalQueueContractError || (error instanceof ApiError && error.kind === 'response')) return { status: 'incompatible', data: null, message: 'Contrato da fila incompatível. A resposta foi recusada.' }
  return { status: 'error', data: null, message: 'Não foi possível consultar a fila. Tente atualizar novamente.' }
}
export function useOperationalQueue(config: ApiConfig = apiConfig, origin = window.location.origin) {
  const [request, setRequest] = useState({ offset: 0, attempt: 0 })
  const busy = useRef(false)
  const access = dashboardAccess(config, origin), { baseUrl, status: configStatus } = config
  const key = `${configStatus}|${baseUrl}|${origin}|${request.offset}|${request.attempt}`
  const [result, setResult] = useState<{ key: string; state: State }>({ key: '', state: loading })
  useEffect(() => {
    if (access !== 'ready' || configStatus !== 'configured' || baseUrl === null) { busy.current = false; return }
    busy.current = true
    const controller = new AbortController()
    let active = true
    void Promise.resolve().then(async () => {
      if (!active) return
      setResult({ key, state: loading })
      try {
        const data = await loadOperationalQueue({ status: 'configured', baseUrl }, origin, request.offset, controller.signal)
        if (active) setResult({ key, state: { data, status: data.items.length ? 'success' : 'empty', message: data.items.length ? 'Fila recebida do backend. Atualização somente manual.' : 'Nenhum registro retornado nesta página.' } })
      } catch (error) {
        if (active && !controller.signal.aborted) setResult({ key, state: failure(error) })
      } finally { if (active) busy.current = false }
    })
    return () => { active = false; controller.abort() }
  }, [access, configStatus, baseUrl, origin, request.offset, key])
  const state: State = access !== 'ready'
    ? { status: 'unavailable', data: null, message: 'Consulta indisponível. Configure a API na mesma origem local com sessão QC.' }
    : result.key === key ? result.state : loading
  const change = (offset: number) => {
    if (access !== 'ready' || busy.current) return
    busy.current = true
    setRequest(previous => ({ offset, attempt: previous.attempt + 1 }))
  }
  return {
    ...state, access, offset: request.offset,
    retry: () => change(request.offset),
    previous: () => { if (request.offset > 0) change(Math.max(0, request.offset - operationalQueueLimit)) },
    next: () => { if (state.data && state.data.offset + state.data.limit < state.data.total) change(state.data.offset + state.data.limit) },
  }
}
