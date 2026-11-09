import { NavLink } from 'react-router'
import { Icon } from '../ui/Icon'

export function AppSidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  return <aside id="app-sidebar" className={`app-sidebar ${open ? 'is-open' : ''}`}>
    <div className="brand"><span className="brand-mark" aria-hidden="true">M</span><div><span className="brand-name">MKT<span>Auto</span></span><span className="brand-caption">MARKETING AUTOMATIZADO</span></div></div>
    <div className="workspace-label"><span className="workspace-dot" /> Workspace local</div>
    <nav aria-label="Navegação principal">
      <span className="nav-caption">PRINCIPAL</span>
      <NavLink to="/" end onClick={onNavigate}><Icon name="dashboard" /><span>Dashboard</span></NavLink>
      <NavLink to="/base-visual" onClick={onNavigate}><Icon name="layers" /><span>Base visual</span></NavLink>
    </nav>
    <div className="sidebar-note"><Icon name="code" /><p>Uma base. Novas possibilidades.<span>Componentes prontos para evoluir com a operação.</span></p></div>
    <footer className="sidebar-footer"><span className="outline-dot" /> FE-VISUAL <span>BASE 001</span></footer>
  </aside>
}
