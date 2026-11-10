import { useLocation } from 'react-router'
import type { Ref } from 'react'
import { Icon } from '../ui/Icon'

export function AppHeader({ menuOpen, onToggle, menuRef }: { menuOpen: boolean; onToggle: () => void; menuRef: Ref<HTMLButtonElement> }) {
  const { pathname } = useLocation()
  const page = pathname === '/' ? 'Dashboard' : pathname === '/campanhas' ? 'Campanhas' : pathname === '/base-visual' ? 'Base visual' : 'Página não encontrada'
  return (
    <header className="app-header">
      <div className="header-leading">
        <button ref={menuRef} className="menu-toggle" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-controls="app-sidebar" aria-expanded={menuOpen} onClick={onToggle}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
        <nav className="breadcrumb" aria-label="Localização"><ol><li>Workspace</li><li aria-current="page">{page}</li></ol></nav>
      </div>
      <div className="header-status"><span className="local-badge"><Icon name="monitor" width="16" height="16" /> Ambiente local</span><span className="header-edition">MKTAUTO / COCKPIT</span></div>
    </header>
  )
}
