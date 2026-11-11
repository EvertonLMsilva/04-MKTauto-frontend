import { useRef, useState, type FormEvent } from 'react'
import { NeonButton } from '../../../components/ui/NeonButton'
import { StatusMessage } from '../../../components/ui/StatusMessage'
import { canResume, validExecutionId, type ControlledExecution } from '../contracts/fakeCampaignCommands'
import type { FakeCommandActions } from '../hooks/useFakeCampaignCommands'

export function ControlledExecutionPanel({ commands, state, onChange }: { commands: FakeCommandActions; state: ControlledExecution | null; onChange: (value: ControlledExecution | null) => void }) {
  const [id, setId] = useState('')
  const [confirmedFor, setConfirmedFor] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [freshFor, setFreshFor] = useState<string | null>(null)
  const sending = useRef(false)
  const identity = state ? `${state.execution.executionId}:${state.execution.version}:${state.policy.requestHash}` : null
  const fresh = identity !== null && freshFor === identity
  const confirmed = identity !== null && confirmedFor === identity
  async function read(executionId: string) {
    setConfirmedFor(null); setFreshFor(null); onChange(null)
    if (!validExecutionId(executionId)) { setMessage('Informe o executionId UUID real da execução controlada.'); return }
    const result = await commands.read(executionId)
    if (result.ok) { const value = result.data; onChange(value); setFreshFor(`${value.execution.executionId}:${value.execution.version}:${value.policy.requestHash}`); setMessage('Estado e versão consultados. Nenhuma ação foi retomada automaticamente.') }
    else setMessage(result.problem.message)
  }
  async function resume() {
    if (sending.current || !state || !fresh || !confirmed || commands.busy || !canResume(state)) return
    sending.current = true; setConfirmedFor(null); setFreshFor(null)
    const result = await commands.resume(state, true)
    sending.current = false
    if (result.ok) { onChange(result.data); setMessage('Retomada recebida. Consulte novamente para acompanhar o resultado; QC e CTC permanecem obrigatórios.') }
    else {
      setMessage(result.problem.message)
      if (['conflict', 'ambiguous'].includes(result.problem.kind)) {
        await read(state.execution.executionId)
        setMessage(`${result.problem.message} A consulta foi solicitada; nenhum POST será repetido sem nova confirmação e versão.`)
      }
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!commands.busy) void read(id) }
  return <section className="command-section" aria-labelledby="controlled-execution-title">
    <h3 id="controlled-execution-title">Estado da execução controlada</h3>
    <p className="campaign-note">Use o executionId real de uma execução criada pelo novo comando FAKE. Atualização manual, sem polling. Execuções legadas podem não ter esta política.</p>
    <form onSubmit={submit} className="command-lookup" aria-label="Consulta de execução controlada" noValidate>
      <div><label htmlFor="controlled-execution-id">Execution ID controlado</label><input id="controlled-execution-id" value={id} onChange={event => { setId(event.target.value); setFreshFor(null); setConfirmedFor(null); onChange(null) }} autoComplete="off" /></div>
      <NeonButton type="submit" disabled={commands.busy || commands.access !== 'ready'}>Consultar estado controlado</NeonButton>
    </form>
    {message && state?.result !== 'EXECUTION_ACCEPTED' && <p role="status" className="campaign-note">{message}</p>}
    {state && <article aria-label="Execução FAKE controlada" className="controlled-execution">
      <StatusMessage tone="info">{state.result === 'EXECUTION_ACCEPTED' ? 'Aceita e persistida; conclusão ainda não confirmada.' : 'Estado oficial retornado pelo backend.'} Publicação social desabilitada, inclusive simulada.</StatusMessage>
      <dl>{Object.entries(state.execution).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <h4>Política FAKE validada</h4><dl>{Object.entries(state.policy).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <NeonButton variant="secondary" disabled={commands.busy} onClick={() => void read(state.execution.executionId)}>Atualizar estado controlado</NeonButton>
      {canResume(state) ? <div className="command-resume"><p className="campaign-note">Retomar usa a versão {state.execution.version}. A ação preserva os bloqueios de QC/CTC e não equivale a aprovação humana.</p>
        {!fresh && <p className="campaign-note">Consulte novamente o estado antes de confirmar uma retomada.</p>}
        <label className="command-check"><input type="checkbox" checked={confirmed} disabled={!fresh || commands.busy || !commands.operator} onChange={e => setConfirmedFor(e.target.checked ? identity : null)} />Confirmo a retomada desta execução na versão {state.execution.version}.</label>
        <NeonButton disabled={!fresh || !confirmed || commands.busy || commands.reconciliationRequired || !commands.operator} onClick={() => void resume()}>Retomar execução FAKE</NeonButton>
      </div> : <p className="campaign-note">O estado {state.execution.status} não admite retomada nesta interface.</p>}
    </article>}
  </section>
}
