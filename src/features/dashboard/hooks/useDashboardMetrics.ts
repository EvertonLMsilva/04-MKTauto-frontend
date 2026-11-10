import { useEffect, useState } from 'react'
import { apiConfig, type ApiConfig } from '../../../config/env'
import { ApiError } from '../../../services/http/client'
import { DashboardContractError, metricKeys, type DashboardSummary } from '../contracts/dashboardMetrics'
import { dashboardAccess, loadDashboardMetrics } from '../services/dashboardMetrics'

type State = {
  status: 'idle' | 'loading' | 'success' | 'error' | 'unavailable'
  data: DashboardSummary | null
  message: string
  unauthorized: boolean
}
const idle: State = { status: 'idle', data: null, message: 'Nenhum dado operacional carregado', unauthorized: false }
const unavailableMessages = {
  unconfigured: 'Configure a origem local da API para consultar os indicadores.',
  invalid: 'Revise a URL pública da API: use uma URL HTTP local válida, sem credenciais.',
  origin: 'A sessão QC exige frontend e API na mesma origem local. Configure o proxy local documentado.',
}
function failure(error: unknown): Pick<State, 'message' | 'unauthorized'> {
  if (error instanceof DashboardContractError || (error instanceof ApiError && error.kind === 'response')) return { message: 'Contrato de indicadores incompatível. Os dados foram recusados.', unauthorized: false }
  if (error instanceof ApiError && [401, 403].includes(error.status ?? 0)) return { message: 'Sessão não autorizada. Autentique-se no console operacional existente desta origem e tente novamente.', unauthorized: true }
  return { message: error instanceof ApiError && error.kind === 'http' ? 'O backend não disponibilizou os indicadores. Verifique o endpoint e tente novamente.' : 'Erro de conexão. Não foi possível consultar os indicadores.', unauthorized: false }
}

export function useDashboardMetrics(config: ApiConfig = apiConfig, origin = window.location.origin) {
  const [attempt, setAttempt] = useState(0)
  const key = `${config.status}|${config.baseUrl}|${origin}|${attempt}`
  const [result, setResult] = useState<{ key: string; state: State }>({ key, state: idle })
  const access = dashboardAccess(config, origin)
  const baseUrl = config.baseUrl, configStatus = config.status
  useEffect(() => {
    if (access !== 'ready' || configStatus !== 'configured' || baseUrl === null) return
    const controller = new AbortController()
    let active = true
    void Promise.resolve().then(async () => {
      if (!active) return
      setResult({ key, state: { ...idle, status: 'loading', message: 'Consultando indicadores operacionais…' } })
      try {
        const data = await loadDashboardMetrics({ status: 'configured', baseUrl }, origin, controller.signal)
        if (active) setResult({ key, state: { status: metricKeys.every(metric => data[metric] === null) ? 'unavailable' : 'success', data, message: 'Resumo histórico recebido do backend.', unauthorized: false } })
      } catch (error) {
        if (active && !controller.signal.aborted) setResult({ key, state: { status: 'error', data: null, ...failure(error) } })
      }
    })
    return () => { active = false; controller.abort() }
  }, [access, configStatus, baseUrl, origin, key])
  const state: State = access !== 'ready'
    ? { ...idle, status: 'unavailable', message: unavailableMessages[access] }
    : result.key === key ? result.state : idle
  return { ...state, access, retry: () => setAttempt(previous => previous + 1) }
}
