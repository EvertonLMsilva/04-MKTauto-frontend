import { useId } from 'react'
import type { ReactNode } from 'react'

interface NeonPanelProps {
  title: string
  eyebrow?: string
  children: ReactNode
  className?: string
  id?: string
}

export function NeonPanel({ title, eyebrow, children, className = '', id }: NeonPanelProps) {
  const headingId = useId()
  return <section id={id} className={`neon-panel ${className}`} aria-labelledby={headingId}>
    <div className="panel-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 id={headingId}>{title}</h2>
    </div>
    {children}
  </section>
}
