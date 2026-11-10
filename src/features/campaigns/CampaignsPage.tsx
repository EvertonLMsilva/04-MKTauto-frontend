import { useState } from 'react'
import { apiConfig, type ApiConfig } from '../../config/env'
import { NeonPanel } from '../../components/ui/NeonPanel'
import { NeonBadge } from '../../components/ui/NeonBadge'
import { NeonButton } from '../../components/ui/NeonButton'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import type { CampaignQuery } from './contracts/campaign'
import { useCampaignRevision, useRecentActivity } from './hooks/useCampaignRead'
import { CampaignActivity } from './components/CampaignActivity'
import { CampaignDetails } from './components/CampaignDetails'
import { CampaignLookup } from './components/CampaignLookup'
import { CampaignReadState } from './components/CampaignReadState'

export function CampaignsPage({ config = apiConfig, origin = window.location.origin }: { config?: ApiConfig; origin?: string }) {
  useDocumentTitle('Campanhas')
  const [query, setQuery] = useState<CampaignQuery | null>(null)
  const activity = useRecentActivity(config, origin)
  const revision = useCampaignRevision(query, config, origin)
  const select = (next: CampaignQuery) => {
    if (next.id === query?.id && next.revision === query.revision) revision.retry()
    else setQuery(next)
  }
  return (
    <div className="page-content campaigns-page">
      <section className="campaigns-intro" aria-labelledby="campaigns-title">
        <div><span className="eyebrow">WORKSPACE / CAMPANHAS</span><h1 id="campaigns-title">Campanhas</h1><p>Consulte revisões e acompanhe a atividade das execuções.</p></div>
        <NeonBadge tone="info">Consulta operacional</NeonBadge>
      </section>
      <div className="campaigns-grid">
        <NeonPanel title="Consultar uma revisão" eyebrow="CAMPANHA">
          <CampaignLookup onLookup={select} available={revision.access === 'ready'} loading={revision.status === 'loading'} />
          {query && <p className="campaign-note" role="status">Consulta selecionada: {query.id} · revisão {query.revision}</p>}
          <CampaignReadState {...revision} hasQuery={!!query} />
          {revision.data && <CampaignDetails campaign={revision.data} />}
        </NeonPanel>
        <NeonPanel title="Atividade recente" eyebrow="EXECUÇÕES">
          <p className="campaign-note">Campanhas e revisões presentes nas até 100 execuções mais recentes. Este recorte inclui somente campanhas com execução e não representa o catálogo completo.</p>
          <CampaignReadState {...activity} />
          {activity.status === 'empty' && <p className="campaign-empty">Nenhuma execução retornada nesta consulta. Isso não comprova ausência de campanhas cadastradas.</p>}
          {activity.data && activity.data.length > 0 && <CampaignActivity executions={activity.data} onSelect={select} />}
        </NeonPanel>
      </div>
      <NeonPanel title="Criação e execução" eyebrow="DISPONIBILIDADE">
        <p>Criação de campanhas e início FAKE aguardam integração com autorização QC, proteção de sessão e garantia de execução sem serviços pagos. Essas ações ainda não estão disponíveis nesta página.</p>
        <p className="campaign-note">Para consultar mídias, pipeline e publicações, abra o Dashboard e selecione a execução pelo identificador exibido aqui.</p>
        <NeonButton to="/" variant="secondary">Consultar resultados no Dashboard</NeonButton>
      </NeonPanel>
    </div>
  )
}
