#!/usr/bin/env node

/**
 * Teste simplificado sem dependência do Playwright
 * Verifica arquivos e estrutura do projeto
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

console.log(`${colors.blue}🚀 Executando teste simplificado VCIA_DHL...${colors.reset}\n`);

const results = {
  errors: [],
  warnings: [],
  missingFiles: [],
  summary: {
    totalErrors: 0,
    totalWarnings: 0,
    missingFiles: 0
  }
};

// Arquivos essenciais que devem existir
const essentialFiles = [
  'index.html',
  'js/app.js',
  'js/core/EventBus.js',
  'js/core/AppState.js',
  'js/core/AppController.js',
  'js/components/WorkflowPanel.js',
  'js/components/FileRenderer.js',
  'js/components/FilterPanel.js',
  'js/components/OrganizationPanel.js',
  'js/managers/CategoryManager.js',
  'js/managers/RAGExportManager.js',
  'css/main.css'
];

// Variável global para o conteúdo HTML
let htmlContent = '';

// Verificar arquivos essenciais
console.log(`${colors.blue}📁 Verificando arquivos essenciais...${colors.reset}`);
essentialFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    results.missingFiles.push(file);
    results.errors.push({
      type: 'missing_file',
      file: file,
      message: `Arquivo essencial não encontrado: ${file}`
    });
  } else {
    console.log(`${colors.green}✓${colors.reset} ${file}`);
  }
});

// Verificar HTML
if (fs.existsSync(path.join(__dirname, 'index.html'))) {
  console.log(`\n${colors.blue}📄 Analisando index.html...${colors.reset}`);
  htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  
  // Verificar se os novos botões estão presentes
  if (!htmlContent.includes('btn-api-config')) {
    results.warnings.push({
      type: 'html_check',
      message: 'Botão de configuração de API não encontrado no HTML'
    });
  } else {
    console.log(`${colors.green}✓${colors.reset} Botão de configuração de API presente`);
  }
  
  if (!htmlContent.includes('export-state')) {
    results.warnings.push({
      type: 'html_check',
      message: 'Botão de exportar estado não encontrado no HTML'
    });
  } else {
    console.log(`${colors.green}✓${colors.reset} Botão de exportar estado presente`);
  }
  
  // Verificar se stats panel foi removido
  if (htmlContent.includes('stats-section')) {
    results.warnings.push({
      type: 'html_check',
      message: 'Painel de estatísticas ainda presente no HTML (deveria ter sido removido)'
    });
  } else {
    console.log(`${colors.green}✓${colors.reset} Painel de estatísticas removido corretamente`);
  }
}

// Verificar CSS
if (fs.existsSync(path.join(__dirname, 'css/main.css'))) {
  console.log(`\n${colors.blue}🎨 Analisando CSS...${colors.reset}`);
  const cssContent = fs.readFileSync(path.join(__dirname, 'css/main.css'), 'utf8');
  
  if (!cssContent.includes('.btn-api-config')) {
    results.warnings.push({
      type: 'css_check',
      message: 'Estilos do botão de configuração de API não encontrados'
    });
  } else {
    console.log(`${colors.green}✓${colors.reset} Estilos do botão de configuração de API presentes`);
  }
  
  if (!cssContent.includes('.btn-export-state')) {
    results.warnings.push({
      type: 'css_check',
      message: 'Estilos do botão de exportar estado não encontrados'
    });
  } else {
    console.log(`${colors.green}✓${colors.reset} Estilos do botão de exportar estado presentes`);
  }
  
  if (cssContent.includes('main-content-wrapper')) {
    results.warnings.push({
      type: 'css_check',
      message: 'Estilos do layout side-by-side ainda presentes (deveriam ter sido removidos)'
    });
  } else {
    console.log(`${colors.green}✓${colors.reset} Estilos do layout side-by-side removidos corretamente`);
  }
}

// Verificar Dark Mode
console.log(`\n${colors.blue}🌙 Verificando Dark Mode...${colors.reset}`);
if (fs.existsSync(path.join(__dirname, 'css/utils/dark-mode.css'))) {
  console.log(`${colors.green}✓${colors.reset} Arquivo dark-mode.css presente`);
  
  // Verificar se está incluído no HTML
  if (htmlContent && htmlContent.includes('dark-mode.css')) {
    console.log(`${colors.green}✓${colors.reset} Dark mode CSS incluído no HTML`);
  } else {
    results.warnings.push({
      type: 'dark_mode_check',
      message: 'Dark mode CSS não está incluído no HTML'
    });
  }
} else {
  results.errors.push({
    type: 'dark_mode_check',
    message: 'Arquivo dark-mode.css não encontrado'
  });
}

// Verificar ThemeManager
if (fs.existsSync(path.join(__dirname, 'js/utils/ThemeManager.js'))) {
  console.log(`${colors.green}✓${colors.reset} ThemeManager.js presente`);
  
  // Verificar se está incluído no HTML
  if (htmlContent && htmlContent.includes('ThemeManager.js')) {
    console.log(`${colors.green}✓${colors.reset} ThemeManager incluído no HTML`);
  } else {
    results.warnings.push({
      type: 'theme_manager_check',
      message: 'ThemeManager.js não está incluído no HTML'
    });
  }
} else {
  results.errors.push({
    type: 'theme_manager_check',
    message: 'ThemeManager.js não encontrado'
  });
}

// Verificar botão de toggle
if (htmlContent && htmlContent.includes('theme-toggle')) {
  console.log(`${colors.green}✓${colors.reset} Botão de toggle de tema presente no HTML`);
} else {
  results.warnings.push({
    type: 'theme_toggle_check',
    message: 'Botão de toggle de tema não encontrado no HTML'
  });
}

// Verificar JavaScript
console.log(`\n${colors.blue}📜 Verificando arquivos JavaScript...${colors.reset}`);

// Verificar CategoryManager
if (fs.existsSync(path.join(__dirname, 'js/managers/CategoryManager.js'))) {
  const categoryManagerContent = fs.readFileSync(path.join(__dirname, 'js/managers/CategoryManager.js'), 'utf8');
  if (!categoryManagerContent.includes('getCategoryByName')) {
    results.errors.push({
      type: 'js_check',
      file: 'CategoryManager.js',
      message: 'Método getCategoryByName não encontrado'
    });
  } else {
    console.log(`${colors.green}✓${colors.reset} CategoryManager.getCategoryByName implementado`);
  }
}

// Verificar RAGExportManager
if (fs.existsSync(path.join(__dirname, 'js/managers/RAGExportManager.js'))) {
  const ragContent = fs.readFileSync(path.join(__dirname, 'js/managers/RAGExportManager.js'), 'utf8');
  if (ragContent.includes('relevance >= 50')) {
    results.errors.push({
      type: 'js_check',
      file: 'RAGExportManager.js',
      message: 'Restrição de 50% de relevância ainda presente'
    });
  } else {
    console.log(`${colors.green}✓${colors.reset} Restrição de 50% removida do RAGExportManager`);
  }
}

// Verificar FileRenderer
if (fs.existsSync(path.join(__dirname, 'js/components/FileRenderer.js'))) {
  const fileRendererContent = fs.readFileSync(path.join(__dirname, 'js/components/FileRenderer.js'), 'utf8');
  if (!fileRendererContent.includes('approveFile')) {
    results.errors.push({
      type: 'js_check',
      file: 'FileRenderer.js',
      message: 'Método approveFile não encontrado'
    });
  } else {
    console.log(`${colors.green}✓${colors.reset} FileRenderer.approveFile implementado`);
  }
  
  if (!fileRendererContent.includes('rejectFile')) {
    results.errors.push({
      type: 'js_check',
      file: 'FileRenderer.js',
      message: 'Método rejectFile não encontrado'
    });
  } else {
    console.log(`${colors.green}✓${colors.reset} FileRenderer.rejectFile implementado`);
  }
}

// Calcular totais
results.summary.totalErrors = results.errors.length;
results.summary.totalWarnings = results.warnings.length;
results.summary.missingFiles = results.missingFiles.length;

// Salvar relatório
const reportPath = path.join(__dirname, 'test-report.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

// Exibir resumo
console.log(`\n${colors.blue}📊 Resumo dos testes:${colors.reset}`);
console.log(`   Erros: ${results.summary.totalErrors}`);
console.log(`   Avisos: ${results.summary.totalWarnings}`);
console.log(`   Arquivos faltando: ${results.summary.missingFiles}`);

if (results.summary.totalErrors > 0) {
  console.log(`\n${colors.red}❌ Erros encontrados:${colors.reset}`);
  results.errors.forEach(error => {
    console.log(`   - ${error.message}`);
  });
}

if (results.summary.totalWarnings > 0) {
  console.log(`\n${colors.yellow}⚠️  Avisos:${colors.reset}`);
  results.warnings.forEach(warning => {
    console.log(`   - ${warning.message}`);
  });
}

if (results.summary.totalErrors === 0 && results.summary.totalWarnings === 0) {
  console.log(`\n${colors.green}🎉 Todos os testes passaram com sucesso!${colors.reset}`);
  process.exit(0);
} else {
  console.log(`\n${colors.yellow}📝 Relatório completo salvo em: test-report.json${colors.reset}`);
  process.exit(results.summary.totalErrors > 0 ? 1 : 0);
}