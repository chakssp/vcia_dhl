// DEBUG COMPLETO DO PROBLEMA DE EMBEDDING

async function debugEmbedding() {
    console.log('=== DEBUG EMBEDDING ===');
    
    // 1. Testar Ollama direto
    console.log('\n1. Testando Ollama direto:');
    try {
        const response = await fetch('http://localhost:11434/api/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'nomic-embed-text',
                prompt: 'teste simples'
            })
        });
        
        const data = await response.json();
        console.log('✅ Ollama respondeu:', {
            status: response.status,
            hasEmbedding: !!data.embedding,
            embeddingLength: data.embedding?.length
        });
    } catch (e) {
        console.error('❌ Erro Ollama:', e);
    }
    
    // 2. Testar EmbeddingService
    console.log('\n2. Testando EmbeddingService:');
    try {
        const result = await KC.EmbeddingService.generateEmbedding('teste');
        console.log('✅ EmbeddingService retornou:', {
            tipo: typeof result,
            temEmbedding: !!result?.embedding,
            temDimensions: !!result?.dimensions,
            keys: result ? Object.keys(result) : 'null'
        });
    } catch (e) {
        console.error('❌ Erro EmbeddingService:', e);
    }
    
    // 3. Ver configuração
    console.log('\n3. Configuração do EmbeddingService:');
    console.log({
        ollamaEnabled: KC.EmbeddingService?.config?.ollama?.enabled,
        ollamaUrl: KC.EmbeddingService?.config?.ollama?.url,
        ollamaModel: KC.EmbeddingService?.config?.ollama?.model,
        ollamaAvailable: KC.EmbeddingService?.ollamaAvailable
    });
    
    // 4. Testar fluxo completo
    console.log('\n4. Testando fluxo completo com arquivo:');
    const testFile = {
        id: 'test123',
        fileName: 'teste.md',
        name: 'teste.md',
        content: 'Este é um teste de embedding',
        preview: 'Este é um teste'
    };
    
    try {
        const enriched = await KC.QdrantService.enrichWithEmbeddings(testFile);
        console.log('✅ Enriquecimento funcionou:', {
            temVector: !!enriched?.vector,
            vectorLength: enriched?.vector?.length
        });
    } catch (e) {
        console.error('❌ Erro no enriquecimento:', e.message);
    }
}

// Executar
debugEmbedding();