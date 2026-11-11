import { useCallback, useState, type FormEvent } from 'react'
import { apiConfig, type ApiConfig } from '../../config/env'
import { NeonPanel } from '../../components/ui/NeonPanel'
import { NeonButton } from '../../components/ui/NeonButton'
import { NeonBadge } from '../../components/ui/NeonBadge'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { executionLabels } from '../dashboard/contracts/campaignExecutions'
import { loadCampaignExecutions } from '../dashboard/services/campaignExecutions'
import { loadProcessingMedia } from '../dashboard/services/processingMedia'
import { dashboardAccess } from '../dashboard/services/dashboardMetrics'
import { type ExecutionContent, validExecutionId } from './contracts'
import { loadExecutionContent, mediaErrorMessage } from './service'
import { useMediaRead } from './useMediaRead'
import { MediaPlayer } from './MediaPlayer'

type Context = { config: ApiConfig; origin: string }
function ReadFeedback({ loading, error }: { loading: boolean; error: unknown }) {
  return <>{loading && <StatusMessage tone="loading">Consultando o backend…</StatusMessage>}{error != null && <StatusMessage tone="error">{mediaErrorMessage(error)}</StatusMessage>}</>
}
function RegisteredMedia({ content, config, origin }: Context & { content: ExecutionContent }) {
  const runId = content.execution.run_id
  const [attempt, setAttempt] = useState(0)
  const load = useCallback((signal: AbortSignal) => loadProcessingMedia(config, origin, runId, signal), [config, origin, runId])
  const result = useMediaRead(`${runId}:${attempt}`, load)
  return <NeonPanel title="Mídias vinculadas" eyebrow="REGISTRO DO RUN" action={<NeonButton variant="ghost" loading={result.loading} onClick={() => setAttempt(value => value + 1)}>Atualizar mídias</NeonButton>}>
    <p>Registros associados ao run desta execução. O registro não comprova liberação de uma prévia.</p>
    <ReadFeedback {...result} />
    {result.data?.length === 0 && <StatusMessage tone="info">Nenhuma mídia registrada foi retornada para este run.</StatusMessage>}
    {!!result.data?.length && <ul className="media-records">{result.data.map(asset => <li key={asset.mediaAssetId}>
      <strong>{asset.assetType === 'IMAGE' ? 'Imagem' : 'Vídeo'} · revisão {asset.revision}</strong>
      <span>{asset.mediaAssetId}</span><span>Origem declarada: {asset.origin}</span><span>Registrada em: {asset.createdAt}</span>
      {asset.supersedesMediaAssetId && <span>Substitui: {asset.supersedesMediaAssetId}</span>}
    </li>)}</ul>}
    <p>Prévia de mídia de revisão indisponível: o backend não forneceu um vínculo autorizado para este arquivo.</p>
  </NeonPanel>
}
function ContentDetails({ content, config, origin }: Context & { content: ExecutionContent }) {
  const { execution, script, preview } = content
  return <>
    <NeonPanel title="Execução selecionada" eyebrow="ESTADO REAL">
      <dl className="media-facts">
        <div><dt>Execução</dt><dd>{execution.execution_id}</dd></div>
        <div><dt>Campanha / revisão</dt><dd>{execution.campaign_id} / {execution.campaign_revision}</dd></div>
        <div><dt>Run</dt><dd>{execution.run_id}</dd></div>
        <div><dt>Estado / versão</dt><dd>{executionLabels[execution.status]} ({execution.status}) / {execution.version}</dd></div>
        <div><dt>Etapas concluídas informadas</dt><dd>{content.completedSteps.join(', ') || 'Nenhuma etapa informada'}</dd></div>
        <div><dt>QC técnico do MP4</dt><dd>{preview?.qc ?? 'Sem resultado comprovado'}</dd></div>
      </dl>
      <p>QC técnico e disponibilidade de prévia não representam aprovação humana, conclusão da execução ou autorização de publicação.</p>
      {execution.pending && <StatusMessage tone="info">Pendência: {execution.pending.code ?? 'Sem código'} — {execution.pending.message ?? 'Sem descrição'}</StatusMessage>}
      {content.nextAction && <p className="media-note">Orientação operacional ({content.nextAction.code}): {content.nextAction.message}</p>}
    </NeonPanel>
    <NeonPanel title="Roteiro" eyebrow="CONTEÚDO VINCULADO">
      {script ? <><p>{script.scriptId} · revisão {script.revision} · {script.schemaVersion} · {script.language} · {script.contentFormat} · duração estimada {script.estimatedDurationSeconds}s</p><div className="media-script" role="region" tabIndex={0} aria-label="Narração do roteiro">{script.fullNarration}</div></> : <StatusMessage tone="info">Roteiro ainda não disponível nesta execução.</StatusMessage>}
    </NeonPanel>
    <div className="media-grid">
      <NeonPanel title="Narração WAV" eyebrow="ÁUDIO">
        {content.narrationAvailable ? <MediaPlayer config={config} origin={origin} executionId={execution.execution_id} kind="audio" /> : <StatusMessage tone="info">Narração ainda não disponível segundo o backend.</StatusMessage>}
      </NeonPanel>
      <NeonPanel title="MP4 final" eyebrow="PRÉVIA TÉCNICA">
        {preview?.ready ? <><p>Prévia técnica informada como pronta. Render: {preview.renderId}.</p><MediaPlayer config={config} origin={origin} executionId={execution.execution_id} kind="video" /></> : <StatusMessage tone="info">MP4 final indisponível: nenhuma prévia técnica pronta foi comprovada nesta consulta. Confira as pendências e atualize manualmente.</StatusMessage>}
      </NeonPanel>
    </div>
    <RegisteredMedia content={content} config={config} origin={origin} />
  </>
}
function MediaWorkspace({ config, origin }: Context) {
  const access = dashboardAccess(config, origin)
  const [id, setId] = useState('')
  const [selection, setSelection] = useState<{ id: string; attempt: number } | null>(null)
  const [invalid, setInvalid] = useState(false)
  const [listAttempt, setListAttempt] = useState(0)
  const listLoad = useCallback((signal: AbortSignal) => loadCampaignExecutions(config, origin, signal), [config, origin])
  const list = useMediaRead(access === 'ready' ? `list:${listAttempt}` : null, listLoad)
  const selectedId = selection?.id ?? ''
  const detailLoad = useCallback((signal: AbortSignal) => loadExecutionContent(config, origin, selectedId, signal), [config, origin, selectedId])
  const selectionKey = selection && access === 'ready' ? `${selection.id}:${selection.attempt}` : null
  const detail = useMediaRead(selectionKey, detailLoad)
  function select(value: string) {
    if (!validExecutionId(value)) { setInvalid(true); return }
    setInvalid(false); setId(value)
    setSelection(previous => ({ id: value, attempt: (previous?.attempt ?? 0) + 1 }))
  }
  function submit(event: FormEvent) { event.preventDefault(); select(id.trim()) }
  return <>
    {access !== 'ready' && <StatusMessage tone="info">{access === 'unconfigured' ? 'API não configurada. Configure a origem pública local da API para consultar mídias.' : 'Consulta bloqueada: a API deve usar a mesma origem loopback do frontend, sem prefixo de caminho.'}</StatusMessage>}
    <NeonPanel title="Selecionar execução" eyebrow="CONSULTA" action={<NeonButton variant="ghost" disabled={access !== 'ready'} loading={list.loading} onClick={() => setListAttempt(value => value + 1)}>Atualizar lista</NeonButton>}>
      <p>Até 100 execuções recentes. Você também pode informar o identificador de uma execução existente.</p>
      <ReadFeedback {...list} />
      {list.data?.length === 0 && <p>Nenhuma execução retornada nesta lista.</p>}
      {!!list.data?.length && <label className="media-field">Execuções recentes<select value={list.data.some(item => item.execution_id === selectedId) ? selectedId : ''} onChange={event => { if (event.target.value) select(event.target.value) }}><option value="">Selecione uma execução</option>{list.data.map(item => <option key={item.execution_id} value={item.execution_id}>{item.campaign_id} / r{item.campaign_revision} · {executionLabels[item.status]} · {item.execution_id}</option>)}</select></label>}
      <form className="media-lookup" onSubmit={submit}>
        <label className="media-field">Identificador da execução<input value={id} maxLength={200} onChange={event => setId(event.target.value)} autoComplete="off" spellCheck={false} aria-invalid={invalid} aria-describedby="media-id-help" disabled={access !== 'ready'} /></label>
        <NeonButton type="submit" disabled={access !== 'ready'}>Consultar execução</NeonButton>
      </form>
      <p id="media-id-help">De 3 a 200 caracteres: letras, números e os separadores _, :, . ou -. Nenhuma URL ou caminho local.</p>
      {invalid && <StatusMessage tone="error">Informe um identificador de execução válido.</StatusMessage>}
      <p>Autenticação: entre manualmente no <a href="/operations" target="_blank" rel="noopener noreferrer">console QC desta origem</a>, se necessário. Esta página usa a sessão existente e oferece somente leitura.</p>
    </NeonPanel>
    <ReadFeedback {...detail} />
    {!selection && <StatusMessage tone="info">Selecione uma execução para consultar seu conteúdo real.</StatusMessage>}
    {detail.data && <ContentDetails key={selectionKey} content={detail.data} config={config} origin={origin} />}
  </>
}
export function MediaPage({ config = apiConfig, origin = window.location.origin }: Partial<Context>) {
  useDocumentTitle('Mídia')
  return <div className="page-content media-page">
    <section className="media-intro" aria-labelledby="media-title"><div><span className="eyebrow">WORKSPACE / MÍDIA</span><h1 id="media-title">Mídia</h1><p>Consulte roteiro, narração e prévias vinculadas a uma execução.</p></div><NeonBadge tone="info">Somente leitura</NeonBadge></section>
    <MediaWorkspace key={`${origin}:${config.status}:${config.baseUrl}`} config={config} origin={origin} />
  </div>
}
