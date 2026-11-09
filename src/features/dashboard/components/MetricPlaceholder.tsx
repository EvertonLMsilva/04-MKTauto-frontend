import type { ComponentProps } from 'react'
import { Icon } from '../../../components/ui/Icon'

export function MetricPlaceholder({ label, icon }: { label: string; icon: ComponentProps<typeof Icon>['name'] }) {
  return (
    <div className="metric-placeholder">
      <dt><span className="metric-icon"><Icon name={icon} /></span>{label}</dt>
      <dd><span className="metric-value" aria-hidden="true">—</span><span>Indisponível</span></dd>
    </div>
  )
}
