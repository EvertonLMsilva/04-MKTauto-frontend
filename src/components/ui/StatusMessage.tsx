import type { ReactNode } from 'react'

const labels = { info: 'Informação', loading: 'Carregando', success: 'Sucesso', error: 'Erro' }
const paths = {
  info: 'M12 8h.01 M12 11v6',
  loading: 'M12 3a9 9 0 0 1 9 9',
  success: 'm7 12 3 3 7-7',
  error: 'm9 9 6 6 M9 15l6-6',
}

export function StatusMessage({ tone, children }: { tone: keyof typeof labels; children: ReactNode }) {
  return (
    <div className={`status-message status-message--${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-busy={tone === 'loading' || undefined}>
      <svg className={`status-icon ${tone === 'loading' ? 'status-spinner' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" opacity={tone === 'loading' ? '0.25' : '1'} />
        <path d={paths[tone]} />
      </svg>
      <span className="sr-only">{labels[tone]}: </span>
      <span>{children}</span>
    </div>
  )
}
