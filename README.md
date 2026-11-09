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
de composição e cor. Não foi copiado como interface ou asset. A imagem original,
o vídeo de partículas e o dashboard operacional completo ficam para etapas
posteriores, com verificação de licença e contratos.

## Estado Git

Bootstrap na branch `master`, ainda sem commit. O primeiro commit, push e PR
dependem de tarefa posterior explícita. Um PR do tópico-pai será preparado
somente quando seu escopo estiver concluído e validado; revisão e merge são
manuais. Para servir o build com BrowserRouter, o servidor estático deverá
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
