/**
 * 🛤️ NavigationPath - Gerador de Caminhos Navegáveis
 * 
 * Transforma convergências em caminhos navegáveis com contexto e direção
 */
class NavigationPath {
    constructor() {
        this.maxPaths = 5;
        this.minConfidence = 0.5;
    }
    
    /**
     * Gera caminhos navegáveis a partir de convergências
     */
    async generate(convergences) {
        console.log('🛤️ Gerando caminhos navegáveis...');
        
        if (!convergences || convergences.length === 0) {
            return this.getEmptyPaths();
        }
        
        const paths = [];
        
        // Processar cada convergência
        for (let i = 0; i < Math.min(convergences.length, this.maxPaths); i++) {
            const convergence = convergences[i];
            
            // Pular convergências com confiança muito baixa
            if (convergence.density < this.minConfidence && i > 0) {
                continue;
            }
            
            const path = this.createPath(convergence, i);
            paths.push(path);
        }
        
        // Conectar caminhos (identificar relações)
        this.connectPaths(paths);
        
        // Enriquecer com contexto
        await this.enrichPaths(paths);
        
        console.log(`✅ ${paths.length} caminhos gerados`);
        
        return paths;
    }
    
    /**
     * Cria um caminho individual
     */
    createPath(convergence, index) {
        const pathType = index === 0 ? 'primary' : 'alternative';
        const pathId = `path-${Date.now()}-${index}`;
        
        return {
            id: pathId,
            type: pathType,
            
            // Métricas principais
            density: convergence.density,
            confidence: convergence.density, // Por enquanto igual à densidade
            strength: this.calculateStrength(convergence),
            
            // Descrição e contexto
            description: this.generateDescription(convergence, pathType),
            narrative: this.generateNarrative(convergence),
            
            // Dimensões participantes
            dimensions: convergence.dimensions || [],
            dimensionDetails: this.extractDimensionDetails(convergence),
            
            // Evidências
            evidenceCount: convergence.files ? convergence.files.length : 0,
            files: convergence.files || [],
            chunks: convergence.intersections || [],
            
            // Navegação
            navigation: {
                steps: this.generateNavigationSteps(convergence),
                focus: this.identifyFocus(convergence),
                direction: this.determineDirection(convergence)
            },
            
            // Metadados
            created: new Date().toISOString(),
            convergenceId: convergence.id || null
        };
    }
    
    /**
     * Calcula força do caminho
     */
    calculateStrength(convergence) {
        // Combinar densidade, número de dimensões e quantidade de evidências
        const densityWeight = convergence.density * 0.5;
        const dimensionWeight = (convergence.dimensions.length / 4) * 0.3;
        const evidenceWeight = Math.min(convergence.files.length / 10, 1) * 0.2;
        
        return densityWeight + dimensionWeight + evidenceWeight;
    }
    
    /**
     * Gera descrição textual do caminho
     */
    generateDescription(convergence, pathType) {
        const dimensionNames = {
            temporal: 'temporal',
            semantic: 'semântica',
            categorical: 'categorial',
            analytical: 'analítica'
        };
        
        const dims = convergence.dimensions
            .map(d => dimensionNames[d] || d)
            .join(' + ');
        
        const density = Math.round(convergence.density * 100);
        const files = convergence.files.length;
        
        if (pathType === 'primary') {
            return `Convergência principal ${dims} com ${density}% de densidade em ${files} arquivo${files !== 1 ? 's' : ''}`;
        } else {
            return `Caminho alternativo via ${dims} (${density}% densidade, ${files} arquivo${files !== 1 ? 's' : ''})`;
        }
    }
    
    /**
     * Gera narrativa explicativa
     */
    generateNarrative(convergence) {
        const narratives = {
            high: [
                "Esta é uma convergência forte que indica um padrão claro e consistente nos seus dados.",
                "Alta densidade de interseção sugere que este é um tema central no seu conhecimento.",
                "Múltiplas dimensões convergem aqui, revelando um ponto focal importante."
            ],
            medium: [
                "Convergência moderada que pode revelar conexões interessantes.",
                "Este caminho mostra relações emergentes que merecem exploração.",
                "Densidade média sugere um tema em desenvolvimento."
            ],
            low: [
                "Convergência inicial que pode indicar novas áreas de interesse.",
                "Caminho exploratório com potencial para descobertas.",
                "Conexões sutis que podem revelar insights não óbvios."
            ]
        };
        
        let level = 'low';
        if (convergence.density > 0.8) level = 'high';
        else if (convergence.density > 0.6) level = 'medium';
        
        const options = narratives[level];
        return options[Math.floor(Math.random() * options.length)];
    }
    
    /**
     * Extrai detalhes das dimensões
     */
    extractDimensionDetails(convergence) {
        const details = {};
        
        if (convergence.intersections && convergence.intersections.length > 0) {
            // Extrair informações agregadas das interseções
            const firstIntersection = convergence.intersections[0];
            
            if (firstIntersection.chunk) {
                const chunk = firstIntersection.chunk;
                
                if (chunk.keywords) {
                    details.semantic = chunk.keywords.slice(0, 5);
                }
                
                if (chunk.categories) {
                    details.categorical = chunk.categories;
                }
                
                if (chunk.analysisType) {
                    details.analytical = chunk.analysisType;
                }
                
                if (chunk.lastModified) {
                    details.temporal = this.formatTemporalInfo(chunk.lastModified);
                }
            }
        }
        
        return details;
    }
    
    /**
     * Formata informação temporal
     */
    formatTemporalInfo(date) {
        const d = new Date(date);
        const now = new Date();
        const days = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'Hoje';
        if (days === 1) return 'Ontem';
        if (days < 7) return `${days} dias atrás`;
        if (days < 30) return `${Math.floor(days / 7)} semanas atrás`;
        if (days < 365) return `${Math.floor(days / 30)} meses atrás`;
        
        return d.toLocaleDateString('pt-BR');
    }
    
    /**
     * Gera passos de navegação
     */
    generateNavigationSteps(convergence) {
        const steps = [];
        
        // Passo 1: Explorar dimensão principal
        if (convergence.dimensions.length > 0) {
            steps.push({
                order: 1,
                action: 'explore',
                target: convergence.dimensions[0],
                description: `Explorar dimensão ${convergence.dimensions[0]}`
            });
        }
        
        // Passo 2: Verificar interseções
        if (convergence.dimensions.length > 1) {
            steps.push({
                order: 2,
                action: 'intersect',
                target: convergence.dimensions.slice(0, 2),
                description: 'Analisar interseções entre dimensões'
            });
        }
        
        // Passo 3: Examinar evidências
        if (convergence.files && convergence.files.length > 0) {
            steps.push({
                order: 3,
                action: 'examine',
                target: convergence.files[0],
                description: `Examinar evidência principal: ${convergence.files[0]}`
            });
        }
        
        // Passo 4: Sintetizar insights
        steps.push({
            order: steps.length + 1,
            action: 'synthesize',
            target: 'insights',
            description: 'Sintetizar insights da convergência'
        });
        
        return steps;
    }
    
    /**
     * Identifica foco principal do caminho
     */
    identifyFocus(convergence) {
        // Determinar qual dimensão tem maior peso
        if (convergence.dimensions.includes('semantic')) {
            return {
                type: 'conceptual',
                description: 'Foco em conceitos e ideias'
            };
        } else if (convergence.dimensions.includes('temporal')) {
            return {
                type: 'chronological',
                description: 'Foco em evolução temporal'
            };
        } else if (convergence.dimensions.includes('categorical')) {
            return {
                type: 'thematic',
                description: 'Foco em temas e categorias'
            };
        } else if (convergence.dimensions.includes('analytical')) {
            return {
                type: 'analytical',
                description: 'Foco em análise e insights'
            };
        }
        
        return {
            type: 'general',
            description: 'Exploração geral'
        };
    }
    
    /**
     * Determina direção de navegação
     */
    determineDirection(convergence) {
        const density = convergence.density;
        
        if (density > 0.8) {
            return {
                type: 'deep',
                description: 'Aprofundamento vertical',
                recommendation: 'Explore detalhes e nuances'
            };
        } else if (density > 0.6) {
            return {
                type: 'broad',
                description: 'Expansão horizontal',
                recommendation: 'Explore conexões relacionadas'
            };
        } else {
            return {
                type: 'exploratory',
                description: 'Exploração aberta',
                recommendation: 'Descubra novas conexões'
            };
        }
    }
    
    /**
     * Conecta caminhos identificando relações
     */
    connectPaths(paths) {
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            path.connections = [];
            
            for (let j = 0; j < paths.length; j++) {
                if (i === j) continue;
                
                const otherPath = paths[j];
                
                // Verificar overlap de dimensões
                const commonDimensions = path.dimensions.filter(d => 
                    otherPath.dimensions.includes(d)
                );
                
                if (commonDimensions.length > 0) {
                    path.connections.push({
                        pathId: otherPath.id,
                        type: 'dimensional',
                        strength: commonDimensions.length / Math.max(path.dimensions.length, otherPath.dimensions.length),
                        commonDimensions: commonDimensions
                    });
                }
                
                // Verificar overlap de arquivos
                const commonFiles = path.files.filter(f => 
                    otherPath.files.includes(f)
                );
                
                if (commonFiles.length > 0) {
                    const existingConnection = path.connections.find(c => c.pathId === otherPath.id);
                    
                    if (existingConnection) {
                        existingConnection.commonFiles = commonFiles;
                        existingConnection.strength = Math.max(
                            existingConnection.strength,
                            commonFiles.length / Math.max(path.files.length, otherPath.files.length)
                        );
                    } else {
                        path.connections.push({
                            pathId: otherPath.id,
                            type: 'evidential',
                            strength: commonFiles.length / Math.max(path.files.length, otherPath.files.length),
                            commonFiles: commonFiles
                        });
                    }
                }
            }
            
            // Ordenar conexões por força
            path.connections.sort((a, b) => b.strength - a.strength);
        }
    }
    
    /**
     * Enriquece caminhos com contexto adicional
     */
    async enrichPaths(paths) {
        for (const path of paths) {
            // Adicionar sugestões de exploração
            path.suggestions = this.generateSuggestions(path);
            
            // Adicionar perguntas guia
            path.questions = this.generateQuestions(path);
            
            // Adicionar tags
            path.tags = this.generateTags(path);
        }
    }
    
    /**
     * Gera sugestões de exploração
     */
    generateSuggestions(path) {
        const suggestions = [];
        
        if (path.density > 0.8) {
            suggestions.push("Aprofunde-se nos detalhes desta convergência forte");
            suggestions.push("Explore padrões recorrentes nas evidências");
        } else if (path.density > 0.6) {
            suggestions.push("Verifique conexões com outros temas relacionados");
            suggestions.push("Identifique gaps que podem ser preenchidos");
        } else {
            suggestions.push("Use como ponto de partida para exploração mais ampla");
            suggestions.push("Considere refinar sua intenção para foco mais específico");
        }
        
        // Sugestões baseadas em dimensões
        if (path.dimensions.includes('temporal')) {
            suggestions.push("Analise a evolução cronológica do tema");
        }
        if (path.dimensions.includes('semantic')) {
            suggestions.push("Explore variações e sinônimos dos conceitos");
        }
        
        return suggestions;
    }
    
    /**
     * Gera perguntas guia
     */
    generateQuestions(path) {
        const questions = [];
        
        // Perguntas baseadas na densidade
        if (path.density > 0.7) {
            questions.push("O que torna esta convergência tão forte?");
            questions.push("Que padrões emergem das evidências?");
        } else {
            questions.push("Que conexões ainda não foram exploradas?");
            questions.push("Como fortalecer esta convergência?");
        }
        
        // Perguntas baseadas nas dimensões
        if (path.dimensions.includes('temporal')) {
            questions.push("Como este tema evoluiu ao longo do tempo?");
        }
        if (path.dimensions.includes('categorical')) {
            questions.push("Que categorias relacionadas podem ser exploradas?");
        }
        
        return questions;
    }
    
    /**
     * Gera tags descritivas
     */
    generateTags(path) {
        const tags = [];
        
        // Tags de densidade
        if (path.density > 0.8) tags.push('alta-convergência');
        else if (path.density > 0.6) tags.push('média-convergência');
        else tags.push('exploratório');
        
        // Tags de tipo
        if (path.type === 'primary') tags.push('principal');
        else tags.push('alternativo');
        
        // Tags de dimensões
        path.dimensions.forEach(dim => tags.push(dim));
        
        // Tags de quantidade
        if (path.evidenceCount > 10) tags.push('rico-em-evidências');
        else if (path.evidenceCount > 5) tags.push('bem-documentado');
        else tags.push('exploração-inicial');
        
        return tags;
    }
    
    /**
     * Retorna caminhos vazios (quando não há convergências)
     */
    getEmptyPaths() {
        return [{
            id: 'empty-path',
            type: 'empty',
            density: 0,
            confidence: 0,
            strength: 0,
            description: 'Nenhuma convergência encontrada',
            narrative: 'Tente refinar sua intenção ou explorar diferentes dimensões',
            dimensions: [],
            files: [],
            navigation: {
                steps: [{
                    order: 1,
                    action: 'refine',
                    target: 'intention',
                    description: 'Refinar intenção de navegação'
                }],
                focus: { type: 'none', description: 'Sem foco definido' },
                direction: { type: 'exploratory', description: 'Exploração aberta' }
            },
            suggestions: [
                "Seja mais específico na sua intenção",
                "Adicione contexto temporal (quando?)",
                "Inclua palavras-chave relevantes",
                "Especifique categorias de interesse"
            ],
            questions: [
                "O que você realmente busca descobrir?",
                "Qual período de tempo é relevante?",
                "Que tipo de insight você espera encontrar?"
            ],
            tags: ['sem-convergência', 'refinar-busca']
        }];
    }
}

// Exportar para uso global
window.NavigationPath = NavigationPath;