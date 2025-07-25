// claude-static-analyzer.js
// Analisador estático para Claude executar via filesystem MCP

const analysisInstructions = `
Analise o projeto VCIA_DHL e identifique:

1. Arquivos faltando (404)
2. Variáveis não definidas
3. Ordem incorreta de carregamento
4. Erros de sintaxe
5. Dependências quebradas

Execute estas verificações:
`;

async function analyzeProject() {
  const checks = [
    {
      name: "Verificar estrutura",
      command: "ls -la js/ css/ test/"
    },
    {
      name: "Contar arquivos JS",
      command: "find js/ -name '*.js' | wc -l"
    },
    {
      name: "Verificar sintaxe JS",
      command: "for f in js/**/*.js; do node -c \"$f\" 2>&1 || echo \"ERRO: $f\"; done"
    },
    {
      name: "Buscar undefined",
      command: "grep -r 'is not defined' test/*.js || echo 'Nenhum erro undefined'"
    },
    {
      name: "Verificar ordem no HTML",
      command: "grep -n '<script' index.html | head -20"
    }
  ];
  
  return checks;
}

// Para Claude executar
console.log(analysisInstructions);
console.log("\nChecklist de comandos para executar:");
analyzeProject().then(checks => {
  checks.forEach(check => {
    console.log(`\n${check.name}:`);
    console.log(`$ ${check.command}`);
  });
});

// Função helper para Claude
global.validateFile = function(filepath) {
  try {
    require(filepath);
    return { success: true, file: filepath };
  } catch (error) {
    return { 
      success: false, 
      file: filepath, 
      error: error.message,
      line: error.stack.split('\n')[1]
    };
  }
};