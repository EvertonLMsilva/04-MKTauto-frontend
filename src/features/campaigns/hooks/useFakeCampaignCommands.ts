import { useEffect, useMemo, useRef, useState } from 'react'
import type { ApiConfig } from '../../../config/env'
import { dashboardAccess } from '../../dashboard/services/dashboardMetrics'
import type { QcSession } from '../contracts/fakeCampaignCommands'
import type { Campaign } from '../contracts/campaign'
import { commandProblem, fakeCampaignCommands, type CommandProblem } from '../services/fakeCampaignCommands'

export type CommandOutcome<T> = { ok: true; data: T } | { ok: false; problem: CommandProblem }
export function useFakeCampaignCommands(config: ApiConfig, origin: string) {
  const api = useMemo(() => fakeCampaignCommands(config, origin), [config, origin])
  const [busy, setBusy] = useState(false)
  const [operator, setOperator] = useState<string | null>(null)
  const [problem, setProblem] = useState<CommandProblem | null>(null)
  const session = useRef<QcSession | null>(null)
  const locked = useRef(false)
  const barrier = useRef<string | null>(null)
  const [reconciliationRequired, setReconciliationRequired] = useState(false)
  const lifecycle = useRef<AbortController | null>(null)
  const access = dashboardAccess(config, origin)
  useEffect(() => {
    const controller = new AbortController()
    lifecycle.current = controller
    session.current = null
    return () => { controller.abort(); session.current = null }
  }, [api])
  // The token lives in this ref only; it is neither rendered nor persisted.
  async function run<T>(action: (auth: QcSession, signal: AbortSignal) => Promise<T>, mutation?: string): Promise<CommandOutcome<T>> {
    if (locked.current || access !== 'ready') return { ok: false, problem: { kind: 'blocked', message: 'Aguarde a operação atual e use uma API na mesma origem local.' } }
    if (mutation && barrier.current) return { ok: false, problem: { kind: 'blocked', message: 'Concilie a operação pendente por consulta antes de enviar outro comando.' } }
    locked.current = true
    setBusy(true); setProblem(null)
    const controller = lifecycle.current!
    let started = false
    try {
      const auth = await api.session(AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]))
      if (controller.signal.aborted) return { ok: false, problem: { kind: 'blocked', message: 'Contexto alterado. Consulte novamente.' } }
      session.current = auth; setOperator(auth.operatorId)
      started = !!mutation
      const data = await action(auth, controller.signal)
      if (controller.signal.aborted) return { ok: false, problem: { kind: 'ambiguous', message: 'Contexto alterado durante a operação. Consulte o estado.' } }
      return { ok: true, data }
    } catch (error) {
      const next = commandProblem(error, started)
      if (!controller.signal.aborted) {
        setProblem(next)
        if (mutation && ['ambiguous', 'conflict'].includes(next.kind)) { barrier.current = mutation; setReconciliationRequired(true) }
        if (next.invalidateSession) { session.current = null; setOperator(null) }
      }
      return { ok: false, problem: next }
    } finally {
      locked.current = false
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  function resolveReconciliation(expected: string) {
    if (barrier.current === expected) { barrier.current = null; setReconciliationRequired(false) }
  }
  return { busy, operator, problem, access, reconciliationRequired, resolveReconciliation,
    verifySession: () => run(async () => true),
    register: (campaign: Campaign, key: string, confirmation: boolean) => run(auth => api.register(campaign, key, confirmation, auth.csrfToken), 'register'),
    prepare: (...args: [Parameters<typeof api.prepare>[0], boolean]) => run(auth => api.prepare(...args, auth.csrfToken, auth.operatorId), 'prepare'),
    resume: (...args: [Parameters<typeof api.resume>[0], boolean]) => run(auth => api.resume(...args, auth.csrfToken), `resume:${args[0].execution.executionId}`),
    read: async (executionId: string) => {
      const result = await run((_auth, signal) => api.read(executionId, AbortSignal.any([signal, AbortSignal.timeout(20000)])))
      if (result.ok) resolveReconciliation(`resume:${executionId}`)
      return result
    },
  }
}
export type FakeCommandActions = ReturnType<typeof useFakeCampaignCommands>
