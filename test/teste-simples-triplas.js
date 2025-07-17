/**
 * Teste super simples para entender o problema
 */

async function testeSimplesTriplas() {
    console.log('🔍 TESTE SIMPLES DE TRIPLAS\n');
    
    const KC = window.KnowledgeConsolidator;
    
    // 1. Testar extração direta
    console.log('1️⃣ Testando RelationshipExtractor diretamente...');
    
    const arquivo = {
        id: 'simples_001',
        name: 'teste.md',
        content: 'Machine Learning com Python',
        type: 'text/markdown'
    };
    
    try {
        const extractor = new KC.RelationshipExtractor();
        const triplas = await extractor.extrairDeArquivo(arquivo);
        
        console.log(`✅ Triplas extraídas: ${triplas.length}`);
        
        if (triplas.length > 0) {
            console.log('\nPrimeiras 3 triplas:');
            triplas.slice(0, 3).forEach((t, i) => {
                console.log(`\nTripla ${i + 1}:`);
                console.log(`  Legado: ${t.legado.valor}`);
                console.log(`  Relação: ${t.presente.valor}`);
                console.log(`  Objetivo: ${t.objetivo.valor}`);
            });
        }
        
        // 2. Testar adicionar ao manager
        console.log('\n2️⃣ Testando TripleStoreManager...');
        
        const manager = new KC.TripleStoreManager();
        manager.config.validateSchema = false; // Desabilitar validação
        
        console.log('Adicionando tripla manualmente...');
        const triplaAdicionada = await manager.adicionarTripla(
            'arquivo_teste',
            'temNome',
            'teste.md'
        );
        
        console.log('✅ Tripla adicionada:', triplaAdicionada);
        
        // 3. Testar com arquivo real da 2Litros (pequeno trecho)
        console.log('\n3️⃣ Testando com conteúdo da 2Litros...');
        
        const arquivo2litros = {
            id: '2litros_001',
            name: '2litros-case.md',
            content: `Case de Sucesso: Ambev
            Cliente: Ambev
            Resultado: +32% brand awareness
            Tecnologia: Machine Learning`,
            type: 'text/markdown'
        };
        
        const triplas2litros = await extractor.extrairDeArquivo(arquivo2litros);
        console.log(`✅ Triplas da 2Litros: ${triplas2litros.length}`);
        
        if (triplas2litros.length > 0) {
            console.log('\nAlgumas triplas:');
            triplas2litros.slice(0, 3).forEach((t, i) => {
                console.log(`  ${t.legado.valor} → ${t.presente.valor} → ${t.objetivo.valor}`);
            });
        }
        
    } catch (erro) {
        console.error('❌ Erro:', erro.message);
        console.error(erro.stack);
    }
}

// Teste ainda mais básico
function testeBasicoExtractor() {
    console.log('🔬 Teste básico do extractor\n');
    
    const KC = window.KnowledgeConsolidator;
    
    if (!KC.RelationshipExtractor) {
        console.error('RelationshipExtractor não encontrado!');
        return;
    }
    
    // Verificar métodos
    const extractor = new KC.RelationshipExtractor();
    console.log('Métodos disponíveis:');
    console.log('- extrairDeArquivo:', typeof extractor.extrairDeArquivo);
    console.log('- extrairRelacionamentosBasicos:', typeof extractor.extrairRelacionamentosBasicos);
    console.log('- criarTripla:', typeof extractor.criarTripla);
    
    // Testar criação de tripla
    if (extractor.criarTripla) {
        const tripla = extractor.criarTripla('teste', 'temNome', 'arquivo.md');
        console.log('\nTripla criada:', tripla);
    }
}

window.testeSimplesTriplas = testeSimplesTriplas;
window.testeBasicoExtractor = testeBasicoExtractor;

console.log('🧪 Testes simples carregados!');
console.log('Execute: testeSimplesTriplas() ou testeBasicoExtractor()');