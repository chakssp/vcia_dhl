const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Iniciando teste de debugTripleExtraction...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capturar mensagens do console
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    // Ignorar mensagens de estilo
    if (!text.includes('color:') && !text.includes('font-weight:')) {
      console.log(`[${type.toUpperCase()}] ${text}`);
    }
  });
  
  // Capturar erros
  page.on('pageerror', error => {
    console.error('[ERROR]', error.message);
  });
  
  try {
    console.log('📍 Navegando para http://127.0.0.1:5500...');
    await page.goto('http://127.0.0.1:5500', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('⏳ Aguardando carregamento completo...');
    await page.waitForTimeout(3000);
    
    console.log('🔍 Executando debugTripleExtraction()...\n');
    
    const result = await page.evaluate(async () => {
      if (typeof debugTripleExtraction === 'function') {
        try {
          await debugTripleExtraction();
          return { success: true, message: 'Função executada com sucesso' };
        } catch (error) {
          return { success: false, error: error.toString() };
        }
      } else {
        return { success: false, error: 'Função debugTripleExtraction não encontrada' };
      }
    });
    
    if (result.success) {
      console.log(`\n✅ ${result.message}`);
    } else {
      console.error(`\n❌ Erro: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante execução:', error.message);
  } finally {
    await browser.close();
    console.log('\n🏁 Teste concluído.');
  }
})();