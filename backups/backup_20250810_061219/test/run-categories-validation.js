/**
 * Script para executar validação de categorias no console
 * Execute este script no console do navegador com a aplicação carregada
 */

console.log('🚀 INICIANDO VALIDAÇÃO DE CATEGORIAS - 30/01/2025');
console.log('=' .repeat(70));

// Verificar se KC está disponível
if (typeof window.KC === 'undefined') {
    console.error('❌ KC não está disponível! Certifique-se de que a aplicação está carregada.');
    throw new Error('KC não disponível');
}

// Carregar e executar o script de validação
console.log('📂 Carregando script de validação...');

const script = document.createElement('script');
script.src = 'test/validate-categories-preservation.js';
script.onload = () => {
    console.log('✅ Script de validação carregado com sucesso!');
    console.log('⏳ Aguardando execução automática em 2 segundos...');
};
script.onerror = (error) => {
    console.error('❌ Erro ao carregar script de validação:', error);
};

document.head.appendChild(script);

// Instruções adicionais
console.log('\n📋 INSTRUÇÕES:');
console.log('1. O teste será executado automaticamente em 2 segundos');
console.log('2. Verifique os resultados detalhados acima');
console.log('3. Procure por [CATEGORY-TRACE] nos logs para rastreamento detalhado');
console.log('\n💡 Para executar manualmente depois:');
console.log('   validateCategoriesPreservation()');