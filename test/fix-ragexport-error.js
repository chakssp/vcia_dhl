/**
 * Correção para o erro text.toLowerCase no RAGExportManager
 */

// Salvar a função original
const originalExtractKeywords = KC.RAGExportManager._extractKeywords;

// Substituir por versão corrigida
KC.RAGExportManager._extractKeywords = function(text) {
    if (!text) return [];
    
    // Garantir que text é uma string
    let textStr = text;
    if (typeof text === 'object') {
        // Se for um objeto preview, extrair o texto
        if (text.segment1 || text.segment2 || text.segment3) {
            textStr = KC.PreviewUtils?.getTextPreview(text) || '';
        } else {
            textStr = JSON.stringify(text);
        }
    } else if (typeof text !== 'string') {
        textStr = String(text);
    }
    
    const words = textStr.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);
    
    const wordFreq = {};
    words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    return Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
};

// Corrigir também _generateTags
const originalGenerateTags = KC.RAGExportManager._generateTags;
KC.RAGExportManager._generateTags = function(file) {
    const tags = new Set();
    
    // Tags baseadas no tipo de análise
    if (file.analysisType && typeof file.analysisType === 'string') {
        tags.add(file.analysisType.toLowerCase().replace(/\s+/g, '-'));
    }
    
    // Tags baseadas em categorias
    if (file.structuralCategories && Array.isArray(file.structuralCategories)) {
        file.structuralCategories.forEach(cat => {
            if (cat && cat.name && typeof cat.name === 'string') {
                tags.add(cat.name.toLowerCase().replace(/\s+/g, '-'));
            }
        });
    }
    
    // Tags baseadas em relevância
    if (file.relevanceScore >= 90) {
        tags.add('high-priority');
    } else if (file.relevanceScore >= 70) {
        tags.add('medium-priority');
    }
    
    return Array.from(tags);
};

// Função para executar o pipeline novamente
async function retryPipeline() {
    console.log('🔄 Tentando pipeline novamente com correções...');
    
    try {
        const result = await KC.RAGExportManager.processApprovedFiles();
        console.log('📊 Resultado:', result);
        
        if (result.success) {
            console.log('✅ Pipeline executado com sucesso!');
            console.log(`📦 ${result.results.processed} documentos processados`);
            console.log(`📄 ${result.results.totalChunks} chunks criados`);
        } else {
            console.log('❌ Erro:', result.error);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Erro não tratado:', error);
    }
}

console.log(`
🔧 Correção do RAGExportManager Carregada!

O erro text.toLowerCase foi corrigido.

Execute: retryPipeline() para tentar novamente
`);