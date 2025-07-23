// claude-static-analyzer.js
// Analisador estático para Claude executar via filesystem MCP
// AIDEV-NOTE: Comandos para análise rápida sem executar código

const fs = require('fs');
const path = require('path');

const analysisCommands = {
  structure: {
    name: "Verificar estrutura de diretórios",
    commands: [
      "ls -la js/",
      "ls -la css/",
      "ls -la test/",
      "find . -name '*.js' | wc -l"
    ]
  },
  
  syntax: {
    name: "Verificar sintaxe JavaScript",
    commands: [
      "for f in js/**/*.js; do node -c \"$f\" 2>&1 || echo \"ERRO: $f\"; done"
    ]
  },
  
  aidev: {
    name: "Buscar AIDEV comments",
    commands: [
      "grep -r 'AIDEV-TODO:' js/ test/ | wc -l",
      "grep -r 'AIDEV-NOTE:' js/ test/ | wc -l",
      "grep -r 'AIDEV-QUESTION:' js/ test/ | wc -l"
    ]
  },
  
  errors: {
    name: "Buscar erros comuns",
    commands: [
      "grep -r 'is not defined' test/*.js || echo 'Nenhum erro undefined'",
      "grep -r 'Cannot read' js/*.js || echo 'Nenhum erro de null'"
    ]
  },
  
  loadOrder: {
    name: "Verificar ordem de carregamento",
    commands: [
      "grep -n '<script' index.html | grep -E '(EventBus|AppState|AppController)'"
    ]
  }
};

// Função para executar análise
function runAnalysis() {
  console.log('🔍 Análise Estática VCIA_DHL\n');
  console.log('Execute os seguintes comandos para análise completa:\n');
  
  Object.entries(analysisCommands).forEach(([key, analysis]) => {
    console.log(`\n## ${analysis.name}:`);
    analysis.commands.forEach(cmd => {
      console.log(`$ ${cmd}`);
    });
  });
  
  console.log('\n\n💡 Para Claude executar via MCP:');
  console.log('Use o filesystem MCP para executar cada comando acima e compilar um relatório.\n');
}

// Função helper para validar arquivo individual
function validateFile(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Verificar sintaxe
    try {
      new Function(content);
    } catch (error) {
      return {
        success: false,
        file: filepath,
        error: 'Erro de sintaxe',
        details: error.message
      };
    }
    
    // Verificar AIDEV comments
    const hasAIDEV = content.includes('AIDEV-');
    const todoCount = (content.match(/AIDEV-TODO:/g) || []).length;
    const noteCount = (content.match(/AIDEV-NOTE:/g) || []).length;
    
    return {
      success: true,
      file: filepath,
      aidev: {
        hasComments: hasAIDEV,
        todos: todoCount,
        notes: noteCount
      }
    };
    
  } catch (error) {
    return {
      success: false,
      file: filepath,
      error: 'Erro ao ler arquivo',
      details: error.message
    };
  }
}

// Exportar para uso global
if (typeof global !== 'undefined') {
  global.validateFile = validateFile;
  global.analysisCommands = analysisCommands;
}

// Executar se chamado diretamente
if (require.main === module) {
  runAnalysis();
}

module.exports = { validateFile, analysisCommands };