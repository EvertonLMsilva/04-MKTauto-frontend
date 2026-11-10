import { useId } from 'react'
import { NeonPanel } from '../../../components/ui/NeonPanel'
import { NeonBadge } from '../../../components/ui/NeonBadge'
import { StatusMessage } from '../../../components/ui/StatusMessage'
import type { CampaignExecution } from '../contracts/campaignExecutions'
import type { CampaignExecutionsStatus } from '../hooks/useCampaignExecutions'

const states = { RUNNING: 'Processando', WAITING_INPUT: 'Aguardando insumo', WAITING_RECONCILIATION: 'Aguardando reconciliação' } as const
export function ProcessingPanel({ executions, status, message, selectedId, onSelect }: {
  executions: readonly CampaignExecution[] | null; status: CampaignExecutionsStatus; message: string
  selectedId: string; onSelect: (id: string) => void
}) {
  const selectId = useId()
  const processing = executions?.filter(row => Object.hasOwn(states, row.status))
  return <NeonPanel title="Acompanhamento de processamentos" eyebrow="RECORTE DA AMOSTRA" className="processing-panel">
    <p className="panel-description">Estados atuais das até 100 execuções da fila. Não representa todos os processamentos do banco. Sem estimativa de progresso ou duração.</p>
    <div aria-busy={status === 'loading'}>
      {executions === null && <StatusMessage tone={['error', 'unauthorized', 'incompatible'].includes(status) ? 'error' : status === 'loading' ? 'loading' : 'info'}>{message}</StatusMessage>}
      {processing?.length === 0 && <p className="execution-note">Nenhum processamento nesses três estados na amostra recebida.</p>}
      {processing && processing.length > 0 && <ul className="execution-list processing-list" aria-label="Processamentos da amostra" tabIndex={0}>
        {processing.map(item => <li key={item.execution_id}><article aria-label={`Processamento ${item.execution_id}`}>
          <div className="execution-heading"><h3><code>{item.execution_id}</code></h3><NeonBadge tone={item.status === 'RUNNING' ? 'info' : 'warning'}>{states[item.status as keyof typeof states]}</NeonBadge></div>
          <p className="execution-lineage">Campanha <code>{item.campaign_id}</code> · revisão {item.campaign_revision}<br />Run <code>{item.run_id}</code></p>
          <p className="execution-note">Atualização: {item.updated_at ? <time dateTime={item.updated_at}>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(item.updated_at))}</time> : 'Não informada'} · America/Sao_Paulo</p>
          {item.status !== 'RUNNING' && <div className="execution-pending"><strong>Pendência</strong><p>{item.pending?.message ?? 'Motivo da pendência não informado.'}</p>{item.pending?.code && <code>{item.pending.code}</code>}</div>}
        </article></li>)}
      </ul>}
    </div>
    <div className="execution-filters"><div>
      <label htmlFor={selectId}>Execução para consultar mídias e publicações</label>
      <select id={selectId} value={selectedId} onChange={event => onSelect(event.target.value)} disabled={!executions?.length}>
        <option value="">Selecione uma execução da amostra</option>
        {executions?.map(item => <option key={item.execution_id} value={item.execution_id}>{item.execution_id}</option>)}
      </select>
    </div></div>
    <p className="execution-note">Seleção local; inclui execuções encerradas. Atualize a fila para renovar a amostra. Cada painel abaixo possui atualização manual própria.</p>
  </NeonPanel>
}
