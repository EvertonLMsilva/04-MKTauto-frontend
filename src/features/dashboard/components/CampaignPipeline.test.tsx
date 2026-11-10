import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { CampaignPipeline } from './CampaignPipeline'
import { executionStates, parseCampaignExecutions } from '../contracts/campaignExecutions'

test('current state distribution counts executions, not campaigns or a timeline', () => {
  const rows = parseCampaignExecutions(executionStates.map((status, i) => ({ execution_id: `execution_${i}`, campaign_id: 'same_campaign', campaign_revision: 1, version: 1, run_id: 'run_001', status })))
  render(<CampaignPipeline executions={rows} />)
  const list = screen.getByRole('list', { name: 'Estados atuais da amostra' })
  const items = within(list).getAllByRole('listitem')
  expect(items).toHaveLength(7)
  for (const item of items) expect(within(item).getByText('1')).toBeVisible()
  expect(screen.getByText(/não representa uma sequência/)).toBeVisible()
  expect(list.querySelector('button, a, [role="progressbar"]')).toBeNull()
})
test('unavailable data never produces zero counts', () => {
  render(<CampaignPipeline executions={null} />)
  expect(screen.getAllByText('—', { selector: 'strong' })).toHaveLength(7)
  expect(screen.queryByText('0')).not.toBeInTheDocument()
})
test('only a confirmed empty sample produces zero counts', () => {
  render(<CampaignPipeline executions={[]} />)
  expect(screen.getAllByText('0')).toHaveLength(7)
  expect(screen.getByText('Nenhuma execução foi retornada nesta amostra.')).toBeVisible()
})
