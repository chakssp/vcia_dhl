// Script robusto para analisar insights dos dados no Qdrant
// Com tratamento de erros e validações

async function analyzeQdrantInsights() {
    console.log('🔍 ANÁLISE DE INSIGHTS - QDRANT ENRICHED DATA\n');
    console.log('Data:', new Date().toISOString());
    console.log('=' .repeat(60) + '\n');

    try {
        // 1. Primeiro verificar se o Qdrant está acessível
        console.log('🔌 Verificando conexão com Qdrant...');
        const testResponse = await fetch('http://qdr.vcia.com.br:6333/');
        if (!testResponse.ok) {
            throw new Error('Qdrant não está acessível');
        }
        console.log('✅ Qdrant conectado!\n');

        // 2. Listar coleções disponíveis
        console.log('📚 Coleções disponíveis:');
        const collectionsResponse = await fetch('http://qdr.vcia.com.br:6333/collections');
        const collections = await collectionsResponse.json();
        
        if (collections.result && collections.result.collections) {
            collections.result.collections.forEach(col => {
                console.log(`   - ${col.name}`);
            });
        }
        console.log('');

        // 3. Verificar especificamente a coleção kc_enriched
        const collectionName = 'kc_enriched';
        console.log(`📊 Analisando coleção: ${collectionName}\n`);
        
        const statsResponse = await fetch(`http://qdr.vcia.com.br:6333/collections/${collectionName}`);
        if (!statsResponse.ok) {
            console.log('⚠️  Coleção kc_enriched não encontrada. Tentando kc_documents...');
            // Tentar coleção alternativa
            const altResponse = await fetch('http://qdr.vcia.com.br:6333/collections/kc_documents');
            if (!altResponse.ok) {
                throw new Error('Nenhuma coleção KC encontrada');
            }
            collectionName = 'kc_documents';
        }

        const stats = await statsResponse.json();
        
        if (stats.result) {
            console.log(`Total de Pontos: ${stats.result.points_count || 0}`);
            console.log(`Status: ${stats.result.status || 'unknown'}`);
            if (stats.result.config && stats.result.config.params && stats.result.config.params.vectors) {
                console.log(`Dimensões: ${stats.result.config.params.vectors.size || 'N/A'}`);
            }
        }
        console.log('');

        // 4. Buscar alguns pontos para análise
        console.log('📋 Buscando dados para análise...\n');
        
        // Primeiro tentar scroll
        let points = [];
        try {
            const scrollResponse = await fetch(`http://qdr.vcia.com.br:6333/collections/${collectionName}/points/scroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    limit: 50,
                    with_payload: true,
                    with_vector: false
                })
            });
            
            if (scrollResponse.ok) {
                const scrollData = await scrollResponse.json();
                if (scrollData.result && scrollData.result.points) {
                    points = scrollData.result.points;
                }
            }
        } catch (error) {
            console.log('⚠️  Scroll falhou, tentando search...');
        }

        // Se scroll falhou, tentar search
        if (points.length === 0) {
            try {
                const searchResponse = await fetch(`http://qdr.vcia.com.br:6333/collections/${collectionName}/points/search`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vector: Array(768).fill(0.1), // Vector dummy
                        limit: 50,
                        with_payload: true,
                        with_vector: false
                    })
                });
                
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.result) {
                        points = searchData.result;
                    }
                }
            } catch (error) {
                console.log('⚠️  Search também falhou');
            }
        }

        if (points.length === 0) {
            console.log('❌ Não foi possível recuperar dados da coleção');
            return;
        }

        console.log(`✅ ${points.length} pontos recuperados para análise\n`);

        // 5. Análise dos dados
        console.log('🎯 ANÁLISE DOS DADOS:\n');
        
        const intelligenceTypes = {};
        const analysisTypes = {};
        const categories = new Map();
        const convergenceScores = [];
        const fileNames = new Set();
        const insights = [];
        
        points.forEach(point => {
            const payload = point.payload || {};
            
            // Tipos de inteligência
            if (payload.intelligenceType) {
                intelligenceTypes[payload.intelligenceType] = (intelligenceTypes[payload.intelligenceType] || 0) + 1;
            }
            
            // Tipos de análise
            if (payload.analysisType) {
                analysisTypes[payload.analysisType] = (analysisTypes[payload.analysisType] || 0) + 1;
            }
            
            // Scores
            if (typeof payload.convergenceScore === 'number') {
                convergenceScores.push(payload.convergenceScore);
            }
            
            // Categorias
            if (Array.isArray(payload.categories)) {
                payload.categories.forEach(cat => {
                    const catName = typeof cat === 'object' ? (cat.name || cat.id) : cat;
                    if (catName) {
                        categories.set(catName, (categories.get(catName) || 0) + 1);
                    }
                });
            }
            
            // Arquivos
            if (payload.fileName) {
                fileNames.add(payload.fileName);
            }
            
            // Coletar insights se existirem
            if (payload.insights && payload.insights.length > 0) {
                insights.push(...payload.insights);
            }
        });
        
        // Exibir resultados
        if (Object.keys(intelligenceTypes).length > 0) {
            console.log('📊 Distribuição de Intelligence Types:');
            Object.entries(intelligenceTypes)
                .sort((a, b) => b[1] - a[1])
                .forEach(([type, count]) => {
                    const percentage = ((count / points.length) * 100).toFixed(1);
                    console.log(`   ${type}: ${count} (${percentage}%)`);
                });
        } else {
            console.log('❌ Nenhum intelligenceType encontrado');
        }
        
        console.log('');
        
        if (Object.keys(analysisTypes).length > 0) {
            console.log('📈 Distribuição de Analysis Types:');
            Object.entries(analysisTypes)
                .sort((a, b) => b[1] - a[1])
                .forEach(([type, count]) => {
                    const percentage = ((count / points.length) * 100).toFixed(1);
                    console.log(`   ${type}: ${count} (${percentage}%)`);
                });
        } else {
            console.log('❌ Nenhum analysisType encontrado');
        }
        
        console.log('');
        
        if (categories.size > 0) {
            console.log('📁 Top 10 Categorias:');
            Array.from(categories.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .forEach(([cat, count]) => {
                    console.log(`   ${cat}: ${count} ocorrências`);
                });
        }
        
        console.log('');
        
        if (convergenceScores.length > 0) {
            const avgScore = convergenceScores.reduce((a, b) => a + b, 0) / convergenceScores.length;
            const maxScore = Math.max(...convergenceScores);
            const minScore = Math.min(...convergenceScores);
            
            console.log('📊 Estatísticas de Convergence Score:');
            console.log(`   Média: ${avgScore.toFixed(3)}`);
            console.log(`   Máximo: ${maxScore.toFixed(3)}`);
            console.log(`   Mínimo: ${minScore.toFixed(3)}`);
        }
        
        console.log(`\n📄 Arquivos únicos identificados: ${fileNames.size}`);
        
        if (insights.length > 0) {
            console.log(`\n💡 Insights extraídos: ${insights.length}`);
            console.log('   Primeiros 3 insights:');
            insights.slice(0, 3).forEach((insight, idx) => {
                const text = typeof insight === 'object' ? insight.content : insight;
                console.log(`   ${idx + 1}. ${text?.substring(0, 100)}...`);
            });
        }
        
        // 6. Análise de qualidade
        console.log('\n\n🔍 ANÁLISE DE QUALIDADE:\n');
        
        let qualityIssues = [];
        
        // Verificar dados incompletos
        let incomplete = 0;
        points.forEach(point => {
            const p = point.payload || {};
            if (!p.content || !p.analysisType || !p.categories || p.categories.length === 0) {
                incomplete++;
            }
        });
        
        if (incomplete > 0) {
            qualityIssues.push(`${incomplete} pontos (${((incomplete/points.length)*100).toFixed(1)}%) com dados incompletos`);
        }
        
        // Verificar distribuição
        if (Object.keys(intelligenceTypes).length < 3) {
            qualityIssues.push('Baixa diversidade de tipos de inteligência');
        }
        
        if (avgScore && avgScore < 0.3) {
            qualityIssues.push('Convergence scores muito baixos em média');
        }
        
        if (qualityIssues.length > 0) {
            console.log('⚠️  Problemas identificados:');
            qualityIssues.forEach(issue => console.log(`   - ${issue}`));
        } else {
            console.log('✅ Qualidade geral dos dados está boa!');
        }
        
        // 7. Recomendações
        console.log('\n💡 RECOMENDAÇÕES:\n');
        
        if (points.length < 100) {
            console.log('   1. Processar mais documentos para ter uma base mais robusta');
        }
        
        if (Object.keys(intelligenceTypes).length < 4) {
            console.log('   2. Revisar classificador para identificar mais tipos de inteligência');
        }
        
        if (categories.size < 5) {
            console.log('   3. Enriquecer categorização dos documentos');
        }
        
        if (insights.length === 0) {
            console.log('   4. Ativar extração de insights no pipeline');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Análise concluída com sucesso!');
        
    } catch (error) {
        console.error('\n❌ Erro durante análise:', error.message);
        console.log('\n💡 Sugestões:');
        console.log('   1. Verificar se o Qdrant está acessível');
        console.log('   2. Confirmar nome da coleção (kc_enriched ou kc_documents)');
        console.log('   3. Verificar se há dados na coleção');
    }
}

// Executar
analyzeQdrantInsights();