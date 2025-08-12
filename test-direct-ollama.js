// Script para testar Ollama diretamente sem Circuit Breaker
// Execute no console do navegador

async function testOllamaDirect() {
    console.log('=== Teste Direto Ollama (sem Circuit Breaker) ===');
    
    try {
        // 1. Testar chamada direta ao Ollama
        console.log('1. Chamando Ollama diretamente...');
        const response = await fetch('http://127.0.0.1:11434/api/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'nomic-embed-text',
                prompt: 'teste de embedding direto'
            })
        });
        
        const data = await response.json();
        
        console.log('2. Resposta do Ollama:', {
            hasEmbedding: !!data.embedding,
            isArray: Array.isArray(data.embedding),
            type: typeof data.embedding,
            length: data.embedding?.length,
            firstValues: data.embedding?.slice(0, 5)
        });
        
        // 2. Testar com EmbeddingService mas sem Circuit Breaker
        if (KC.EmbeddingService) {
            console.log('\n3. Testando EmbeddingService...');
            
            // Desabilitar Circuit Breaker temporariamente
            const breaker = KC.EmbeddingService.ollamaBreaker;
            KC.EmbeddingService.ollamaBreaker = null;
            
            const result = await KC.EmbeddingService.generateEmbedding('teste via service');
            
            console.log('4. Resultado do EmbeddingService:', {
                hasEmbedding: !!result.embedding,
                isArray: Array.isArray(result.embedding),
                type: typeof result.embedding,
                length: result.embedding?.length,
                keys: Object.keys(result)
            });
            
            // Se não for array, verificar se é objeto com índices
            if (!Array.isArray(result.embedding) && typeof result.embedding === 'object') {
                console.log('5. PROBLEMA DETECTADO - embedding como objeto:');
                const keys = Object.keys(result.embedding);
                console.log('   - Total de keys:', keys.length);
                console.log('   - Primeiras keys:', keys.slice(0, 10));
                console.log('   - São números?', keys.slice(0, 10).every(k => !isNaN(k)));
            }
            
            // Restaurar Circuit Breaker
            KC.EmbeddingService.ollamaBreaker = breaker;
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

// Executar teste
testOllamaDirect();