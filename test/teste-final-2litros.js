/**
 * Teste final direto com arquivo 2Litros
 */

async function testeFinal2Litros() {
    console.log('🎯 TESTE FINAL - 2LITROS\n');
    
    const KC = window.KnowledgeConsolidator;
    
    // Conteúdo simplificado da 2Litros
    const conteudo2Litros = `Sistema de Triplas Semânticas - Aplicação Prática para 2Litros

A 2Litros é uma empresa de Marketing focada em Valorização de Marcas.

Case de Sucesso: Rebranding Ambev 2024
- Cliente: Ambev
- Resultado: +32% brand awareness
- Estratégia: Storytelling emocional com identidade visual renovada
- Tecnologias: Machine Learning para análise de sentimento

Insights importantes:
- Sustentabilidade é diferencial chave para Gen Z
- ROI comprovado de 25-35% em campanhas data-driven
- Integração com N8N para automação de workflows

Decisão estratégica: Implementar sistema de triplas semânticas para:
1. Onboarding instantâneo de clientes
2. Precificação baseada em dados históricos
3. Templates personalizados automaticamente`;

    // 1. Testar RelationshipExtractor diretamente
    console.log('1️⃣ Extração direta com RelationshipExtractor...\n');
    
    const arquivo = {
        id: '2litros_final_001',
        name: 'business-case-2litros.md',
        content: conteudo2Litros,
        type: 'text/markdown',
        categories: ['Business Cases', 'Marketing'],
        relevanceScore: 95,
        size: conteudo2Litros.length
    };
    
    try {
        const extractor = new KC.RelationshipExtractor();
        const triplas = await extractor.extrairDeArquivo(arquivo);
        
        console.log(`✅ SUCESSO: ${triplas.length} triplas extraídas!\n`);
        
        // Agrupar por tipo
        const grupos = {};
        triplas.forEach(t => {
            const tipo = t.presente.valor;
            if (!grupos[tipo]) grupos[tipo] = [];
            grupos[tipo].push(t);
        });
        
        console.log('📊 ANÁLISE DAS TRIPLAS:\n');
        
        Object.entries(grupos).forEach(([tipo, triplasDoTipo]) => {
            console.log(`${tipo} (${triplasDoTipo.length} triplas):`);
            triplasDoTipo.slice(0, 3).forEach(t => {
                console.log(`  • ${t.objetivo.valor}`);
            });
            if (triplasDoTipo.length > 3) {
                console.log(`  • ... e mais ${triplasDoTipo.length - 3}`);
            }
            console.log('');
        });
        
        // Mostrar insights extraídos
        const insights = grupos['possuiInsight'] || [];
        if (insights.length > 0) {
            console.log('💡 INSIGHTS DETECTADOS:');
            insights.forEach(t => {
                console.log(`  • ${t.objetivo.valor}`);
            });
            console.log('');
        }
        
        // 2. Testar adição ao TripleStore
        console.log('\n2️⃣ Testando armazenamento no TripleStore...\n');
        
        const manager = new KC.TripleStoreManager();
        manager.config.validateSchema = false; // Simplificar para teste
        
        let adicionadas = 0;
        for (const tripla of triplas.slice(0, 5)) { // Adicionar apenas 5 para teste
            try {
                await manager.adicionarTripla(
                    tripla.legado.valor,
                    tripla.presente.valor,
                    tripla.objetivo.valor,
                    tripla.metadados
                );
                adicionadas++;
            } catch (erro) {
                console.error(`Erro ao adicionar: ${erro.message}`);
            }
        }
        
        console.log(`✅ ${adicionadas} triplas armazenadas com sucesso!`);
        
        // 3. Buscar triplas armazenadas
        console.log('\n3️⃣ Verificando triplas armazenadas...\n');
        
        const armazenadas = manager.buscar({ legado: '2litros_final_001' });
        console.log(`📦 ${armazenadas.length} triplas encontradas no store`);
        
        return {
            sucesso: true,
            extraidas: triplas.length,
            armazenadas: adicionadas,
            grupos: Object.keys(grupos)
        };
        
    } catch (erro) {
        console.error('❌ ERRO:', erro);
        console.error(erro.stack);
        return {
            sucesso: false,
            erro: erro.message
        };
    }
}

// Versão simplificada para teste rápido
function testeRapido2Litros() {
    const KC = window.KnowledgeConsolidator;
    const extractor = new KC.RelationshipExtractor();
    
    const arquivo = {
        id: 'rapido_001',
        name: 'teste.md',
        content: 'Ambev implementou Machine Learning para análise de ROI',
        type: 'text/markdown'
    };
    
    extractor.extrairDeArquivo(arquivo).then(triplas => {
        console.log(`✅ ${triplas.length} triplas extraídas`);
        triplas.forEach(t => {
            console.log(`${t.legado.valor} → ${t.presente.valor} → ${t.objetivo.valor}`);
        });
    });
}

window.testeFinal2Litros = testeFinal2Litros;
window.testeRapido2Litros = testeRapido2Litros;

console.log('🎯 Teste final carregado!');
console.log('Execute: testeFinal2Litros() para teste completo');
console.log('ou: testeRapido2Litros() para teste rápido');