import { useEffect, useState } from 'react'
import { apiConfig, type ApiConfig } from '../../../config/env'
import { ApiError } from '../../../services/http/client'
import { ExecutionPublicationsContractError, type ExecutionPublication } from '../contracts/executionPublications'
import { loadExecutionPublications } from '../services/executionPublications'
import { dashboardAccess } from '../services/dashboardMetrics'

type Status = 'idle' | 'loading' | 'success' | 'empty' | 'error' | 'unauthorized' | 'incompatible' | 'unavailable'
interface State { status: Status; data: ExecutionPublication[] | null; message: string }
const idle: State = { status: 'idle', data: null, message: 'Selecione uma execução para consultar publicações.' }
export function useExecutionPublications(executionId: string | null, config: ApiConfig = apiConfig, origin = window.location.origin) {
  const [attempt, setAttempt] = useState(0)
  const access = dashboardAccess(config, origin)
  const baseUrl = config.baseUrl, configStatus = config.status
  const key = `${configStatus}|${baseUrl}|${origin}|${executionId}|${attempt}`
  const [result, setResult] = useState<{ key: string; state: State }>({ key, state: idle })
  useEffect(() => {
    if (access !== 'ready' || configStatus !== 'configured' || baseUrl === null || executionId === null) return
    const controller = new AbortController()
    let active = true
    void Promise.resolve().then(async () => {
      if (!active) return
      setResult({ key, state: { ...idle, status: 'loading', message: 'Consultando publicações da execução selecionada…' } })
      try {
        const data = await loadExecutionPublications({ status: 'configured', baseUrl }, origin, executionId, controller.signal)
        if (active) setResult({ key, state: { data, status: data.length === 0 ? 'empty' : 'success', message: data.length === 0 ? 'Nenhum registro retornado neste escopo.' : 'Consulta recebida. Atualização somente manual.' } })
      } catch (error) {
        if (!active || controller.signal.aborted) return
        const unauthorized = error instanceof ApiError && [401, 403].includes(error.status ?? 0)
        const incompatible = error instanceof ExecutionPublicationsContractError || (error instanceof ApiError && error.kind === 'response')
        setResult({ key, state: { data: null, status: unauthorized ? 'unauthorized' : incompatible ? 'incompatible' : 'error', message: unauthorized ? 'Sessão não autorizada. Autentique-se no console existente desta origem.' : incompatible ? 'Contrato incompatível. A resposta foi recusada.' : error instanceof ApiError && error.kind === 'http' ? 'Consulta indisponível no backend. Tente novamente.' : 'Falha de conexão. Tente novamente.' } })
      }
    })
    return () => { active = false; controller.abort() }
  }, [access, configStatus, baseUrl, origin, executionId, key])
  const state: State = access !== 'ready' ? { ...idle, status: 'unavailable', message: 'Consulta indisponível. É necessária uma API na mesma origem HTTP local com sessão QC.' }
    : executionId === null ? idle : result.key === key ? result.state : idle
  return { ...state, access, retry: () => setAttempt(previous => previous + 1) }
}
