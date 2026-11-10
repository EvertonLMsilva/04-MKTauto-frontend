import { useId, useState } from 'react'
import { NeonPanel } from '../../../components/ui/NeonPanel'
import { NeonButton } from '../../../components/ui/NeonButton'
import { StatusMessage } from '../../../components/ui/StatusMessage'
import { executionLabels, executionListLimit, executionStates, type CampaignExecution } from '../contracts/campaignExecutions'
import { ExecutionStatusBadge } from './ExecutionStatusBadge'
import type { CampaignExecutionsStatus } from '../hooks/useCampaignExecutions'

interface Props {
  executions: readonly CampaignExecution[] | null
  status: CampaignExecutionsStatus
  message: string
  canRefresh: boolean
  onRefresh: () => void
}
function ExecutionTime({ value }: { value: string | null }) {
  return value === null ? <>Não informado</> : <time dateTime={value}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))}</time>
}
export function CampaignQueue({ executions, status, message, canRefresh, onRefresh }: Props) {
  const filterId = useId()
  const [filter, setFilter] = useState('all')
  const filtered = executions?.filter(item => filter === 'all' || item.status === filter) ?? null
  const loading = status === 'loading'
  const error = ['error', 'unauthorized', 'incompatible'].includes(status)
  return (
    <NeonPanel title="Fila e execuções" eyebrow="AMOSTRA OPERACIONAL" className="campaign-queue" action={canRefresh && <NeonButton variant="secondary" loading={loading} onClick={onRefresh}>Atualizar execuções</NeonButton>}>
      <p className="panel-description">Execuções agendadas, em andamento, aguardando intervenção e encerradas. A elegibilidade de disparo permanece sob o backend.</p>
      <p className="execution-note">Até {executionListLimit} execuções recentes, por atualização decrescente e depois identificador. Sem paginação ou total global. Horários em America/Sao_Paulo.</p>
      <div className="execution-read-state" aria-busy={loading}>
        <StatusMessage tone={error ? 'error' : loading ? 'loading' : executions ? 'success' : 'info'}>{message}</StatusMessage>
        {status === 'unauthorized' && <a className="dashboard-session-link" href="/operations" target="_blank" rel="noreferrer">Abrir console para autenticar execuções</a>}
      </div>
      <div className="execution-filters">
        <div>
          <label htmlFor={filterId}>Filtrar estados da amostra</label>
          <select id={filterId} value={filter} onChange={event => setFilter(event.target.value)} disabled={executions === null}>
            <option value="all">Todos os estados da amostra</option>
            {executionStates.map(state => <option key={state} value={state}>{executionLabels[state]}</option>)}
          </select>
        </div>
        {executions !== null && <p className="execution-note" role="status">Exibindo {filtered?.length} de {executions.length} registros desta amostra.</p>}
      </div>
      {executions?.length === executionListLimit && <p className="execution-limit">A amostra atingiu o limite de 100. Podem existir outras execuções fora desta consulta.</p>}
      {executions === null && <p className="execution-note">Nenhuma amostra de execuções disponível para exibição.</p>}
      {executions?.length === 0 && <p className="execution-note">Amostra vazia confirmada pelo backend. Não informa o total histórico.</p>}
      {executions && executions.length > 0 && filtered?.length === 0 && <p className="execution-note">Nenhuma execução corresponde ao filtro nesta amostra.</p>}
      {filtered && filtered.length > 0 && <ul className="execution-list" aria-label="Execuções da amostra" tabIndex={0}>
        {filtered.map(item => <li key={item.execution_id}>
          <article aria-label={`Execução ${item.execution_id}`}>
            <div className="execution-heading">
              <div><h3><span className="sr-only">Execução </span><code>{item.execution_id}</code></h3><p>Campanha <code>{item.campaign_id}</code> · revisão {item.campaign_revision}</p></div>
              <ExecutionStatusBadge status={item.status} />
            </div>
            <dl className="execution-dates">
              <div><dt>Agendamento</dt><dd><ExecutionTime value={item.scheduled_at} /></dd></div>
              <div><dt>Criação</dt><dd><ExecutionTime value={item.created_at} /></dd></div>
              <div><dt>Atualização</dt><dd><ExecutionTime value={item.updated_at} /></dd></div>
            </dl>
            <p className="execution-lineage">Run <code>{item.run_id}</code></p>
            {(item.pending || ['WAITING_INPUT', 'WAITING_RECONCILIATION'].includes(item.status)) && <div className="execution-pending"><strong>Pendência</strong><p>{item.pending?.message ?? 'Motivo da pendência não informado.'}</p>{item.pending?.code && <code>{item.pending.code}</code>}</div>}
          </article>
        </li>)}
      </ul>}
    </NeonPanel>
  )
}
