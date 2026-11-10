import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { MetricPlaceholder } from './MetricPlaceholder'

test('distinguishes unavailability from an observed zero', () => {
  const { rerender } = render(<dl><MetricPlaceholder label="Execuções" icon="processor" value={null} detail="Fonte indisponível" /></dl>)
  expect(screen.getByText('Indisponível')).toBeVisible()
  expect(screen.queryByText('0')).not.toBeInTheDocument()
  rerender(<dl><MetricPlaceholder label="Execuções" icon="processor" value={0} detail="Estado RUNNING." /></dl>)
  expect(screen.getByText('0')).toBeVisible()
  expect(screen.getByText(/Sem registros nesta métrica/)).toBeVisible()
})
test('formats the server rate without manufacturing a percentage for null', () => {
  const { rerender } = render(<dl><MetricPlaceholder label="QC" icon="chart" value={12.345} percent /></dl>)
  expect(screen.getByText('12,35%')).toBeVisible()
  rerender(<dl><MetricPlaceholder label="QC" icon="chart" value={null} percent detail="Sem avaliações" /></dl>)
  expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  expect(screen.getByText('Sem avaliações')).toBeVisible()
})
