import { useState } from 'react'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { NeonPanel } from '../../components/ui/NeonPanel'
import { NeonBadge } from '../../components/ui/NeonBadge'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { DashboardHero } from './components/DashboardHero'
import { MetricPlaceholder } from './components/MetricPlaceholder'
import { NeonButton } from '../../components/ui/NeonButton'
import { useDashboardMetrics } from './hooks/useDashboardMetrics'
import { reasonLabels, type MetricKey } from './contracts/dashboardMetrics'
import { useCampaignExecutions } from './hooks/useCampaignExecutions'
import { CampaignPipeline } from './components/CampaignPipeline'
import { CampaignQueue } from './components/CampaignQueue'
import { ProcessingPanel } from './components/ProcessingPanel'
import { MediaPanel } from './components/MediaPanel'
import { RecentPublicationsPanel } from './components/RecentPublicationsPanel'
import { useProcessingMedia } from './hooks/useProcessingMedia'
import { useExecutionPublications } from './hooks/useExecutionPublications'
import { useOperationalQueue } from './hooks/useOperationalQueue'

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const metrics = useDashboardMetrics()
  const executions = useCampaignExecutions()
  const queue = useOperationalQueue()
  const [selectedId, setSelectedId] = useState('')
  const selected = executions.data?.find(item => item.execution_id === selectedId) ?? null
  const media = useProcessingMedia(selected?.run_id ?? null)
  const publications = useExecutionPublications(selected?.execution_id ?? null)
  const { data } = metrics
  const detail = (key: MetricKey, description: string) => {
    const reason = data?.availability[key].reason
    return reason ? reasonLabels[reason] : data ? description : 'Aguardando consulta autorizada.'
  }
  const metric = (key: MetricKey, label: string, icon: Parameters<typeof MetricPlaceholder>[0]['icon'], description: string, percent = false) => (
    <MetricPlaceholder key={key} label={label} icon={icon} value={data?.[key] ?? null} detail={detail(key, description)} percent={percent} />
  )
  const title = metrics.status === 'error' ? (metrics.unauthorized ? 'Sessão não autorizada' : 'Consulta não concluída')
    : metrics.status === 'loading' ? 'Carregando indicadores' : data ? 'Resumo recebido' : metrics.access === 'unconfigured' ? 'Aguardando configuração' : 'Integração indisponível'
  return (
    <div className="page-content cockpit-dashboard">
      <div className="page-heading">
        <div><p className="eyebrow">SEU CENTRO DE OPERAÇÃO</p><h1>Dashboard</h1></div>
        <NeonBadge tone={metrics.status === 'error' ? 'error' : data ? 'success' : 'info'}>{metrics.unauthorized ? 'Sessão não autorizada' : metrics.status === 'error' ? 'Resumo indisponível' : metrics.status === 'loading' ? 'Consultando resumo' : data ? 'Resumo histórico' : 'Aguardando dados'}</NeonBadge>
      </div>
      <NeonPanel title="Estado de integração" className="integration-panel">
        <div className="integration-content">
          <div>
            <h3>{title}</h3>
            <p className="panel-description">Indicadores históricos · atualização manual.</p>
            {metrics.unauthorized && <a className="dashboard-session-link" href="/operations" target="_blank" rel="noreferrer">Abrir console de autenticação existente</a>}
          </div>
          <div className="dashboard-read-state" aria-busy={metrics.status === 'loading'}>
            <StatusMessage tone={metrics.status === 'error' ? 'error' : metrics.status === 'loading' ? 'loading' : data ? 'success' : 'info'}>{metrics.message}</StatusMessage>
            {!data && metrics.status !== 'loading' && <p className="panel-description">Nenhum dado operacional carregado</p>}
            {metrics.access === 'ready' && <NeonButton variant="secondary" loading={metrics.status === 'loading'} onClick={metrics.retry}>{data ? 'Atualizar resumo' : 'Tentar novamente'}</NeonButton>}
          </div>
        </div>
      </NeonPanel>
      <div className="cockpit-overview">
        <DashboardHero />
        <NeonPanel title="Indicadores operacionais" className="metrics-panel">
          <dl className="metric-grid">
            {metric('runningExecutions', 'Execuções em processamento', 'processor', 'Execuções com estado RUNNING.')}
            {metric('activeCampaigns', 'Campanhas ativas', 'campaign', 'Definição operacional ainda não estabelecida.')}
            {metric('generatedMedia', 'Mídias geradas', 'media', 'Mídias materializadas comprovadas pela fonte.')}
            {metric('socialPublicationsLive', 'Publicações reais · LIVE', 'publish', 'Publicações confirmadas no modo LIVE.')}
            {metric('socialPublicationsFake', 'Publicações simuladas · FAKE', 'publish', 'Simulações; não representam publicações reais.')}
            {metric('qcApprovalRate', 'Aprovação QC técnico V1', 'chart', data && data.qcApproved !== null && data.qcEvaluated !== null ? `PASS: ${data.qcApproved} · Avaliadas: ${data.qcEvaluated}. Não inclui aprovação humana.` : 'Não inclui aprovação humana.', true)}
          </dl>
          <details className="metrics-audit">
            <summary>Escopo e critérios dos indicadores</summary>
            <p className="metrics-note">Total combinado de publicações: indisponível. {data ? reasonLabels[data.availability.completedPublications.reason!] : 'O contrato mantém fake e LIVE separados.'}</p>
            {data && <p className="metrics-note">Todo o histórico · QC: {data.scope.qcFamily}<br />Recebido: <time dateTime={data.generatedAt}>{new Date(data.generatedAt).toLocaleString('pt-BR')}</time>. A consulta não autoriza ações operacionais.</p>}
          </details>
        </NeonPanel>
      </div>
      <CampaignPipeline executions={executions.data} />
      <CampaignQueue page={queue.data} offset={queue.offset} status={queue.status} message={queue.message} canRefresh={queue.access === 'ready'} onRefresh={queue.retry} onPrevious={queue.previous} onNext={queue.next} />
      <ProcessingPanel executions={executions.data} status={executions.status} message={executions.message} selectedId={selected?.execution_id ?? ''} onSelect={setSelectedId} />
      <div className="operational-grid monitoring-grid">
        <MediaPanel executionId={selected?.execution_id ?? null} runId={selected?.run_id ?? null} state={media} />
        <RecentPublicationsPanel executionId={selected?.execution_id ?? null} state={publications} />
      </div>
    </div>
  )
}
