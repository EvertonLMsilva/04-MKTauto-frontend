import { NeonPanel } from '../../../components/ui/NeonPanel'
import { NeonBadge } from '../../../components/ui/NeonBadge'
import { NeonButton } from '../../../components/ui/NeonButton'
import { StatusMessage } from '../../../components/ui/StatusMessage'
import { publicationLabels } from '../contracts/executionPublications'
import type { useExecutionPublications } from '../hooks/useExecutionPublications'

export function RecentPublicationsPanel({ executionId, state }: { executionId: string | null; state: ReturnType<typeof useExecutionPublications> }) {
  return <NeonPanel title="Publicações da execução" eyebrow="OPERAÇÕES SOCIAIS POR DESTINO" className="monitoring-panel" action={executionId && state.access === 'ready' && <NeonButton variant="secondary" loading={state.status === 'loading'} onClick={state.retry}>Atualizar publicações</NeonButton>}>
    <p className="panel-description">Reservas sociais vinculadas à execução selecionada, incluindo sucessoras quando retornadas. Sem paginação, ordem temporal ou limite documentado. Não representa histórico global nem publicações manuais.</p>
    {executionId && <p className="execution-note">Execução <code>{executionId}</code></p>}
    <div className="execution-read-state" aria-busy={state.status === 'loading'}><StatusMessage tone={['error', 'unauthorized', 'incompatible'].includes(state.status) ? 'error' : state.status === 'loading' ? 'loading' : 'info'}>{state.message}</StatusMessage>
      {state.status === 'unauthorized' && <a className="dashboard-session-link" href="/operations" target="_blank" rel="noreferrer">Autenticar consulta de publicações no console</a>}
    </div>
    {state.data && state.data.length > 0 && <ul className="monitoring-list" aria-label="Operações sociais da execução" tabIndex={0}>{state.data.map(item => <li key={item.operationId}>
      <h3><code>{item.operationId}</code></h3><p>{item.network === 'INSTAGRAM' ? 'Instagram' : 'Facebook Reels'} · conta <code>{item.accountId}</code></p>
      {item.operation ? <>
        <NeonBadge tone={item.operation.executionMode === 'fake' ? 'warning' : 'info'}>{item.operation.executionMode === 'fake' ? 'FAKE · simulação' : 'LIVE · operação real'}</NeonBadge>
        <p>{publicationLabels[item.operation.state]}{item.operation.state === 'PUBLISHED' ? item.operation.executionMode === 'fake' ? ' · conclusão simulada' : ' · publicação confirmada' : ' · publicação não confirmada'}</p>
        <p>Pacote <code>{item.operation.packageHash}</code></p>
        <p>Atualização: <time dateTime={item.operation.updatedAt}>{new Date(item.operation.updatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time> · America/Sao_Paulo</p>
      </> : <p>Operação indisponível. Estado e modo não comprovados.</p>}
    </li>)}</ul>}
    <p className="execution-note">Estados FAILED, UNCERTAIN e demais estados intermediários não comprovam publicação. Nenhuma ação de escrita ou reconciliação é oferecida.</p>
  </NeonPanel>
}
