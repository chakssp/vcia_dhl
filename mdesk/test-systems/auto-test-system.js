const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class VCIAAutoTestSystem {
  constructor() {
    this.indexPath = path.join(__dirname, 'index.html');
    this.browser = null;
    this.page = null;
    this.results = {
      errors: [],
      warnings: [],
      logs: [],
      networkErrors: [],
      missingFiles: [],
      loadOrder: [],
      testResults: {}
    };
  }

  async initialize() {
    console.log('🚀 Inicializando sistema de auto-teste VCIA_DHL...');
    
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Configurar interceptadores
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Capturar console
    this.page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      
      if (msg.type() === 'error') {
        this.results.errors.push(logEntry);
      } else if (msg.type() === 'warning') {
        this.results.warnings.push(logEntry);
      } else {
        this.results.logs.push(logEntry);
      }
    });

    // Capturar erros de página
    this.page.on('pageerror', error => {
      this.results.errors.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Capturar requisições de rede
    this.page.on('requestfailed', request => {
      this.results.networkErrors.push({
        url: request.url(),
        failure: request.failure(),
        timestamp: new Date().toISOString()
      });
    });

    // Rastrear ordem de carregamento
    this.page.on('response', response => {
      if (response.url().endsWith('.js')) {
        this.results.loadOrder.push({
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async runFullTest() {
    console.log('🔍 Executando teste completo...\n');
    
    // 1. Carregar página
    await this.loadPage();
    
    // 2. Verificar carregamento de scripts
    await this.checkScriptsLoading();
    
    // 3. Verificar namespace KC
    await this.checkKCNamespace();
    
    // 4. Executar testes unitários
    await this.runUnitTests();
    
    // 5. Testar fluxo principal
    await this.testMainWorkflow();
    
    // 6. Gerar relatório
    return this.generateReport();
  }

  async loadPage() {
    console.log('📄 Carregando index.html...');
    
    try {
      const response = await this.page.goto(`file://${this.indexPath}`, {
        waitUntil: 'networkidle'
      });
      
      if (!response.ok()) {
        this.results.errors.push({
          type: 'load_error',
          text: `Falha ao carregar página: ${response.status()}`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Aguardar inicialização
      await this.page.waitForTimeout(2000);
      
    } catch (error) {
      this.results.errors.push({
        type: 'load_exception',
        text: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async checkScriptsLoading() {
    console.log('📦 Verificando carregamento de scripts...');
    
    const scriptStatuses = await this.page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts.map(script => ({
        src: script.src,
        loaded: script.loaded !== false,
        async: script.async,
        defer: script.defer
      }));
    });

    // Verificar scripts faltantes
    scriptStatuses.forEach(script => {
      if (!script.loaded) {
        this.results.missingFiles.push(script.src);
      }
    });
  }

  async checkKCNamespace() {
    console.log('🔧 Verificando namespace KC...');
    
    const kcStatus = await this.page.evaluate(() => {
      if (typeof window.KC === 'undefined') {
        return { exists: false };
      }
      
      const managers = [];
      const missing = [];
      
      // Lista esperada de managers
      const expectedManagers = [
        'AppController', 'EventBus', 'Logger', 'ConfigManager',
        'DiscoveryManager', 'AnalysisManager', 'FilterManager',
        'CategoryManager', 'StatsManager', 'ExportManager'
      ];
      
      expectedManagers.forEach(manager => {
        if (window.KC[manager]) {
          managers.push(manager);
        } else {
          missing.push(manager);
        }
      });
      
      return {
        exists: true,
        managers,
        missing,
        total: Object.keys(window.KC).length
      };
    });

    if (!kcStatus.exists) {
      this.results.errors.push({
        type: 'namespace_error',
        text: 'Namespace KC não foi criado',
        timestamp: new Date().toISOString()
      });
    } else if (kcStatus.missing.length > 0) {
      this.results.warnings.push({
        type: 'missing_managers',
        text: `Managers faltando: ${kcStatus.missing.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async runUnitTests() {
    console.log('🧪 Executando testes unitários...');
    
    const testFiles = [
      'test-triple-extraction.js',
      'test-triple-store-service.js',
      'test-manual-triple-extraction.js',
      'teste-simples-triplas.js',
      'teste-final-2litros.js'
    ];

    for (const testFile of testFiles) {
      try {
        const testResult = await this.page.evaluate(async (file) => {
          // Tentar executar função de teste se existir
          const testFunctionName = file.replace('.js', '').replace(/-/g, '_');
          
          if (typeof window[testFunctionName] === 'function') {
            try {
              const result = await window[testFunctionName]();
              return { success: true, file, result };
            } catch (error) {
              return { success: false, file, error: error.message };
            }
          }
          
          // Verificar se há função runTest global
          if (typeof window.runTest === 'function') {
            try {
              const result = await window.runTest(file);
              return { success: true, file, result };
            } catch (error) {
              return { success: false, file, error: error.message };
            }
          }
          
          return { success: false, file, error: 'Função de teste não encontrada' };
        }, testFile);
        
        this.results.testResults[testFile] = testResult;
        
      } catch (error) {
        this.results.testResults[testFile] = {
          success: false,
          file: testFile,
          error: error.message
        };
      }
    }
  }

  async testMainWorkflow() {
    console.log('🔄 Testando fluxo principal...');
    
    try {
      // Testar inicialização do app
      const appInitialized = await this.page.evaluate(() => {
        return window.KC && window.KC.AppController && 
               typeof window.KC.AppController.initialize === 'function';
      });
      
      if (!appInitialized) {
        this.results.errors.push({
          type: 'workflow_error',
          text: 'AppController não está inicializado corretamente',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Simular clique no primeiro workflow
      await this.page.click('.workflow-card:first-child', { timeout: 5000 }).catch(() => {
        this.results.warnings.push({
          type: 'ui_warning',
          text: 'Não foi possível clicar no card de workflow',
          timestamp: new Date().toISOString()
        });
      });
      
      // Verificar se painel foi carregado
      const panelLoaded = await this.page.evaluate(() => {
        const panel = document.querySelector('#panel-container');
        return panel && panel.children.length > 0;
      });
      
      if (!panelLoaded) {
        this.results.warnings.push({
          type: 'ui_warning',
          text: 'Painel de configuração não foi carregado',
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      this.results.errors.push({
        type: 'workflow_exception',
        text: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  generateReport() {
    const report = {
      summary: {
        totalErrors: this.results.errors.length,
        totalWarnings: this.results.warnings.length,
        missingFiles: this.results.missingFiles.length,
        failedTests: Object.values(this.results.testResults).filter(t => !t.success).length,
        timestamp: new Date().toISOString()
      },
      details: this.results,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analisar erros comuns
    this.results.errors.forEach(error => {
      if (error.text.includes('is not defined')) {
        const variable = error.text.match(/(\w+) is not defined/)?.[1];
        recommendations.push({
          type: 'undefined_variable',
          message: `Variável '${variable}' não definida. Verificar ordem de carregamento ou declaração.`,
          severity: 'high'
        });
      }
      
      if (error.text.includes('Cannot read')) {
        recommendations.push({
          type: 'null_reference',
          message: 'Tentativa de acessar propriedade de objeto null/undefined. Adicionar verificações de null.',
          severity: 'high'
        });
      }
    });
    
    // Verificar arquivos faltantes
    if (this.results.missingFiles.length > 0) {
      recommendations.push({
        type: 'missing_files',
        message: `${this.results.missingFiles.length} arquivos não foram carregados. Verificar caminhos.`,
        files: this.results.missingFiles,
        severity: 'critical'
      });
    }
    
    // Verificar ordem de dependências
    const loadOrder = this.results.loadOrder.map(l => l.url);
    if (loadOrder.indexOf('EventBus.js') > loadOrder.indexOf('AppController.js')) {
      recommendations.push({
        type: 'load_order',
        message: 'EventBus deve ser carregado antes do AppController',
        severity: 'medium'
      });
    }
    
    return recommendations;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async autoFix(recommendations) {
    console.log('\n🔧 Aplicando correções automáticas...\n');
    
    const fixes = [];
    
    for (const rec of recommendations) {
      switch (rec.type) {
        case 'undefined_variable':
          // Sugerir onde adicionar declaração
          fixes.push({
            type: 'add_declaration',
            file: 'js/app.js',
            content: `window.${rec.message.match(/'(\w+)'/)?.[1]} = window.${rec.message.match(/'(\w+)'/)?.[1]} || {};`,
            position: 'top'
          });
          break;
          
        case 'load_order':
          // Sugerir reordenação no HTML
          fixes.push({
            type: 'reorder_scripts',
            message: rec.message,
            action: 'manual'
          });
          break;
          
        case 'missing_files':
          // Verificar se arquivos existem
          for (const file of rec.files) {
            const localPath = file.replace('file:///', '');
            if (!fs.existsSync(localPath)) {
              fixes.push({
                type: 'create_file',
                path: localPath,
                content: '// Arquivo criado automaticamente\n'
              });
            }
          }
          break;
      }
    }
    
    return fixes;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  (async () => {
    const tester = new VCIAAutoTestSystem();
    
    try {
      await tester.initialize();
      const report = await tester.runFullTest();
      
      // Salvar relatório
      fs.writeFileSync(
        path.join(__dirname, 'test-report.json'),
        JSON.stringify(report, null, 2)
      );
      
      // Exibir resumo
      console.log('\n📊 RELATÓRIO DE TESTES\n');
      console.log(`✅ Testes executados`);
      console.log(`❌ Erros encontrados: ${report.summary.totalErrors}`);
      console.log(`⚠️  Avisos: ${report.summary.totalWarnings}`);
      console.log(`📁 Arquivos faltando: ${report.summary.missingFiles}`);
      console.log(`🧪 Testes falhados: ${report.summary.failedTests}`);
      
      // Exibir recomendações
      if (report.recommendations.length > 0) {
        console.log('\n💡 RECOMENDAÇÕES:\n');
        report.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.severity.toUpperCase()}] ${rec.message}`);
        });
        
        // Aplicar correções automáticas
        if (process.argv.includes('--autofix')) {
          const fixes = await tester.autoFix(report.recommendations);
          console.log(`\n🔧 ${fixes.length} correções sugeridas`);
          
          // Salvar arquivo de correções
          fs.writeFileSync(
            path.join(__dirname, 'suggested-fixes.json'),
            JSON.stringify(fixes, null, 2)
          );
        }
      }
      
    } catch (error) {
      console.error('❌ Erro durante teste:', error);
    } finally {
      await tester.cleanup();
    }
  })();
}

module.exports = VCIAAutoTestSystem;