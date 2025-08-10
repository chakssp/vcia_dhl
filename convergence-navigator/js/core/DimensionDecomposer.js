/**
 * 🔍 DimensionDecomposer - Decompositor Multi-dimensional de Intenções
 * 
 * Extrai dimensões temporal, semântica, categorial e analítica de uma intenção textual
 */
class DimensionDecomposer {
    constructor() {
        // Padrões temporais
        this.temporalPatterns = {
            relative: {
                hoje: { days: 1, label: 'Hoje' },
                ontem: { days: 2, label: 'Ontem' },
                'esta semana': { days: 7, label: 'Esta semana' },
                'semana passada': { days: 14, label: 'Semana passada' },
                'este mês': { days: 30, label: 'Este mês' },
                'mês passado': { days: 60, label: 'Mês passado' },
                'este ano': { days: 365, label: 'Este ano' },
                'ano passado': { days: 730, label: 'Ano passado' },
                recente: { days: 30, label: 'Recente (30 dias)' },
                recentemente: { days: 30, label: 'Recentemente' }
            },
            quantified: {
                pattern: /últim[oa]s?\s+(\d+)\s+(dia|dias|semana|semanas|mês|meses|ano|anos)/i,
                multipliers: {
                    dia: 1, dias: 1,
                    semana: 7, semanas: 7,
                    mês: 30, meses: 30,
                    ano: 365, anos: 365
                }
            },
            specific: {
                pattern: /(?:em\s+)?(\d{4})|(?:(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(?:de\s+)?(\d{4}))/i,
                months: {
                    janeiro: 1, fevereiro: 2, março: 3, abril: 4,
                    maio: 5, junho: 6, julho: 7, agosto: 8,
                    setembro: 9, outubro: 10, novembro: 11, dezembro: 12
                }
            }
        };
        
        // Mapeamento de categorias
        this.categoryMappings = {
            // Técnico
            'ia': ['Técnico', 'Inteligência Artificial'],
            'inteligência artificial': ['Técnico', 'Inteligência Artificial'],
            'machine learning': ['Técnico', 'Machine Learning', 'Inteligência Artificial'],
            'ml': ['Técnico', 'Machine Learning'],
            'deep learning': ['Técnico', 'Deep Learning', 'Inteligência Artificial'],
            'neural': ['Técnico', 'Redes Neurais', 'Inteligência Artificial'],
            'llm': ['Técnico', 'LLM', 'Inteligência Artificial'],
            'embedding': ['Técnico', 'Embeddings', 'Inteligência Artificial'],
            'vector': ['Técnico', 'Vetores', 'Inteligência Artificial'],
            'código': ['Técnico', 'Desenvolvimento'],
            'programação': ['Técnico', 'Desenvolvimento'],
            'algoritmo': ['Técnico', 'Algoritmos'],
            'arquitetura': ['Técnico', 'Arquitetura'],
            'sistema': ['Técnico', 'Sistemas'],
            'api': ['Técnico', 'API'],
            'database': ['Técnico', 'Banco de Dados'],
            'dados': ['Técnico', 'Dados'],
            
            // Estratégico
            'estratégia': ['Estratégico', 'Planejamento'],
            'estratégico': ['Estratégico'],
            'decisão': ['Estratégico', 'Decisão'],
            'planejamento': ['Estratégico', 'Planejamento'],
            'objetivo': ['Estratégico', 'Objetivos'],
            'meta': ['Estratégico', 'Metas'],
            'kpi': ['Estratégico', 'KPI'],
            'roi': ['Estratégico', 'ROI'],
            
            // Conceitual
            'conceito': ['Conceitual', 'Teoria'],
            'teoria': ['Conceitual', 'Teoria'],
            'paradigma': ['Conceitual', 'Paradigma'],
            'framework': ['Conceitual', 'Framework'],
            'metodologia': ['Conceitual', 'Metodologia'],
            'abordagem': ['Conceitual', 'Abordagem'],
            
            // Descoberta
            'descoberta': ['Descoberta', 'Insight'],
            'breakthrough': ['Descoberta', 'Breakthrough'],
            'insight': ['Descoberta', 'Insight'],
            'revelação': ['Descoberta', 'Revelação'],
            'eureka': ['Descoberta', 'Eureka'],
            
            // Evolução
            'evolução': ['Evolução', 'Progresso'],
            'progresso': ['Evolução', 'Progresso'],
            'avanço': ['Evolução', 'Avanço'],
            'melhoria': ['Evolução', 'Melhoria'],
            'aprendizado': ['Evolução', 'Aprendizado'],
            'desenvolvimento': ['Evolução', 'Desenvolvimento'],
            'crescimento': ['Evolução', 'Crescimento']
        };
        
        // Tipos de análise
        this.analysisTypes = {
            'breakthrough técnico': ['breakthrough', 'descoberta', 'inovação', 'nova', 'novo'],
            'evolução conceitual': ['evolução', 'progresso', 'desenvolvimento', 'aprendizado'],
            'decisão estratégica': ['decisão', 'estratégia', 'escolha', 'opção'],
            'análise comparativa': ['comparar', 'versus', 'diferença', 'melhor', 'pior'],
            'revisão sistemática': ['revisão', 'review', 'análise', 'estudo'],
            'síntese integrativa': ['síntese', 'integração', 'consolidação', 'unificação']
        };
        
        // Stop words em português
        this.stopWords = new Set([
            'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'da', 'do', 'dos', 'das',
            'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem',
            'sobre', 'entre', 'após', 'até', 'desde', 'durante',
            'que', 'qual', 'quais', 'como', 'quando', 'onde',
            'e', 'ou', 'mas', 'porém', 'todavia', 'contudo',
            'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas',
            'meu', 'minha', 'meus', 'minhas', 'seu', 'sua', 'seus', 'suas',
            'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
            'aquele', 'aquela', 'aqueles', 'aquelas',
            'muito', 'pouco', 'mais', 'menos', 'bem', 'mal',
            'sim', 'não', 'talvez', 'já', 'ainda', 'sempre', 'nunca'
        ]);
    }
    
    /**
     * Decompõe uma intenção em múltiplas dimensões
     */
    async decompose(intention) {
        if (!intention || typeof intention !== 'string') {
            throw new Error('Intenção inválida para decomposição');
        }
        
        console.log('🔍 Decomposição dimensional:', intention);
        
        const normalized = this.normalizeText(intention);
        
        const result = {
            original: intention,
            normalized: normalized,
            temporal: this.extractTemporal(intention, normalized),
            semantic: this.extractSemantic(normalized),
            categorical: this.inferCategories(normalized),
            analytical: this.identifyAnalysisType(normalized),
            confidence: 0
        };
        
        // Calcular confiança da decomposição
        result.confidence = this.calculateConfidence(result);
        
        console.log('📊 Resultado da decomposição:', result);
        
        return result;
    }
    
    /**
     * Normaliza o texto para análise
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^\w\s]/g, ' ') // Remove pontuação
            .replace(/\s+/g, ' ') // Normaliza espaços
            .trim();
    }
    
    /**
     * Extrai dimensão temporal
     */
    extractTemporal(original, normalized) {
        const result = {
            type: null,
            value: null,
            label: null,
            startDate: null,
            endDate: null,
            days: null
        };
        
        // Verificar padrões relativos
        for (const [key, config] of Object.entries(this.temporalPatterns.relative)) {
            if (normalized.includes(key)) {
                const now = new Date();
                const startDate = new Date(now);
                startDate.setDate(startDate.getDate() - config.days);
                
                result.type = 'relative';
                result.value = key;
                result.label = config.label;
                result.days = config.days;
                result.startDate = startDate.toISOString();
                result.endDate = now.toISOString();
                
                return result;
            }
        }
        
        // Verificar padrões quantificados (últimos X dias/meses/anos)
        const quantMatch = original.match(this.temporalPatterns.quantified.pattern);
        if (quantMatch) {
            const quantity = parseInt(quantMatch[1]);
            const unit = quantMatch[2].replace(/s$/, ''); // Remove plural
            const multiplier = this.temporalPatterns.quantified.multipliers[unit] || 1;
            const days = quantity * multiplier;
            
            const now = new Date();
            const startDate = new Date(now);
            startDate.setDate(startDate.getDate() - days);
            
            result.type = 'quantified';
            result.value = quantMatch[0];
            result.label = `Últimos ${quantity} ${quantMatch[2]}`;
            result.days = days;
            result.startDate = startDate.toISOString();
            result.endDate = now.toISOString();
            
            return result;
        }
        
        // Verificar anos específicos
        const yearMatch = original.match(/\b(20\d{2})\b/);
        if (yearMatch) {
            const year = parseInt(yearMatch[1]);
            
            result.type = 'specific';
            result.value = yearMatch[0];
            result.label = `Ano ${year}`;
            result.startDate = new Date(year, 0, 1).toISOString();
            result.endDate = new Date(year, 11, 31).toISOString();
            
            return result;
        }
        
        // Se não encontrar padrão temporal, retornar null
        return null;
    }
    
    /**
     * Extrai dimensão semântica (keywords principais)
     */
    extractSemantic(normalized) {
        const words = normalized.split(/\s+/);
        const keywords = [];
        const frequency = new Map();
        
        // Filtrar stop words e contar frequência
        for (const word of words) {
            if (word.length > 2 && !this.stopWords.has(word)) {
                frequency.set(word, (frequency.get(word) || 0) + 1);
                if (!keywords.includes(word)) {
                    keywords.push(word);
                }
            }
        }
        
        // Adicionar bigramas relevantes
        for (let i = 0; i < words.length - 1; i++) {
            const bigram = `${words[i]} ${words[i + 1]}`;
            if (!this.stopWords.has(words[i]) && !this.stopWords.has(words[i + 1])) {
                if (this.categoryMappings[bigram]) {
                    keywords.push(bigram);
                }
            }
        }
        
        // Ordenar por relevância (frequência e posição)
        keywords.sort((a, b) => {
            const freqA = frequency.get(a) || 1;
            const freqB = frequency.get(b) || 1;
            if (freqA !== freqB) return freqB - freqA;
            
            // Se mesma frequência, priorizar por posição
            const posA = normalized.indexOf(a);
            const posB = normalized.indexOf(b);
            return posA - posB;
        });
        
        // Retornar top keywords
        return keywords.slice(0, 10);
    }
    
    /**
     * Infere categorias baseado no conteúdo
     */
    inferCategories(normalized) {
        const categories = new Set();
        const words = normalized.split(/\s+/);
        
        // Verificar palavras individuais
        for (const word of words) {
            if (this.categoryMappings[word]) {
                this.categoryMappings[word].forEach(cat => categories.add(cat));
            }
        }
        
        // Verificar bigramas
        for (let i = 0; i < words.length - 1; i++) {
            const bigram = `${words[i]} ${words[i + 1]}`;
            if (this.categoryMappings[bigram]) {
                this.categoryMappings[bigram].forEach(cat => categories.add(cat));
            }
        }
        
        // Se não encontrar categorias, tentar inferir genericamente
        if (categories.size === 0) {
            if (normalized.includes('técnic') || normalized.includes('código') || normalized.includes('sistema')) {
                categories.add('Técnico');
            }
            if (normalized.includes('estratég') || normalized.includes('decisão') || normalized.includes('planej')) {
                categories.add('Estratégico');
            }
            if (normalized.includes('aprend') || normalized.includes('conhec') || normalized.includes('estud')) {
                categories.add('Aprendizado');
            }
        }
        
        return Array.from(categories);
    }
    
    /**
     * Identifica o tipo de análise
     */
    identifyAnalysisType(normalized) {
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [type, keywords] of Object.entries(this.analysisTypes)) {
            let score = 0;
            for (const keyword of keywords) {
                if (normalized.includes(keyword)) {
                    score++;
                }
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = type;
            }
        }
        
        // Se não encontrar match específico, determinar por contexto
        if (!bestMatch) {
            if (normalized.includes('descobr') || normalized.includes('nov')) {
                bestMatch = 'breakthrough técnico';
            } else if (normalized.includes('evolu') || normalized.includes('progress')) {
                bestMatch = 'evolução conceitual';
            } else if (normalized.includes('compar') || normalized.includes('analis')) {
                bestMatch = 'análise comparativa';
            } else {
                bestMatch = 'análise geral';
            }
        }
        
        return bestMatch;
    }
    
    /**
     * Calcula confiança da decomposição
     */
    calculateConfidence(decomposition) {
        let score = 0;
        let maxScore = 4;
        
        // Pontuação por dimensão identificada
        if (decomposition.temporal) score += 1;
        if (decomposition.semantic && decomposition.semantic.length > 0) score += 1;
        if (decomposition.categorical && decomposition.categorical.length > 0) score += 1;
        if (decomposition.analytical && decomposition.analytical !== 'análise geral') score += 1;
        
        // Bônus por riqueza de informação
        if (decomposition.semantic && decomposition.semantic.length > 3) score += 0.5;
        if (decomposition.categorical && decomposition.categorical.length > 2) score += 0.5;
        
        return Math.min(score / maxScore, 1);
    }
    
    /**
     * Valida uma decomposição
     */
    validate(decomposition) {
        const errors = [];
        
        if (!decomposition.semantic || decomposition.semantic.length === 0) {
            errors.push('Nenhuma palavra-chave semântica identificada');
        }
        
        if (decomposition.confidence < 0.3) {
            errors.push('Confiança muito baixa na decomposição');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors,
            confidence: decomposition.confidence
        };
    }
}

// Exportar para uso global
window.DimensionDecomposer = DimensionDecomposer;