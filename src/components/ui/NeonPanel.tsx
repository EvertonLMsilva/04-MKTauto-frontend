import { useId } from 'react'
import type { ReactNode } from 'react'

interface NeonPanelProps {
  title: string
  eyebrow?: string
  children: ReactNode
  className?: string
  id?: string
  action?: ReactNode
}

export function NeonPanel({ title, eyebrow, children, className = '', id, action }: NeonPanelProps) {
  const headingId = useId()
  return (
    <section id={id} className={`neon-panel ${action ? 'neon-panel--action' : ''} ${className}`} aria-labelledby={headingId}>
      <div className="panel-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 id={headingId}>{title}</h2>
        </div>
        {action && <div className="panel-action">{action}</div>}
      </div>
      {children}
    </section>
  )
}
