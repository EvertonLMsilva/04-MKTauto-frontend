# MKTAuto Frontend

Base independente da interface React do MKTAuto. Este bootstrap entrega layout,
navegação, tokens visuais, componentes compartilhados e um cliente HTTP preparado
para futuras integrações com o backend NestJS.

Não carrega campanhas, métricas ou publicações. Os textos de estados na página
Base visual são amostras de componentes, identificadas como tal. Nenhuma
autenticação, conexão com o backend ou ação operacional é simulada.

## Tecnologias

React 19, TypeScript 6 em modo strict, Vite 8, React Router 8, CSS com variáveis,
Vitest 5, React Testing Library e ESLint 10. Versões exatas ficam em `package.json`
e `package-lock.json`. Requer Node.js 24.15+ da linha 24 ou Node.js 26+ e npm.

O override transitivo de minimatch 11.0.1 evita a versão vulnerável descrita em
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
Ele se limita às versões afetadas do tooling. Ao atualizar ESLint/typescript-eslint,
reavaliar o override e executar build, lint e testes; não usar `--force` ou
`--legacy-peer-deps` para esconder conflitos de dependências.

## Instalar e executar

```powershell
npm ci
npm run dev
```

O Vite escuta apenas em `127.0.0.1` e informa a porta escolhida no terminal.
Para exigir uma porta livre específica:

```powershell
npm run dev -- --port 5173 --strictPort
```

Rotas atuais:

- `/`: Dashboard inicial, sem dados operacionais.
- `/base-visual`: tokens e exemplos de estados dos componentes.
- Outros caminhos: página 404 com retorno ao dashboard.

O menu é persistente em desktop e expansível em telas menores. Há foco visível,
atalho para o conteúdo, fechamento do menu com Escape e respeito à preferência
de movimento reduzido. Nenhuma fonte, imagem ou biblioteca é carregada de CDN.

## Verificar

```powershell
npm run test
npm run build
npm run lint
```

Os testes cobrem montagem, AppShell, navegação, 404 e contratos de transporte
HTTP. Requisições sem mock são bloqueadas nos testes. O build verifica tipos e
gera `dist/`; o lint rejeita avisos. Nenhum desses comandos executa o backend.

## Configurar a API

Copie `.env.example` para `.env.local` e defina `VITE_API_BASE_URL` com a origem
HTTP/HTTPS do seu backend. Um prefixo de caminho também é permitido quando
fizer parte da configuração real. Não acrescente credenciais, query ou fragmento.
Reinicie o Vite após mudar o arquivo. As variáveis Vite são públicas no bundle:
**nunca coloque tokens ou segredos em variáveis `VITE_*`.**

O valor é vazio por padrão. Não existe endereço de backend fixo ou fallback
automático. O bootstrap funciona mesmo sem API e não faz consultas ao montá-la.
Uma URL configurada indica apenas preparação, não disponibilidade do servidor.

`src/config/env.ts` valida a configuração. `src/services/http/client.ts`
centraliza JSON e erros de configuração, caminho, HTTP, rede e cancelamento.
Não há retry automático. Respostas são `unknown`: serviços de futuras features
deverão validar os contratos efetivos antes de usá-las nos componentes.

O cliente omite cookies por padrão; autenticação, cookies, CSRF e CORS deverão
ser integrados posteriormente segundo os contratos reais. Nenhum proxy, endpoint
de negócio ou mecanismo fictício de login foi criado nesta tarefa.

## Estrutura

```text
src/
  app/                    # App, rotas e fallback 404
  components/
    layout/               # AppShell, AppSidebar e AppHeader
    ui/                   # NeonPanel, Icon e StatusMessage
  features/dashboard/     # Dashboard inicial e Base visual
  services/http/          # Cliente e contratos de transporte
  config/                 # Configuração pública da API
  hooks/                  # Título de página compartilhado
  styles/                 # Tokens, estilos globais e layout responsivo
  test/                   # Setup de testes com rede bloqueada
```

## Relação com o NestJS

O backend pertence ao repositório `EvertonLMsilva/04-MKTauto` e mantém sua
interface `/operations`. Este frontend se comunicará exclusivamente por HTTP:
não importa código do backend, não acessa SQLite e não duplica regras de negócio,
direitos, Finance, estados, aprovações ou idempotência.

O mockup MKTAuto Neon Marketing Cockpit foi consultado apenas como referência
de composição e cor. Não foi copiado como interface ou asset. FE-VISUAL.05 usa
dois assets isolados somente no ambiente local, conforme as restrições de
licença documentadas abaixo. Integrações operacionais dependem dos contratos reais.

## Estado Git

O bootstrap e o Design System Neon estão versionados na branch `master`.
FE-VISUAL.04 entrega o layout local; commit, push e PR dependem de tarefa
explícita. Revisão e merge são manuais.
Para servir o build com BrowserRouter, o servidor estático deverá
oferecer fallback para `index.html` nas rotas da aplicação; deploy não faz parte
deste bootstrap.

## Design System Neon — FE-VISUAL.03

A rota `/base-visual` é o catálogo dos componentes implementados. Paleta,
tipografia, painéis, botões, badges e estados são identificados como demonstração
visual, sem métricas ou operações do backend. Seus botões de demonstração
produzem somente feedback local; os links de retorno navegam ao Dashboard.

Os tokens em `src/styles/tokens.css` centralizam superfícies e elevações, cores
semânticas, hierarquia tipográfica, espaçamentos, raios, bordas, sombras, brilho,
foco e transições. `global.css` mantém os componentes visuais compartilhados;
`layout.css` adapta o shell aprovado e as composições do catálogo. Não há fontes
externas, frameworks CSS, vídeos, canvas ou partículas.

- **NeonPanel:** mantém `title`, `eyebrow`, `children`, `className` e `id`.
  O novo slot opcional `action` recebe um controle real no cabeçalho. A seção
  continua sendo informativa, sem `onClick`, papel de botão ou foco artificial.
  O brilho de interação só acompanha o hover/foco de seu controle de ação.
- **NeonButton:** variantes `primary`, `secondary` e `ghost`. Sem `to`, renderiza
  um botão nativo com `type="button"` por padrão. `disabled` e `loading` impedem
  acionamentos; loading também informa `aria-busy`. Com `to`, renderiza um Link
  do React Router, sem simular botão ou aceitar disabled/loading.
- **NeonBadge:** variantes visuais `neutral`, `info`, `success`, `warning` e
  `error`. Exibe símbolo e texto, sem anunciar operação ao vivo ou converter
  estados de negócio. O consumidor continua responsável pelo rótulo verdadeiro.
- **StatusMessage:** preserva `tone` e `children`, `status` para informação,
  carregamento e sucesso, e `alert` para erro. Ícones decorativos e um prefixo
  textual acessível distinguem os estados sem depender apenas da cor.

Foco de teclado tem contorno visível. Apenas os indicadores explícitos de
carregamento giram; `prefers-reduced-motion: reduce` elimina animações e
transições, mantendo texto e símbolos estáticos para comunicar o estado.

Comparação com o mockup: reproduzidos azul-preto, azul elétrico/ciano, superfícies
escuras translúcidas, reflexos nas bordas, profundidade controlada, badges compactos
e hierarquia legível. O catálogo não pretende reproduzir o dashboard completo ou
ser pixel-perfect. Hero com braços robóticos/cidade, vídeo de partículas,
indicadores, pipeline e dados operacionais dependem das etapas seguintes.

Os testes focados de UI cobrem contratos de painel, controles de ação, estados,
teclado, disabled/loading, semântica de links/badges e feedback local do catálogo.
As regressões do bootstrap continuam cobrindo Dashboard, menu, rotas e cliente HTTP.

## Layout e navegação — FE-VISUAL.04

O Dashboard segue a organização espacial do mockup: sidebar persistente à
esquerda, header compacto, hero com indicadores à direita, pipeline em largura
total, fila/processamentos/publicações em três painéis e integração na base.
Em telas menores, os indicadores passam para baixo do hero, os painéis se
reorganizam e o menu se expande no fluxo da página. O conteúdo pode rolar
verticalmente; a sidebar desktop também tem rolagem própria quando necessário.

Somente Dashboard e Base visual são links na sidebar. Campanhas, Pipeline,
Mídia, Publicação e Relatórios aparecem no grupo de módulos futuros, claramente
indisponíveis e sem controles de navegação. O header mostra a localização e o
ambiente local, sem simular usuário, notificações ou disponibilidade da API.

O botão de menu expõe seu estado e a região controlada. Escape fecha o menu e
restaura o foco ao botão. Navegar fecha o menu, transfere o foco ao conteúdo e
posiciona a nova página no topo, sem rolagem animada. O link para pular ao
conteúdo e os contornos de foco continuam disponíveis.

`DashboardHero` separa texto, link para o catálogo e espaço holográfico estático
em CSS. `MetricPlaceholder` apresenta rótulo e valor indisponível numa lista
de definições; o traço visual nunca significa zero. `OperationalEmptyState`
compartilha a apresentação das áreas aguardando integração. Os painéis usam
`NeonPanel`, os controles usam `NeonButton`, e os avisos reutilizam `NeonBadge`
e `StatusMessage`. Os tokens e componentes do FE-VISUAL.03 foram preservados.

Não há métricas, percentuais, etapas do pipeline, campanhas ou publicações
inventadas. “Ainda não consultada” descreve ausência de integração, sem afirmar
que a fila real está vazia. Configuração de URL não comprova conexão. Nenhuma
consulta HTTP é iniciada ao renderizar o dashboard.

Verificação local: testes de montagem, rotas, catálogo e 404; teclado, Escape,
fechamento do menu e foco; indicadores sem números artificiais; áreas
operacionais pendentes; estados de configuração da API sem consultas automáticas.
Os testes usam mocks e não validam integração operacional. A inspeção visual
no navegador cobriu 1440×900, 1280×800, 768×1024 e 390×844, sem overflow
horizontal no dashboard. O catálogo também foi conferido no mobile.

A composição usa apenas CSS e ícones SVG locais, sem imagens, vídeos, canvas,
3D ou novas dependências. A regra existente de movimento reduzido permanece
ativa; o dashboard não introduz animações. A composição cinematográfica do hero
fica para FE-VISUAL.05; integrações e dados reais dependem de tópicos posteriores.

## Hero cinematográfico local — FE-VISUAL.05

`DashboardHero` preserva título, descrição, link e organização do cockpit.
`HeroMedia` isola imagem decorativa, partículas, luz, máscaras e fallback CSS.
A cidade e os braços robóticos se integram à superfície do hero; o mockup
completo não é usado como fundo. No mobile, a imagem fica abaixo do texto e
do link, com enquadramento que preserva os dois braços.

O vídeo web usa H.264/yuv420p, 1280×720, 24 fps, duração de 13,33 s e não tem
faixa de áudio. A camada tem baixa opacidade e `mix-blend-mode: screen`.
`muted`, `loop` e `playsInline` acompanham preload `none`; a reprodução só é
iniciada depois da carga da imagem, com movimento permitido e aba visível.
Um controle acessível permite pausar/retomar as partículas. A preferência por
movimento reduzido é acompanhada durante o uso: o vídeo não é montado nesse
modo, mantendo a imagem estática. Ocultar a aba remove o vídeo e interrompe a
reprodução; a escolha de pausa é preservada ao voltar.

Erro ou bloqueio de autoplay remove somente o vídeo, mantendo a imagem. Se a
imagem também faltar, o hero conserva sua composição CSS, sem ícone de imagem
quebrada. Isso permite usar outros clones sem os arquivos locais. Navegação e
texto permanecem disponíveis em todos esses casos. Nenhuma API de negócio é
consultada; os únicos carregamentos adicionais são os arquivos estáticos locais.

### Origem, integridade e limites de distribuição

Materiais entregues pelo usuário em
`D:\04-Projetos\23-MKTauto\00-materiais\prototipo\referencias`:

| Arquivo de origem | Formato / dimensões | Tamanho | Uso |
| --- | --- | ---: | --- |
| `mktauto-robotic-city-original.png` | PNG RGB, 960×540 | 599.620 bytes | Cópia local |
| `mktauto-blue-neon-particles.mp4` | H.264/yuv422p10le, 2560×1440, 29,97 fps, 13,35 s | 36.486.076 bytes | Referência; não copiado |
| `mktauto-blue-neon-particles-web.mp4` | H.264/yuv420p, 1280×720, 24 fps, 13,33 s | 5.782.494 bytes | Cópia local otimizada |

Os três arquivos passaram por inspeção de metadados e decodificação completa
com FFmpeg já instalado. Não houve conversão ou alteração dos originais.
As cópias locais têm o mesmo SHA-256 dos arquivos de origem:

- Imagem: `f0983563d6011a2b65cea19f008863f126a4617218a94d7257049432bcdb95ab`.
- Vídeo original: `c6a0fd63bfad0de50c5e7473f37c268c08ebe423283092fea4a35c2240a5e8f1`.
- Vídeo web: `aafc2d08c2f065a185cea5199da054550a70250e8e09f5dbe3538bb34b14c42a`.

**Os assets não possuem autorização confirmada para redistribuição no GitHub
público.** A origem disponível é a entrega local do usuário. Autor, provedor,
URL original, licença e texto de atribuição do vídeo e da imagem não foram
fornecidos nem confirmados. Qualquer distribuição futura exige verificar esses
direitos e registrar a atribuição exigida pelos respectivos titulares.

Somente estas cópias locais são usadas e explicitamente ignoradas pelo Git:

- `public/media/mktauto-robotic-city-original.png`
- `public/media/mktauto-blue-neon-particles-web.mp4`

Não adicionar esses binários ao staging, inclusive com `git add -f`.
Um clone sem eles usa o fallback automaticamente. Para preparar um ambiente
local autorizado, copiar os arquivos correspondentes para esses dois caminhos,
sem sobrescrever os originais em materiais. As URLs respeitam `BASE_URL` do Vite.
O build local do Vite copia `public/` para o `dist/` ignorado; esse build também
contém os assets privados e não deve ser publicado enquanto os direitos de
distribuição estiverem pendentes. Esta entrega não executa publicação.

### Validação local

- Testes focados de mídia, dashboard e navegação: 20 PASS; suíte completa: 49 PASS.
- Build e lint: PASS, sem instalar dependências.
- Navegador: imagem carregada, vídeo 1280×720 em reprodução silenciosa e
  pausa/retomada por teclado. Console sem avisos ou erros com os assets presentes.
- Inspeção em 1440×900, 1280×800, 768×1024 e 390×844: sem overflow horizontal.
- Ausência real das cópias locais: fallback CSS e navegação conferidos no
  navegador; arquivos restaurados e hashes reconferidos após a simulação.
  Os erros de recurso ausente nessa simulação são esperados; não há exceção da aplicação.
- Movimento reduzido inicial/dinâmico, aba oculta, erro de vídeo e autoplay
  rejeitado são cobertos por testes com mocks. Não houve emulação da preferência
  de movimento no navegador utilizado na inspeção.

Diferenças em relação ao mockup: os braços e a cidade são uma imagem estática
960×540, sem movimento de câmera, animação dos braços ou modelagem 3D. O vídeo
adiciona partículas decorativas independentes. Máscaras preservam contraste do
texto; no mobile o cenário fica abaixo dos controles. O resultado não é uma
reprodução pixel-perfect do mockup nem demonstra uma operação real.
