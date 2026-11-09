import { Link } from 'react-router'
import { NeonPanel } from '../components/ui/NeonPanel'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Página não encontrada')
  return <div className="page-content not-found"><p className="eyebrow">ROTA NÃO ENCONTRADA / 404</p><h1>Página não encontrada</h1><NeonPanel title="Vamos voltar ao início?"><p className="panel-description">Este endereço não faz parte da navegação atual.</p><Link className="button button--primary" to="/">Voltar ao dashboard</Link></NeonPanel></div>
}
