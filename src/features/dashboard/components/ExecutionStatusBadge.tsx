import { NeonBadge } from '../../../components/ui/NeonBadge'
import { executionLabels, executionStates, type ExecutionStatus } from '../contracts/campaignExecutions'

const tones = { SCHEDULED: 'info', RUNNING: 'info', WAITING_INPUT: 'warning', WAITING_RECONCILIATION: 'warning', SUCCEEDED: 'success', FAILED: 'error', CANCELLED: 'neutral' } as const satisfies Record<ExecutionStatus, string>
export function ExecutionStatusBadge({ status }: { status: string }) {
  const known = executionStates.find(value => value === status)
  return <NeonBadge tone={known ? tones[known] : 'warning'}>{known ? executionLabels[known] : 'Estado desconhecido'}</NeonBadge>
}
