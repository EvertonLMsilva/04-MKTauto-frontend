import { useId, useState } from 'react'
import { NeonPanel } from '../../../components/ui/NeonPanel'
import { NeonButton } from '../../../components/ui/NeonButton'
import { NeonBadge } from '../../../components/ui/NeonBadge'
import { StatusMessage } from '../../../components/ui/StatusMessage'
import { executionLabels, executionStates } from '../contracts/campaignExecutions'
import { publicationLabels, publicationStates } from '../contracts/executionPublications'
import type { OperationalQueuePage, QueueDestination } from '../contracts/operationalQueue'
import type { OperationalQueueStatus } from '../hooks/useOperationalQueue'

interface Props {
  page: OperationalQueuePage | null
  offset: number
  status: OperationalQueueStatus
  message: string
  canRefresh: boolean
  onRefresh: () => void
  onPrevious: () => void
  onNext: () => void
}
const nextActions: Record<string, string> = {
  NONE: 'Nenhuma ação indicada', REVIEW_HUMAN_APPROVAL: 'Revisar aprovação humana exata', REVIEW_PACKAGE: 'Revisar pacote', REVIEW_APPROVAL: 'Revisar aprovação', REVIEW_FAILURE: 'Revisar falha', PREPARE_FACEBOOK: 'Preparar Facebook', CHECK_EXECUTION_GATES: 'Verificar gates da execução', REVIEW_SUPERSESSION_RECOVERY: 'Revisar recuperação da sucessora', AUTHORIZE_RECOVERY_AND_RECONCILE: 'Autorizar recuperação e reconciliar', REVIEW_INSTAGRAM_RECONCILIATION: 'Revisar reconciliação Instagram', VERIFY_RECEIPT: 'Verificar recibo', REQUEST_NEW_AUTHORIZATION: 'Solicitar nova autorização', AUTHORIZE_SUCCESSOR: 'Autorizar sucessora', AUTHORIZE_FACEBOOK: 'Autorizar Facebook', CHECK_PROCESSING: 'Verificar processamento', WAIT_FOR_CLAIM_RELEASE: 'Aguardar liberação da execução',
}
function Time({ value }: { value: string | null }) {
  return value === null ? <>Não informado</> : <time dateTime={value}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))}</time>
}
function Destination({ value: d }: { value: QueueDestination }) {
  const network = d.network === 'INSTAGRAM' ? 'Instagram' : 'Facebook'
  const confirmedLive = d.receipt !== null && d.executionMode === 'live' && !d.simulated
  const state = d.state === null ? 'Estado não informado' : publicationStates.some(s => s === d.state) ? publicationLabels[d.state as keyof typeof publicationLabels] : d.state
  const approval = d.approval.revoked ? 'Revogada' : d.approval.pending ? `Pendente${d.approval.decision ? ` · ${d.approval.decision}` : ''}` : d.approval.decision ?? 'Não informada'
  return <section aria-label={`Destino ${network} ${d.accountId}`} className="execution-lineage">
    <div className="execution-heading"><h4>{network} · <code>{d.accountId}</code></h4><NeonBadge tone={confirmedLive ? 'success' : d.requiresReconciliation || d.simulated ? 'warning' : 'info'}>{d.state === 'PUBLISHED' ? 'Estado PUBLISHED' : state}</NeonBadge></div>
    <p>{d.executionMode === 'fake' ? 'Modo simulado · FAKE' : d.executionMode === 'live' ? 'Modo LIVE' : 'Modo não informado'} · {d.required ? 'Destino obrigatório' : 'Destino adicional'}</p>
    <p>{d.simulated ? 'Simulação; não comprova publicação real.' : confirmedLive ? 'Recibo remoto confirmado pelo backend.' : d.receipt ? 'Recibo informado; modo não informado.' : 'Sem recibo remoto confirmado.'}</p>
    {d.receipt && <p>Recibo <code>{d.receipt.mediaId}</code></p>}
    <dl className="execution-dates">
      <div><dt>Aprovação</dt><dd>{approval}</dd></div>
      <div><dt>Autorização</dt><dd>{d.authorizationExpired ? 'Expirada' : d.authorizationExpiresAt ? <>Expiração informada: <Time value={d.authorizationExpiresAt} /></> : 'Não informada'}</dd></div>
      <div><dt>Reconciliação</dt><dd>{d.requiresReconciliation ? 'Necessária' : 'Não sinalizada pelo backend'}</dd></div>
    </dl>
    <p>Pendência: <code>{d.pendingCode ?? 'Não informada'}</code></p>
    <p>Próximo passo: {nextActions[d.nextAction] ?? d.nextAction} · <code>{d.nextAction}</code></p>
    {d.activeClaim && <p>Execução em andamento; claim ativo informado pelo backend.</p>}
    <p>Operação <code>{d.operationId ?? 'Não informada'}</code> · versão {d.version ?? 'Não informada'}</p>
    {d.supersessionRevision > 0 && <p>Revisão da sucessora: {d.supersessionRevision} · original <code>{d.originalOperationId ?? 'Não informada'}</code></p>}
    <p>Evidência: <Time value={d.lastEvidence?.at ?? null} /> · provedor <code>{d.lastEvidence?.providerStatus ?? 'Não informado'}</code> · estágio incerto <code>{d.lastEvidence?.uncertainStage ?? 'Não informado'}</code></p>
  </section>
}
export function CampaignQueue({ page, offset, status, message, canRefresh, onRefresh, onPrevious, onNext }: Props) {
  const filterId = useId(), [filter, setFilter] = useState('all')
  const filtered = page?.items.filter(item => filter === 'all' || item.campaignStatus === filter)
  const loading = status === 'loading', error = ['error', 'unauthorized', 'incompatible'].includes(status)
  return <NeonPanel title="Fila e execuções" eyebrow="PUBLICAÇÕES POR DESTINO" className="campaign-queue" action={canRefresh && <NeonButton variant="secondary" loading={loading} onClick={onRefresh}>Atualizar fila</NeonButton>}>
    <p className="panel-description">Campanhas e ocorrências com destinos independentes. Concluir uma execução não comprova publicação. Esta fila permite somente consulta.</p>
    <p id={`${filterId}-scope`} className="execution-note">Paginação do backend, até 25 registros por consulta. Filtro aplicado somente à página recebida. Horários em America/Sao_Paulo.</p>
    <div className="execution-read-state" aria-busy={loading}>
      <StatusMessage tone={error ? 'error' : loading ? 'loading' : page ? 'success' : 'info'}>{message}</StatusMessage>
      {status === 'unauthorized' && <a className="dashboard-session-link" href="/operations" target="_blank" rel="noreferrer">Abrir console para autenticar a fila</a>}
    </div>
    <div className="execution-filters">
      <div><label htmlFor={filterId}>Filtrar estados desta página</label><select id={filterId} aria-describedby={`${filterId}-scope`} value={filter} onChange={e => setFilter(e.target.value)} disabled={!page || loading}>
        <option value="all">Todos os estados desta página</option>
        {[...new Set([...executionStates, ...(page?.items.map(i => i.campaignStatus) ?? [])])].map(state => <option key={state} value={state}>{executionLabels[state as keyof typeof executionLabels] ?? state}</option>)}
      </select></div>
      {page && <p className="execution-note" role="status">Página: {page.items.length ? `${page.offset + 1}–${page.offset + page.items.length}` : 'sem registros'} · total informado: {page.total} · exibindo {filtered?.length} nesta página.</p>}
    </div>
    {!page && <p className="execution-note">Nenhuma página da fila disponível para exibição.</p>}
    {page?.items.length === 0 && <p className="execution-note">Página vazia confirmada pelo backend.</p>}
    {page && page.items.length > 0 && filtered?.length === 0 && <p className="execution-note">Nenhuma execução corresponde ao filtro nesta página.</p>}
    {!!filtered?.length && <ul className="execution-list" aria-label="Publicações da página" tabIndex={0}>
      {filtered.map(item => <li key={item.executionId}><article aria-label={`Execução ${item.executionId}`}>
        <div className="execution-heading"><div><h3><code>{item.executionId}</code></h3><p>Campanha <code>{item.campaignId}</code> · revisão {item.campaignRevision}</p></div><NeonBadge tone="info">Execução: {executionLabels[item.campaignStatus as keyof typeof executionLabels] ?? item.campaignStatus}</NeonBadge></div>
        <dl className="execution-dates"><div><dt>Ocorrência</dt><dd>{item.occurrenceDate ?? 'Não informada'}</dd></div><div><dt>Projeto</dt><dd>{item.projectId ?? 'Não informado'}</dd></div><div><dt>Run</dt><dd>{item.runId ?? 'Não informado'}</dd></div></dl>
        <p className="execution-lineage">{item.destinations.some(d => d.required) ? `Recibos dos destinos obrigatórios: ${item.publicationComplete ? 'presentes; confira o modo de cada destino.' : 'pendentes.'}` : 'Destinos obrigatórios não informados.'}</p>
        {item.blockingCode && <p className="execution-pending">Bloqueio da execução: <code>{item.blockingCode}</code></p>}
        {item.destinations.length ? item.destinations.map(d => <Destination key={`${d.network}:${d.accountId}`} value={d} />) : <p className="execution-note">Destinos não informados.</p>}
      </article></li>)}
    </ul>}
    {canRefresh && <nav className="execution-filters" aria-label="Paginação da fila"><NeonButton variant="secondary" disabled={loading || offset === 0} onClick={onPrevious}>Página anterior</NeonButton><NeonButton variant="secondary" disabled={loading || !page || page.offset + page.limit >= page.total} onClick={onNext}>Próxima página</NeonButton></nav>}
  </NeonPanel>
}
