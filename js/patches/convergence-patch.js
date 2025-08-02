/**
 * Patch temporário para corrigir problemas de cache com métodos renomeados
 * Este arquivo deve ser carregado APÓS ConvergenceAnalysisService
 */
(function() {
    'use strict';
    
    // Aguardar carregamento do KC
    if (!window.KC || !window.KC.ConvergenceAnalysisService) {
        console.warn('ConvergenceAnalysisService não encontrado, patch não aplicado');
        return;
    }
    
    // Patch 1: Corrigir método calculateSimilarity que foi renomeado
    if (!window.KC.EmbeddingService.calculateSimilarity && window.KC.EmbeddingService.cosineSimilarity) {
        window.KC.EmbeddingService.calculateSimilarity = window.KC.EmbeddingService.cosineSimilarity;
        console.log('✅ Patch aplicado: calculateSimilarity -> cosineSimilarity');
    }
    
    // Patch 2: Corrigir método _calculateSimilarityMatrix que foi renomeado
    if (!window.KC.ConvergenceAnalysisService._calculateSimilarityMatrix && window.KC.ConvergenceAnalysisService._cosineSimilarityMatrix) {
        window.KC.ConvergenceAnalysisService._calculateSimilarityMatrix = window.KC.ConvergenceAnalysisService._cosineSimilarityMatrix;
        console.log('✅ Patch aplicado: _calculateSimilarityMatrix -> _cosineSimilarityMatrix');
    }
    
    console.log('🔧 Patches de convergência aplicados com sucesso');
})();