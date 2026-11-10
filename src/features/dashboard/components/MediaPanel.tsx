import { NeonPanel } from '../../../components/ui/NeonPanel'
import { NeonBadge } from '../../../components/ui/NeonBadge'
import { NeonButton } from '../../../components/ui/NeonButton'
import { StatusMessage } from '../../../components/ui/StatusMessage'
import type { useProcessingMedia } from '../hooks/useProcessingMedia'

const origins = { OPERATOR_OWNED: 'Do operador', AUTHORIZED_THIRD_PARTY: 'Terceiro autorizado', PROVIDER_GENERATED: 'Gerado pelo provedor', PROVIDER_LICENSED: 'Licenciado pelo provedor' }
export function MediaPanel({ executionId, runId, state }: { executionId: string | null; runId: string | null; state: ReturnType<typeof useProcessingMedia> }) {
  return <NeonPanel title="Mídias vinculadas" eyebrow="ATIVOS CADASTRADOS" className="monitoring-panel" action={executionId && state.access === 'ready' && <NeonButton variant="secondary" loading={state.status === 'loading'} onClick={state.retry}>Atualizar mídias</NeonButton>}>
    <p className="panel-description">Ativos cadastrados do run selecionado, sem paginação ou limite documentado. Cadastro e origem não comprovam materialização, geração ou aprovação.</p>
    {executionId && <dl className="execution-context" aria-label="Vínculo das mídias">
      <div><dt>Execução</dt><dd><code>{executionId}</code></dd></div>
      <div><dt>Pipeline run</dt><dd><code>{runId}</code></dd></div>
    </dl>}
    <div className="execution-read-state" aria-busy={state.status === 'loading'}><StatusMessage tone={['error', 'unauthorized', 'incompatible'].includes(state.status) ? 'error' : state.status === 'loading' ? 'loading' : 'info'}>{state.message}</StatusMessage>
      {state.status === 'unauthorized' && <a className="dashboard-session-link" href="/operations" target="_blank" rel="noreferrer">Autenticar consulta de mídias no console</a>}
    </div>
    {state.data && state.data.length > 0 && <ul className="monitoring-list" aria-label="Ativos do run selecionado" tabIndex={0}>{state.data.map(item => <li key={item.mediaAssetId}>
      <h3><code>{item.mediaAssetId}</code></h3><NeonBadge>{item.assetType === 'VIDEO' ? 'Vídeo' : 'Imagem'} · cadastrado</NeonBadge>
      <p>Origem: {origins[item.origin]} · revisão {item.revision}</p>
      <p>Cadastro: <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time> · America/Sao_Paulo</p>
      {item.supersedesMediaAssetId && <p>Substitui <code>{item.supersedesMediaAssetId}</code></p>}
    </li>)}</ul>}
    <p className="execution-note">Prévia indisponível: este contrato não fornece URL de prévia autorizada. Nenhum caminho local é aberto.</p>
  </NeonPanel>
}
