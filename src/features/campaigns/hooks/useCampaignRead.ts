import { useCallback, useEffect, useState } from 'react'
import type { ApiConfig } from '../../../config/env'
import { ApiError } from '../../../services/http/client'
import { CampaignExecutionsContractError } from '../../dashboard/contracts/campaignExecutions'
import { dashboardAccess } from '../../dashboard/services/dashboardMetrics'
import { CampaignContractError, type CampaignQuery } from '../contracts/campaign'
import { loadCampaign, loadRecentActivity } from '../services/campaigns'

type Status = 'idle' | 'loading' | 'success' | 'empty' | 'unauthorized' | 'notfound' | 'incompatible' | 'error' | 'unavailable'
interface State<T> { status: Status; data: T | null; message: string }
const unavailableMessages = {
  unconfigured: 'Configure a origem local da API para consultar campanhas.',
  invalid: 'Revise a URL da API: use uma origem HTTP local válida, sem credenciais.',
  origin: 'A sessão QC exige frontend e API na mesma origem local. Utilize o proxy local documentado.',
}
function failure<T>(error: unknown, revisionLookup: boolean): State<T> {
  const state = (status: Status, message: string): State<T> => ({ status, message, data: null })
  if (error instanceof CampaignContractError || error instanceof CampaignExecutionsContractError || (error instanceof ApiError && error.kind === 'response')) return state('incompatible', 'Contrato incompatível. A resposta foi recusada; nenhum dado foi exibido.')
  if (error instanceof ApiError && [401, 403].includes(error.status ?? 0)) return state('unauthorized', 'Sessão não autorizada. Entre no console QC desta origem e tente novamente.')
  if (revisionLookup && error instanceof ApiError && error.status === 404) return state('notfound', 'Esta revisão de campanha não foi encontrada. Confira o identificador e a revisão.')
  return state('error', error instanceof ApiError && error.kind === 'http' ? 'O backend não disponibilizou esta consulta. Tente novamente.' : 'Não foi possível conectar à API. Tente novamente.')
}
function useRead<T>(resource: string | null, load: (config: ApiConfig, origin: string, signal?: AbortSignal) => Promise<T>, config: ApiConfig, origin: string, revisionLookup = false) {
  const [attempt, setAttempt] = useState(0)
  const access = dashboardAccess(config, origin), baseUrl = config.baseUrl, configStatus = config.status
  const key = `${configStatus}|${baseUrl}|${origin}|${resource}|${attempt}`
  const [result, setResult] = useState<{ key: string; state: State<T> } | null>(null)
  useEffect(() => {
    if (!resource || access !== 'ready' || configStatus !== 'configured' || baseUrl === null) return
    const controller = new AbortController()
    let active = true
    void Promise.resolve().then(async () => {
      if (!active) return
      setResult({ key, state: { status: 'loading', data: null, message: 'Consultando o backend…' } })
      try {
        const data = await load({ status: 'configured', baseUrl }, origin, controller.signal)
        if (active) setResult({ key, state: { status: Array.isArray(data) && data.length === 0 ? 'empty' : 'success', data, message: 'Consulta recebida. Atualização somente manual.' } })
      } catch (error) {
        if (active && !controller.signal.aborted) setResult({ key, state: failure<T>(error, revisionLookup) })
      }
    })
    return () => { active = false; controller.abort() }
  }, [resource, access, baseUrl, configStatus, origin, key, load, revisionLookup])
  const state: State<T> = access !== 'ready'
    ? { status: 'unavailable', data: null, message: unavailableMessages[access] }
    : result?.key === key ? result.state : { status: 'idle', data: null, message: 'Nenhuma consulta carregada.' }
  return { ...state, access, retry: () => setAttempt(value => value + 1) }
}
export function useRecentActivity(config: ApiConfig, origin: string) {
  return useRead('activity', loadRecentActivity, config, origin)
}
export function useCampaignRevision(query: CampaignQuery | null, config: ApiConfig, origin: string) {
  const id = query?.id, revision = query?.revision
  const load = useCallback((config: ApiConfig, origin: string, signal?: AbortSignal) => {
    if (!id || !revision) throw new Error('Consulta não selecionada.')
    return loadCampaign({ id, revision }, config, origin, signal)
  }, [id, revision])
  return useRead(id && revision ? `${id}:${revision}` : null, load, config, origin, true)
}
