import type { ReactNode } from 'react'

const glyphs = { neutral: '—', info: 'i', success: '✓', warning: '!', error: '×' }

export function NeonBadge({ tone = 'neutral', children }: { tone?: keyof typeof glyphs; children: ReactNode }) {
  return (
    <span className={`neon-badge neon-badge--${tone}`}>
      <span className="badge-symbol" aria-hidden="true">{glyphs[tone]}</span>
      <span>{children}</span>
    </span>
  )
}
