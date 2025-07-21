# GEMINI.md - Guia de Colaboração com IA

Olá! Sou Gemini, seu assistente de desenvolvimento de IA. Analisei a documentação e o código-fonte do projeto "Consolidador de Conhecimento Pessoal" e estou pronto para ajudar a acelerar o desenvolvimento.

## Meu Entendimento do Projeto

Compreendi que o objetivo é criar uma ferramenta poderosa para transformar conhecimento pessoal em insights acionáveis, com um fluxo de trabalho claro: **Descoberta (Baseada em arquivos com extensões pré-definidas/Que contenham argumentos ou dados especificos caso necessário) -> Pré-Análise (Estrutura lógica baseada em Funil de Qualificação para Refinamento dos arquivos encontrados que possam ser Categorização, Mapeados com base em palavras chave pré-estabelecidas que suporte a inclusão de novos keywords ajustáveis, durante esta modelagem 'estratégica' de dados baseado no legado histórico de arquivos diversos 'espalhados' por suas pastas e discos com acessos direto 'a principio, locais') -> Análise com IA (a partir do refinamento de dados brutos incluindo `Annotation and Labeling` inicia-se a fase de modelagem 'curadoria de dados' com `humam-in-the-loop`, `HITL` em escala com o auxilio da IA como indexador deste conteudo para a organização aplicando outros conceitos como `Feedback Loop` e `RLHF`, `Reinforcement Learning Human Feedback` convergindo os dados rotulados em projeções consistentes baseadas em dados históricos `factuais` do legado em momentos de `inferencia` estratégica utilizando conceitos `XAI`, `Explainable AI` para extrair deste conteudo insights estratégicos valiosos utilizando novamente `RLHF` e `HITL` para estruturar uma base de conhecimento `verticalizada`, que atenda critérios que permitam realizar próativamente ações como `Monitoring & Auditing` que contibuam para sua autogestão, evitando `bias`, `vieses`, `model drift` e `alucinações` para que entenda e as trate como demandas `componentizadas`, `como sua parte em relação` ao contexto e realidade(no mundo real, verticalizado) em que está inserida para utilizar métodos compativeis com RAG para entender, pesquisar, estudar, compreender e armazenar dados de forma autodidata e incremental que devem ir de encontro com os valores, critérios e objetivos para que servem como base de conhecimento compativel com o mercado em que foi inserida.) -> Organização (Convergir, Segmentar e Estruturar a entrega do conteudo mapeado na base histórica em Chunks de contexto compativel com estrutura de dados compátiveis com bancos de indexação prática e acessiveis para inteligencia artificial que representem o enriquecimento de contexto necessários para se obter os insights condizentes com os objetivos que lhe forem apresentados no futuro pelo usuário, este modelo de acesso a dados deve envolver compatibilidade com soluções de acesso rápido de informações como Redis para que atue como acelerador de cache e para comunicação e acesso direto a dadso em bancos de dados dedicados para este tipo de operação tais como: `qdrant` como principal fonte de acesso, `supabase`, `postgres`, `pinecone`, e demais soluções consideradas `cutting-edge` compátiveis para se obter interoperabilidade com outras plataformas de integração e automação tais como: `n8n`, `flowise`, `langchain`, `string`, `MCP`s e `API`s como `evolution api` e etc..)**. 

A arquitetura é modular, baseada em Vanilla JS, e prioriza a interação com dados reais através da File System Access API.

## Como Posso Ajudar

Com base no estado atual do projeto e nos próximos passos planejados para o Sprint 1.3, aqui estão as áreas em que posso oferecer maior valor:

### 1. Desenvolvimento e Refatoração de Código

*   **Implementar Novos Componentes:** Posso escrever o código para novos componentes, como o `AnalysisManager.js` ou `APIManager.js`, seguindo os padrões de arquitetura já estabelecidos.
*   **Refatorar Código Existente:** Se você precisar melhorar a performance, a clareza ou a estrutura de um componente, posso analisar e propor uma versão refatorada.
*   **Escrever Testes:** Posso criar arquivos de teste (`test-*.html`) para validar a funcionalidade de componentes específicos de forma isolada, garantindo que as novas implementações sejam robustas.
*   **Corrigir Bugs:** Descreva o bug, e eu posso analisar os componentes relevantes, diagnosticar a causa raiz e implementar a correção.

**Exemplo de Prompt:**
> "Gemini, crie o `AnalysisManager.js`. Ele deve ter uma fila de processamento, gerenciar o estado da análise (pendente, processando, concluído) e se comunicar com outros componentes através do `EventBus`."

### 2. Análise e Documentação

*   **Analisar Código:** Peça-me para analisar um arquivo ou componente específico para identificar possíveis problemas, sugerir melhorias ou explicar sua funcionalidade.
*   **Gerar Documentação Técnica:** Posso criar ou atualizar a documentação técnica (como `1.2-components.md`) para refletir as últimas mudanças no código.
*   **Criar Diagramas:** Posso gerar diagramas de fluxo de dados ou arquitetura em formato Mermaid para visualizar e entender melhor as interações entre os componentes.

**Exemplo de Prompt:**
> "Gemini, analise o `FilterManager.js` e crie um diagrama Mermaid que explique seu fluxo de eventos."

### 3. Planejamento e Estratégia

*   **Elaborar Planos de Ação:** Com base em um objetivo (por exemplo, "integrar a API do Claude"), posso criar um plano de ação detalhado, com fases, checkpoints e critérios de sucesso, semelhante ao `1.2-plano-mitigacao.md`.
*   **Sugerir Arquiteturas:** Posso propor a arquitetura para novas funcionalidades, definindo os componentes, seus métodos e como eles se integrarão ao sistema existente.
*   **Consolidar Lições Aprendidas:** Ao final de uma fase ou correção, posso ajudar a criar documentos como o `licoes-aprendidas-master.md` para garantir que o conhecimento seja preservado.

**Exemplo de Prompt:**
> "Gemini, vamos planejar a integração com a API do Claude. Crie um plano de ação detalhado, incluindo os componentes necessários, a estrutura de eventos e os checkpoints de validação."

### 4. Debug e Solução de Problemas

*   **Diagnosticar Problemas:** Se algo não está funcionando como esperado, forneça os sintomas e eu posso sugerir comandos de diagnóstico (`kcdiag()`, `KC.AppState.export()`, etc.) e possíveis causas.
*   **Criar Ferramentas de Debug:** Posso criar páginas de debug (`debug-*.html`) para isolar e testar componentes específicos em tempo real.

**Exemplo de Prompt:**
> "Gemini, o filtro de 'Alta Relevância' não está funcionando. Crie uma página de debug para isolar o `FilterManager` e me ajude a diagnosticar o problema."

## Regras de Colaboração

Para trabalharmos de forma eficiente, vamos seguir as excelentes "Lições Aprendidas" do projeto:

1.  **Um Objetivo por Vez:** Foco em uma tarefa de cada vez para garantir a qualidade.
2.  **Validação Contínua:** Testaremos cada mudança no navegador.
3.  **Dados Reais:** Sempre que possível, usaremos dados reais para os testes.
4.  **Comunicação Clara:** Usaremos os documentos em `/docs/` para registrar nossos planos e resultados.

Estou pronto para começar. Qual é o nosso primeiro objetivo?
