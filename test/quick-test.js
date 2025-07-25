#!/usr/bin/env node

/**
 * Script de Teste Rápido para Claude Code
 * Uso: node quick-test.js [--fix]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

console.log(`${colors.blue}🚀 Iniciando teste rápido VCIA_DHL...${colors.reset}\n`);

// Verificar se precisa instalar dependências
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.log(`${colors.yellow}📦 Criando package.json...${colors.reset}`);
  const packageJson = {
    name: "vcia-dhl-tests",
    version: "1.0.0",
    description: "Sistema de testes automatizados para VCIA_DHL",
    scripts: {
      "test": "node auto-test-system.js",
      "test:fix": "node auto-test-system.js --autofix",
      "quick": "node quick-test.js"
    },
    dependencies: {
      "playwright": "^1.48.0"
    }
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

// Verificar se Playwright está instalado
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log(`${colors.yellow}📦 Instalando dependências...${colors.reset}`);
  const npm = spawn('npm', ['install'], { 
    cwd: __dirname, 
    stdio: 'inherit',
    shell: true 
  });
  
  npm.on('close', (code) => {
    if (code === 0) {
      runTests();
    } else {
      console.error(`${colors.red}❌ Erro ao instalar dependências${colors.reset}`);
      process.exit(1);
    }
  });
} else {
  runTests();
}

function runTests() {
  const args = ['auto-test-system.js'];
  if (process.argv.includes('--fix')) {
    args.push('--autofix');
  }
  
  console.log(`${colors.blue}🧪 Executando testes...${colors.reset}\n`);
  
  const test = spawn('node', args, { 
    cwd: __dirname, 
    stdio: 'inherit' 
  });
  
  test.on('close', (code) => {
    if (code === 0) {
      console.log(`\n${colors.green}✅ Testes concluídos com sucesso!${colors.reset}`);
      
      // Mostrar resumo se existir
      const reportPath = path.join(__dirname, 'test-report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        console.log(`\n📊 Resumo:`);
        console.log(`   Erros: ${report.summary.totalErrors}`);
        console.log(`   Avisos: ${report.summary.totalWarnings}`);
        console.log(`   Arquivos faltando: ${report.summary.missingFiles}`);
        
        if (report.summary.totalErrors === 0) {
          console.log(`\n${colors.green}🎉 Código pronto para produção!${colors.reset}`);
        }
      }
    } else {
      console.error(`\n${colors.red}❌ Testes falharam. Verifique test-report.json${colors.reset}`);
      process.exit(1);
    }
  });
}

// Função helper para Claude usar via eval
global.quickTest = async function() {
  return new Promise((resolve) => {
    const test = spawn('node', ['auto-test-system.js'], { 
      cwd: __dirname,
      capture: ['stdout', 'stderr']
    });
    
    let output = '';
    test.stdout.on('data', (data) => output += data);
    test.stderr.on('data', (data) => output += data);
    
    test.on('close', (code) => {
      const reportPath = path.join(__dirname, 'test-report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        resolve({
          success: code === 0,
          output,
          report
        });
      } else {
        resolve({
          success: false,
          output,
          error: 'Relatório não foi gerado'
        });
      }
    });
  });
};