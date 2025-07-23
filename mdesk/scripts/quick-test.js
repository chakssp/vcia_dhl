#!/usr/bin/env node
// quick-test.js
// Script de teste rápido para VCIA_DHL
// AIDEV-NOTE: Wrapper para facilitar execução dos testes

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Detectar qual sistema usar baseado no ambiente
const isRestricted = !process.env.PLAYWRIGHT_BROWSERS_PATH;
const testSystem = isRestricted ? 
  'lightweight-test-system.js' : 
  'enhanced-test-system.js';

console.log(`🚀 Executando ${isRestricted ? 'sistema leve' : 'sistema completo'}...\n`);

// Caminho para o sistema de teste
const testSystemPath = path.join(__dirname, '..', 'test-systems', testSystem);

// Argumentos
const args = [testSystemPath];
if (process.argv.includes('--fix')) {
  args.push('--fix');
}

// Executar teste
const test = spawn('node', args, { 
  cwd: path.dirname(testSystemPath),
  stdio: 'inherit'
});

test.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Testes concluídos!');
    
    // Mostrar localização dos relatórios
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (fs.existsSync(reportsDir)) {
      console.log(`\n📊 Relatórios salvos em: ${reportsDir}`);
      
      const files = fs.readdirSync(reportsDir);
      if (files.length > 0) {
        console.log('   Arquivos disponíveis:');
        files.forEach(file => {
          console.log(`   - ${file}`);
        });
      }
    }
  } else {
    console.error(`\n❌ Testes falharam com código: ${code}`);
    process.exit(code);
  }
});