import { NavLink } from 'react-router'
import { Icon } from '../ui/Icon'

const futureModules = [
  { icon: 'campaign', label: 'Campanhas' },
  { icon: 'layers', label: 'Pipeline' },
  { icon: 'media', label: 'Mídia' },
  { icon: 'publish', label: 'Publicação' },
  { icon: 'chart', label: 'Relatórios' },
] as const

export function AppSidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  return (
    <aside id="app-sidebar" className={`app-sidebar ${open ? 'is-open' : ''}`} aria-label="Menu do workspace">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">M</span>
        <div><span className="brand-name">MKT<span>Auto</span></span><span className="brand-caption">MARKETING · LOCAL</span></div>
      </div>
      <div className="workspace-label"><Icon name="monitor" width="16" height="16" /> Workspace local</div>
      <nav aria-label="Navegação principal">
        <span className="nav-caption">WORKSPACE</span>
        <NavLink to="/" end onClick={onNavigate}><Icon name="dashboard" /><span>Dashboard</span></NavLink>
        <NavLink to="/base-visual" onClick={onNavigate}><Icon name="layers" /><span>Base visual</span></NavLink>
      </nav>
      <section className="sidebar-future" aria-labelledby="future-modules-title">
        <h2 id="future-modules-title" className="nav-caption">MÓDULOS FUTUROS</h2>
        <p>Indisponíveis nesta etapa</p>
        <ul>{futureModules.map(({ icon, label }) => (
          <li key={label}><Icon name={icon} /><span>{label}</span><Icon name="lock" width="13" height="13" /><span className="sr-only"> · indisponível</span></li>
        ))}</ul>
      </section>
      <div className="sidebar-note"><Icon name="plug" /><p>Integração pendente<span>Nenhuma conexão verificada.</span></p></div>
      <footer className="sidebar-footer"><span className="outline-dot" /> MKTAUTO <span>NEON / 004</span></footer>
    </aside>
  )
}
