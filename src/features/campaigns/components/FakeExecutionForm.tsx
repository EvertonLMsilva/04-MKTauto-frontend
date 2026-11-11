import { useRef, useState, type FormEvent } from 'react'
import { NeonButton } from '../../../components/ui/NeonButton'
import { StatusMessage } from '../../../components/ui/StatusMessage'
import { validateExecutionDraft, type ControlledExecution, type Draft, type ExecutionRequest } from '../contracts/fakeCampaignCommands'
import type { FakeCommandActions } from '../hooks/useFakeCampaignCommands'
import { CommandFields, type FieldSpec } from './CommandFields'
import { focusCommandError } from './commandForm'

const fields: FieldSpec[] = [
  { key: 'campaignId', label: 'ID da campanha para execução' }, { key: 'campaignRevision', label: 'Revisão da campanha para execução', type: 'number' },
  { key: 'projectVersion', label: 'Versão do projeto', type: 'number' },
  { key: 'mediaReference', label: 'Referência da imagem local autorizada', hint: 'Referência já reconhecida pelo backend. Não há upload nesta tela.' },
  { key: 'contentHash', label: 'SHA-256 da imagem' },
  { key: 'origin', label: 'Origem da imagem', options: ['OPERATOR_OWNED', 'AUTHORIZED_THIRD_PARTY'] },
  { key: 'usageBasis', label: 'Base documental de uso', options: ['OWNED', 'LICENSED', 'EXPLICIT_PERMISSION'] },
  { key: 'evidence', label: 'Evidências oficiais de direitos (JSON)', type: 'textarea', hint: 'Array AffiliateEvidence com mediaAuthorization correspondente à referência e SHA-256, uso comercial e processamento local concedidos. Cole documentação real; não inclua credenciais.' },
]
export function FakeExecutionForm({ commands, observed, onAccepted }: { commands: FakeCommandActions; observed: ControlledExecution | null; onAccepted: (state: ControlledExecution) => void }) {
  const [draft, setDraft] = useState<Draft>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [rights, setRights] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [intent, setIntent] = useState<ExecutionRequest | null>(null)
  const [phase, setPhase] = useState<'idle' | 'ambiguous' | 'done'>('idle')
  const [message, setMessage] = useState('')
  const sending = useRef(false)
  const disabled = commands.busy || commands.reconciliationRequired || commands.access !== 'ready' || !commands.operator
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current || disabled || phase !== 'idle') return
    const validation = validateExecutionDraft(draft, rights)
    if (!confirmed) validation.errors.confirmation = 'Confirme a preparação sem publicação social.'
    setErrors(validation.errors); focusCommandError(event, validation.errors)
    if (!validation.data || !confirmed) return
    sending.current = true
    const next = intent ?? { ...validation.data, requestId: `fc_run_${crypto.randomUUID().replace(/-/g, '')}`, requestedAt: new Date().toISOString() }
    setIntent(next)
    const outcome = await commands.prepare(next, true)
    sending.current = false; setConfirmed(false)
    if (outcome.ok) { setPhase('done'); setMessage('EXECUTION_ACCEPTED: execução aceita e persistida. Isso não confirma conclusão.'); onAccepted(outcome.data) }
    else { setMessage(outcome.problem.message); if (['ambiguous', 'conflict'].includes(outcome.problem.kind)) setPhase('ambiguous') }
  }
  function reconcile() {
    if (!observed || !intent) return
    const { policy } = observed
    if (policy.commandId !== intent.requestId || policy.campaignId !== intent.campaignId || policy.campaignRevision !== intent.campaignRevision || Date.parse(policy.scheduledAt) !== Date.parse(intent.requestedAt)) { setMessage('A execução consultada não corresponde à intenção enviada. Preparação permanece bloqueada.'); return }
    setPhase('done'); setMessage('Execução confirmada pela consulta de estado e política correspondentes. Nenhum POST foi repetido.')
    commands.resolveReconciliation('prepare')
  }
  return <details className="command-section">
    <summary>Preparar execução FAKE</summary>
    <p className="campaign-note">Exige campanha existente e imagem local com direitos documentados. Somente provedores locais; publicação social desabilitada, inclusive simulada.</p>
    <form aria-label="Preparação de execução FAKE" onSubmit={submit} noValidate>
      <fieldset disabled={disabled || phase !== 'idle'}><legend className="sr-only">Dados da execução FAKE</legend>
        <CommandFields fields={fields} draft={draft} errors={errors} onChange={(key, value) => { setDraft(previous => ({ ...previous, [key]: value })); setConfirmed(false); setRights(false); setIntent(null) }} />
        <label className="command-check"><input name="rights" type="checkbox" checked={rights} onChange={e => { setRights(e.target.checked); setConfirmed(false) }} />Conferi a documentação real e confirmo os direitos comerciais e de processamento local desta imagem.</label>
        {errors.rights && <p className="campaign-validation">{errors.rights}</p>}
        <label className="command-check"><input name="confirmation" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Confirmo esta preparação FAKE, sem publicação social e sem provedores pagos.</label>
        {errors.confirmation && <p className="campaign-validation">{errors.confirmation}</p>}
        <NeonButton type="submit" loading={commands.busy}>Preparar execução FAKE</NeonButton>
      </fieldset>
    </form>
    {Object.keys(errors).length > 0 && <p role="alert" className="campaign-validation">Confira os campos, os direitos e a confirmação da execução.</p>}
    {message && <StatusMessage tone={phase === 'done' ? 'success' : 'error'}>{message}</StatusMessage>}
    {intent && <p className="campaign-note">Intenção: <code>{intent.requestId}</code> · {intent.requestedAt}</p>}
    {phase === 'ambiguous' && <><p className="campaign-note">Consulte abaixo o executionId real obtido no console ou na atividade recente. Sem uma identidade comprovada, a reconciliação permanece pendente.</p><NeonButton variant="secondary" disabled={!observed || commands.busy} onClick={reconcile}>Conciliar com a execução consultada</NeonButton></>}
  </details>
}
