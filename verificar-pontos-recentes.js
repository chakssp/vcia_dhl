// Verificar pontos mais recentes no Qdrant
async function verificarPontosRecentes() {
    console.log('=== VERIFICANDO PONTOS RECENTES ===\n');
    
    try {
        // Buscar TODOS os pontos para análise completa
        let offset = null;
        let todosOsPontos = [];
        let iteracao = 0;
        
        console.log('Coletando todos os pontos...');
        
        while (true) {
            const response = await fetch(`${KC.QdrantService.config.baseUrl}/collections/${KC.QdrantService.config.collectionName}/points/scroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    limit: 100,
                    offset: offset,
                    with_payload: true,
                    with_vector: false
                })
            });
            
            const data = await response.json();
            const pontos = data.result?.points || [];
            
            if (pontos.length === 0) break;
            
            todosOsPontos = todosOsPontos.concat(pontos);
            offset = data.result?.next_page_offset;
            
            iteracao++;
            if (!offset || iteracao > 50) break; // Limite de segurança
        }
        
        console.log(`Total de pontos coletados: ${todosOsPontos.length}\n`);
        
        // Analisar estruturas diferentes
        const estruturas = {
            comAnalysisType: 0,
            comCategories: 0,
            comContent: 0,
            comFileName: 0,
            comChunkInfo: 0,
            comTimestamp: 0
        };
        
        // Analisar timestamps
        let maisRecente = 0;
        let maisAntigo = Date.now();
        
        todosOsPontos.forEach(p => {
            const payload = p.payload || {};
            
            if (payload.analysisType) estruturas.comAnalysisType++;
            if (payload.categories) estruturas.comCategories++;
            if (payload.content) estruturas.comContent++;
            if (payload.fileName) estruturas.comFileName++;
            if (payload.chunkIndex !== undefined) estruturas.comChunkInfo++;
            if (payload.timestamp) {
                estruturas.comTimestamp++;
                const ts = payload.timestamp;
                if (ts > maisRecente) maisRecente = ts;
                if (ts < maisAntigo) maisAntigo = ts;
            }
        });
        
        console.log('ANÁLISE DE ESTRUTURAS:');
        Object.entries(estruturas).forEach(([key, count]) => {
            const percent = ((count / todosOsPontos.length) * 100).toFixed(1);
            console.log(`- ${key}: ${count} (${percent}%)`);
        });
        
        console.log('\nANÁLISE TEMPORAL:');
        if (maisRecente > 0) {
            console.log(`- Ponto mais antigo: ${new Date(maisAntigo).toLocaleString()}`);
            console.log(`- Ponto mais recente: ${new Date(maisRecente).toLocaleString()}`);
        }
        
        // Encontrar pontos dos últimos 30 minutos
        const agora = Date.now();
        const trintaMinutosAtras = agora - (30 * 60 * 1000);
        const pontosRecentes = todosOsPontos.filter(p => {
            const ts = p.payload?.timestamp || 0;
            return ts > trintaMinutosAtras;
        });
        
        console.log(`\nPONTOS DOS ÚLTIMOS 30 MINUTOS: ${pontosRecentes.length}`);
        
        // Mostrar exemplos de diferentes estruturas
        console.log('\nEXEMPLOS DE DIFERENTES ESTRUTURAS:');
        
        // Exemplo com analysisType
        const comAnalysis = todosOsPontos.find(p => p.payload?.analysisType);
        if (comAnalysis) {
            console.log('\n1. Com analysisType:');
            console.log(JSON.stringify(comAnalysis, null, 2));
        }
        
        // Exemplo com fileName (provável dos 18 documentos)
        const comFileName = todosOsPontos.find(p => p.payload?.fileName);
        if (comFileName) {
            console.log('\n2. Com fileName (possível documento recente):');
            console.log(JSON.stringify(comFileName, null, 2));
        }
        
        // Verificar se há pontos com estrutura esperada do processamento
        const pontosProcessamento = todosOsPontos.filter(p => {
            const payload = p.payload || {};
            return payload.fileName && payload.fileId && payload.chunkIndex !== undefined;
        });
        
        console.log(`\nPONTOS COM ESTRUTURA DE PROCESSAMENTO: ${pontosProcessamento.length}`);
        if (pontosProcessamento.length > 0) {
            console.log('Exemplo:');
            console.log(JSON.stringify(pontosProcessamento[0], null, 2));
        }
        
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Executar
verificarPontosRecentes();