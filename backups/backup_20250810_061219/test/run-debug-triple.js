// Script para executar debugTripleExtraction usando playwright-cli

const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Navegar para a página
  await page.goto('http://127.0.0.1:5500');
  
  // Aguardar carregamento
  await page.waitForTimeout(3000);
  
  // Executar a função no console
  const result = await page.evaluate(async () => {
    if (typeof debugTripleExtraction === 'function') {
      // Capturar saída do console
      const logs = [];
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = (...args) => {
        logs.push({ type: 'log', message: args.join(' ') });
        originalLog(...args);
      };
      
      console.error = (...args) => {
        logs.push({ type: 'error', message: args.join(' ') });
        originalError(...args);
      };
      
      try {
        await debugTripleExtraction();
      } catch (error) {
        logs.push({ type: 'error', message: error.toString() });
      }
      
      // Restaurar console
      console.log = originalLog;
      console.error = originalError;
      
      return logs;
    } else {
      return [{ type: 'error', message: 'debugTripleExtraction não encontrada' }];
    }
  });
  
  // Exibir resultados
  console.log('=== RESULTADO DO DEBUG ===\n');
  result.forEach(log => {
    if (log.type === 'error') {
      console.error(log.message);
    } else {
      console.log(log.message);
    }
  });
  
  await browser.close();
})();