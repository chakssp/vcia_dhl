/**
 * Resumo dos dados no Qdrant
 * Execute este código no console
 */

// Função para executar busca e mostrar resumo
async function mostrarDadosQdrant() {
    console.log('\n🔍 BUSCANDO DADOS NO QDRANT...\n');
    
    try {
        // Verificar conexão
        const connected = await KC.QdrantService.checkConnection();
        if (!connected) {
            console.error('❌ Não conectado ao Qdrant!');
            return;
        }
        
        // Obter stats
        const stats = await KC.QdrantService.getCollectionStats();
        console.log(`📊 Total de pontos: ${stats.vectors_count || 0}\n`);
        
        if (!stats.vectors_count) {
            console.log('⚠️ Nenhum dado no Qdrant ainda!');
            return;
        }
        
        // Buscar amostra
        const results = await KC.QdrantService.search({
            vector: new Array(768).fill(0),
            limit: 100,
            with_payload: true
        });
        
        console.log(`✅ ${results.length} pontos recuperados\n`);
        
        // Análise rápida
        const files = new Set();
        const categories = {};
        let withCategories = 0;
        let withEnrichment = 0;
        
        results.forEach(r => {
            const p = r.payload;
            files.add(p.fileName);
            
            if (p.categories?.length > 0) {
                withCategories++;
                p.categories.forEach(cat => {
                    categories[cat] = (categories[cat] || 0) + 1;
                });
            }
            
            if (p.intelligenceType) {
                withEnrichment++;
            }
        });
        
        // Mostrar resumo
        console.log('📄 ARQUIVOS ÚNICOS:', files.size);
        console.log('🏷️  COM CATEGORIAS:', withCategories);
        console.log('🧠 ENRIQUECIDOS:', withEnrichment);
        
        console.log('\n📂 CATEGORIAS:');
        Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([cat, count]) => {
                console.log(`   • ${cat}: ${count}`);
            });
        
        console.log('\n📄 PRIMEIROS ARQUIVOS:');
        Array.from(files).slice(0, 5).forEach(f => {
            console.log(`   • ${f}`);
        });
        
        console.log('\n✅ Use o script completo para análise detalhada:');
        console.log('   const s = document.createElement("script");');
        console.log('   s.src = "test/execute-qdrant-search.js";');
        console.log('   document.head.appendChild(s);');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

// Executar
mostrarDadosQdrant();