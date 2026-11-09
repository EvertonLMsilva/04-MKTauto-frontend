import { Link } from 'react-router'
import { NeonPanel } from '../../components/ui/NeonPanel'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { Icon } from '../../components/ui/Icon'

const colors = [
  { name: 'Fundo profundo', token: '--color-background' },
  { name: 'Superfície', token: '--color-surface' },
  { name: 'Azul energia', token: '--color-primary' },
  { name: 'Ciano', token: '--color-accent' },
]

export function VisualFoundationPage() {
  useDocumentTitle('Base visual')
  return <div className="page-content">
    <div className="page-heading"><div><p className="eyebrow">DESIGN SYSTEM / INÍCIO</p><h1>Base visual</h1></div><span className="version-badge">FE-VISUAL.02</span></div>
    <div className="page-intro"><h2>Uma linguagem visual compartilhada.</h2><p>Cores, superfícies e estados consistentes para construir o MKTAuto, um componente de cada vez.</p></div>
    <NeonPanel title="Cores que dão direção" eyebrow="TOKENS VISUAIS"><div className="color-grid">{colors.map((color) => <div className="color-swatch" key={color.token}><div className="swatch-surface" style={{ backgroundColor: `var(${color.token})` }} /><strong>{color.name}</strong><code>{color.token}</code></div>)}</div></NeonPanel>
    <div className="foundation-grid">
      <NeonPanel title="Estados da interface" eyebrow="CLAREZA EM CADA RESPOSTA"><p className="panel-description">Amostras visuais. Não representam serviços ou operações em execução.</p><div className="state-examples"><StatusMessage tone="info">Vazio · aguardando dados da integração.</StatusMessage><StatusMessage tone="loading">Carregamento · exemplo de espera.</StatusMessage><StatusMessage tone="error">Erro · exemplo de mensagem recuperável.</StatusMessage><StatusMessage tone="success">Sucesso · exemplo de confirmação visual.</StatusMessage></div></NeonPanel>
      <NeonPanel title="Foco no que importa" eyebrow="INTERAÇÃO E ACESSIBILIDADE"><div className="type-sample"><span className="eyebrow">HIERARQUIA LEGÍVEL</span><h3>Menos ruído.<br /><span>Mais clareza.</span></h3><p className="panel-description">Contraste, foco visível e movimento reduzido respeitado em toda a base.</p></div><Link className="button button--secondary" to="/">Voltar ao dashboard <Icon name="arrow" /></Link></NeonPanel>
    </div>
  </div>
}
