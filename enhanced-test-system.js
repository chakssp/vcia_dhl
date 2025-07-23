// enhanced-test-system.js
// Sistema de teste com validação de Anchor Comments

const fs = require('fs');
const path = require('path');
const vm = require('vm');

class EnhancedTestSystem {
  constructor() {
    this.projectPath = path.dirname(__filename);
    this.results = {
      errors: [],
      warnings: [],
      missingFiles: [],
      loadOrder: [],
      testResults: {},
      namespaceCheck: {},
      anchorComments: {
        valid: [],
        invalid: [],
        todos: [],
        questions: [],
        stats: {}
      }
    };
  }

  async runTests() {
    console.log('🚀 Iniciando testes com validação de Anchor Comments...\n');
    
    // 1. Verificar estrutura de arquivos
    await this.checkFileStructure();
    
    // 2. Validar Anchor Comments
    await this.validateAnchorComments();
    
    // 3. Analisar index.html
    await this.analyzeHTML();
    
    // 4. Carregar e verificar scripts
    await this.loadAndCheckScripts();
    
    // 5. Executar testes unitários
    await this.runUnitTests();
    
    // 6. Gerar relatório
    return this.generateReport();
  }

  async validateAnchorComments() {
    console.log('🏷️ Validando Anchor Comments...');
    
    const jsFiles = this.getAllJSFiles();
    let totalNotes = 0;
    let totalTodos = 0;
    let totalQuestions = 0;
    
    for (const file of jsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Detectar AIDEV comments
          const aidevMatch = line.match(/(AIDEV-NOTE|AIDEV-TODO|AIDEV-QUESTION):\s*(.+)/);
          
          if (aidevMatch) {
            const [, type, comment] = aidevMatch;
            const lineNumber = index + 1;
            
            // Validar comprimento (120 chars)
            if (comment.length > 120) {
              this.results.anchorComments.invalid.push({
                file: path.relative(this.projectPath, file),
                line: lineNumber,
                type,
                comment,
                issue: `Excede 120 caracteres (atual: ${comment.length})`
              });
            } else {
              this.results.anchorComments.valid.push({
                file: path.relative(this.projectPath, file),
                line: lineNumber,
                type,
                comment
              });
            }
            
            // Categorizar por tipo
            switch (type) {
              case 'AIDEV-NOTE':
                totalNotes++;
                break;
              case 'AIDEV-TODO':
                totalTodos++;
                this.results.anchorComments.todos.push({
                  file: path.relative(this.projectPath, file),
                  line: lineNumber,
                  comment
                });
                break;
              case 'AIDEV-QUESTION':
                totalQuestions++;
                this.results.anchorComments.questions.push({
                  file: path.relative(this.projectPath, file),
                  line: lineNumber,
                  comment
                });
                break;
            }
          }
          
          // Detectar TODOs genéricos sem AIDEV
          if (line.includes('TODO:') && !line.includes('AIDEV-TODO:')) {
            this.results.warnings.push({
              type: 'generic_todo',
              message: `TODO genérico encontrado em ${path.relative(this.projectPath, file)}:${lineNumber}`,
              suggestion: 'Use AIDEV-TODO: para TODOs direcionados a AI'
            });
          }
        });
      } catch (error) {
        this.results.errors.push({
          type: 'file_read_error',
          file: path.relative(this.projectPath, file),
          message: error.message
        });
      }
    }
    
    this.results.anchorComments.stats = {
      totalNotes,
      totalTodos,
      totalQuestions,
      totalInvalid: this.results.anchorComments.invalid.length
    };
    
    // Adicionar avisos se houver muitos TODOs
    if (totalTodos > 10) {
      this.results.warnings.push({
        type: 'excessive_todos',
        message: `${totalTodos} AIDEV-TODOs encontrados. Considere priorizar e resolver.`
      });
    }
  }

  getAllJSFiles() {
    const files = [];
    const dirs = ['js', 'test'];
    
    dirs.forEach(dir => {
      const dirPath = path.join(this.projectPath, dir);
      if (fs.existsSync(dirPath)) {
        this.walkDir(dirPath, files);
      }
    });
    
    return files;
  }

  walkDir(dir, files) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.walkDir(fullPath, files);
      } else if (item.endsWith('.js')) {
        files.push(fullPath);
      }
    });
  }

  async checkFileStructure() {
    console.log('📁 Verificando estrutura de arquivos...');
    
    // AIDEV-NOTE: Estrutura esperada do projeto VCIA_DHL
    const requiredDirs = ['js', 'css', 'test'];
    const requiredSubDirs = {
      'js': ['core', 'config', 'utils', 'managers', 'components', 'services', 'schemas', 'extractors'],
      'css': ['utils', 'components']
    };
    
    const missingDirs = [];
    
    // Verificar diretórios principais
    requiredDirs.forEach(dir => {
      const dirPath = path.join(this.projectPath, dir);
      if (!fs.existsSync(dirPath)) {
        missingDirs.push(dir);
      } else {
        // Verificar subdiretórios
        if (requiredSubDirs[dir]) {
          requiredSubDirs[dir].forEach(subDir => {
            const subDirPath = path.join(dirPath, subDir);
            if (!fs.existsSync(subDirPath)) {
              missingDirs.push(`${dir}/${subDir}`);
            }
          });
        }
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
    
    // AIDEV-NOTE: Ordem crítica de carregamento para namespace KC
    const criticalOrder = [
      'EventBus.js',
      'AppState.js', 
      'AppController.js'
    ];
    
    // Verificar ordem de carregamento
    const coreIndexes = criticalOrder.map(script => 
      scripts.findIndex(s => s.includes(script))
    );
    
    // Validar ordem
    for (let i = 0; i < coreIndexes.length - 1; i++) {
      if (coreIndexes[i] > coreIndexes[i + 1] && coreIndexes[i] !== -1 && coreIndexes[i + 1] !== -1) {
        this.results.errors.push({
          type: 'load_order_error',
          message: `${criticalOrder[i]} deve ser carregado antes de ${criticalOrder[i + 1]}`,
          severity: 'critical'
        });
      }
    }
    
    this.results.loadOrder = scripts;
    
    // AIDEV-TODO: Verificar integridade de links CSS também
  }

  async loadAndCheckScripts() {
    console.log('📦 Verificando scripts...');
    
    const window = this.createBrowserEnvironment();
    const context = vm.createContext(window);
    
    for (const scriptPath of this.results.loadOrder) {
      const fullPath = path.join(this.projectPath, scriptPath);
      
      if (!fs.existsSync(fullPath)) {
        this.results.missingFiles.push(scriptPath);
        // AIDEV-QUESTION: Deve criar arquivo vazio ou lançar erro crítico?
        continue;
      }
      
      try {
        const scriptContent = fs.readFileSync(fullPath, 'utf8');
        
        // Verificar se tem AIDEV comments
        if (!scriptContent.includes('AIDEV-')) {
          this.results.warnings.push({
            type: 'missing_aidev_comments',
            file: scriptPath,
            message: 'Arquivo sem AIDEV comments para orientação'
          });
        }
        
        // Executar script no contexto simulado
        vm.runInContext(scriptContent, context, {
          filename: scriptPath,
          timeout: 1000
        });
        
      } catch (error) {
        this.results.errors.push({
          type: 'script_error',
          file: scriptPath,
          message: error.message,
          line: this.extractLineNumber(error)
        });
      }
    }
    
    // Verificar namespace KC
    this.checkKCNamespace(window);
  }

  extractLineNumber(error) {
    const stackLines = error.stack.split('\n');
    const relevantLine = stackLines.find(line => line.includes('.js:'));
    if (relevantLine) {
      const match = relevantLine.match(/:(\d+):\d+/);
      return match ? parseInt(match[1]) : null;
    }
    return null;
  }

  createBrowserEnvironment() {
    // AIDEV-NOTE: Simulação de ambiente browser para testes sem Playwright
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

    window.window = window;
    window.global = window;
    
    return window;
  }

  captureLog(type, args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    if (type === 'error') {
      this.results.errors.push({ 
        type: 'console_error', 
        message,
        timestamp: new Date().toISOString()
      });
    } else if (type === 'warn') {
      this.results.warnings.push({ 
        type: 'console_warn', 
        message,
        timestamp: new Date().toISOString()
      });
    }
  }

  checkKCNamespace(window) {
    console.log('🔧 Verificando namespace KC...');
    
    if (!window.KC) {
      this.results.errors.push({
        type: 'namespace_error',
        message: 'Namespace KC não foi criado',
        severity: 'critical'
      });
      return;
    }
    
    // AIDEV-NOTE: Managers essenciais do sistema KC
    const expectedManagers = [
      'AppController', 'EventBus', 'Logger', 'ConfigManager',
      'DiscoveryManager', 'AnalysisManager', 'FilterManager',
      'CategoryManager', 'StatsManager', 'ExportManager',
      'TripleStoreManager', 'DataIntegrityManager', 'PromptManager'
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
        message: `Managers faltando: ${missing.join(', ')}`,
        severity: 'high'
      });
    }
  }

  async runUnitTests() {
    console.log('🧪 Executando testes unitários...');
    
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
    
    for (const testFile of testFiles) {
      const testPath = path.join(testDir, testFile);
      try {
        const content = fs.readFileSync(testPath, 'utf8');
        
        // Verificar AIDEV comments em testes
        if (!content.includes('AIDEV-')) {
          this.results.warnings.push({
            type: 'test_missing_comments',
            file: `test/${testFile}`,
            message: 'Teste sem AIDEV comments'
          });
        }
        
        // Verificar sintaxe
        new Function(content);
        
        this.results.testResults[testFile] = {
          success: true,
          message: 'Sintaxe válida'
        };
        
        // AIDEV-TODO: Executar testes de fato quando ambiente permitir
        
      } catch (error) {
        this.results.testResults[testFile] = {
          success: false,
          error: error.message,
          line: this.extractLineNumber(error)
        };
      }
    }
  }

  generateReport() {
    const report = {
      summary: {
        totalErrors: this.results.errors.length,
        totalWarnings: this.results.warnings.length,
        missingFiles: this.results.missingFiles.length,
        anchorComments: this.results.anchorComments.stats,
        timestamp: new Date().toISOString()
      },
      details: this.results,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Recomendações sobre Anchor Comments
    if (this.results.anchorComments.invalid.length > 0) {
      recommendations.push({
        type: 'fix_anchor_comments',
        severity: 'medium',
        message: `${this.results.anchorComments.invalid.length} comentários excedem 120 caracteres`,
        files: this.results.anchorComments.invalid.map(c => c.file),
        fix: 'Reduzir comentários para máximo 120 caracteres'
      });
    }
    
    if (this.results.anchorComments.todos.length > 5) {
      recommendations.push({
        type: 'resolve_todos',
        severity: 'medium',
        message: `${this.results.anchorComments.todos.length} AIDEV-TODOs pendentes`,
        priority: this.results.anchorComments.todos.slice(0, 5),
        fix: 'Priorizar e resolver TODOs mais críticos'
      });
    }
    
    if (this.results.anchorComments.questions.length > 0) {
      recommendations.push({
        type: 'answer_questions',
        severity: 'low',
        message: `${this.results.anchorComments.questions.length} AIDEV-QUESTIONs precisam resposta`,
        questions: this.results.anchorComments.questions,
        fix: 'Documentar decisões para questões levantadas'
      });
    }
    
    // Recomendações sobre arquivos
    if (this.results.missingFiles.length > 0) {
      recommendations.push({
        type: 'missing_files',
        severity: 'critical',
        message: 'Arquivos não encontrados',
        files: this.results.missingFiles,
        fix: 'Verificar caminhos ou criar arquivos faltantes'
      });
    }
    
    // Recomendações sobre erros
    const scriptErrors = this.results.errors.filter(e => e.type === 'script_error');
    if (scriptErrors.length > 0) {
      scriptErrors.forEach(error => {
        recommendations.push({
          type: 'script_error',
          severity: 'high',
          message: `Erro em ${error.file}: ${error.message}`,
          line: error.line,
          fix: 'Verificar sintaxe e dependências'
        });
      });
    }
    
    // Recomendações sobre namespace
    if (this.results.namespaceCheck.missing?.length > 0) {
      recommendations.push({
        type: 'incomplete_namespace',
        severity: 'high',
        message: 'Managers KC não inicializados',
        missing: this.results.namespaceCheck.missing,
        fix: 'Verificar inicialização dos managers no AppController'
      });
    }
    
    return recommendations;
  }

  async applyFixes(recommendations) {
    console.log('\n🔧 Aplicando correções automáticas...\n');
    const fixes = [];
    
    for (const rec of recommendations) {
      switch (rec.type) {
        case 'missing_files':
          if (rec.files) {
            for (const file of rec.files) {
              const fullPath = path.join(this.projectPath, file);
              const dir = path.dirname(fullPath);
              
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              
              if (!fs.existsSync(fullPath)) {
                // AIDEV-NOTE: Arquivo criado automaticamente com template mínimo
                const content = `// ${path.basename(file)}
// AIDEV-NOTE: Arquivo criado automaticamente - necessita implementação
// AIDEV-TODO: Implementar funcionalidade deste módulo

(function() {
    'use strict';
    
    // AIDEV-TODO: Adicionar implementação aqui
    
})();
`;
                fs.writeFileSync(fullPath, content);
                fixes.push(`Criado: ${file} com template AIDEV`);
              }
            }
          }
          break;
          
        case 'fix_anchor_comments':
          // AIDEV-TODO: Implementar correção automática de comentários longos
          fixes.push('Correção de comentários longos: requer revisão manual');
          break;
      }
    }
    
    return fixes;
  }

  // Método para gerar relatório de Anchor Comments
  generateAnchorReport() {
    const report = [];
    
    report.push('\n📊 RELATÓRIO DE ANCHOR COMMENTS\n');
    report.push('================================\n');
    
    // Estatísticas
    const stats = this.results.anchorComments.stats;
    report.push(`📌 Total de AIDEV-NOTEs: ${stats.totalNotes}`);
    report.push(`📝 Total de AIDEV-TODOs: ${stats.totalTodos}`);
    report.push(`❓ Total de AIDEV-QUESTIONs: ${stats.totalQuestions}`);
    report.push(`❌ Comentários inválidos: ${stats.totalInvalid}\n`);
    
    // TODOs pendentes
    if (this.results.anchorComments.todos.length > 0) {
      report.push('\n🔧 AIDEV-TODOs Pendentes:\n');
      this.results.anchorComments.todos.slice(0, 10).forEach((todo, i) => {
        report.push(`${i + 1}. ${todo.file}:${todo.line}`);
        report.push(`   ${todo.comment}\n`);
      });
    }
    
    // Questions
    if (this.results.anchorComments.questions.length > 0) {
      report.push('\n❓ AIDEV-QUESTIONs:\n');
      this.results.anchorComments.questions.forEach((q, i) => {
        report.push(`${i + 1}. ${q.file}:${q.line}`);
        report.push(`   ${q.comment}\n`);
      });
    }
    
    // Comentários inválidos
    if (this.results.anchorComments.invalid.length > 0) {
      report.push('\n⚠️ Comentários que excedem 120 caracteres:\n');
      this.results.anchorComments.invalid.forEach((invalid, i) => {
        report.push(`${i + 1}. ${invalid.file}:${invalid.line}`);
        report.push(`   ${invalid.issue}`);
        report.push(`   "${invalid.comment.substring(0, 50)}..."\n`);
      });
    }
    
    return report.join('\n');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  (async () => {
    const tester = new EnhancedTestSystem();
    
    try {
      const report = await tester.runTests();
      
      // Salvar relatório completo
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
      
      // Exibir relatório de Anchor Comments
      console.log(tester.generateAnchorReport());
      
      // Exibir recomendações
      if (report.recommendations.length > 0) {
        console.log('\n💡 RECOMENDAÇÕES:\n');
        report.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.severity.toUpperCase()}] ${rec.message}`);
          if (rec.fix) {
            console.log(`   Correção: ${rec.fix}`);
          }
          if (rec.line) {
            console.log(`   Linha: ${rec.line}`);
          }
        });
        
        // Auto-fix se solicitado
        if (process.argv.includes('--fix')) {
          const fixes = await tester.applyFixes(report.recommendations);
          if (fixes.length > 0) {
            console.log('\n✅ Correções aplicadas:');
            fixes.forEach(fix => console.log(`   ✓ ${fix}`));
          }
        }
      }
      
      // Salvar relatório de anchor comments
      fs.writeFileSync(
        path.join(__dirname, 'anchor-comments-report.txt'),
        tester.generateAnchorReport()
      );
      
      // Status final
      if (report.summary.totalErrors === 0 && 
          report.summary.missingFiles === 0 &&
          report.summary.anchorComments.totalInvalid === 0) {
        console.log('\n✅ Código sem erros críticos e com comentários válidos!');
      } else {
        console.log('\n❌ Correções necessárias - verifique os relatórios');
        console.log('   - test-report.json: Relatório completo');
        console.log('   - anchor-comments-report.txt: Relatório de AIDEV comments');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Erro durante teste:', error);
      process.exit(1);
    }
  })();
}

module.exports = EnhancedTestSystem;