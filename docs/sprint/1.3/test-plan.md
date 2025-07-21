● 🧪 PLANO DE TESTES - OLLAMA API LOCAL

  📋 Test Strategy Overview

  Objetivo: Validar integração completa com Ollama local para homologação da Sprint 1.3Escopo: Testes end-to-end focados na
  API do OllamaDuração Estimada: 30-45 minutos

  🔧 Pré-Requisitos

  # 1. Verificar se Ollama está instalado e rodando
  curl http://127.0.0.1:11434/api/tags

  # 2. Instalar modelo de teste (se ainda não tiver)
  ollama pull llama2:7b  # Modelo recomendado para testes
  # Alternativas menores/mais rápidas:
  ollama pull phi      # 2.7B - muito rápido
  ollama pull mistral  # 7B - boa qualidade

  📝 Test Implementation

  TESTE 1: Verificação de Conectividade

  // Execute no console do navegador em http://127.0.0.1:5500

  async function testeConectividade() {
      console.log("🔍 TESTE 1: Verificando conectividade com Ollama...");

      try {
          const disponivel = await KC.AIAPIManager.checkOllamaAvailability();
          console.log("✅ Ollama disponível:", disponivel);

          // Verificar modelos instalados
          const response = await fetch('http://127.0.0.1:11434/api/tags');
          const data = await response.json();
          console.log("📦 Modelos disponíveis:", data.models?.map(m => m.name) || []);

          return disponivel;
      } catch (error) {
          console.error("❌ Erro de conectividade:", error);
          return false;
      }
  }

  // Executar
  await testeConectividade();

  TESTE 2: Configuração do Provider

  async function testeConfiguracao() {
      console.log("\n🔧 TESTE 2: Configurando Ollama como provider ativo...");

      // Configurar Ollama como provider ativo
      KC.AIAPIManager.setActiveProvider('ollama');

      // Verificar configuração
      const provider = KC.AIAPIManager.activeProvider;
      console.log("✅ Provider ativo:", provider);

      // Verificar configurações do Ollama
      const ollamaConfig = KC.AIAPIManager.providers.ollama;
      console.log("📋 Configuração Ollama:", {
          baseUrl: ollamaConfig.baseUrl,
          modelos: ollamaConfig.models,
          modeloPadrao: ollamaConfig.defaultModel
      });

      return provider === 'ollama';
  }

  // Executar
  await testeConfiguracao();

  TESTE 3: Análise Simples com Template

  async function testeAnaliseSimples() {
      console.log("\n📝 TESTE 3: Testando análise com template padrão...");

      // Criar arquivo de teste
      const arquivoTeste = {
          id: 'teste-001',
          name: 'teste-ollama.md',
          content: `# Decisão Importante sobre Arquitetura

          Hoje tomei a decisão de migrar nossa aplicação para microserviços.
          
          ## Motivação
          - Performance melhorada
          - Escalabilidade independente
          - Deploy mais ágil
          
          ## Próximos Passos
          1. Definir bounded contexts
          2. Escolher tecnologia de mensageria
          3. Implementar primeiro serviço
          
          Esta é uma mudança estratégica fundamental para o futuro do projeto.`,
          preview: 'Decisão de migrar para microserviços...',
          relevanceScore: 0.85
      };

      try {
          // Preparar prompt
          const prompt = KC.PromptManager.prepare(arquivoTeste, 'decisiveMoments');
          console.log("📋 Prompt preparado:", {
              template: 'decisiveMoments',
              tamanhoSystem: prompt.system.length,
              tamanhoUser: prompt.user.length
          });

          // Analisar com Ollama
          console.log("🤖 Enviando para Ollama...");
          const inicio = Date.now();

          const resultado = await KC.AIAPIManager.providers.ollama.analyze(
              prompt.system + "\n\n" + prompt.user,
              {
                  model: 'llama2',
                  temperature: 0.7
              }
          );

          const tempo = Date.now() - inicio;
          console.log(`⏱️ Tempo de resposta: ${tempo}ms`);

          // Normalizar resposta
          const normalizado = KC.AnalysisAdapter.normalize(resultado, 'ollama', 'decisiveMoments');
          console.log("✅ Resposta normalizada:", normalizado);

          return normalizado;
      } catch (error) {
          console.error("❌ Erro na análise:", error);
          return null;
      }
  }

  // Executar
  const resultadoAnalise = await testeAnaliseSimples();

  TESTE 4: Processamento em Lote

  async function testeProcessamentoLote() {
      console.log("\n📊 TESTE 4: Testando processamento em lote...");

      // Criar múltiplos arquivos de teste
      const arquivosTeste = [
          {
              id: 'lote-001',
              name: 'tecnico.md',
              content: 'Implementei nova arquitetura usando padrão Repository com injeção de dependência.',
              preview: 'Nova arquitetura com Repository pattern...'
          },
          {
              id: 'lote-002',
              name: 'insight.md',
              content: 'Descobri que a causa dos delays era o N+1 query problem no ORM.',
              preview: 'Problema de performance identificado...'
          },
          {
              id: 'lote-003',
              name: 'projeto.md',
              content: 'Proposta: criar microserviço de autenticação para unificar login.',
              preview: 'Proposta de microserviço...'
          }
      ];

      try {
          // Adicionar à fila
          KC.AnalysisManager.addToQueue(arquivosTeste, {
              template: 'technicalInsights',
              batchSize: 2
          });

          console.log("📋 Fila de análise:", {
              tamanho: KC.AnalysisManager.queue.length,
              processando: KC.AnalysisManager.isProcessing
          });

          // Processar fila
          console.log("🔄 Iniciando processamento...");
          await KC.AnalysisManager.processQueue();

          // Verificar resultados
          const analisados = arquivosTeste.filter(f =>
              KC.AppState.get('files')?.find(file =>
                  file.id === f.id && file.analyzed
              )
          );

          console.log(`✅ Arquivos analisados: ${analisados.length}/${arquivosTeste.length}`);

          return analisados.length === arquivosTeste.length;
      } catch (error) {
          console.error("❌ Erro no processamento:", error);
          return false;
      }
  }

  // Executar
  await testeProcessamentoLote();

  TESTE 5: Validação de Templates

  async function testeTemplates() {
      console.log("\n🎨 TESTE 5: Validando todos os templates...");

      const templates = KC.PromptManager.getTemplates();
      const resultados = {};

      const arquivoTeste = {
          id: 'template-test',
          name: 'test.md',
          content: 'Conteúdo de teste para validar templates de análise.',
          preview: 'Teste de templates...'
      };

      for (const template of templates) {
          if (template.id === 'customizable') continue; // Pular customizável

          console.log(`\n📝 Testando template: ${template.name}`);

          try {
              const prompt = KC.PromptManager.prepare(arquivoTeste, template.id);
              console.log(`✅ ${template.id}: Prompt gerado com sucesso`);
              resultados[template.id] = true;
          } catch (error) {
              console.error(`❌ ${template.id}: Erro ao gerar prompt`, error);
              resultados[template.id] = false;
          }
      }

      console.log("\n📊 Resumo dos templates:", resultados);
      return Object.values(resultados).every(r => r === true);
  }

  // Executar
  await testeTemplates();

  📊 Coverage Analysis

  Suite de Testes Completa

  // EXECUTAR TODOS OS TESTES EM SEQUÊNCIA
  async function executarSuiteCompleta() {
      console.log("🚀 INICIANDO SUITE COMPLETA DE TESTES OLLAMA\n");
      console.log("="*50);

      const resultados = {
          conectividade: false,
          configuracao: false,
          analiseSimples: false,
          processamentoLote: false,
          templates: false
      };

      // Teste 1
      resultados.conectividade = await testeConectividade();
      if (!resultados.conectividade) {
          console.error("\n❌ FALHA CRÍTICA: Ollama não está acessível!");
          console.log("💡 Solução: Verifique se o Ollama está rodando com 'ollama serve'");
          return resultados;
      }

      // Teste 2
      resultados.configuracao = await testeConfiguracao();

      // Teste 3
      resultados.analiseSimples = !!(await testeAnaliseSimples());

      // Teste 4
      resultados.processamentoLote = await testeProcessamentoLote();

      // Teste 5
      resultados.templates = await testeTemplates();

      // Relatório Final
      console.log("\n" + "="*50);
      console.log("📊 RELATÓRIO FINAL DE TESTES\n");

      const total = Object.keys(resultados).length;
      const sucessos = Object.values(resultados).filter(r => r === true).length;
      const percentual = (sucessos / total * 100).toFixed(0);

      console.log("Resultados por teste:");
      Object.entries(resultados).forEach(([teste, passou]) => {
          console.log(`  ${passou ? '✅' : '❌'} ${teste}`);
      });

      console.log(`\nTOTAL: ${sucessos}/${total} testes passaram (${percentual}%)`);

      if (percentual === '100') {
          console.log("\n🎉 PARABÉNS! Todos os testes passaram!");
          console.log("✅ Sistema APROVADO para homologação");
      } else {
          console.log("\n⚠️ Alguns testes falharam");
          console.log("📋 Verifique os logs acima para detalhes");
      }

      return resultados;
  }

  // EXECUTAR SUITE COMPLETA
  const resultadoFinal = await executarSuiteCompleta();

  🚀 Execution Plan

  Comando Único para Homologação

  // COPIE E COLE ESTE COMANDO NO CONSOLE PARA EXECUTAR TODOS OS TESTES
  (async () => {
      console.clear();
      console.log("🔬 SISTEMA DE HOMOLOGAÇÃO - OLLAMA API");
      console.log("📅 Data:", new Date().toLocaleString());
      console.log("🔗 Endpoint:", "http://127.0.0.1:11434");
      console.log("\n" + "="*50 + "\n");

      // Executar todos os testes
      await executarSuiteCompleta();

      console.log("\n💾 Para salvar este relatório:");
      console.log("1. Clique direito no console");
      console.log("2. Selecione 'Save as...'");
      console.log("3. Salve como 'homologacao-ollama-api.log'");
  })();

  📝 Next Actions

  Se todos os testes passarem ✅:

  1. Salve o log de homologação
  2. Aprove a Sprint 1.3
  3. Configure outros providers (opcional)

  Se algum teste falhar ❌:

  1. Conectividade: Verifique se Ollama está rodando
  2. Análise: Verifique modelo instalado
  3. Timeout: Ajuste configurações de timeout

  Troubleshooting Comum:

  # Problema: Ollama não responde
  ollama serve  # Iniciar servidor

  # Problema: Modelo não encontrado
  ollama list   # Ver modelos instalados
  ollama pull llama2  # Baixar modelo

  # Problema: Porta em uso
  lsof -i :11434  # Ver processo usando a porta

  ---
  Execute o comando único acima para validação completa! 🚀