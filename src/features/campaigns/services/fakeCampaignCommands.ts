import type { ApiConfig } from '../../../config/env'
import { ApiError, createHttpClient } from '../../../services/http/client'
import { dashboardAccess } from '../../dashboard/services/dashboardMetrics'
import type { Campaign } from '../contracts/campaign'
import { canResume, FakeCommandContractError, parseControlledExecution, parseQcSession, parseRegistration, validExecutionId, validateCampaignDraft, validateExecutionDraft, type ControlledExecution, type ExecutionRequest } from '../contracts/fakeCampaignCommands'

export type CommandProblem = { kind: 'blocked' | 'failed' | 'ambiguous' | 'conflict'; message: string; invalidateSession?: boolean }
export function commandProblem(error: unknown, mutation = false): CommandProblem {
  if (error instanceof ApiError) {
    const { status, code } = error
    if (status === 401) return { kind: 'blocked', message: code === 'QC_SESSION_EXPIRED' ? 'Sessão QC expirada. Entre novamente no console operacional.' : 'Sessão QC ausente. Entre no console operacional.', invalidateSession: true }
    if (status === 403) return { kind: 'blocked', message: code === 'QC_CSRF_REQUIRED' ? 'CSRF ausente ou inválido. Verifique novamente a sessão QC.' : 'Operador sem permissão para este comando.', invalidateSession: true }
    if (code === 'QC_FAKE_COMMAND_CONFIGURATION_REQUIRED') return { kind: 'blocked', message: 'BACKEND_OPT_IN_PENDING: comandos FAKE desabilitados ou sem configuração privada autorizada.' }
    if (code === 'FAKE_EXECUTION_PROVIDER_FORBIDDEN') return { kind: 'blocked', message: 'O backend bloqueou a configuração de provedores. Somente processamento local é permitido.' }
    if (status === 404 && !code) return { kind: 'blocked', message: 'RUNTIME_PENDING: endpoint indisponível neste runtime.' }
    if (status === 409) return { kind: 'conflict', message: 'Conflito (409). Consulte o estado e a versão atuais antes de uma nova decisão.' }
    if (status && status >= 400 && status < 500) return { kind: 'failed', message: `Comando recusado${code ? `: ${code}` : ` (HTTP ${status})`}. Confira os dados e os pré-requisitos.` }
    if (!mutation) return { kind: 'failed', message: 'Falha de rede ou resposta inválida. Atualize a consulta manualmente.' }
  }
  if (mutation) return { kind: 'ambiguous', message: 'Resposta ambígua: a operação pode ter sido persistida. Consulte antes de qualquer nova ação; não haverá reenvio automático.' }
  return { kind: 'failed', message: error instanceof FakeCommandContractError ? 'Contrato incompatível. Nenhum estado de execução foi presumido.' : 'Não foi possível concluir a consulta.' }
}
function transport(config: ApiConfig, origin: string, path: string, body?: unknown, csrf?: string, signal?: AbortSignal) {
  if (dashboardAccess(config, origin) !== 'ready') throw new Error('Origem local compatível necessária.')
  if (body && (!csrf || !/^[A-Za-z0-9_-]{43}$/.test(csrf))) throw new Error('CSRF inválido.')
  return createHttpClient(config).request(path, { method: body ? 'POST' : 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal: signal ?? AbortSignal.timeout(20000),
    ...(body ? { headers: { 'Content-Type': 'application/json', 'x-qc-csrf': csrf! }, body: JSON.stringify(body) } : {}) })
}
export function fakeCampaignCommands(config: ApiConfig, origin: string) {
  const base = '/operations/campaign-commands'
  return {
    async session(signal?: AbortSignal) { return parseQcSession(await transport(config, origin, '/operations/session', undefined, undefined, signal)) },
    async register(campaign: Campaign, idempotencyKey: string, confirmation: boolean, csrf: string) {
      const draft = Object.fromEntries(Object.entries(campaign).map(([k, v]) => [k, String(v)]))
      if (!confirmation || !/^[a-z0-9][a-z0-9_-]{2,79}$/.test(idempotencyKey) || !validateCampaignDraft(draft).data) throw new Error('Cadastro ou confirmação inválidos.')
      return parseRegistration(await transport(config, origin, `${base}/campaigns`, { mode: 'FAKE', confirmation: true, idempotencyKey, campaign }, csrf), campaign)
    },
    async prepare(request: ExecutionRequest, confirmation: boolean, csrf: string, actorId: string) {
      const draft = { campaignId: request.campaignId, campaignRevision: String(request.campaignRevision), projectVersion: String(request.projectVersion), mediaReference: request.localImage.mediaReference, contentHash: request.localImage.contentHash, origin: request.localImage.origin, usageBasis: request.localImage.rights.usageBasis, evidence: JSON.stringify(request.localImage.rights.evidence) }
      if (!confirmation || !validateExecutionDraft(draft, request.localImage.rights.commercialUseAllowed).data || !/^[a-zA-Z0-9][a-zA-Z0-9_:.-]{2,199}$/.test(request.requestId) || !Number.isFinite(Date.parse(request.requestedAt))) throw new Error('Execução ou confirmação inválidos.')
      return parseControlledExecution(await transport(config, origin, `${base}/executions/fake`, { mode: 'FAKE', confirmation: true, request }, csrf), 'EXECUTION_ACCEPTED', { request, actorId })
    },
    async read(executionId: string, signal?: AbortSignal) {
      if (!validExecutionId(executionId)) throw new Error('Identificador de execução inválido.')
      return parseControlledExecution(await transport(config, origin, `${base}/executions/${encodeURIComponent(executionId)}`, undefined, undefined, signal), 'EXECUTION_STATE', { executionId })
    },
    async resume(state: ControlledExecution, confirmation: boolean, csrf: string) {
      const checked = parseControlledExecution(state, state.result)
      if (!confirmation || !canResume(checked)) throw new Error('Estado ou confirmação de retomada inválidos.')
      const result = parseControlledExecution(await transport(config, origin, `${base}/executions/${encodeURIComponent(checked.execution.executionId)}/resume`, { mode: 'FAKE', confirmation: true, expectedVersion: checked.execution.version }, csrf), 'EXECUTION_STATE', { executionId: checked.execution.executionId })
      if (result.execution.campaignId !== checked.execution.campaignId || result.execution.campaignRevision !== checked.execution.campaignRevision || result.execution.runId !== checked.execution.runId || Object.keys(checked.policy).some(k => result.policy[k as keyof typeof result.policy] !== checked.policy[k as keyof typeof checked.policy])) throw new FakeCommandContractError()
      return result
    },
  }
}
