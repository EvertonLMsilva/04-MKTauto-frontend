import { useLocation } from 'react-router'
import type { Ref } from 'react'
import { Icon } from '../ui/Icon'

export function AppHeader({ menuOpen, onToggle, menuRef }: { menuOpen: boolean; onToggle: () => void; menuRef: Ref<HTMLButtonElement> }) {
  const { pathname } = useLocation()
  const page = pathname === '/' ? 'Dashboard' : pathname === '/base-visual' ? 'Base visual' : 'Página não encontrada'
  return <header className="app-header">
    <div className="header-leading"><button ref={menuRef} className="menu-toggle" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-controls="app-sidebar" aria-expanded={menuOpen} onClick={onToggle}><Icon name={menuOpen ? 'close' : 'menu'} /></button><div className="breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>{page}</strong></div></div>
    <div className="header-status"><span className="local-badge"><span className="outline-dot" /> Ambiente local</span><span className="header-divider" /><span className="bootstrap-label">BOOTSTRAP<span className="outline-dot" /></span></div>
  </header>
}
