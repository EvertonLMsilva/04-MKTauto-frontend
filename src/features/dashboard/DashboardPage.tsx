import { Link } from 'react-router'
import { apiConfig } from '../../config/env'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { Icon } from '../../components/ui/Icon'
import { NeonPanel } from '../../components/ui/NeonPanel'
import { StatusMessage } from '../../components/ui/StatusMessage'

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  return <div className="page-content">
    <div className="page-heading"><div><p className="eyebrow">SEU CENTRO DE OPERAÇÃO</p><h1>Dashboard</h1></div><span className="version-badge">BASE DE INTERFACE <span>01</span></span></div>

    <section className="foundation-hero" aria-labelledby="hero-title">
      <div className="hero-copy"><span className="hero-label"><span className="outline-dot" /> CONSTRUÍDO PARA EVOLUIR</span><h2 id="hero-title">Uma nova base<br />{' '}para sua <span>operação.</span></h2><p>Uma interface modular para conectar cada etapa do MKTAuto. O primeiro passo começa com uma estrutura clara.</p><Link className="button button--primary" to="/base-visual">Explorar a base visual <Icon name="arrow" /></Link><span className="hero-caption">Sem dados simulados. Pronta para a próxima integração.</span></div>
      <div className="hero-art" aria-hidden="true"><div className="orbital orbital--outer" /><div className="orbital orbital--inner" /><span className="hero-monogram">M</span><div className="art-corner art-corner--one" /><div className="art-corner art-corner--two" /><span className="art-label">MKTAUTO / INTERFACE FOUNDATION</span><span className="art-cross art-cross--one">+</span><span className="art-cross art-cross--two">+</span></div>
    </section>

    <div className="foundation-grid">
      <NeonPanel title="Uma estrutura que conecta" eyebrow="COMPONENTES REUTILIZÁVEIS" className="structure-panel"><p className="panel-description">A mesma linguagem visual, do primeiro acesso aos próximos fluxos.</p><ul className="foundation-list"><li><span className="feature-icon"><Icon name="layers" /></span><div><strong>Layout consistente</strong><p>Navegação, cabeçalho e painéis compartilhados.</p></div><Icon name="check" className="check-icon" /></li><li><span className="feature-icon"><Icon name="dashboard" /></span><div><strong>Espaço para cada tela</strong><p>Estrutura adaptável a desktop e dispositivos menores.</p></div><Icon name="check" className="check-icon" /></li><li><span className="feature-icon"><Icon name="code" /></span><div><strong>Base pronta para evoluir</strong><p>Componentes React com TypeScript e rotas independentes.</p></div><Icon name="check" className="check-icon" /></li></ul></NeonPanel>
      <NeonPanel title="Conexão com a API" eyebrow="INTEGRAÇÃO FUTURA" id="api-foundation"><div className="api-icon"><Icon name="plug" width="28" height="28" /></div><h3>{apiConfig.status === 'configured' ? 'Configuração preparada' : apiConfig.status === 'invalid' ? 'Revise a configuração' : 'Aguardando configuração'}</h3><p className="panel-description">{apiConfig.status === 'configured' ? 'A URL da API está configurada. Nenhuma conexão ou consulta foi iniciada nesta etapa.' : apiConfig.status === 'invalid' ? 'VITE_API_BASE_URL precisa conter uma URL HTTP válida, sem credenciais, query ou fragmento.' : 'A API NestJS será conectada nas próximas etapas. A interface funciona de forma independente.'}</p><StatusMessage tone={apiConfig.status === 'invalid' ? 'error' : 'info'}>Nenhum dado operacional carregado</StatusMessage></NeonPanel>
    </div>

    <div className="scope-note"><span className="scope-index">PRÓXIMA ETAPA</span><p>Esta entrega prepara a base. Campanhas, pipeline, mídia e publicações serão conectados aos contratos reais do NestJS.</p><Link to="/base-visual" aria-label="Conhecer os componentes da base visual"><Icon name="arrow" /></Link></div>
  </div>
}
