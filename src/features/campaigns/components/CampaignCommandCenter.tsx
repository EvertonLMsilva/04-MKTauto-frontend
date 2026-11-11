import { useState } from 'react'
import type { ApiConfig } from '../../../config/env'
import { NeonPanel } from '../../../components/ui/NeonPanel'
import { NeonButton } from '../../../components/ui/NeonButton'
import { StatusMessage } from '../../../components/ui/StatusMessage'
import type { CampaignQuery } from '../contracts/campaign'
import type { ControlledExecution } from '../contracts/fakeCampaignCommands'
import { useFakeCampaignCommands } from '../hooks/useFakeCampaignCommands'
import { CampaignRegistrationForm } from './CampaignRegistrationForm'
import { FakeExecutionForm } from './FakeExecutionForm'
import { ControlledExecutionPanel } from './ControlledExecutionPanel'

export function CampaignCommandCenter({ config, origin, onSelect }: { config: ApiConfig; origin: string; onSelect: (query: CampaignQuery) => void }) {
  const commands = useFakeCampaignCommands(config, origin)
  const [state, setState] = useState<ControlledExecution | null>(null)
  return <NeonPanel title="Gestão FAKE autorizada" eyebrow="COMANDOS CONTROLADOS">
    <p>Cadastre campanhas e prepare execuções com processamento local. A política FAKE desabilita toda publicação social, inclusive simulada.</p>
    <div className="command-session">
      <p className="campaign-note">{commands.operator ? `Sessão QC verificada: ${commands.operator}. O backend ainda decide a permissão e o opt-in de cada comando.` : 'Sessão QC ainda não verificada. Use seu login existente no console operacional.'}</p>
      <p className="campaign-note">Uma URL válida não comprova autorização. Os comandos exigem habilitação privada pelo responsável pelo backend.</p>
      {commands.access !== 'ready' && <StatusMessage tone="info">Configure a API na mesma origem HTTP local para habilitar a verificação de sessão.</StatusMessage>}
      <div className="command-actions"><NeonButton disabled={commands.access !== 'ready' || commands.busy} onClick={() => void commands.verifySession()}>Verificar sessão QC</NeonButton><a className="button button--secondary" href="/operations">Abrir console operacional</a></div>
      {commands.busy && <StatusMessage tone="loading">Consultando sessão ou comando. Aguarde antes de outra ação.</StatusMessage>}
      {commands.problem && <StatusMessage tone="error">{commands.problem.message}</StatusMessage>}
      {commands.reconciliationRequired && <StatusMessage tone="info">Comandos suspensos até conciliar a intenção pendente por consulta. Nenhum envio será repetido automaticamente.</StatusMessage>}
    </div>
    <CampaignRegistrationForm commands={commands} config={config} origin={origin} onSelect={onSelect} />
    <FakeExecutionForm commands={commands} observed={state} onAccepted={setState} />
    <ControlledExecutionPanel commands={commands} state={state} onChange={setState} />
    <NeonButton to="/" variant="secondary">Consultar resultados no Dashboard</NeonButton>
  </NeonPanel>
}
