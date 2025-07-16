PRD Completo: Knowledge Consolidator - Da Fundação à Inteligência
Versão: 1.3 (Visualmente Contextualizada e Expandida)
Data: 13 de Julho de 2025
Autor: Cliente Zero & Gemini AI

1. Visão Geral do Produto

O Problema: Empresas perdem tempo e dinheiro valiosos devido ao conhecimento crítico estar disperso em arquivos, e-mails e sistemas legados. Essa desorganização, ou "entropia de dados", leva à ineficiência operacional, perda de memória corporativa quando colaboradores saem, e dificuldade crônica na tomada de decisões estratégicas. O processo de onboarding de novos clientes ou projetos, que deveria ser um momento de aceleração, torna-se um exercício frustrante de arqueologia digital.

A Solução: O Knowledge Consolidator é uma plataforma que centraliza e organiza este conhecimento. Através de um processo de curadoria assistida por uma interface intuitiva (a Fundação), a plataforma capacita especialistas de negócio a criar um ativo de conhecimento confiável e de alta fidelidade. Esta fundação, uma vez estabelecida, alimenta uma camada de IA conversacional (a Aliança Estratégica), que utiliza métodos avançados como RAG (Retrieval-Augmented Generation) para transformar o legado de dados em insights precisos e contextuais, acessíveis através de linguagem natural.

O Valor: A jornada do cliente é uma transição de um estado de sobrecarga e ineficiência para um de empoderamento e clareza. A solução permite acesso instantâneo a insights precisos, que antes levariam horas ou dias para serem encontrados. Isso se traduz em KPIs de negócio mensuráveis: redução no tempo de onboarding, aceleração na criação de propostas comerciais, e uma melhoria qualitativa nas decisões estratégicas. O resultado final é uma base de conhecimento verticalizada, autodidata e dinamicamente alinhada aos objetivos do negócio.

2. Fases de Desenvolvimento

O projeto será executado em três fases principais, construindo valor incrementalmente. Esta abordagem ágil garante que cada fase entregue um benefício tangível e um retorno sobre o investimento, validando a direção do projeto e construindo confiança com o cliente. Cada fase implementa um pilar da visão original, transformando os conceitos de Descoberta, Pré-Análise, Análise com IA e Organização em uma realidade funcional e coesa.

FASE 1: A FUNDAÇÃO DE CONHECIMENTO (MVP Atual)
Status: Em grande parte concluído.

Objetivo: Implementar as etapas de Descoberta e Pré-Análise da visão original. O foco estratégico desta fase é a criação de um ativo de dados. Permitimos que um especialista humano ("curador") transforme um conjunto caótico de arquivos em uma base de dados limpa, validada e enriquecida, pronta para a IA. Esta fase é a mais crítica, pois a qualidade de toda a solução de IA depende diretamente da qualidade do trabalho realizado aqui.

Esta fase combate diretamente os problemas de silos de conhecimento e a ineficiência no onboarding, sendo a primeira e mais importante entrega de valor tangível.

Módulos Principais:

1.1 Descoberta Automática: Materializa a etapa de Descoberta. A interface permite ao usuário configurar as "Configurações de Performance", aplicando filtros granulares como Níveis de Subpastas, Período de Busca, Tamanho Mínimo do Arquivo e Padrões de Arquivo. O usuário define os Diretórios de Busca, com um recurso de destaque para "Detecção Automática do Obsidian", que visa um nicho de usuários avançados que já possuem bases de conhecimento bem estruturadas. Ao iniciar a descoberta, um painel de resultados exibe em tempo real as estatísticas do processo (Arquivos Válidos vs. Ignorados, Tempo decorrido), focando o esforço humano apenas no que tem potencial de ser um ativo de conhecimento e proporcionando uma experiência de usuário transparente.

1.2 Pré-Análise Local (Bancada de Curadoria): Concretiza a etapa de Pré-Análise, funcionando como o "Funil de Qualificação". A interface apresenta uma lista de "Arquivos Descobertos" que pode ser refinada através de "Filtros Inteligentes" (Relevância, Status, Tipo, etc.). O usuário pode então realizar "Ações em Lote" (Aprovar Todos, Arquivar Todos) ou revisar cada arquivo individualmente, abrindo um preview do conteúdo e utilizando um modal de Categorização para aplicar etiquetas pré-definidas ou criar novas. Este processo de Annotation and Labeling, guiado por um Human-in-the-Loop (HITL), é o que codifica a expertise e a intuição de negócio — algo impossível para uma IA replicar do zero — criando o alicerce semântico para a IA.

Entregável da Fase: Uma lista de arquivos "Aprovados" com metadados associados (categorias, etc.), pronta para o processamento. Este entregável é a base de dados brutos refinada, que pode ser exportada como um "manifesto" JSON. Este formato garante a integridade e portabilidade dos dados, servindo como a fonte única e imutável de verdade para a próxima fase e garantindo a rastreabilidade completa do processo de curadoria.

FASE 2: ATIVAÇÃO DA BASE DE CONHECIMENTO (Próximos Passos)
Status: A ser desenvolvido.

Objetivo: Implementar a etapa de Organização da visão original. O foco é processar os dados curados, transformando-os de uma lista de arquivos em um ativo de conhecimento dinâmico, indexado e explorável dentro da infraestrutura de dados cutting-edge da solução. Esta fase é a ponte entre os dados organizados e a inteligência acionável.

Módulos Principais:

2.1 Dashboard de Insights (Valor Imediato): Uma primeira camada de visualização que oferece uma visão macro do conhecimento curado. Este dashboard responde a perguntas de negócio de alto nível sem a necessidade de IA (ex: "Qual a proporção de documentos estratégicos versus técnicos?", "Quais foram nossos meses mais produtivos em termos de criação de propostas?"). Ele serve para provar o valor imediato da curadoria para stakeholders não-técnicos e para gerar um entendimento inicial sobre a composição do conhecimento da empresa.

2.2 Pipeline de Processamento e Carga (O "Onboarding Técnico"): Este é o coração da Organização. O processo de backend é responsável por:

Segmentar e Estruturar: Quebrar o conteúdo dos arquivos aprovados em Chunks de contexto otimizados. A estratégia de chunking com sobreposição (overlap) é crucial para garantir que o contexto semântico não seja perdido nas fronteiras dos segmentos de texto.

Vetorizar: Converter cada chunk em um vetor numérico (embedding), que captura seu significado semântico.

Convergir: Inserir (fazer o "upsert") dos vetores e metadados em bancos de dados de indexação prática. A arquitetura aqui é sinérgica: o Qdrant armazena os vetores para busca semântica rápida, o Postgres armazena os metadados estruturados para filtragem precisa (ex: buscar apenas em documentos da categoria 'Contrato'), e o Redis atua como um acelerador de cache para perguntas frequentes ou resultados populares.

Nota Técnica: Este módulo prepara a infraestrutura para ser acessada por plataformas de automação como n8n e LangChain, conforme previsto na ideação, permitindo a criação de fluxos de trabalho complexos que utilizam a base de conhecimento como uma fonte de dados.

FASE 3: INTELIGÊNCIA CONVERSACIONAL (O Grand Finale)
Status: A ser desenvolvido.

Objetivo: Implementar a etapa de Análise com IA, habilitando a interação em linguagem natural para extrair insights estratégicos e valiosos da base de conhecimento já organizada. Esta é a fase em que a plataforma evolui de um sistema reativo de organização para um parceiro de conhecimento proativo.

Módulos Principais:

3.1 Análise IA Seletiva (Interface de Chat RAG): A interface onde o usuário interage com a IA. O design deve focar na simplicidade e na confiança.

Funcionalidades:

Confiança e Explicabilidade (XAI): A exibição das fontes utilizadas para cada resposta é uma implementação prática do conceito de Explainable AI. Permitir que o usuário clique em uma fonte e veja o chunk de texto exato que fundamentou a resposta é essencial para construir confiança, especialmente em decisões de negócio de alto risco.

Prevenção de Alucinações: Ao basear-se estritamente no contexto recuperado da base de conhecimento curada (RAG), o sistema minimiza drasticamente o risco de alucinações, bias e model drift, pois a IA é forçada a operar dentro dos limites do conhecimento validado pela empresa.

3.2 Orquestrador de RAG (Lógica do Backend): O cérebro que implementa o fluxo de RAG. Ele realiza a inferência estratégica ao não apenas encontrar fatos, mas ao ser capaz de sintetizar informações de múltiplos documentos para responder a perguntas complexas (ex: "Com base em nossos contratos ganhos e feedbacks de clientes, quais são os três principais pontos de valor que devemos destacar em nossas próximas propostas?").

Nota Estratégica: Conceitos mais avançados como RLHF (Reinforcement Learning from Human Feedback) e Monitoring & Auditing para autogestão do modelo são evoluções futuras que podem ser construídas sobre esta base sólida. Uma vez que o ciclo de feedback (Feedback Loop) esteja estabelecido através de botões de "polegar para cima/baixo" nas respostas, esses dados podem ser usados para refinar continuamente a relevância das buscas e a qualidade das respostas, criando um sistema que melhora com o uso.

MÓDULO DE SUPORTE: PAINEL DE CONTROLE DE MODELOS
Status: A ser desenvolvido. Pré-requisito para as Fases 2.2 e 3.

Objetivo: Criar uma interface de administração para gerenciar de forma flexível quais modelos de IA são utilizados, garantindo a interoperabilidade com múltiplos contextos de modelos (Gemini, OpenAI, Anthropic, Ollama) e, assim, "à prova de futuro" a plataforma.

Funcionalidades:

Formulário para adicionar/editar configurações de modelos, incluindo: Provedor, Endpoint (para Ollama), Chave de API, Nome do Modelo de Embedding e Nome do Modelo de Geração.

Mecanismo no backend (Padrão Adapter) para carregar e utilizar a configuração selecionada. Este padrão de design é uma decisão arquitetural estratégica, pois cria uma interface unificada (ex: llm.generate()) que permite ao resto do código interagir com qualquer modelo de IA da mesma forma. Isso permite ao cliente final (ou a você) otimizar custos (usando um modelo mais barato para tarefas simples) ou performance (usando um modelo de ponta para análises complexas) sem a necessidade de reescrever a aplicação, evitando o "vendor lock-in".