import type { ComponentProps, ReactNode } from 'react'
import { Icon } from '../../../components/ui/Icon'

export function OperationalEmptyState({ icon, title, children }: { icon: ComponentProps<typeof Icon>['name']; title: string; children: ReactNode }) {
  return (
    <div className="operational-empty">
      <span className="empty-icon"><Icon name={icon} width="26" height="26" /></span>
      <div><p className="empty-title">{title}</p><p className="panel-description">{children}</p></div>
    </div>
  )
}
