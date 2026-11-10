import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import { MediaPanel } from './MediaPanel'
import { parseProcessingMedia } from '../contracts/processingMedia'
import type { useProcessingMedia } from '../hooks/useProcessingMedia'

const state: ReturnType<typeof useProcessingMedia> = { status: 'success', access: 'ready', retry: vi.fn(), message: 'Consulta recebida.', data: parseProcessingMedia([{ schemaVersion: 'media-asset/1.0.0', mediaAssetId: 'asset_001', pipelineRunId: 'run_001', assetType: 'VIDEO', origin: 'PROVIDER_GENERATED', createdAt: '2026-11-10T12:00:00Z', revision: 2, supersedesMediaAssetId: 'asset_old', mediaReference: 'file:///secret' }], 'run_001') }
test('shows registered metadata without materialization claims or private previews', async () => {
  const { container } = render(<MediaPanel executionId="execution_001" runId="run_001" state={state} />)
  expect(screen.getByText('Vídeo · cadastrado')).toBeVisible()
  expect(screen.getByText(/Origem: Gerado pelo provedor/)).toBeVisible()
  expect(screen.getByText('asset_old')).toBeVisible()
  expect(container.querySelector('img, video, iframe')).toBeNull()
  expect(container.textContent).not.toContain('secret')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Atualizar mídias' }))
  expect(state.retry).toHaveBeenCalledOnce()
  expect(fetch).not.toHaveBeenCalled()
})
test('unauthorized response offers existing console without presenting empty data', () => {
  render(<MediaPanel executionId="execution_001" runId="run_001" state={{ ...state, status: 'unauthorized', data: null, message: 'Sessão não autorizada.' }} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Sessão não autorizada')
  expect(screen.getByRole('link')).toHaveAttribute('href', '/operations')
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
})
