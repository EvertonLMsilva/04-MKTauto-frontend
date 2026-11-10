import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { ExecutionStatusBadge } from './ExecutionStatusBadge'
import { executionLabels, executionStates } from '../contracts/campaignExecutions'

test.each(executionStates)('identifies %s with readable text, not only color', state => {
  render(<ExecutionStatusBadge status={state} />)
  expect(screen.getByText(executionLabels[state])).toBeVisible()
})
test('does not invent an operational meaning for an unknown state', () => {
  render(<ExecutionStatusBadge status="PUBLISHING_NEW" />)
  expect(screen.getByText('Estado desconhecido')).toBeVisible()
})
