import { useRef, useState, type FormEvent } from 'react'
import { NeonButton } from '../../../components/ui/NeonButton'
import { parseCampaignQuery, type CampaignQuery } from '../contracts/campaign'

export function CampaignLookup({ onLookup, available, loading }: { onLookup: (query: CampaignQuery) => void; available: boolean; loading: boolean }) {
  const [id, setId] = useState(''), [revision, setRevision] = useState('')
  const [invalid, setInvalid] = useState(false)
  const idRef = useRef<HTMLInputElement>(null), revisionRef = useRef<HTMLInputElement>(null)
  const validId = /^[a-z0-9][a-z0-9_-]{2,79}$/.test(id)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!available || loading) return
    const query = parseCampaignQuery(id, revision)
    setInvalid(!query)
    if (query) onLookup(query)
    else (validId ? revisionRef : idRef).current?.focus()
  }
  return (
    <form className="campaign-lookup" aria-label="Consultar revisão de campanha" onSubmit={submit} noValidate>
      <p className="campaign-note" id="campaign-lookup-help">Consulte uma revisão conhecida, inclusive de campanhas sem execução recente. Os dois campos são obrigatórios.</p>
      <div className="campaign-fields">
        <div><label htmlFor="campaign-id">Identificador da campanha</label><input ref={idRef} id="campaign-id" value={id} onChange={event => setId(event.target.value)} required maxLength={80} autoCapitalize="none" spellCheck={false} aria-invalid={invalid && !validId || undefined} aria-describedby="campaign-id-help campaign-lookup-error" />
          <p id="campaign-id-help" className="campaign-note">3 a 80 caracteres: letras minúsculas, números, “_” ou “-”.</p></div>
        <div><label htmlFor="campaign-revision">Revisão</label><input ref={revisionRef} id="campaign-revision" value={revision} onChange={event => setRevision(event.target.value)} required inputMode="numeric" maxLength={16} aria-invalid={invalid && !parseCampaignQuery(id, revision) && validId || undefined} aria-describedby="campaign-revision-help campaign-lookup-error" />
          <p id="campaign-revision-help" className="campaign-note">Número inteiro positivo, sem zeros à esquerda.</p></div>
      </div>
      <p id="campaign-lookup-error" className="campaign-validation" role={invalid ? 'alert' : undefined}>{invalid ? 'Informe um identificador válido e uma revisão inteira positiva.' : ''}</p>
      <NeonButton type="submit" variant="secondary" disabled={!available} loading={loading}>Consultar revisão</NeonButton>
    </form>
  )
}
