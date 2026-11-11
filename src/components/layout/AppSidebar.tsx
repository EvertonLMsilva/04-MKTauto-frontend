import { NavLink } from 'react-router'
import { Icon } from '../ui/Icon'

const dashboardAreas = [
  { icon: 'layers', label: 'Pipeline' },
  { icon: 'publish', label: 'Publicação' },
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
        <NavLink to="/campanhas" onClick={onNavigate}><Icon name="campaign" /><span>Campanhas</span></NavLink>
        <NavLink to="/midias" onClick={onNavigate}><Icon name="media" /><span>Mídia</span></NavLink>
        <NavLink to="/base-visual" onClick={onNavigate}><Icon name="layers" /><span>Base visual</span></NavLink>
      </nav>
      <section className="sidebar-areas" aria-labelledby="dashboard-areas-title">
        <h2 id="dashboard-areas-title" className="nav-caption">NO DASHBOARD</h2>
        <p>Áreas de leitura operacional</p>
        <ul>{dashboardAreas.map(({ icon, label }) => (
          <li key={label}><Icon name={icon} /><span>{label}</span></li>
        ))}</ul>
        <div className="sidebar-unavailable"><Icon name="chart" /><span>Relatórios <span>Indisponível</span></span><Icon name="lock" width="13" height="13" /></div>
      </section>
      <div className="sidebar-note"><Icon name="plug" /><p>Consultas operacionais<span>Disponibilidade e sessão informadas no Dashboard.</span></p></div>
      <footer className="sidebar-footer"><span className="outline-dot" /> MKTAUTO <span>NEON / 004</span></footer>
    </aside>
  )
}
