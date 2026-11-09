import { useId } from 'react'
import { Icon } from '../../../components/ui/Icon'
import { NeonButton } from '../../../components/ui/NeonButton'

export function DashboardHero() {
  const titleId = useId()
  return (
    <section className="cockpit-hero" aria-labelledby={titleId}>
      <div className="cockpit-hero-copy">
        <span className="hero-label"><span className="outline-dot" /> MARKETING AUTOMATIZADO</span>
        <h2 id={titleId}>Sua operação.<br />{' '}<span>Uma nova dimensão.</span></h2>
        <p>Do planejamento à publicação, um lugar para acompanhar cada parte da sua operação de marketing.</p>
        <NeonButton to="/base-visual">Explorar a base visual <Icon name="arrow" /></NeonButton>
        <span className="hero-caption">Estrutura visual · integração operacional pendente</span>
      </div>
      <div className="hologram-space" aria-hidden="true">
        <div className="hologram-grid" />
        <div className="hologram-frame"><Icon name="layers" width="64" height="64" /><span>MKTAUTO</span></div>
        <span className="hologram-caption">ESPAÇO HOLOGRÁFICO<br />COMPOSIÇÃO VISUAL EM PREPARAÇÃO</span>
      </div>
    </section>
  )
}
