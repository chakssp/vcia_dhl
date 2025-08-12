/**
 * Script para executar análise completa do Qdrant
 * Execute no console do navegador
 */

console.log('🚀 Iniciando análise completa do Qdrant...\n');

// Carregar e executar o script de análise
const script = document.createElement('script');
script.src = 'test/qdrant-full-analysis.js';
script.onload = () => {
    console.log('✅ Script de análise carregado!');
    console.log('⏳ Executando análise...\n');
};
script.onerror = (error) => {
    console.error('❌ Erro ao carregar script:', error);
};

document.head.appendChild(script);

console.log('\n📋 COMANDOS ÚTEIS APÓS ANÁLISE:');
console.log('1. Ver relatório completo:');
console.log('   KC.AppState.get("lastQdrantAnalysis")');
console.log('\n2. Buscar por categoria específica:');
console.log('   KC.QdrantService.search({filter: {must: [{key: "categories", match: {value: "tecnico"}}]}})');
console.log('\n3. Buscar knowledge hubs:');
console.log('   KC.QdrantService.search({filter: {must: [{key: "intelligenceType", match: {value: "knowledge_hub"}}]}})');
console.log('\n4. Ver estatísticas do pipeline:');
console.log('   KC.IntelligenceEnrichmentPipeline.getStats()');