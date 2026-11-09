import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuRef.current?.focus()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
    <AppSidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
    <div className="app-workspace"><AppHeader menuOpen={menuOpen} menuRef={menuRef} onToggle={() => setMenuOpen((open) => !open)} /><main id="main-content" tabIndex={-1}><Outlet /></main><footer className="workspace-footer"><span>MKTAuto <span aria-hidden="true">/</span> Interface em construção</span><span>React · TypeScript</span></footer></div>
  </div>
}
