// Script para identificar a coleção correta e analisar os dados

async function checkCollections() {
    console.log('🔍 VERIFICANDO COLEÇÕES DO QDRANT\n');
    
    try {
        // Buscar todas as coleções
        const response = await fetch('http://qdr.vcia.com.br:6333/collections');
        const data = await response.json();
        
        if (data.result && data.result.collections) {
            console.log('📚 Coleções encontradas:\n');
            
            // Para cada coleção, verificar detalhes
            for (const col of data.result.collections) {
                const colName = col.name;
                console.log(`\n📁 Coleção: ${colName}`);
                console.log('-'.repeat(40));
                
                try {
                    // Buscar info da coleção
                    const colResponse = await fetch(`http://qdr.vcia.com.br:6333/collections/${colName}`);
                    const colData = await colResponse.json();
                    
                    if (colData.result) {
                        console.log(`   Pontos: ${colData.result.points_count || 0}`);
                        console.log(`   Status: ${colData.result.status || 'unknown'}`);
                        
                        // Verificar dimensões se disponível
                        if (colData.result.config?.params?.vectors?.size) {
                            console.log(`   Dimensões: ${colData.result.config.params.vectors.size}`);
                        }
                        
                        // Se for uma coleção relacionada ao KC, buscar uma amostra
                        if (colName.includes('knowledge') || colName.includes('vcia') || colName.includes('document')) {
                            console.log('\n   📊 Amostra de dados:');
                            
                            // Tentar buscar um ponto
                            const sampleResponse = await fetch(`http://qdr.vcia.com.br:6333/collections/${colName}/points/scroll`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    limit: 2,
                                    with_payload: true,
                                    with_vector: false
                                })
                            });
                            
                            if (sampleResponse.ok) {
                                const sampleData = await sampleResponse.json();
                                if (sampleData.result?.points?.length > 0) {
                                    const sample = sampleData.result.points[0];
                                    const payload = sample.payload || {};
                                    
                                    console.log('   Campos encontrados:');
                                    Object.keys(payload).forEach(key => {
                                        const value = payload[key];
                                        const valueType = Array.isArray(value) ? 'array' : typeof value;
                                        console.log(`     - ${key}: ${valueType}`);
                                    });
                                    
                                    // Verificar se tem campos de enriquecimento
                                    if (payload.intelligenceType || payload.convergenceScore || payload.analysisType) {
                                        console.log('\n   ✅ COLEÇÃO COM DADOS ENRIQUECIDOS!');
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.log(`   ❌ Erro ao acessar: ${error.message}`);
                }
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('💡 Sugestão: Use a coleção com dados enriquecidos para análise');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

checkCollections();