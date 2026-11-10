import { NeonBadge } from '../../../components/ui/NeonBadge'
import type { Campaign } from '../contracts/campaign'

export function CampaignDetails({ campaign }: { campaign: Campaign }) {
  return (
    <article className="campaign-details" aria-label="Revisão consultada">
      <div className="campaign-card-heading"><h3>{campaign.campaignId}</h3><NeonBadge tone="info">Revisão {campaign.revision}</NeonBadge></div>
      <dl>
        <div><dt>Projeto</dt><dd>{campaign.projectId}</dd></div>
        <div><dt>Produto</dt><dd>{campaign.productId} · revisão {campaign.productRevision}</dd></div>
        <div><dt>CTA</dt><dd>{campaign.cta}</dd></div>
        <div><dt>Identificação publicitária</dt><dd>{campaign.disclosure}</dd></div>
        <div><dt>Link de afiliado</dt><dd>{campaign.affiliateUrl}</dd></div>
      </dl>
      <p className="campaign-note">Esta revisão não informa nome, datas ou estado operacional da campanha. Os estados abaixo pertencem às execuções consultadas.</p>
    </article>
  )
}
