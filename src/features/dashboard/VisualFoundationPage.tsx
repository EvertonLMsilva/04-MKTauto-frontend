import { useState } from 'react'
import { NeonPanel } from '../../components/ui/NeonPanel'
import { NeonButton } from '../../components/ui/NeonButton'
import { NeonBadge } from '../../components/ui/NeonBadge'
import { StatusMessage } from '../../components/ui/StatusMessage'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { Icon } from '../../components/ui/Icon'

const colors = [
  { name: 'Azul-preto', token: '--color-background' },
  { name: 'Superfície', token: '--color-surface' },
  { name: 'Azul elétrico', token: '--color-primary' },
  { name: 'Ciano neon', token: '--color-accent' },
  { name: 'Texto principal', token: '--color-text' },
  { name: 'Sucesso', token: '--color-success' },
  { name: 'Atenção', token: '--color-warning' },
  { name: 'Erro', token: '--color-error' },
]

const sections = [
  ['palette', 'Paleta'], ['type', 'Tipografia'], ['surfaces', 'Painéis'],
  ['controls', 'Botões'], ['badges', 'Badges'], ['states', 'Estados'],
] as const

export function VisualFoundationPage() {
  useDocumentTitle('Base visual')
  const [actionShown, setActionShown] = useState(false)
  const [controlFeedback, setControlFeedback] = useState('')

  return (
    <div className="page-content design-catalog">
      <div className="page-heading">
        <div><p className="eyebrow">SISTEMA VISUAL / MKTAUTO</p><h1>Base visual</h1></div>
        <span className="version-badge">FE-VISUAL.03 <span>NEON</span></span>
      </div>
      <div className="catalog-intro">
        <div>
          <NeonBadge tone="info">Demonstração visual</NeonBadge>
          <h2>Uma linguagem visual compartilhada.</h2>
          <p>Superfícies, controles e sinais que dão forma ao MKTAuto. Todos os exemplos abaixo são locais, sem dados ou conexão com o backend.</p>
        </div>
        <span className="catalog-signature" aria-hidden="true"><Icon name="layers" width="44" height="44" /><span>DESIGN SYSTEM<br />NEON / 003</span></span>
      </div>
      <nav className="catalog-index" aria-label="Seções do catálogo">
        {sections.map(([id, label], index) => <a href={`#catalog-${id}`} key={id}><span>0{index + 1}</span>{label}</a>)}
      </nav>
      <NeonPanel id="catalog-palette" title="Paleta e tokens" eyebrow="01 / IDENTIDADE">
        <p className="panel-description">Azul-preto como base. Luz ciano nos pontos de atenção. Cores semânticas sempre acompanhadas de texto ou símbolo.</p>
        <div className="color-grid">
          {colors.map((color) => <div className="color-swatch" key={color.token}>
            <div className="swatch-surface" style={{ background: `var(${color.token})` }} />
            <strong>{color.name}</strong><code>{color.token}</code>
          </div>)}
        </div>
        <div className="token-notes"><span>Superfícies translúcidas</span><span>Elevação controlada</span><span>Brilho sem animação contínua</span></div>
      </NeonPanel>
      <NeonPanel id="catalog-type" title="Hierarquia tipográfica" eyebrow="02 / LEGIBILIDADE">
        <div className="typography-grid">
          <div className="type-display-sample"><span className="eyebrow">TÍTULO PRINCIPAL</span><p>Precisão na<br /><span>operação.</span></p></div>
          <dl className="type-specimens">
            <div><dt>Título de seção</dt><dd className="type-section">Cada etapa, no seu lugar.</dd></div>
            <div><dt>Descrição</dt><dd className="type-description">Informação clara antes de qualquer ação.</dd></div>
            <div><dt>Algarismos tabulares · amostra de fonte</dt><dd className="type-numeric">0123456789</dd></div>
            <div><dt>Label técnico</dt><dd className="type-technical">COMPONENTE / DEMONSTRAÇÃO</dd></div>
          </dl>
        </div>
      </NeonPanel>
      <div id="catalog-surfaces" className="catalog-panel-grid">
        <NeonPanel title="Painel informativo" eyebrow="03 / SUPERFÍCIE ESTÁTICA">
          <div className="surface-symbol"><Icon name="layers" width="28" height="28" /></div>
          <p className="panel-description">Borda luminosa, reflexo sutil e profundidade. Esta superfície organiza conteúdo e não é clicável.</p>
          <div className="surface-footnote"><span className="outline-dot" /> Sem ação ou foco artificial</div>
        </NeonPanel>
        <NeonPanel title="Painel com ação" eyebrow="03 / INTERAÇÃO EXPLÍCITA" action={<NeonButton variant="ghost" onClick={() => setActionShown(true)}>Testar ação local</NeonButton>}>
          <p className="panel-description">Somente o botão recebe a ação. O brilho acompanha o hover ou foco do controle, sem transformar todo o painel em botão.</p>
          <div className="surface-feedback">{actionShown
            ? <StatusMessage tone="success">Ação local demonstrada. Nenhuma API foi chamada.</StatusMessage>
            : <NeonBadge>Exemplo interativo · somente interface</NeonBadge>}
          </div>
        </NeonPanel>
      </div>
      <NeonPanel id="catalog-controls" title="Botões e navegação" eyebrow="04 / CONTROLES">
        <p className="panel-description">Demonstrações de ações locais. Botões desabilitados ou em carregamento não disparam ações. Links continuam sendo links.</p>
        <div className="control-specimen">
          <span className="eyebrow">VARIANTES</span>
          <div className="button-row">
            <NeonButton onClick={() => setControlFeedback('Botão primário acionado somente nesta demonstração.')}>Primário <Icon name="arrow" /></NeonButton>
            <NeonButton variant="secondary" onClick={() => setControlFeedback('Botão secundário acionado somente nesta demonstração.')}>Secundário</NeonButton>
            <NeonButton variant="ghost" onClick={() => setControlFeedback('Botão discreto acionado somente nesta demonstração.')}>Discreto</NeonButton>
          </div>
        </div>
        <div className="control-specimen">
          <span className="eyebrow">ESTADOS E LINK REAL</span>
          <div className="button-row">
            <NeonButton disabled>Desabilitado</NeonButton>
            <NeonButton loading>Aguardando · exemplo</NeonButton>
            <NeonButton to="/" variant="secondary">Voltar ao dashboard <Icon name="arrow" /></NeonButton>
          </div>
        </div>
        {controlFeedback && <StatusMessage tone="info">{controlFeedback}</StatusMessage>}
      </NeonPanel>
      <div className="catalog-panel-grid">
        <NeonPanel id="catalog-badges" title="Badges de estado" eyebrow="05 / SINAIS COMPACTOS">
          <p className="panel-description">Rótulos de demonstração, sem associação a operações reais. A integração futura fornecerá os estados efetivos.</p>
          <div className="badge-row">
            <NeonBadge>Não iniciado</NeonBadge><NeonBadge tone="info">Em andamento</NeonBadge>
            <NeonBadge tone="success">Concluído</NeonBadge><NeonBadge tone="warning">Aguardando</NeonBadge>
            <NeonBadge tone="error">Bloqueado</NeonBadge>
          </div>
          <p className="surface-footnote">Texto + símbolo + cor. Sem anúncios de operação ao vivo.</p>
        </NeonPanel>
        <NeonPanel id="catalog-states" title="Estados da interface" eyebrow="06 / FEEDBACK ACESSÍVEL">
          <p className="panel-description">Amostras visuais. Não representam serviços ou operações em execução.</p>
          <div className="state-examples">
            <StatusMessage tone="info">Vazio · aguardando dados da integração.</StatusMessage>
            <StatusMessage tone="loading">Carregamento · exemplo de espera.</StatusMessage>
            <StatusMessage tone="success">Sucesso · exemplo de confirmação visual.</StatusMessage>
            <StatusMessage tone="error">Erro · exemplo de mensagem recuperável.</StatusMessage>
          </div>
        </NeonPanel>
      </div>
      <NeonPanel title="Composição de componentes" eyebrow="07 / SOMENTE DEMONSTRAÇÃO">
        <div className="composition-sample">
          <span className="composition-icon"><Icon name="dashboard" width="28" height="28" /></span>
          <div><span className="eyebrow">PAINEL + BADGE + LINK</span><h3>Uma base pronta para receber contratos reais.</h3><p className="panel-description">Sem métricas, identificadores ou resultados operacionais fictícios.</p></div>
          <NeonBadge tone="info">Demonstração</NeonBadge>
        </div>
        <div className="composition-footer"><span>Foco visível · teclado · movimento reduzido</span><NeonButton to="/" variant="ghost">Explorar o dashboard <Icon name="arrow" /></NeonButton></div>
      </NeonPanel>
    </div>
  )
}
