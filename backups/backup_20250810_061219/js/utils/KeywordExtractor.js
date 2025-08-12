/**
 * KeywordExtractor.js - Extração Inteligente de Keywords e Entidades
 * 
 * NÃO usa frequência simples - extrai CONCEITOS RELEVANTES
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class KeywordExtractor {
        constructor() {
            // Stop words em português
            this.stopWords = new Set([
                // Artigos e preposições
                'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
                'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
                'por', 'para', 'com', 'sem', 'sob', 'sobre',
                // Pronomes
                'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas',
                'este', 'esta', 'esse', 'essa', 'aquele', 'aquela',
                'isto', 'isso', 'aquilo',
                // Verbos auxiliares
                'ser', 'estar', 'ter', 'haver', 'fazer',
                'é', 'são', 'foi', 'foram', 'será', 'serão',
                'está', 'estão', 'estava', 'estavam',
                'tem', 'têm', 'tinha', 'tinham',
                // Conectivos
                'e', 'ou', 'mas', 'porém', 'contudo', 'todavia',
                'porque', 'pois', 'como', 'quando', 'onde',
                // Palavras comuns
                'muito', 'mais', 'menos', 'bem', 'mal',
                'sim', 'não', 'talvez', 'apenas', 'só',
                'já', 'ainda', 'sempre', 'nunca',
                'aqui', 'ali', 'lá', 'agora', 'hoje', 'ontem', 'amanhã'
            ]);

            // Padrões para identificar entidades
            this.patterns = {
                // Tecnologias e ferramentas
                technologies: /\b(JavaScript|Python|React|Vue|Angular|Node\.?js|Docker|Kubernetes|AWS|Azure|GCP|MongoDB|PostgreSQL|Redis|Elasticsearch|Qdrant|Pinecone|ChromaDB|LangChain|OpenAI|Claude|GPT-?\d?|BERT|Transformer|embedding|vector|database|API|REST|GraphQL|WebSocket|HTTP|JSON|XML|HTML|CSS|SQL|NoSQL)\b/gi,
                
                // Conceitos de ML/AI
                mlConcepts: /\b(machine learning|deep learning|neural network|inteligência artificial|aprendizado de máquina|rede neural|embedding|vector|dimension|cluster|classification|regression|transformer|attention|fine-?tuning|RAG|retrieval|augmented|generation|LLM|NLP|processamento de linguagem|semântica|convergência)\b/gi,
                
                // Conceitos de negócio
                businessConcepts: /\b(estratégia|decisão|análise|insight|breakthrough|evolução|transformação|inovação|otimização|performance|métrica|KPI|ROI|stakeholder|requisito|especificação|documento|relatório|dashboard|visualização)\b/gi,
                
                // Datas e períodos
                temporal: /\b(20\d{2}|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|Q[1-4]|trimestre|semestre|ano|mês|semana|dia|hoje|ontem|amanhã|recente|atual|futuro|passado)\b/gi,
                
                // Arquivos e formatos
                fileTypes: /\b([a-zA-Z0-9_-]+\.(md|txt|pdf|docx?|xlsx?|json|js|py|java|cpp|cs|rb|go|rs|ts|jsx|tsx|vue|yaml|yml|xml|html|css))\b/gi
            };
        }

        /**
         * Extrai keywords inteligentes do conteúdo
         * @param {string} content - Conteúdo para análise
         * @returns {object} Objeto com diferentes tipos de keywords
         */
        extract(content) {
            if (!content || typeof content !== 'string') {
                return {
                    keywords: [],
                    entities: {
                        technologies: [],
                        concepts: [],
                        dates: [],
                        files: []
                    },
                    topics: []
                };
            }

            // 1. Extrair entidades nomeadas
            const entities = this.extractEntities(content);
            
            // 2. Extrair conceitos-chave (não apenas frequência)
            const concepts = this.extractKeyConcepts(content);
            
            // 3. Gerar keywords consolidadas (máximo 10)
            const keywords = this.consolidateKeywords(entities, concepts);
            
            // 4. Identificar tópicos principais
            const topics = this.identifyTopics(content, entities, concepts);

            return {
                keywords: keywords,        // Para retrocompatibilidade
                entities: entities,         // Entidades estruturadas
                topics: topics             // Tópicos identificados
            };
        }

        /**
         * Extrai entidades nomeadas usando padrões
         */
        extractEntities(content) {
            const entities = {
                technologies: [],
                concepts: [],
                dates: [],
                files: []
            };

            // Extrair tecnologias
            const techMatches = content.match(this.patterns.technologies) || [];
            entities.technologies = [...new Set(techMatches.map(t => t.trim()))];

            // Extrair conceitos de ML
            const mlMatches = content.match(this.patterns.mlConcepts) || [];
            
            // Extrair conceitos de negócio
            const businessMatches = content.match(this.patterns.businessConcepts) || [];
            
            entities.concepts = [...new Set([
                ...mlMatches.map(c => c.trim()),
                ...businessMatches.map(c => c.trim())
            ])];

            // Extrair referências temporais
            const temporalMatches = content.match(this.patterns.temporal) || [];
            entities.dates = [...new Set(temporalMatches.map(d => d.trim()))];

            // Extrair nomes de arquivos
            const fileMatches = content.match(this.patterns.fileTypes) || [];
            entities.files = [...new Set(fileMatches.map(f => f.trim()))];

            return entities;
        }

        /**
         * Extrai conceitos-chave usando TF-IDF simplificado
         */
        extractKeyConcepts(content) {
            // Limpar e tokenizar
            const words = content
                .toLowerCase()
                .replace(/[^\wàáâãèéêìíîòóôõùúûç\s-]/g, ' ')
                .split(/\s+/)
                .filter(word => 
                    word.length > 3 && 
                    !this.stopWords.has(word) &&
                    !/^\d+$/.test(word)
                );

            // Calcular frequência
            const frequency = {};
            words.forEach(word => {
                frequency[word] = (frequency[word] || 0) + 1;
            });

            // Calcular TF-IDF simplificado
            // Penalizar palavras muito comuns (aparecem em > 50% das frases)
            const sentences = content.split(/[.!?]+/);
            const docFrequency = {};
            
            Object.keys(frequency).forEach(word => {
                let appearanceCount = 0;
                sentences.forEach(sentence => {
                    if (sentence.toLowerCase().includes(word)) {
                        appearanceCount++;
                    }
                });
                docFrequency[word] = appearanceCount / sentences.length;
            });

            // Calcular score final
            const scores = {};
            Object.keys(frequency).forEach(word => {
                const tf = frequency[word] / words.length;
                const idf = Math.log(1 / (docFrequency[word] + 0.01));
                scores[word] = tf * idf;
            });

            // Retornar top conceitos
            return Object.entries(scores)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 15)
                .map(([word]) => word);
        }

        /**
         * Consolida keywords de diferentes fontes
         */
        consolidateKeywords(entities, concepts) {
            const allKeywords = new Set();

            // Adicionar top tecnologias
            entities.technologies.slice(0, 3).forEach(t => allKeywords.add(t.toLowerCase()));
            
            // Adicionar top conceitos
            entities.concepts.slice(0, 3).forEach(c => allKeywords.add(c.toLowerCase()));
            
            // Adicionar conceitos extraídos por TF-IDF
            concepts.slice(0, 4).forEach(c => allKeywords.add(c));

            return Array.from(allKeywords).slice(0, 10);
        }

        /**
         * Identifica tópicos principais do documento
         */
        identifyTopics(content, entities, concepts) {
            const topics = [];

            // Verificar se é sobre ML/AI
            if (entities.technologies.some(t => /GPT|Claude|embedding|vector/i.test(t)) ||
                entities.concepts.some(c => /machine learning|inteligência artificial/i.test(c))) {
                topics.push('Inteligência Artificial');
            }

            // Verificar se é sobre arquitetura
            if (entities.concepts.some(c => /arquitetura|design|estrutura/i.test(c))) {
                topics.push('Arquitetura de Software');
            }

            // Verificar se é estratégico
            if (entities.concepts.some(c => /estratégia|decisão|insight/i.test(c))) {
                topics.push('Estratégia');
            }

            // Verificar se é sobre dados
            if (entities.technologies.some(t => /database|MongoDB|PostgreSQL|Redis/i.test(t))) {
                topics.push('Banco de Dados');
            }

            return topics;
        }

        /**
         * Método para debug
         */
        debug(content) {
            const result = this.extract(content);
            console.log('=== EXTRAÇÃO DE KEYWORDS ===');
            console.log('Keywords:', result.keywords);
            console.log('Tecnologias:', result.entities.technologies);
            console.log('Conceitos:', result.entities.concepts);
            console.log('Datas:', result.entities.dates);
            console.log('Arquivos:', result.entities.files);
            console.log('Tópicos:', result.topics);
            return result;
        }
    }

    // Registrar no namespace
    KC.KeywordExtractor = KeywordExtractor;

    // Expor para debug
    window.kckeywords = new KeywordExtractor();

})(window);