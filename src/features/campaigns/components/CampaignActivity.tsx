import { useState } from 'react'
import { NeonBadge } from '../../../components/ui/NeonBadge'
import { NeonButton } from '../../../components/ui/NeonButton'
import { executionLabels, type CampaignExecution } from '../../dashboard/contracts/campaignExecutions'
import { parseCampaignQuery, type CampaignQuery } from '../contracts/campaign'

function date(value: string | null) { return value ? new Date(value).toLocaleString('pt-BR') : 'Não informada' }
export function CampaignActivity({ executions, onSelect }: { executions: CampaignExecution[]; onSelect: (query: CampaignQuery) => void }) {
  const [filter, setFilter] = useState('')
  const groups = new Map<string, [CampaignExecution, ...CampaignExecution[]]>()
  for (const execution of executions) {
    const key = `${execution.campaign_id}:${execution.campaign_revision}`
    const group = groups.get(key)
    if (group) group.push(execution)
    else groups.set(key, [execution])
  }
  const visible = [...groups.values()].filter(group => group[0].campaign_id.toLowerCase().includes(filter.trim().toLowerCase()))
  return (
    <div className="campaign-activity">
      <div className="campaign-filter"><label htmlFor="campaign-filter">Filtrar identificador nos registros carregados</label><input id="campaign-filter" type="search" value={filter} onChange={event => setFilter(event.target.value)} /></div>
      <p className="campaign-note" role="status">{visible.length} de {groups.size} revisões com atividade nesta amostra · {executions.length} execuções carregadas.</p>
      {executions.length === 100 && <p className="execution-limit">Limite de 100 execuções atingido. Outras campanhas e execuções podem existir.</p>}
      {visible.length === 0 ? <p>Nenhum identificador corresponde ao filtro nesta amostra.</p> : <ul className="campaign-cards" aria-label="Campanhas com execuções recentes">{visible.map(group => {
        const first = group[0]
        const query = parseCampaignQuery(first.campaign_id, String(first.campaign_revision))
        return <li key={`${first.campaign_id}:${first.campaign_revision}`}>
          <article>
            <div className="campaign-card-heading"><h3>{first.campaign_id}</h3><NeonBadge>Revisão {first.campaign_revision}</NeonBadge></div>
            {query ? <NeonButton variant="secondary" onClick={() => onSelect(query)} aria-label={`Consultar ${first.campaign_id}, revisão ${first.campaign_revision}`}>Consultar detalhes</NeonButton> : <p className="campaign-note">Identificador desta execução incompatível com a consulta de revisão de campanha.</p>}
            <ul className="campaign-executions" aria-label={`Execuções de ${first.campaign_id}, revisão ${first.campaign_revision}`}>{group.map(execution => <li key={execution.execution_id}>
              <div className="campaign-card-heading"><strong>{execution.execution_id}</strong><NeonBadge tone={execution.status === 'FAILED' ? 'error' : execution.status === 'SUCCEEDED' ? 'success' : 'info'}>{executionLabels[execution.status]}</NeonBadge></div>
              <dl><div><dt>Run</dt><dd>{execution.run_id}</dd></div><div><dt>Criação da execução</dt><dd>{date(execution.created_at)}</dd></div><div><dt>Atualização da execução</dt><dd>{date(execution.updated_at)}</dd></div></dl>
              {execution.pending && <p className="campaign-note">Pendência: {execution.pending.message ?? execution.pending.code ?? 'Detalhes não informados.'}</p>}
            </li>)}</ul>
          </article>
        </li>
      })}</ul>}
    </div>
  )
}
