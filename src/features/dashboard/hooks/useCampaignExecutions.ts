import { useEffect, useState } from 'react'
import { apiConfig, type ApiConfig } from '../../../config/env'
import { ApiError } from '../../../services/http/client'
import { CampaignExecutionsContractError, type CampaignExecution } from '../contracts/campaignExecutions'
import { loadCampaignExecutions } from '../services/campaignExecutions'
import { dashboardAccess } from '../services/dashboardMetrics'

export type CampaignExecutionsStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'unauthorized' | 'incompatible' | 'unavailable'
interface State { status: CampaignExecutionsStatus; data: CampaignExecution[] | null; message: string }
const idle: State = { status: 'idle', data: null, message: 'Nenhuma amostra de execuções carregada.' }
const unavailableMessages = {
  unconfigured: 'Configure a origem local da API para consultar as execuções.',
  invalid: 'Revise a URL pública da API: use uma URL HTTP local válida, sem credenciais.',
  origin: 'A sessão QC exige frontend e API na mesma origem local. Utilize o proxy local documentado.',
}
function failure(error: unknown): State {
  if (error instanceof CampaignExecutionsContractError || (error instanceof ApiError && error.kind === 'response')) return { status: 'incompatible', data: null, message: 'Contrato de execuções incompatível. A resposta foi recusada.' }
  if (error instanceof ApiError && [401, 403].includes(error.status ?? 0)) return { status: 'unauthorized', data: null, message: 'Sessão não autorizada para consultar execuções. Autentique-se no console existente desta origem e tente novamente.' }
  return { status: 'error', data: null, message: error instanceof ApiError && error.kind === 'http' ? 'O backend não disponibilizou a amostra de execuções. Tente novamente.' : 'Não foi possível conectar para consultar as execuções. Tente novamente.' }
}
export function useCampaignExecutions(config: ApiConfig = apiConfig, origin = window.location.origin) {
  const [attempt, setAttempt] = useState(0)
  const access = dashboardAccess(config, origin)
  const baseUrl = config.baseUrl, configStatus = config.status
  const key = `${configStatus}|${baseUrl}|${origin}|${attempt}`
  const [result, setResult] = useState<{ key: string; state: State }>({ key, state: idle })
  useEffect(() => {
    if (access !== 'ready' || configStatus !== 'configured' || baseUrl === null) return
    const controller = new AbortController()
    let active = true
    void Promise.resolve().then(async () => {
      if (!active) return
      setResult({ key, state: { ...idle, status: 'loading', message: 'Consultando amostra de execuções…' } })
      try {
        const data = await loadCampaignExecutions({ status: 'configured', baseUrl }, origin, controller.signal)
        if (active) setResult({ key, state: { data, status: data.length === 0 ? 'empty' : 'success', message: data.length === 0 ? 'A consulta retornou uma amostra vazia.' : 'Amostra recebida do backend. Atualização somente manual.' } })
      } catch (error) {
        if (active && !controller.signal.aborted) setResult({ key, state: failure(error) })
      }
    })
    return () => { active = false; controller.abort() }
  }, [access, configStatus, baseUrl, origin, key])
  const state: State = access !== 'ready'
    ? { ...idle, status: 'unavailable', message: unavailableMessages[access] }
    : result.key === key ? result.state : idle
  return { ...state, access, retry: () => setAttempt(previous => previous + 1) }
}
