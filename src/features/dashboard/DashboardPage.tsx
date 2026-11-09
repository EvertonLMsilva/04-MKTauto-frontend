import { apiConfig } from '../../config/env'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { NeonPanel } from '../../components/ui/NeonPanel'
import { NeonBadge } from '../../components/ui/NeonBadge'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { DashboardHero } from './components/DashboardHero'
import { MetricPlaceholder } from './components/MetricPlaceholder'
import { OperationalEmptyState } from './components/OperationalEmptyState'

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  return (
    <div className="page-content cockpit-dashboard">
      <div className="page-heading">
        <div><p className="eyebrow">SEU CENTRO DE OPERAÇÃO</p><h1>Dashboard</h1></div>
        <NeonBadge>Integração pendente</NeonBadge>
      </div>
      <div className="cockpit-overview">
        <DashboardHero />
        <NeonPanel title="Indicadores operacionais" className="metrics-panel">
          <dl className="metric-grid">
            <MetricPlaceholder label="Campanhas ativas" icon="campaign" />
            <MetricPlaceholder label="Mídias geradas" icon="media" />
            <MetricPlaceholder label="Publicações" icon="publish" />
            <MetricPlaceholder label="Aprovação de qualidade" icon="chart" />
          </dl>
          <p className="metrics-note">Valores disponíveis após integração.</p>
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
            <h3>{apiConfig.status === 'configured' ? 'Configuração preparada' : apiConfig.status === 'invalid' ? 'Revise a configuração' : 'Aguardando configuração'}</h3>
            <p className="panel-description">{apiConfig.status === 'configured' ? 'A URL da API está configurada. Nenhuma conexão ou consulta foi iniciada nesta etapa.' : apiConfig.status === 'invalid' ? 'VITE_API_BASE_URL precisa conter uma URL HTTP válida, sem credenciais, query ou fragmento.' : 'A API será conectada em uma etapa futura. Nenhuma conexão foi verificada.'}</p>
          </div>
          <StatusMessage tone={apiConfig.status === 'invalid' ? 'error' : 'info'}>Nenhum dado operacional carregado</StatusMessage>
        </div>
      </NeonPanel>
    </div>
  )
}
