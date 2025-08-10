/**
 * 📐 IntersectionCalculator - Calculador de Interseções Multi-dimensionais
 * 
 * Identifica e calcula a densidade de interseções entre múltiplas dimensões
 */
class IntersectionCalculator {
    constructor() {
        this.minDimensions = 2; // Mínimo de dimensões para considerar interseção
        this.weightConfig = {
            temporal: 0.25,
            semantic: 0.35,
            categorical: 0.20,
            analytical: 0.20
        };
    }
    
    /**
     * Calcula todas as interseções possíveis
     */
    async calculate(dimensions, data) {
        console.log('📐 Calculando interseções multi-dimensionais...');
        
        const chunks = data.chunks || [];
        const total = data.total || chunks.length;
        
        // Calcular scores para cada chunk
        const scoredChunks = this.scoreChunks(chunks, dimensions);
        
        // Gerar combinações de dimensões
        const combinations = this.generateCombinations(dimensions);
        
        // Calcular interseções para cada combinação
        const intersections = [];
        
        for (const combo of combinations) {
            const intersection = this.calculateIntersection(combo, scoredChunks, total);
            if (intersection.files.length > 0) {
                intersections.push(intersection);
            }
        }
        
        // Ordenar por densidade
        intersections.sort((a, b) => b.density - a.density);
        
        console.log(`✅ ${intersections.length} interseções encontradas`);
        
        return intersections;
    }
    
    /**
     * Pontua chunks baseado nas dimensões
     */
    scoreChunks(chunks, dimensions) {
        return chunks.map(chunk => {
            const scores = {
                temporal: this.scoreTemporalMatch(chunk, dimensions.temporal),
                semantic: this.scoreSemanticMatch(chunk, dimensions.semantic),
                categorical: this.scoreCategoricalMatch(chunk, dimensions.categorical),
                analytical: this.scoreAnalyticalMatch(chunk, dimensions.analytical)
            };
            
            // Calcular score total ponderado
            const totalScore = Object.keys(scores).reduce((sum, key) => {
                return sum + (scores[key] * this.weightConfig[key]);
            }, 0);
            
            return {
                ...chunk,
                dimensionScores: scores,
                totalScore: totalScore,
                matchedDimensions: Object.keys(scores).filter(k => scores[k] > 0)
            };
        });
    }
    
    /**
     * Score de match temporal
     */
    scoreTemporalMatch(chunk, temporalDimension) {
        if (!temporalDimension || !chunk.lastModified) return 0;
        
        const chunkDate = new Date(chunk.lastModified);
        const now = new Date();
        
        // Se há range específico
        if (temporalDimension.startDate && temporalDimension.endDate) {
            const start = new Date(temporalDimension.startDate);
            const end = new Date(temporalDimension.endDate);
            
            if (chunkDate >= start && chunkDate <= end) {
                // Score maior para datas mais recentes dentro do range
                const rangeSize = end - start;
                const position = chunkDate - start;
                return 0.5 + (position / rangeSize) * 0.5;
            }
        }
        
        // Match por dias relativos
        if (temporalDimension.days) {
            const daysDiff = (now - chunkDate) / (1000 * 60 * 60 * 24);
            if (daysDiff <= temporalDimension.days) {
                // Score inversamente proporcional à distância temporal
                return 1 - (daysDiff / temporalDimension.days) * 0.5;
            }
        }
        
        return 0;
    }
    
    /**
     * Score de match semântico
     */
    scoreSemanticMatch(chunk, semanticKeywords) {
        if (!semanticKeywords || semanticKeywords.length === 0) return 0;
        if (!chunk.keywords && !chunk.content) return 0;
        
        const chunkText = (chunk.content || '').toLowerCase();
        const chunkKeywords = (chunk.keywords || []).map(k => k.toLowerCase());
        
        let matchCount = 0;
        let totalWeight = 0;
        
        for (let i = 0; i < semanticKeywords.length; i++) {
            const keyword = semanticKeywords[i].toLowerCase();
            const weight = 1 / (i + 1); // Peso decrescente por posição
            
            totalWeight += weight;
            
            // Verificar match exato em keywords
            if (chunkKeywords.includes(keyword)) {
                matchCount += weight;
            }
            // Verificar match parcial em keywords
            else if (chunkKeywords.some(k => k.includes(keyword) || keyword.includes(k))) {
                matchCount += weight * 0.7;
            }
            // Verificar no conteúdo
            else if (chunkText.includes(keyword)) {
                matchCount += weight * 0.5;
            }
        }
        
        return totalWeight > 0 ? matchCount / totalWeight : 0;
    }
    
    /**
     * Score de match categorial
     */
    scoreCategoricalMatch(chunk, categories) {
        if (!categories || categories.length === 0) return 0;
        if (!chunk.categories || chunk.categories.length === 0) return 0;
        
        const chunkCats = chunk.categories.map(c => c.toLowerCase());
        const targetCats = categories.map(c => c.toLowerCase());
        
        let matches = 0;
        for (const cat of targetCats) {
            if (chunkCats.includes(cat)) {
                matches++;
            } else if (chunkCats.some(c => c.includes(cat) || cat.includes(c))) {
                matches += 0.5;
            }
        }
        
        return matches / targetCats.length;
    }
    
    /**
     * Score de match analítico
     */
    scoreAnalyticalMatch(chunk, analysisType) {
        if (!analysisType) return 0;
        if (!chunk.analysisType) return 0;
        
        const chunkType = chunk.analysisType.toLowerCase();
        const targetType = analysisType.toLowerCase();
        
        if (chunkType === targetType) {
            return 1;
        } else if (chunkType.includes(targetType) || targetType.includes(chunkType)) {
            return 0.7;
        }
        
        // Verificar similaridade por palavras
        const chunkWords = chunkType.split(/\s+/);
        const targetWords = targetType.split(/\s+/);
        
        const commonWords = chunkWords.filter(w => targetWords.includes(w));
        const similarity = commonWords.length / Math.max(chunkWords.length, targetWords.length);
        
        return similarity;
    }
    
    /**
     * Gera todas as combinações possíveis de dimensões
     */
    generateCombinations(dimensions) {
        const combinations = [];
        const dims = [];
        
        // Coletar dimensões não-nulas
        if (dimensions.temporal) dims.push('temporal');
        if (dimensions.semantic && dimensions.semantic.length > 0) dims.push('semantic');
        if (dimensions.categorical && dimensions.categorical.length > 0) dims.push('categorical');
        if (dimensions.analytical) dims.push('analytical');
        
        // Gerar todas as combinações de tamanho >= minDimensions
        for (let size = this.minDimensions; size <= dims.length; size++) {
            this.getCombinationsOfSize(dims, size, combinations);
        }
        
        return combinations;
    }
    
    /**
     * Gera combinações de tamanho específico
     */
    getCombinationsOfSize(arr, size, result, current = [], start = 0) {
        if (current.length === size) {
            result.push([...current]);
            return;
        }
        
        for (let i = start; i < arr.length; i++) {
            current.push(arr[i]);
            this.getCombinationsOfSize(arr, size, result, current, i + 1);
            current.pop();
        }
    }
    
    /**
     * Calcula interseção para uma combinação específica de dimensões
     */
    calculateIntersection(dimensions, scoredChunks, totalChunks) {
        // Filtrar chunks que têm score > 0 em todas as dimensões da combinação
        const matchingChunks = scoredChunks.filter(chunk => {
            return dimensions.every(dim => chunk.dimensionScores[dim] > 0.3); // Threshold mínimo
        });
        
        // Agrupar por arquivo
        const fileGroups = new Map();
        for (const chunk of matchingChunks) {
            const fileName = chunk.fileName;
            if (!fileGroups.has(fileName)) {
                fileGroups.set(fileName, {
                    fileName: fileName,
                    chunks: [],
                    avgScore: 0
                });
            }
            fileGroups.get(fileName).chunks.push(chunk);
        }
        
        // Calcular score médio por arquivo
        for (const fileData of fileGroups.values()) {
            const totalScore = fileData.chunks.reduce((sum, chunk) => {
                return sum + dimensions.reduce((s, dim) => s + chunk.dimensionScores[dim], 0);
            }, 0);
            fileData.avgScore = totalScore / (fileData.chunks.length * dimensions.length);
        }
        
        // Criar objeto de interseção
        const files = Array.from(fileGroups.values())
            .sort((a, b) => b.avgScore - a.avgScore)
            .map(f => f.fileName);
        
        const density = this.calculateDensity(
            matchingChunks.length,
            totalChunks,
            dimensions.length,
            4 // máximo de dimensões
        );
        
        return {
            dimensions: dimensions,
            files: files,
            chunkCount: matchingChunks.length,
            density: density,
            confidence: this.calculateConfidence(matchingChunks, dimensions),
            description: this.generateDescription(dimensions, files.length)
        };
    }
    
    /**
     * Calcula densidade da convergência
     */
    calculateDensity(matchedChunks, totalChunks, activeDimensions, maxDimensions) {
        if (totalChunks === 0) return 0;
        
        // Fórmula da FORMULA-DO-SUCESSO.md
        const intersectionRatio = matchedChunks / totalChunks;
        const dimensionRatio = activeDimensions / maxDimensions;
        const confidenceWeight = 0.85; // Peso de confiança base
        
        return (intersectionRatio * 0.4) + (dimensionRatio * 0.4) + (confidenceWeight * 0.2);
    }
    
    /**
     * Calcula confiança da interseção
     */
    calculateConfidence(chunks, dimensions) {
        if (chunks.length === 0) return 0;
        
        // Média dos scores nas dimensões ativas
        const avgScore = chunks.reduce((sum, chunk) => {
            const dimScore = dimensions.reduce((s, dim) => s + chunk.dimensionScores[dim], 0);
            return sum + (dimScore / dimensions.length);
        }, 0) / chunks.length;
        
        // Ajustar por quantidade de chunks (mais chunks = mais confiança)
        const quantityBonus = Math.min(chunks.length / 10, 1) * 0.2;
        
        return Math.min(avgScore + quantityBonus, 1);
    }
    
    /**
     * Gera descrição textual da interseção
     */
    generateDescription(dimensions, fileCount) {
        const dimNames = {
            temporal: 'temporal',
            semantic: 'semântica',
            categorical: 'categorial',
            analytical: 'analítica'
        };
        
        const dimList = dimensions.map(d => dimNames[d]).join(' + ');
        
        return `Convergência ${dimList} (${fileCount} arquivo${fileCount !== 1 ? 's' : ''})`;
    }
    
    /**
     * Otimiza interseções removendo redundâncias
     */
    optimizeIntersections(intersections) {
        // Remover interseções que são subconjuntos de outras com densidade similar
        const optimized = [];
        
        for (const intersection of intersections) {
            let isSubset = false;
            
            for (const other of optimized) {
                // Verificar se é subconjunto
                if (intersection.dimensions.every(d => other.dimensions.includes(d))) {
                    // Se a densidade é similar (diferença < 10%), é redundante
                    if (Math.abs(intersection.density - other.density) < 0.1) {
                        isSubset = true;
                        break;
                    }
                }
            }
            
            if (!isSubset) {
                optimized.push(intersection);
            }
        }
        
        return optimized;
    }
}

// Exportar para uso global
window.IntersectionCalculator = IntersectionCalculator;