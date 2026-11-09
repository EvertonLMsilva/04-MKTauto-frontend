import type { ReactNode } from 'react'

export function StatusMessage({ tone, children }: { tone: 'info' | 'loading' | 'error' | 'success'; children: ReactNode }) {
  return <div className={`status-message status-message--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <span className={tone === 'loading' ? 'status-spinner' : 'status-marker'} aria-hidden="true" />
    <span>{children}</span>
  </div>
}
