/**
 * ContentLoader.js - Utilitário para garantir que arquivos tenham conteúdo completo
 * 
 * Resolve o problema de arquivos sem conteúdo no AppState
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class ContentLoader {
        /**
         * Carrega conteúdo completo para arquivos que só têm preview
         * @param {Array} files - Array de arquivos do AppState
         * @returns {Array} Arquivos com conteúdo completo
         */
        static async ensureFileContent(files) {
            const filesWithContent = [];

            for (const file of files) {
                const fileWithContent = { ...file };

                // Se não tem conteúdo mas tem handle, carrega
                if (!file.content && file.handle) {
                    try {
                        const fileObj = await file.handle.getFile();
                        fileWithContent.content = await fileObj.text();
                        console.log(`✅ Conteúdo carregado para ${file.name}`);
                    } catch (error) {
                        console.error(`❌ Erro ao carregar conteúdo de ${file.name}:`, error);
                        // Usa preview como fallback
                        if (file.preview) {
                            fileWithContent.content = KC.PreviewUtils?.getTextPreview(file.preview) || '';
                        }
                    }
                } else if (!file.content && file.preview) {
                    // Se não tem handle nem conteúdo, usa preview
                    fileWithContent.content = KC.PreviewUtils?.getTextPreview(file.preview) || '';
                }

                // Garante que sempre tem algum conteúdo
                if (!fileWithContent.content) {
                    fileWithContent.content = fileWithContent.name || 'Arquivo sem conteúdo';
                }

                filesWithContent.push(fileWithContent);
            }

            return filesWithContent;
        }

        /**
         * Verifica e corrige relevanceScore
         * @param {Array} files - Array de arquivos
         * @returns {Array} Arquivos com relevanceScore corrigido
         */
        static normalizeRelevanceScores(files) {
            return files.map(file => {
                const normalized = { ...file };
                
                // Corrige relevanceScore se estiver em decimal
                if (normalized.relevanceScore && normalized.relevanceScore < 1) {
                    normalized.relevanceScore = normalized.relevanceScore * 100;
                }
                
                // Se não tem relevanceScore, calcula baseado no preview
                if (!normalized.relevanceScore && normalized.preview) {
                    normalized.relevanceScore = KC.PreviewUtils?.calculatePreviewRelevance(normalized.preview) || 0; // 0% = aguardando processamento
                }
                
                // Preservar 0% - é informação válida (arquivo não processado)
                if (normalized.relevanceScore === undefined) {
                    normalized.relevanceScore = 0;
                }
                
                return normalized;
            });
        }

        /**
         * Prepara arquivos para processamento garantindo todos os campos necessários
         * @param {Array} files - Array de arquivos do AppState
         * @returns {Promise<Array>} Arquivos prontos para processamento
         */
        static async prepareFilesForProcessing(files) {
            // 1. Garante conteúdo completo
            let preparedFiles = await this.ensureFileContent(files);
            
            // 2. Normaliza relevance scores
            preparedFiles = this.normalizeRelevanceScores(preparedFiles);
            
            // 3. Garante que tem preview
            preparedFiles = preparedFiles.map(file => {
                if (!file.preview && file.content) {
                    // Gera preview se não tiver
                    file.preview = KC.PreviewUtils?.extractPreview(file.content) || {};
                }
                return file;
            });
            
            console.log(`📊 ${preparedFiles.length} arquivos preparados para processamento`);
            
            return preparedFiles;
        }
    }

    // Registra no namespace KC
    KC.ContentLoader = ContentLoader;
    console.log('ContentLoader registrado em KC.ContentLoader');

})(window);