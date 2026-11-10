import type { ComponentProps } from 'react'
import { Icon } from '../../../components/ui/Icon'

export function MetricPlaceholder({ label, icon, value = null, detail = 'Indisponível', percent = false }: {
  label: string; icon: ComponentProps<typeof Icon>['name']; value?: number | null; detail?: string; percent?: boolean
}) {
  const formatted = value === null ? null : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: percent ? 2 : 0 }).format(value)
  return (
    <div className="metric-placeholder">
      <dt><span className="metric-icon"><Icon name={icon} /></span>{label}</dt>
      <dd>
        {formatted === null ? <><span className="metric-value" aria-hidden="true">—</span><span>Indisponível</span></> : <span className="metric-value metric-value--available">{formatted}{percent ? '%' : ''}</span>}
      </dd>
      <dd className="metric-detail">{detail}{value === 0 && !percent ? ' Sem registros nesta métrica.' : ''}</dd>
    </div>
  )
}
