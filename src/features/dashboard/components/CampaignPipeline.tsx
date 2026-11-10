import { NeonPanel } from '../../../components/ui/NeonPanel'
import { executionStates, type CampaignExecution } from '../contracts/campaignExecutions'
import { ExecutionStatusBadge } from './ExecutionStatusBadge'

export function CampaignPipeline({ executions }: { executions: readonly CampaignExecution[] | null }) {
  return (
    <NeonPanel title="Pipeline de campanhas" eyebrow="ESTADOS ATUAIS" className="pipeline-panel">
      <p className="panel-description">Distribuição de execuções na amostra de até 100 registros. Cada execução tem seu estado atual; este painel não representa uma sequência de transições.</p>
      {executions === null && <p className="execution-note">Estados ainda não consultados.</p>}
      {executions?.length === 0 && <p className="execution-note">Nenhuma execução foi retornada nesta amostra.</p>}
      <ul className="execution-state-grid" aria-label="Estados atuais da amostra">
        {executionStates.map(status => (
          <li key={status}>
            <ExecutionStatusBadge status={status} />
            <strong className="execution-state-count">{executions === null ? '—' : executions.filter(item => item.status === status).length}</strong>
            <span>{executions === null ? 'Aguardando consulta' : 'execuções nesta amostra'}</span>
          </li>
        ))}
      </ul>
      <p className="execution-note">Contagens da amostra, sem total global de campanhas ativas, percentual ou previsão de conclusão.</p>
    </NeonPanel>
  )
}
