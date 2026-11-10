import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { NeonPanel } from '../../components/ui/NeonPanel'
import { NeonBadge } from '../../components/ui/NeonBadge'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { DashboardHero } from './components/DashboardHero'
import { MetricPlaceholder } from './components/MetricPlaceholder'
import { OperationalEmptyState } from './components/OperationalEmptyState'
import { NeonButton } from '../../components/ui/NeonButton'
import { useDashboardMetrics } from './hooks/useDashboardMetrics'
import { reasonLabels, type MetricKey } from './contracts/dashboardMetrics'

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const metrics = useDashboardMetrics()
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
        <NeonBadge tone={metrics.status === 'error' ? 'error' : data ? 'success' : 'info'}>{data ? 'Resumo histórico' : 'Aguardando dados'}</NeonBadge>
      </div>
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
          <p className="metrics-note">Total combinado de publicações: indisponível. {data ? reasonLabels[data.availability.completedPublications.reason!] : 'O contrato mantém fake e LIVE separados.'}</p>
          {data && <p className="metrics-note">Todo o histórico · QC: {data.scope.qcFamily}<br />Recebido: <time dateTime={data.generatedAt}>{new Date(data.generatedAt).toLocaleString('pt-BR')}</time>. A consulta não autoriza ações operacionais.</p>}
        </NeonPanel>
      </div>
      <NeonPanel title="Pipeline de campanhas" eyebrow="VISÃO DO FLUXO" className="pipeline-panel">
        <OperationalEmptyState icon="layers" title="Pipeline aguardando integração">
          Etapas e estados serão exibidos conforme os contratos reais. Nenhum fluxo carregado.
        </OperationalEmptyState>
      </NeonPanel>
      <div className="operational-grid">
        <NeonPanel title="Fila de processamento" eyebrow="CAMPANHAS">
          <OperationalEmptyState icon="queue" title="Fila ainda não consultada">
            A integração permitirá consultar as campanhas na fila.
          </OperationalEmptyState>
        </NeonPanel>
        <NeonPanel title="Processamentos em andamento" eyebrow="EXECUÇÕES">
          <OperationalEmptyState icon="processor" title="Processamentos indisponíveis">
            Aguardando integração para acompanhar execuções reais.
          </OperationalEmptyState>
        </NeonPanel>
        <NeonPanel title="Publicações recentes" eyebrow="PUBLICAÇÃO">
          <OperationalEmptyState icon="publish" title="Publicações ainda não consultadas">
            O histórico será exibido após a integração. Nenhuma publicação carregada.
          </OperationalEmptyState>
        </NeonPanel>
      </div>
      <NeonPanel title="Estado de integração" className="integration-panel">
        <div className="integration-content">
          <div>
            <h3>{title}</h3>
            <p className="panel-description">Leitura do resumo operacional. Sem polling e sem operações de escrita.</p>
            {metrics.unauthorized && <a className="dashboard-session-link" href="/operations" target="_blank" rel="noreferrer">Abrir console de autenticação existente</a>}
          </div>
          <div className="dashboard-read-state" aria-busy={metrics.status === 'loading'}>
            <StatusMessage tone={metrics.status === 'error' ? 'error' : metrics.status === 'loading' ? 'loading' : data ? 'success' : 'info'}>{metrics.message}</StatusMessage>
            {!data && metrics.status !== 'loading' && <p className="panel-description">Nenhum dado operacional carregado</p>}
            {metrics.access === 'ready' && <NeonButton variant="secondary" loading={metrics.status === 'loading'} onClick={metrics.retry}>{data ? 'Atualizar resumo' : 'Tentar novamente'}</NeonButton>}
          </div>
        </div>
      </NeonPanel>
    </div>
  )
}
