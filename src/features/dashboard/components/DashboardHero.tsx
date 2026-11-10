import { useId } from 'react'
import { Icon } from '../../../components/ui/Icon'
import { NeonButton } from '../../../components/ui/NeonButton'
import { HeroMedia } from './HeroMedia'

export function DashboardHero() {
  const titleId = useId()
  return (
    <section className="cockpit-hero" aria-labelledby={titleId}>
      <div className="cockpit-hero-copy">
        <span className="hero-label"><span className="outline-dot" /> MARKETING AUTOMATIZADO</span>
        <h2 id={titleId}>Sua operação.<br />{' '}<span>Uma nova dimensão.</span></h2>
        <p>Acompanhe campanhas, execuções, mídias e publicações em uma visão da sua operação.</p>
        <NeonButton to="/base-visual">Explorar a base visual <Icon name="arrow" /></NeonButton>
        <span className="hero-caption">Leitura operacional · estados informados por cada fonte</span>
      </div>
      <HeroMedia />
    </section>
  )
}
