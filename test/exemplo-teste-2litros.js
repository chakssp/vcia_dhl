/**
 * Exemplo de teste com arquivo real da 2Litros
 * 
 * Execute este código no console do navegador
 */

// Conteúdo real do arquivo business-case-2litros.md
const arquivo2Litros = {
    name: 'business-case-2litros.md',
    path: '/docs/lpo/business-cases/business-case-2litros.md',
    type: 'text/markdown',
    content: `> me explique o funcionamento deste novo modelo homologado com 5 exemplos aplicaveis por exemplo ao Onboard de uma empresa de Marketing Voltado para Valorização de Marcas como cliente em Potencial www.2litros.com.br

● 🎯 Sistema de Triplas Semânticas - Aplicação Prática para 2Litros

Vou explicar como o sistema funcionaria no onboarding da 2Litros (Marketing de Valorização de Marcas) com 5 exemplos práticos:

📊 Contexto: Base de Conhecimento da 2Litros

Imagine que a 2Litros tem diversos arquivos sobre campanhas, cases de sucesso, estratégias de branding, análises de mercado, etc.

Exemplo 1: Case de Sucesso Detectado

// Arquivo: "case-ambev-rebranding-2024.pdf"

// TRIPLA 1: Identificação do tipo
{
    legado: "case_ambev_2024",              // O arquivo histórico
    presente: "foiAnalisadoComo",           // Análise da IA
    objetivo: "Breakthrough Técnico",        // Case de sucesso identificado
    metadados: {
        fonte: "analise_ia",
        confianca: 0.95,
        cliente: "Ambev",
        resultado: "+32% brand awareness"
    }
}

// TRIPLA 2: Ação automática
{
    legado: "case_ambev_2024",
    presente: "disparaWorkflow",
    objetivo: "criar_template_proposta",
    metadados: {
        gatilho_n8n: {
            workflow: "template_generator",
            parametros: {
                tipo: "rebranding",
                setor: "bebidas",
                metricas: ["awareness", "engagement"]
            }
        }
    }
}

// RESULTADO: N8N cria automaticamente template de proposta baseado no case`,
    // Adicionar mais metadados relevantes
    categories: ['Business Cases', 'Marketing', '2Litros'],
    relevanceScore: 95,
    analysisType: 'Breakthrough Técnico',
    lastModified: new Date('2025-01-17').getTime(),
    size: 8543 // tamanho aproximado em bytes
};

// Função para executar o teste
async function testar2Litros() {
    console.log('🧪 TESTE COM ARQUIVO REAL: 2Litros Business Case\n');
    
    // Executar teste de extração
    const resultado = await testarExtracao(arquivo2Litros);
    
    if (resultado && resultado.sucesso) {
        console.log('\n📊 RESUMO DO TESTE:');
        console.log(`✅ Triplas extraídas: ${resultado.triplas}`);
        console.log(`💡 Insights gerados: ${resultado.insights}`);
        console.log(`⏱️ Tempo de processamento: ${resultado.duracao}ms`);
        
        if (resultado.detalhes) {
            console.log('\n🔍 ANÁLISE DETALHADA:');
            console.log('Tipos de relações encontradas:');
            Object.entries(resultado.detalhes.porPredicado || {}).forEach(([tipo, quantidade]) => {
                console.log(`  - ${tipo}: ${quantidade.length} triplas`);
            });
        }
    }
    
    return resultado;
}

// Exemplo alternativo com foco em um trecho específico
const trechoEspecifico = {
    name: 'exemplo-case-ambev.md',
    content: `Case de Sucesso: Rebranding Ambev 2024
    
Cliente: Ambev
Setor: Bebidas
Desafio: Modernizar marca mantendo tradição
Solução: Storytelling emocional + identidade visual renovada
Resultado: +32% brand awareness em 6 meses

Estratégias aplicadas:
- Pesquisa profunda com consumidores Gen Z
- Redesign completo da identidade visual
- Campanha multiplataforma com influencers
- Métricas de ROI mensuradas semanalmente

Este case demonstra como a 2Litros transforma marcas através de metodologias data-driven.`,
    type: 'text/markdown',
    categories: ['Cases', 'Ambev', 'Rebranding'],
    relevanceScore: 90
};

// Função para testar trecho específico
async function testarTrechoAmbev() {
    console.log('🧪 TESTE COM TRECHO ESPECÍFICO: Case Ambev\n');
    return await testarExtracao(trechoEspecifico);
}

// Instruções no console
console.log('📝 EXEMPLOS DE TESTE PRONTOS PARA USAR:\n');
console.log('1. Testar arquivo completo da 2Litros:');
console.log('   testar2Litros()');
console.log('\n2. Testar trecho específico do case Ambev:');
console.log('   testarTrechoAmbev()');
console.log('\n3. Testar com conteúdo personalizado:');
console.log('   testarExtracaoRapida("Cole seu conteúdo aqui...")');
console.log('\n💡 Dica: Os testes são isolados e não afetam o sistema em produção!');

// Exportar funções para uso global
window.testar2Litros = testar2Litros;
window.testarTrechoAmbev = testarTrechoAmbev;