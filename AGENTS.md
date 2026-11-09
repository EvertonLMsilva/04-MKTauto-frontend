# MKTAuto Frontend — AGENTS

## Escopo

- Trabalhar neste repositório React independente. Ler a task atual e somente os
  arquivos necessários; não auditar o backend ou outros projetos por padrão.
- Preservar arquivos e alterações preexistentes. Não criar worktrees, cópias de
  desenvolvimento ou refatorações laterais sem instrução da task.
- Manter componentes reutilizáveis e features separadas; evitar abstrações sem
  uso real, endpoints inventados e dependências sem necessidade.

## Frontend e backend

- Comunicar-se com o NestJS exclusivamente via APIs HTTP documentadas.
- Não importar código, abrir bancos, executar scripts ou modificar arquivos do
  backend. Não alterar contratos para acomodar a interface.
- Estados, direitos, Finance, permissões, aprovação exata e idempotência
  continuam sob autoridade do backend. O frontend representa esses contratos.
- Centralizar transporte em `src/services/http` e configuração em `src/config`.
  Validar respostas `unknown` no serviço da feature antes de exibi-las.
- Não criar autenticação fictícia nem apresentar fixtures como dados reais.
  Uma API configurada não deve aparecer como online sem uma verificação real.
- Nunca iniciar publicação, API paga ou outro efeito externo sem autorização
  explícita; chamadas pagas também exigem orçamento.

## Interface e segurança

- Usar tokens CSS, HTML semântico, foco visível, navegação por teclado e layouts
  responsivos. Respeitar `prefers-reduced-motion`.
- Implementar estados vazio, carregamento, erro e sucesso quando a feature os
  utilizar. Descrever exemplos de design como exemplos.
- Não copiar imagens, vídeos ou fontes sem verificar licença/autorização.
- `VITE_*` é público: nunca armazenar tokens, segredos, dados privados ou runtime
  no código, ambiente público, Git ou artefatos de teste.
- `.env.local`, dependências, cache e `dist` permanecem ignorados.

## Qualidade

- Executar testes focados primeiro. Testes de componentes usam Vitest/Testing
  Library e mocks; não consultar serviços externos ou o backend real.
- Para cada entrega executável, rodar `npm run test`, `npm run build` e
  `npm run lint`. Diagnosticar falhas antes de corrigir, sem enfraquecer contratos.
- Validar visualmente navegação e responsividade quando houver mudanças de UI.
- Manter o lockfile, versões compatíveis e documentação de configuração.
  Reavaliar overrides ao atualizar o tooling; não ignorar conflitos de peers.

## Git e fechamento

- Um tópico-pai por branch/PR quando seu fechamento for autorizado. Subtarefas
  relacionadas permanecem na mesma entrega funcional.
- No bootstrap, preservar `master` sem renomear. O remoto começou vazio; não
  tentar abrir PR sem uma branch base com commit.
- Commit, staging, push e PR somente com autorização explícita da task.
- Não executar merge automático, amend, rebase, reset, stash ou clean para
  contornar alterações locais. Revisão e decisão de merge pertencem ao usuário.
- Retornar evidências de execução, pendências reais e distinção entre mocks,
  validação local e integração operacional. Não declarar funcionamento LIVE
  com base em testes offline.
