/**
 * WordCloudGenerator.js - Gerador de Nuvem de Palavras Estratégicas
 * 
 * Integra com nossa arquitetura existente para visualizar densidade semântica
 * baseado nas keywords estratégicas definidas pelo usuário
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    /**
     * Gerador de Word Cloud integrado com Advanced Storage Manager (AppState)
     */
    class WordCloudGenerator {
        constructor() {
            this.storageManager = KC.AppState; // Usa AppState como StorageManager
            this.cache = new Map(); // Cache em memória para performance
            this.defaultKeywords = ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'];
            this.config = {
                maxWords: 50,
                minFrequency: 1,
                enableCompression: false, // Temporariamente desabilitado para debug
                enableIntegrityCheck: true,
                updateMode: 'incremental' // 'full' ou 'incremental'
            };
        }

        /**
         * Gera word cloud baseada nos arquivos filtrados e keywords estratégicas
         */
        async generateWordCloud(parameters = {}) {
            try {
                const {
                    files = this.getFilteredFiles(),
                    keywords = this.getCombinedKeywords(),
                    maxWords = this.config.maxWords,
                    minFrequency = this.config.minFrequency,
                    useCache = true
                } = parameters;

                KC.Logger?.info('WordCloudGenerator: Iniciando geração de word cloud', {
                    filesCount: files.length,
                    keywordsCount: keywords.length
                });

                // Verifica cache primeiro
                const cacheKey = this.generateCacheKey(files, keywords, maxWords, minFrequency);
                if (useCache && this.cache.has(cacheKey)) {
                    KC.Logger?.info('WordCloudGenerator: Usando dados do cache');
                    return this.cache.get(cacheKey);
                }

                // Busca dados existentes do storage
                const existingData = await this.getExistingWordFrequencyData();
                
                // Gera frequências baseadas nos arquivos atuais
                const wordFrequencies = this.extractWordFrequencies(files, keywords);
                
                // Combina com dados existentes se modo incremental
                const finalFrequencies = this.config.updateMode === 'incremental' 
                    ? this.mergeFrequencies(existingData, wordFrequencies)
                    : wordFrequencies;

                // Filtra e ordena palavras
                const filteredWords = this.filterAndSortWords(finalFrequencies, maxWords, minFrequency);
                
                // Gera word cloud
                const wordCloudData = this.buildWordCloudData(filteredWords, keywords);
                
                // Aplica compressão se habilitada
                const finalData = this.config.enableCompression 
                    ? this.compressData(wordCloudData)
                    : wordCloudData;

                // Salva no storage
                await this.storeWordCloudData(finalData, finalFrequencies);
                
                // Adiciona ao cache
                this.cache.set(cacheKey, finalData);
                
                KC.Logger?.info('WordCloudGenerator: Word cloud gerada com sucesso', {
                    wordsCount: filteredWords.size,
                    hasMetadata: !!finalData.metadata,
                    metadataKeys: finalData.metadata ? Object.keys(finalData.metadata) : []
                });

                return finalData;

            } catch (error) {
                KC.Logger?.error('WordCloudGenerator: Erro na geração', error);
                return this.getEmptyWordCloud();
            }
        }

        /**
         * Extrai frequências de palavras dos arquivos
         */
        extractWordFrequencies(files, keywords) {
            const frequencies = new Map();
            const keywordSet = new Set(keywords.map(k => k.toLowerCase()));

            files.forEach(file => {
                // Combina conteúdo de diferentes fontes
                const searchableText = [
                    file.name || '',
                    file.content || '',
                    file.preview || '',
                    file.description || ''
                ].join(' ').toLowerCase();

                // Extrai palavras relevantes
                const words = this.extractRelevantWords(searchableText, keywordSet);
                
                // Conta frequências com peso baseado na relevância do arquivo
                const fileWeight = this.calculateFileWeight(file);
                
                words.forEach(word => {
                    const currentCount = frequencies.get(word) || 0;
                    frequencies.set(word, currentCount + fileWeight);
                });
            });

            return frequencies;
        }

        /**
         * Extrai palavras relevantes do texto
         */
        extractRelevantWords(text, keywordSet) {
            // Palavras de parada em português
            const stopWords = new Set([
                'a', 'o', 'e', 'de', 'do', 'da', 'para', 'com', 'em', 'por', 'um', 'uma',
                'que', 'se', 'na', 'no', 'como', 'mais', 'mas', 'ou', 'sua', 'seu',
                'este', 'esta', 'isso', 'aquele', 'aquela', 'são', 'foi', 'ser', 'ter',
                'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'
            ]);

            const words = text
                .replace(/[^\w\sáéíóúàèìòùâêîôûãõç]/gi, ' ')
                .split(/\s+/)
                .map(word => word.trim().toLowerCase())
                .filter(word => 
                    word.length >= 3 && 
                    !stopWords.has(word) &&
                    (keywordSet.has(word) || this.isRelevantWord(word))
                );

            return words;
        }

        /**
         * Verifica se palavra é relevante (contém elementos das keywords)
         */
        isRelevantWord(word) {
            const relevantPatterns = [
                /decisão|decision/i,
                /insight|percep/i,
                /transform|mudanç/i,
                /aprend|learn/i,
                /breakthrough|inovaç/i,
                /estratég|strategy/i,
                /project|projet/i,
                /análise|analysis/i
            ];

            return relevantPatterns.some(pattern => pattern.test(word));
        }

        /**
         * Calcula peso do arquivo baseado na relevância
         */
        calculateFileWeight(file) {
            let weight = 1;
            
            // Peso baseado na relevância calculada
            if (file.relevanceScore) {
                const relevance = file.relevanceScore > 1 ? file.relevanceScore : file.relevanceScore * 100;
                weight = Math.max(1, relevance / 50); // Normaliza para 1-2
            }
            
            // Peso adicional para arquivos analisados
            if (file.analyzed) weight *= 1.5;
            
            // Peso reduzido para arquivos arquivados
            if (file.archived) weight *= 0.5;
            
            return weight;
        }

        /**
         * Combina keywords base com keywords do usuário
         */
        getCombinedKeywords() {
            const userKeywords = this.storageManager.get('configuration.preAnalysis.keywords') || [];
            return [...this.defaultKeywords, ...userKeywords];
        }

        /**
         * Obtém arquivos filtrados atuais
         */
        getFilteredFiles() {
            if (KC.FileRenderer && KC.FileRenderer.filteredFiles) {
                return KC.FileRenderer.filteredFiles;
            }
            return this.storageManager.get('files') || [];
        }

        /**
         * Filtra e ordena palavras por frequência
         */
        filterAndSortWords(frequencies, maxWords, minFrequency) {
            return new Map(
                Array.from(frequencies.entries())
                    .filter(([word, freq]) => freq >= minFrequency)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, maxWords)
            );
        }

        /**
         * Constrói dados finais da word cloud
         */
        buildWordCloudData(frequencies, keywords) {
            // Verifica se há frequências para evitar erro no Math.max
            const maxFreq = frequencies.size > 0 ? Math.max(...frequencies.values()) : 1;
            const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
            
            const words = Array.from(frequencies.entries()).map(([word, frequency]) => ({
                text: word,
                frequency: frequency,
                size: this.calculateWordSize(frequency, maxFreq),
                color: this.getWordColor(word, keywordSet),
                isKeyword: keywordSet.has(word),
                weight: maxFreq > 0 ? frequency / maxFreq : 1
            }));

            return {
                words: words,
                metadata: {
                    maxFrequency: maxFreq,
                    totalWords: words.length,
                    keywordCount: words.filter(w => w.isKeyword).length,
                    generatedAt: new Date().toISOString(),
                    version: '1.0'
                }
            };
        }

        /**
         * Calcula tamanho visual da palavra
         */
        calculateWordSize(frequency, maxFreq) {
            const minSize = 12;
            const maxSize = 48;
            const ratio = maxFreq > 0 ? frequency / maxFreq : 1;
            return Math.round(minSize + (maxSize - minSize) * ratio);
        }

        /**
         * Define cor da palavra baseada no tipo
         */
        getWordColor(word, keywordSet) {
            if (keywordSet.has(word)) {
                return '#2563eb'; // Cor primária para keywords estratégicas
            }
            
            // Cores baseadas no tipo de palavra
            if (word.includes('decisão') || word.includes('decision')) return '#dc3545';
            if (word.includes('insight') || word.includes('percep')) return '#28a745';
            if (word.includes('transform') || word.includes('mudanç')) return '#fd7e14';
            if (word.includes('aprend') || word.includes('learn')) return '#6f42c1';
            if (word.includes('breakthrough') || word.includes('inovaç')) return '#20c997';
            
            return '#6c757d'; // Cor padrão
        }

        // === STORAGE MANAGER OPERATIONS ===

        /**
         * Busca dados existentes de frequência de palavras
         */
        async getExistingWordFrequencyData() {
            try {
                const data = this.storageManager.get('wordCloud.frequencies');
                
                // Converte dados para Map se necessário
                if (data && typeof data === 'object') {
                    if (data instanceof Map) {
                        return data;
                    } else if (Array.isArray(data)) {
                        return new Map(data);
                    } else {
                        return new Map(Object.entries(data));
                    }
                }
                
                return new Map();
            } catch (error) {
                KC.Logger?.error('WordCloudGenerator: Erro ao buscar dados existentes', error);
                return new Map();
            }
        }

        /**
         * Salva dados da word cloud no storage
         */
        async storeWordCloudData(wordCloudData, frequencies) {
            try {
                // Salva word cloud
                this.storageManager.set('wordCloud.data', wordCloudData);
                
                // Converte Map para object para storage
                const frequenciesObj = frequencies instanceof Map ? 
                    Object.fromEntries(frequencies) : frequencies;
                this.storageManager.set('wordCloud.frequencies', frequenciesObj);
                
                // Salva metadados
                this.storageManager.set('wordCloud.lastUpdate', new Date().toISOString());
                
                KC.Logger?.info('WordCloudGenerator: Dados salvos no storage');
                return true;
                
            } catch (error) {
                KC.Logger?.error('WordCloudGenerator: Erro ao salvar dados', error);
                return false;
            }
        }

        /**
         * Mescla frequências existentes com novas (modo incremental)
         */
        mergeFrequencies(existing, newFreqs) {
            const merged = new Map(existing);
            
            for (const [word, freq] of newFreqs.entries()) {
                const currentFreq = merged.get(word) || 0;
                merged.set(word, currentFreq + freq);
            }
            
            return merged;
        }

        /**
         * Comprime dados se habilitado
         */
        compressData(data) {
            if (!this.config.enableCompression) return data;
            
            // Simplifica dados removendo campos desnecessários para economia de espaço
            const compressed = {
                words: data.words.map(word => ({
                    t: word.text,
                    f: word.frequency,
                    s: word.size,
                    c: word.color,
                    k: word.isKeyword ? 1 : 0
                })),
                metadata: {
                    maxFrequency: data.metadata.maxFrequency,
                    totalWords: data.metadata.totalWords,
                    keywordCount: data.metadata.keywordCount,
                    generatedAt: data.metadata.generatedAt,
                    version: data.metadata.version
                }
            };
            
            return compressed;
        }

        /**
         * Verifica integridade dos dados
         */
        verifyDataIntegrity(data) {
            return data && 
                   typeof data === 'object' && 
                   (data instanceof Map || Array.isArray(data) || data.words);
        }

        /**
         * Limpa dados da word cloud
         */
        async clearWordCloudData() {
            try {
                // Usa método set com undefined para "limpar" as chaves
                this.storageManager.set('wordCloud.data', undefined);
                this.storageManager.set('wordCloud.frequencies', undefined);
                this.storageManager.set('wordCloud.lastUpdate', undefined);
                this.cache.clear();
                
                KC.Logger?.info('WordCloudGenerator: Dados limpos');
                return true;
                
            } catch (error) {
                KC.Logger?.error('WordCloudGenerator: Erro ao limpar dados', error);
                return false;
            }
        }

        /**
         * Exporta backup dos dados
         */
        async exportBackup() {
            try {
                const data = {
                    wordCloudData: this.storageManager.get('wordCloud.data'),
                    frequencies: this.storageManager.get('wordCloud.frequencies'),
                    lastUpdate: this.storageManager.get('wordCloud.lastUpdate'),
                    config: this.config,
                    exportedAt: new Date().toISOString()
                };
                
                return JSON.stringify(data, null, 2);
                
            } catch (error) {
                KC.Logger?.error('WordCloudGenerator: Erro ao exportar backup', error);
                return null;
            }
        }

        /**
         * Restaura dados do backup
         */
        async restoreFromBackup(backupData) {
            try {
                const data = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
                
                if (data.wordCloudData) {
                    this.storageManager.set('wordCloud.data', data.wordCloudData);
                }
                
                if (data.frequencies) {
                    this.storageManager.set('wordCloud.frequencies', data.frequencies);
                }
                
                if (data.lastUpdate) {
                    this.storageManager.set('wordCloud.lastUpdate', data.lastUpdate);
                }
                
                this.cache.clear();
                
                KC.Logger?.info('WordCloudGenerator: Backup restaurado com sucesso');
                return true;
                
            } catch (error) {
                KC.Logger?.error('WordCloudGenerator: Erro ao restaurar backup', error);
                return false;
            }
        }

        // === UTILITY METHODS ===

        /**
         * Gera chave de cache baseada nos parâmetros
         */
        generateCacheKey(files, keywords, maxWords, minFrequency) {
            const fileHash = files.length > 0 ? 
                files.map(f => f.name + f.size).join('').slice(0, 32) : 'empty';
            const keywordHash = keywords.join('').slice(0, 16);
            
            return `wc_${fileHash}_${keywordHash}_${maxWords}_${minFrequency}`;
        }

        /**
         * Retorna word cloud vazia em caso de erro
         */
        getEmptyWordCloud() {
            return {
                words: [],
                metadata: {
                    maxFrequency: 0,
                    totalWords: 0,
                    keywordCount: 0,
                    generatedAt: new Date().toISOString(),
                    version: '1.0'
                }
            };
        }

        /**
         * Obtém estatísticas da word cloud atual
         */
        getStatistics() {
            const data = this.storageManager.get('wordCloud.data');
            const lastUpdate = this.storageManager.get('wordCloud.lastUpdate');
            
            return {
                hasData: !!data,
                wordCount: data?.metadata?.totalWords || 0,
                keywordCount: data?.metadata?.keywordCount || 0,
                lastUpdate: lastUpdate,
                cacheSize: this.cache.size,
                config: this.config
            };
        }

        /**
         * Atualiza configuração
         */
        updateConfig(newConfig) {
            this.config = { ...this.config, ...newConfig };
            this.cache.clear(); // Limpa cache ao mudar configuração
        }
    }

    // Registra no namespace global
    KC.WordCloudGenerator = new WordCloudGenerator();

})(window);