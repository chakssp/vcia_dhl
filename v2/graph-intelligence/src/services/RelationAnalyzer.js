/**
 * RelationAnalyzer - Análise inteligente de relações entre dados do Qdrant
 * 
 * POLÍTICA ZERO FALLBACK:
 * - NUNCA retornar dados mock
 * - SEMPRE mostrar erros reais ao usuário
 * - PROPAGAR erros, não esconder
 */

import ANALYSIS_CONFIG from '../constants/analysisConfig.js';
import notificationService from '../utils/NotificationService.js';

class RelationAnalyzer {
  constructor() {
    this.minConfidence = ANALYSIS_CONFIG.MIN_CONFIDENCE;
    this.maxComparisons = ANALYSIS_CONFIG.MAX_COMPARISONS;
    this.lastError = null;
  }

  /**
   * Analisa relações entre múltiplos pontos do Qdrant
   * @param {Array} data - Array de pontos do Qdrant
   * @returns {Object} Análise completa com keywords, categorias, convergências e sugestões
   */
  analyzeRelations(data) {
    try {
      // Validar entrada - ZERO FALLBACK
      if (!data || !Array.isArray(data)) {
        const error = new Error('Dados inválidos: esperado array de pontos do Qdrant');
        this.showError(error);
        throw error;
      }

      if (data.length === 0) {
        console.warn('⚠️ Nenhum dado para analisar');
        return {
          keywords: [],
          categories: {},
          convergences: [],
          suggestions: [],
          stats: {
            totalPoints: 0,
            analyzed: 0,
            errors: []
          }
        };
      }

      console.log(`📊 Analisando ${data.length} pontos do Qdrant...`);

      // 1. Extrair e contar keywords
      const keywords = this.extractKeywords(data);
      
      // 2. Agrupar por categorias
      const categories = this.groupByCategories(data);
      
      // 3. Detectar cadeias de convergência
      const convergences = this.detectConvergences(data);
      
      // 4. Gerar sugestões de conexão
      const suggestions = this.generateConnectionSuggestions(data, {
        keywords,
        categories,
        convergences
      });

      // 5. Calcular estatísticas
      const stats = {
        totalPoints: data.length,
        analyzed: data.filter(d => d.payload?.analyzed).length,
        withCategories: data.filter(d => d.payload?.categories?.length > 0).length,
        withConvergence: data.filter(d => d.payload?.convergenceChains?.length > 0).length,
        avgScore: this.calculateAverageScore(data),
        errors: []
      };

      return {
        keywords,
        categories,
        convergences,
        suggestions,
        stats
      };

    } catch (error) {
      this.showError(error);
      throw error; // SEMPRE propagar - ZERO FALLBACK
    }
  }

  /**
   * Extrai e conta keywords dos dados
   */
  extractKeywords(data) {
    try {
      const keywordMap = new Map();

      data.forEach(point => {
        // Verificar se tem metadata.keywords
        const keywords = point.payload?.metadata?.keywords || [];
        
        // Também extrair do chunkText se disponível
        if (point.payload?.chunkText) {
          const textKeywords = this.extractKeywordsFromText(point.payload.chunkText);
          keywords.push(...textKeywords);
        }

        // Contar ocorrências
        keywords.forEach(kw => {
          if (kw && typeof kw === 'string') {
            const normalized = kw.toLowerCase().trim();
            keywordMap.set(normalized, (keywordMap.get(normalized) || 0) + 1);
          }
        });
      });

      // Converter para array ordenado
      const sortedKeywords = Array.from(keywordMap.entries())
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count);

      return sortedKeywords;

    } catch (error) {
      console.error('Erro ao extrair keywords:', error);
      this.showError(new Error(`Falha na extração de keywords: ${error.message}`));
      return [];
    }
  }

  /**
   * Extrai keywords básicas de um texto
   */
  extractKeywordsFromText(text) {
    if (!text || typeof text !== 'string') return [];

    // Palavras-chave comuns em contexto técnico/business
    const importantWords = [
      'decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough',
      'estratégia', 'análise', 'projeto', 'desenvolvimento', 'implementação',
      'solução', 'problema', 'desafio', 'oportunidade', 'resultado',
      'processo', 'método', 'framework', 'arquitetura', 'integração'
    ];

    const words = text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => importantWords.some(iw => word.includes(iw)));

    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Agrupa dados por categorias
   */
  groupByCategories(data) {
    const categoryMap = {};
    const categoryIcons = {
      'technical': '⚙️',
      'business': '💼',
      'research': '🔬',
      'documentation': '📄',
      'analysis': '📊',
      'development': '💻',
      'strategy': '🎯',
      'insights': '💡',
      'default': '📦'
    };

    data.forEach(point => {
      const categories = point.payload?.categories || [];
      
      categories.forEach(cat => {
        if (!cat) return;
        
        if (!categoryMap[cat]) {
          categoryMap[cat] = {
            count: 0,
            points: [],
            icon: categoryIcons[cat.toLowerCase()] || categoryIcons.default
          };
        }
        
        categoryMap[cat].count++;
        categoryMap[cat].points.push(point.id);
      });
    });

    return categoryMap;
  }

  /**
   * Detecta cadeias de convergência
   */
  detectConvergences(data) {
    const convergences = [];
    const convergenceMap = new Map();

    data.forEach(point => {
      const chains = point.payload?.convergenceChains || [];
      
      chains.forEach(chain => {
        if (!chain.theme) return;
        
        const key = chain.theme.toLowerCase();
        
        if (!convergenceMap.has(key)) {
          convergenceMap.set(key, {
            theme: chain.theme,
            participants: new Set(),
            totalStrength: 0,
            count: 0
          });
        }
        
        const conv = convergenceMap.get(key);
        conv.participants.add(point.payload?.fileName || point.id);
        conv.totalStrength += (chain.strength || 0.5);
        conv.count++;
        
        // Adicionar participantes da chain
        if (chain.participants) {
          chain.participants.forEach(p => conv.participants.add(p));
        }
      });
    });

    // Converter para array e calcular força média
    convergenceMap.forEach(conv => {
      convergences.push({
        theme: conv.theme,
        participants: Array.from(conv.participants),
        count: conv.participants.size,
        strength: conv.totalStrength / conv.count
      });
    });

    // Ordenar por número de participantes
    return convergences.sort((a, b) => b.count - a.count);
  }

  /**
   * Gera sugestões de conexão baseadas na análise
   */
  generateConnectionSuggestions(data, analysis) {
    const suggestions = [];
    const processed = new Set();

    // Limitar para performance
    const maxComparisons = Math.min(data.length * data.length, this.maxComparisons);
    let comparisons = 0;

    for (let i = 0; i < data.length - 1; i++) {
      for (let j = i + 1; j < data.length; j++) {
        if (comparisons++ > maxComparisons) break;

        const source = data[i];
        const target = data[j];
        
        // Skip se já processado
        const pairKey = `${source.id}-${target.id}`;
        if (processed.has(pairKey)) continue;
        processed.add(pairKey);

        // Calcular força da conexão
        const connection = this.calculateConnectionStrength(source, target);
        
        if (connection.confidence >= this.minConfidence) {
          suggestions.push({
            source: source.id,
            target: target.id,
            sourceFile: source.payload?.fileName || 'Unknown',
            targetFile: target.payload?.fileName || 'Unknown',
            ...connection
          });
        }
      }
    }

    // Ordenar por confiança
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, ANALYSIS_CONFIG.MAX_SUGGESTIONS);
  }

  /**
   * Calcula força de conexão entre dois pontos
   * @param {Object} source - Primeiro ponto do Qdrant
   * @param {Object} target - Segundo ponto do Qdrant
   * @returns {Object} Objeto com confidence, strength, reason e detalhes
   */
  calculateConnectionStrength(source, target) {
    // COMPREHENSIVE INPUT VALIDATION
    try {
      // Validate basic structure
      if (!this.validateConnectionInput(source, target)) {
        return this.createEmptyConnection();
      }

      let confidence = 0;
      let reason = '';
      const details = {};

      // 1. Keywords em comum - with validation
      const commonKeywords = this.calculateKeywordSimilarity(source, target);
      if (commonKeywords.length > 0) {
        confidence += commonKeywords.length * ANALYSIS_CONFIG.WEIGHTS.KEYWORD_WEIGHT;
        reason = 'keywords';
        details.keywords = commonKeywords;
      }

      // 2. Categorias em comum - with validation
      const commonCategories = this.calculateCategorySimilarity(source, target);
      if (commonCategories.length > 0) {
        confidence += commonCategories.length * ANALYSIS_CONFIG.WEIGHTS.CATEGORY_WEIGHT;
        reason = reason ? 'multiple' : 'categories';
        details.categories = commonCategories;
      }

      // 3. Convergência compartilhada - with validation
      const convergenceData = this.calculateConvergenceSimilarity(source, target);
      if (convergenceData.hasConvergence) {
        confidence += ANALYSIS_CONFIG.WEIGHTS.CONVERGENCE_WEIGHT;
        reason = 'convergence';
        details.theme = convergenceData.theme;
      }

      // 4. Scores similares - with validation
      const scoreBonus = this.calculateScoreSimilarity(source, target);
      confidence += scoreBonus;

      // Validate and normalize final confidence
      confidence = this.normalizeConfidence(confidence);

      // Calculate strength for visual representation
      const strength = Math.max(0.1, Math.min(1.0, confidence));

      return {
        confidence,
        strength,
        reason: reason || 'similarity',
        ...details
      };
      
    } catch (error) {
      this.showError(new Error(`Erro ao calcular força de conexão: ${error.message}`));
      return this.createEmptyConnection();
    }
  }

  /**
   * Validate input for connection strength calculation
   */
  validateConnectionInput(source, target) {
    // Check if both inputs exist and are objects
    if (!source || !target || typeof source !== 'object' || typeof target !== 'object') {
      notificationService.validationError('connection', 'Source ou target inválido');
      return false;
    }

    // Check if they have required structure
    if (!source.id || !target.id) {
      notificationService.validationError('connection', 'Source ou target sem ID');
      return false;
    }

    // Prevent self-connection
    if (source.id === target.id) {
      console.warn('Tentativa de auto-conexão detectada e ignorada');
      return false;
    }

    // Validate payload structure
    if (typeof source.payload !== 'object' || typeof target.payload !== 'object') {
      console.warn('Payload inválido detectado');
      // Don't fail completely, just warn
    }

    return true;
  }

  /**
   * Calculate keyword similarity between two points
   */
  calculateKeywordSimilarity(source, target) {
    try {
      const sourceKeywords = this.extractSafeKeywords(source.payload?.metadata?.keywords);
      const targetKeywords = this.extractSafeKeywords(target.payload?.metadata?.keywords);
      
      return sourceKeywords.filter(k => targetKeywords.includes(k));
    } catch (error) {
      console.warn('Erro ao calcular similaridade de keywords:', error);
      return [];
    }
  }

  /**
   * Calculate category similarity between two points
   */
  calculateCategorySimilarity(source, target) {
    try {
      const sourceCategories = this.extractSafeArray(source.payload?.categories);
      const targetCategories = this.extractSafeArray(target.payload?.categories);
      
      return sourceCategories.filter(c => targetCategories.includes(c));
    } catch (error) {
      console.warn('Erro ao calcular similaridade de categorias:', error);
      return [];
    }
  }

  /**
   * Calculate convergence similarity between two points
   */
  calculateConvergenceSimilarity(source, target) {
    try {
      const sourceChains = this.extractSafeArray(source.payload?.convergenceChains);
      const targetChains = this.extractSafeArray(target.payload?.convergenceChains);
      
      for (const sChain of sourceChains) {
        if (!sChain || typeof sChain.theme !== 'string') continue;
        
        for (const tChain of targetChains) {
          if (!tChain || typeof tChain.theme !== 'string') continue;
          
          if (sChain.theme === tChain.theme) {
            return {
              hasConvergence: true,
              theme: sChain.theme
            };
          }
        }
      }
      
      return { hasConvergence: false };
    } catch (error) {
      console.warn('Erro ao calcular convergência:', error);
      return { hasConvergence: false };
    }
  }

  /**
   * Calculate score similarity between two points
   */
  calculateScoreSimilarity(source, target) {
    try {
      const sourceScore = this.extractSafeNumber(source.payload?.relevanceScore, 0);
      const targetScore = this.extractSafeNumber(target.payload?.relevanceScore, 0);
      
      const scoreDiff = Math.abs(sourceScore - targetScore);
      
      if (scoreDiff < ANALYSIS_CONFIG.WEIGHTS.MAX_SCORE_DIFFERENCE) {
        return ANALYSIS_CONFIG.WEIGHTS.SCORE_SIMILARITY_WEIGHT;
      }
      
      return 0;
    } catch (error) {
      console.warn('Erro ao calcular similaridade de score:', error);
      return 0;
    }
  }

  /**
   * Extract safe keywords from input
   */
  extractSafeKeywords(keywords) {
    if (!Array.isArray(keywords)) return [];
    
    return keywords.filter(k => 
      k && 
      typeof k === 'string' && 
      k.trim().length > 0 &&
      k.length < ANALYSIS_CONFIG.VALIDATION.MAX_STRING_LENGTH
    );
  }

  /**
   * Extract safe array from input
   */
  extractSafeArray(input) {
    if (!Array.isArray(input)) return [];
    
    return input.filter(item => 
      item !== null && 
      item !== undefined &&
      (typeof item === 'string' ? item.length < ANALYSIS_CONFIG.VALIDATION.MAX_STRING_LENGTH : true)
    );
  }

  /**
   * Extract safe number from input
   */
  extractSafeNumber(input, defaultValue = 0) {
    if (typeof input === 'number' && !isNaN(input) && isFinite(input)) {
      return input;
    }
    return defaultValue;
  }

  /**
   * Normalize confidence value
   */
  normalizeConfidence(confidence) {
    if (typeof confidence !== 'number' || isNaN(confidence) || !isFinite(confidence)) {
      return 0;
    }
    
    return Math.max(0, Math.min(1.0, confidence));
  }

  /**
   * Create empty connection object
   */
  createEmptyConnection() {
    return {
      confidence: 0,
      strength: 0,
      reason: 'invalid',
      keywords: [],
      categories: []
    };
  }

  /**
   * Gera layout automático baseado na análise
   */
  generateAutoLayout(data, analysis) {
    const nodes = [];
    const edges = [];
    
    // Configurações de layout - CORREÇÃO: Aumentar área e melhorar distribuição
    const centerX = 600;
    const centerY = 400;
    const radiusBase = 250;
    const minNodeDistance = 120; // Distância mínima entre nós
    
    // Agrupar por categorias principais
    const categoryGroups = {};
    
    data.forEach((point, index) => {
      // Usar ID como fallback se não houver dados
      const nodeId = point.id || `node-${index}`;
      const category = point.payload?.categories?.[0] || 
                      point.categories?.[0] || 
                      'uncategorized';
      
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      
      categoryGroups[category].push({
        id: nodeId,
        data: point.payload || point,
        fileName: point.fileName || point.payload?.fileName || point.label || nodeId,
        index
      });
    });

    // CORREÇÃO: Melhor distribuição dos nós
    let categoryIndex = 0;
    const totalCategories = Object.keys(categoryGroups).length;
    
    // Se há apenas uma categoria ou poucos nós, usar grid layout
    if (totalCategories === 1 || data.length <= 6) {
      // Grid layout para melhor visualização
      const cols = Math.ceil(Math.sqrt(data.length));
      const spacing = minNodeDistance * 1.5;
      
      data.forEach((point, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = centerX - (cols * spacing / 2) + (col * spacing);
        const y = centerY - (Math.ceil(data.length / cols) * spacing / 2) + (row * spacing);
        
        nodes.push({
          id: point.id || `node-${index}`,
          position: { x, y },
          data: {
            ...point,
            fileName: point.fileName || point.payload?.fileName || point.label || point.id
          }
        });
      });
    } else {
      // Layout circular para múltiplas categorias
      Object.entries(categoryGroups).forEach(([category, points]) => {
        const categoryAngleStep = (2 * Math.PI) / totalCategories;
        const categoryBaseAngle = categoryAngleStep * categoryIndex;
        
        // Calcular raio baseado no número de pontos
        const pointsCount = points.length;
        const categoryRadius = radiusBase + (categoryIndex % 3) * 80;
        
        if (pointsCount === 1) {
          // Único ponto na categoria - posicionar no ângulo da categoria
          const x = centerX + Math.cos(categoryBaseAngle) * categoryRadius;
          const y = centerY + Math.sin(categoryBaseAngle) * categoryRadius;
          
          nodes.push({
            id: points[0].id,
            position: { x, y },
            data: {
              ...points[0].data,
              fileName: points[0].fileName
            }
          });
        } else {
          // Múltiplos pontos - distribuir em arco ou círculo
          const arcSpread = Math.min(Math.PI / 2, categoryAngleStep * 0.8); // Limitar spread do arco
          const pointAngleStep = pointsCount > 1 ? arcSpread / (pointsCount - 1) : 0;
          const startAngle = categoryBaseAngle - arcSpread / 2;
          
          points.forEach((point, pointIndex) => {
            // Adicionar variação no raio para evitar sobreposição
            const radiusVariation = (pointIndex % 2) * 30;
            const pointRadius = categoryRadius + radiusVariation;
            const pointAngle = startAngle + (pointAngleStep * pointIndex);
            
            const x = centerX + Math.cos(pointAngle) * pointRadius;
            const y = centerY + Math.sin(pointAngle) * pointRadius;
            
            nodes.push({
              id: point.id,
              position: { x, y },
              data: {
                ...point.data,
                fileName: point.fileName
              }
            });
          });
        }
        
        categoryIndex++;
      });
    }
    
    // Log para debug
    console.log('📐 Layout gerado:', {
      totalNodes: nodes.length,
      categories: Object.keys(categoryGroups),
      nodesPerCategory: Object.entries(categoryGroups).map(([cat, points]) => 
        `${cat}: ${points.length} nós`
      )
    });

    // Adicionar edges baseadas nas sugestões
    if (analysis.suggestions) {
      analysis.suggestions.forEach((sug, idx) => {
        edges.push({
          id: `auto-edge-${idx}`,
          source: sug.source,
          sourceHandle: 'source-bottom', // Especificar handle de saída válido
          target: sug.target,
          targetHandle: 'target-top',    // Especificar handle de entrada válido
          type: 'smoothstep',
          animated: sug.confidence > 0.7,
          style: {
            stroke: this.getEdgeColor(sug.reason),
            strokeWidth: Math.max(1, sug.strength * 4)
          },
          data: sug
        });
      });
    }

    return { nodes, edges };
  }

  /**
   * Retorna cor da edge baseada no tipo de conexão
   */
  getEdgeColor(reason) {
    const colors = {
      'keywords': '#3498db',
      'categories': '#2ecc71',
      'convergence': '#e74c3c',
      'multiple': '#9b59b6',
      'default': '#95a5a6'
    };
    
    return colors[reason] || colors.default;
  }

  /**
   * Calcula score médio dos pontos
   */
  calculateAverageScore(data) {
    if (!data || data.length === 0) return 0;
    
    const totalScore = data.reduce((sum, point) => {
      return sum + (point.payload?.relevanceScore || 0);
    }, 0);
    
    return totalScore / data.length;
  }

  /**
   * Mostra erro ao usuário - ZERO FALLBACK
   */
  showError(error) {
    this.lastError = error;
    console.error('❌ RelationAnalyzer Error:', error);
    
    // Use NotificationService instead of blocking alert
    if (notificationService.isAvailable()) {
      notificationService.error(error.message, {
        title: 'Erro na Análise de Relações',
        details: 'Verifique o console para mais detalhes',
        timeout: 8000
      });
    }
  }
}

// Exportar instância singleton
const relationAnalyzer = new RelationAnalyzer();
export default relationAnalyzer;