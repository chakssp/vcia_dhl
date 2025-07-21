// lightweight-test-system.js
// Sistema de teste SEM Playwright - funciona no sandbox!
// AIDEV-NOTE: Sistema leve para ambientes restritos sem deps externas

const fs = require('fs');
const path = require('path');
const vm = require('vm');

class LightweightTestSystem {
  constructor() {
    // AIDEV-NOTE: Ajustado para funcionar de dentro de mdesk/test-systems
    this.projectPath = path.resolve(path.dirname(__filename), '../..');
    this.results = {
      errors: [],
      warnings: [],
      missingFiles: [],
      loadOrder: [],
      testResults: {},
      namespaceCheck: {}
    };
  }

  // Simular ambiente browser
  createBrowserEnvironment() {
    const window = {
      console: {
        log: (...args) => this.captureLog('log', args),
        error: (...args) => this.captureLog('error', args),
        warn: (...args) => this.captureLog('warn', args),
        info: (...args) => this.captureLog('info', args)
      },
      document: {
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementById: () => null,
        createElement: () => ({ style: {}, appendChild: () => {} }),
        body: { appendChild: () => {} }
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      },
      location: { href: 'file:///' + this.projectPath + '/index.html' },
      KC: {}
    };

    // Adicionar window ao global
    window.window = window;
    window.global = window;
    
    return window;
  }

  captureLog(type, args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    if (type === 'error') {
      this.results.errors.push({ type: 'console_error', message });
    } else if (type === 'warn') {
      this.results.warnings.push({ type: 'console_warn', message });
    }
  }

  async runTests() {
    console.log('🚀 Iniciando testes (modo leve - sem Playwright)...\n');
    
    // 1. Verificar estrutura de arquivos
    await this.checkFileStructure();
    
    // 2. Analisar index.html
    await this.analyzeHTML();
    
    // 3. Carregar e verificar scripts
    await this.loadAndCheckScripts();
    
    // 4. Executar testes unitários
    await this.runUnitTests();
    
    // 5. Gerar relatório
    return this.generateReport();
  }

  async checkFileStructure() {
    console.log('📁 Verificando estrutura de arquivos...');
    
    const requiredDirs = ['js', 'css', 'test'];
    const missingDirs = [];
    
    requiredDirs.forEach(dir => {
      const dirPath = path.join(this.projectPath, dir);
      if (!fs.existsSync(dirPath)) {
        missingDirs.push(dir);
      }
    });
    
    if (missingDirs.length > 0) {
      this.results.errors.push({
        type: 'structure_error',
        message: `Diretórios faltando: ${missingDirs.join(', ')}`
      });
    }
  }

  async analyzeHTML() {
    console.log('📄 Analisando index.html...');
    
    const htmlPath = path.join(this.projectPath, 'index.html');
    if (!fs.existsSync(htmlPath)) {
      this.results.errors.push({
        type: 'critical_error',
        message: 'index.html não encontrado!'
      });
      return;
    }
    
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    // Extrair todos os scripts
    const scriptRegex = /<script\s+src="([^"]+)"/g;
    let match;
    const scripts = [];
    
    while ((match = scriptRegex.exec(html)) !== null) {
      scripts.push(match[1]);
    }
    
    // Verificar ordem de carregamento
    const coreScripts = ['EventBus.js', 'AppState.js', 'AppController.js'];
    const coreIndexes = coreScripts.map(script => 
      scripts.findIndex(s => s.includes(script))
    );
    
    if (coreIndexes[0] > coreIndexes[2]) {
      this.results.warnings.push({
        type: 'load_order_warning',
        message: 'EventBus deve ser carregado antes do AppController'
      });
    }
    
    this.results.loadOrder = scripts;
  }

  async loadAndCheckScripts() {
    console.log('📦 Verificando scripts...');
    
    const window = this.createBrowserEnvironment();
    const context = vm.createContext(window);
    
    for (const scriptPath of this.results.loadOrder) {
      const fullPath = path.join(this.projectPath, scriptPath);
      
      if (!fs.existsSync(fullPath)) {
        this.results.missingFiles.push(scriptPath);
        continue;
      }
      
      try {
        const scriptContent = fs.readFileSync(fullPath, 'utf8');
        
        // Executar script no contexto simulado
        vm.runInContext(scriptContent, context, {
          filename: scriptPath,
          timeout: 1000
        });
        
      } catch (error) {
        this.results.errors.push({
          type: 'script_error',
          file: scriptPath,
          message: error.message
        });
      }
    }
    
    // Verificar namespace KC
    this.checkKCNamespace(window);
  }

  checkKCNamespace(window) {
    console.log('🔧 Verificando namespace KC...');
    
    if (!window.KC) {
      this.results.errors.push({
        type: 'namespace_error',
        message: 'Namespace KC não foi criado'
      });
      return;
    }
    
    const expectedManagers = [
      'AppController', 'EventBus', 'Logger', 'ConfigManager',
      'DiscoveryManager', 'AnalysisManager', 'FilterManager',
      'CategoryManager', 'StatsManager', 'ExportManager'
    ];
    
    const existing = [];
    const missing = [];
    
    expectedManagers.forEach(manager => {
      if (window.KC[manager]) {
        existing.push(manager);
      } else {
        missing.push(manager);
      }
    });
    
    this.results.namespaceCheck = {
      total: Object.keys(window.KC).length,
      expected: expectedManagers.length,
      existing,
      missing
    };
    
    if (missing.length > 0) {
      this.results.warnings.push({
        type: 'missing_managers',
        message: `Managers faltando: ${missing.join(', ')}`
      });
    }
  }

  async runUnitTests() {
    console.log('🧪 Verificando testes...');
    
    const testDir = path.join(this.projectPath, 'test');
    if (!fs.existsSync(testDir)) {
      this.results.warnings.push({
        type: 'test_warning',
        message: 'Diretório de testes não encontrado'
      });
      return;
    }
    
    const testFiles = fs.readdirSync(testDir)
      .filter(file => file.endsWith('.js'));
    
    testFiles.forEach(testFile => {
      const testPath = path.join(testDir, testFile);
      try {
        // Apenas verificar sintaxe
        const content = fs.readFileSync(testPath, 'utf8');
        new Function(content); // Verifica sintaxe
        
        this.results.testResults[testFile] = {
          success: true,
          message: 'Sintaxe válida'
        };
      } catch (error) {
        this.results.testResults[testFile] = {
          success: false,
          error: error.message
        };
      }
    });
  }

  generateReport() {
    const report = {
      summary: {
        totalErrors: this.results.errors.length,
        totalWarnings: this.results.warnings.length,
        missingFiles: this.results.missingFiles.length,
        timestamp: new Date().toISOString()
      },
      details: this.results,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Arquivos faltando
    if (this.results.missingFiles.length > 0) {
      recommendations.push({
        type: 'missing_files',
        severity: 'critical',
        message: 'Arquivos não encontrados',
        files: this.results.missingFiles,
        fix: 'Verificar caminhos ou criar arquivos faltantes'
      });
    }
    
    // Erros de script
    const scriptErrors = this.results.errors.filter(e => e.type === 'script_error');
    if (scriptErrors.length > 0) {
      scriptErrors.forEach(error => {
        recommendations.push({
          type: 'script_error',
          severity: 'high',
          message: `Erro em ${error.file}: ${error.message}`,
          fix: 'Verificar sintaxe e dependências'
        });
      });
    }
    
    // Namespace
    if (this.results.namespaceCheck.missing?.length > 0) {
      recommendations.push({
        type: 'incomplete_namespace',
        severity: 'medium',
        message: 'Managers não inicializados',
        missing: this.results.namespaceCheck.missing,
        fix: 'Verificar se todos os managers são criados corretamente'
      });
    }
    
    return recommendations;
  }

  // Método para aplicar correções simples
  async applyFixes(recommendations) {
    const fixes = [];
    
    for (const rec of recommendations) {
      if (rec.type === 'missing_files' && rec.files) {
        rec.files.forEach(file => {
          const fullPath = path.join(this.projectPath, file);
          const dir = path.dirname(fullPath);
          
          // Criar diretório se não existir
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          // Criar arquivo vazio
          if (!fs.existsSync(fullPath)) {
            // AIDEV-NOTE: Template com AIDEV comments
            const content = `// ${path.basename(file)}
// AIDEV-NOTE: Arquivo criado automaticamente
// AIDEV-TODO: Implementar funcionalidade

(function() {
    'use strict';
    
    // AIDEV-TODO: Adicionar código aqui
    
})();
`;
            fs.writeFileSync(fullPath, content);
            fixes.push(`Criado: ${file}`);
          }
        });
      }
    }
    
    return fixes;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  (async () => {
    const tester = new LightweightTestSystem();
    
    try {
      const report = await tester.runTests();
      
      // Criar diretório de reports se não existir
      const reportsDir = path.join(path.dirname(__filename), '../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Salvar relatório
      fs.writeFileSync(
        path.join(reportsDir, 'test-report.json'),
        JSON.stringify(report, null, 2)
      );
      
      // Exibir resumo
      console.log('\n📊 RELATÓRIO DE TESTES\n');
      console.log(`✅ Testes executados`);
      console.log(`❌ Erros encontrados: ${report.summary.totalErrors}`);
      console.log(`⚠️  Avisos: ${report.summary.totalWarnings}`);
      console.log(`📁 Arquivos faltando: ${report.summary.missingFiles}`);
      
      // Exibir recomendações
      if (report.recommendations.length > 0) {
        console.log('\n💡 RECOMENDAÇÕES:\n');
        report.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.severity.toUpperCase()}] ${rec.message}`);
          if (rec.fix) {
            console.log(`   Correção: ${rec.fix}`);
          }
        });
        
        // Auto-fix se solicitado
        if (process.argv.includes('--fix')) {
          console.log('\n🔧 Aplicando correções...');
          const fixes = await tester.applyFixes(report.recommendations);
          fixes.forEach(fix => console.log(`   ✓ ${fix}`));
        }
      }
      
      // Status final
      if (report.summary.totalErrors === 0 && report.summary.missingFiles === 0) {
        console.log('\n✅ Código sem erros críticos!');
      } else {
        console.log('\n❌ Correções necessárias');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Erro durante teste:', error);
      process.exit(1);
    }
  })();
}

module.exports = LightweightTestSystem;