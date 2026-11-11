import { useRef, useState, type FormEvent } from 'react'
import type { ApiConfig } from '../../../config/env'
import { NeonButton } from '../../../components/ui/NeonButton'
import { StatusMessage } from '../../../components/ui/StatusMessage'
import type { Campaign, CampaignQuery } from '../contracts/campaign'
import { validateCampaignDraft, type Draft } from '../contracts/fakeCampaignCommands'
import type { FakeCommandActions } from '../hooks/useFakeCampaignCommands'
import { loadCampaign } from '../services/campaigns'
import { commandProblem } from '../services/fakeCampaignCommands'
import { CommandFields, type FieldSpec } from './CommandFields'
import { focusCommandError } from './commandForm'

const fields: FieldSpec[] = [
  { key: 'campaignId', label: 'ID da campanha para cadastro' }, { key: 'revision', label: 'Revisão para cadastro', type: 'number' },
  { key: 'projectId', label: 'ID do projeto existente' }, { key: 'productId', label: 'ID do produto existente' },
  { key: 'productRevision', label: 'Revisão do produto', type: 'number' }, { key: 'affiliateUrl', label: 'Link de afiliado HTTPS', type: 'url' },
  { key: 'cta', label: 'CTA', type: 'textarea' }, { key: 'disclosure', label: 'Identificação publicitária', type: 'textarea' },
]
export function CampaignRegistrationForm({ commands, config, origin, onSelect }: { commands: FakeCommandActions; config: ApiConfig; origin: string; onSelect: (query: CampaignQuery) => void }) {
  const [draft, setDraft] = useState<Draft>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmed, setConfirmed] = useState(false)
  const [intent, setIntent] = useState<{ key: string; campaign: Campaign } | null>(null)
  const [phase, setPhase] = useState<'idle' | 'ambiguous' | 'done'>('idle')
  const [message, setMessage] = useState('')
  const [checking, setChecking] = useState(false)
  const sending = useRef(false)
  const disabled = commands.busy || checking || commands.reconciliationRequired || commands.access !== 'ready' || !commands.operator
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending.current || disabled || phase !== 'idle') return
    const validation = validateCampaignDraft(draft)
    if (!confirmed) validation.errors.confirmation = 'Confirme este cadastro antes do envio.'
    setErrors(validation.errors); focusCommandError(event, validation.errors)
    if (!validation.data || !confirmed) return
    sending.current = true
    const next = intent ?? { key: `fc_reg_${crypto.randomUUID().replace(/-/g, '')}`, campaign: validation.data }
    setIntent(next)
    const outcome = await commands.register(next.campaign, next.key, true)
    sending.current = false
    setConfirmed(false)
    if (outcome.ok) { setPhase('done'); setMessage('CAMPAIGN_REGISTERED: revisão cadastrada. Nenhuma execução foi iniciada.') }
    else { setMessage(outcome.problem.message); if (['ambiguous', 'conflict'].includes(outcome.problem.kind)) setPhase('ambiguous') }
  }
  async function reconcile() {
    if (!intent || checking || commands.busy) return
    setChecking(true)
    try {
      const found = await loadCampaign({ id: intent.campaign.campaignId, revision: intent.campaign.revision }, config, origin, AbortSignal.timeout(20000))
      if (Object.keys(intent.campaign).some(k => found[k as keyof Campaign] !== intent.campaign[k as keyof Campaign])) { setMessage('A revisão consultada difere da intenção enviada. Cadastro permanece bloqueado para reconciliação.'); return }
      setPhase('done'); setMessage('Revisão confirmada por consulta. A resposta do cadastro não foi recebida; nenhum POST foi repetido.')
      commands.resolveReconciliation('register')
      onSelect({ id: found.campaignId, revision: found.revision })
    } catch (error) { setMessage(`${commandProblem(error).message} A intenção permanece bloqueada até confirmar a revisão.`) }
    finally { setChecking(false) }
  }
  return <details className="command-section">
    <summary>Cadastrar campanha</summary>
    <p className="campaign-note">Vincule um projeto e produto já existentes. O cadastro não cria esses registros nem inicia execução.</p>
    <form aria-label="Cadastro de campanha" onSubmit={submit} noValidate>
      <fieldset disabled={disabled || phase !== 'idle'}><legend className="sr-only">Dados do cadastro</legend>
        <CommandFields fields={fields} draft={draft} errors={errors} onChange={(key, value) => { setDraft(previous => ({ ...previous, [key]: value })); setConfirmed(false); setIntent(null) }} />
        <label className="command-check"><input name="confirmation" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} aria-describedby={errors.confirmation ? 'register-confirmation-error' : undefined} />Confirmo o cadastro desta revisão com os dados acima.</label>
        {errors.confirmation && <p id="register-confirmation-error" className="campaign-validation">{errors.confirmation}</p>}
        <NeonButton type="submit" loading={commands.busy}>Cadastrar revisão FAKE</NeonButton>
      </fieldset>
    </form>
    {Object.keys(errors).length > 0 && <p role="alert" className="campaign-validation">Confira os campos e a confirmação do cadastro.</p>}
    {message && <StatusMessage tone={phase === 'done' ? 'success' : 'error'}>{message}</StatusMessage>}
    {intent && <p className="campaign-note">Chave desta intenção: <code>{intent.key}</code></p>}
    {phase === 'ambiguous' && <NeonButton variant="secondary" loading={checking} disabled={commands.busy} onClick={reconcile}>Verificar revisão antes de outra ação</NeonButton>}
    {phase === 'done' && intent && <div className="command-actions"><NeonButton variant="secondary" onClick={() => onSelect({ id: intent.campaign.campaignId, revision: intent.campaign.revision })}>Consultar revisão cadastrada</NeonButton><NeonButton variant="ghost" onClick={() => { setPhase('idle'); setIntent(null); setDraft({}); setMessage(''); setErrors({}); setConfirmed(false) }}>Novo cadastro</NeonButton></div>}
  </details>
}
