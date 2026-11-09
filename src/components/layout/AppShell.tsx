import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLButtonElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const focusAfterNavigate = useRef(false)
  const location = useLocation()
  const previousPath = useRef(location.pathname)

  useLayoutEffect(() => {
    const routeChanged = previousPath.current !== location.pathname
    previousPath.current = location.pathname
    if (!focusAfterNavigate.current && !routeChanged) return
    focusAfterNavigate.current = false
    mainRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location, menuOpen])

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

  function handleNavigate() {
    focusAfterNavigate.current = true
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <AppHeader menuOpen={menuOpen} menuRef={menuRef} onToggle={() => setMenuOpen((open) => !open)} />
      <AppSidebar open={menuOpen} onNavigate={handleNavigate} />
      <div className="app-workspace">
        <main ref={mainRef} id="main-content" tabIndex={-1}><Outlet /></main>
        <footer className="workspace-footer"><span>MKTAuto <span aria-hidden="true">/</span> Cockpit local</span><span>Integração operacional pendente</span></footer>
      </div>
    </div>
  )
}
