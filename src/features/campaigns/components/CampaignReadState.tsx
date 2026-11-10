import { NeonButton } from '../../../components/ui/NeonButton'
import { StatusMessage } from '../../../components/ui/StatusMessage'

export function CampaignReadState({ status, message, retry, hasQuery = true }: { status: string; message: string; retry: () => void; hasQuery?: boolean }) {
  if (status === 'idle' && !hasQuery) return <p className="campaign-note">Selecione uma revisão na atividade recente ou use a consulta acima.</p>
  const loading = status === 'loading' || status === 'idle'
  return <div className="campaign-read-state">
    {status !== 'success' && status !== 'empty' && <StatusMessage tone={loading ? 'loading' : ['incompatible', 'error'].includes(status) ? 'error' : 'info'}>{message}</StatusMessage>}
    {status === 'unauthorized' && <a className="button button--secondary" href="/operations" target="_blank" rel="noreferrer">Abrir console QC</a>}
    {!loading && status !== 'unavailable' && <NeonButton variant="ghost" onClick={retry}>{status === 'success' || status === 'empty' ? 'Atualizar consulta' : 'Tentar novamente'}</NeonButton>}
  </div>
}
