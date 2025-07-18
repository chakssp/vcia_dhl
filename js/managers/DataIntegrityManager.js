/**
 * DataIntegrityManager.js - Gerenciador de Integridade de Dados
 * 
 * Resolve problemas estruturais de persistência e validação de dados
 * Garante que o sistema sempre tenha dados consistentes e válidos
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class DataIntegrityManager {
        constructor() {
            this.requiredFileFields = [
                'id', 'name', 'path', 'size', 'lastModified'
            ];
            this.initialized = false;
        }

        /**
         * Inicializa o gerenciador
         */
        initialize() {
            // Escutar mudanças de estado
            KC.EventBus.on(KC.Events.STATE_CHANGED, (data) => {
                if (data.key === 'files') {
                    this.validateAndFixFiles(data.newValue);
                }
            });

            // Escutar restauração de estado
            KC.EventBus.on(KC.Events.STATE_RESTORED, () => {
                this.ensureDataIntegrity();
            });

            this.initialized = true;
            KC.Logger?.info('DataIntegrityManager', 'Inicializado');
        }

        /**
         * Garante integridade dos dados ao carregar
         */
        async ensureDataIntegrity() {
            const files = KC.AppState.get('files') || [];
            
            if (files.length === 0) return;

            KC.Logger?.info('DataIntegrityManager', `Verificando integridade de ${files.length} arquivos`);

            let needsUpdate = false;
            const fixedFiles = [];

            for (const file of files) {
                const fixedFile = await this.ensureFileIntegrity(file);
                if (fixedFile !== file) {
                    needsUpdate = true;
                }
                fixedFiles.push(fixedFile);
            }

            if (needsUpdate) {
                KC.AppState.set('files', fixedFiles);
                KC.Logger?.info('DataIntegrityManager', 'Dados corrigidos e atualizados');
            }
        }

        /**
         * Garante integridade de um arquivo individual
         */
        async ensureFileIntegrity(file) {
            const fixed = { ...file };

            // 1. Garantir campos obrigatórios
            for (const field of this.requiredFileFields) {
                if (!fixed[field]) {
                    KC.Logger?.warn('DataIntegrityManager', `Campo obrigatório ausente: ${field} em ${file.name}`);
                    fixed[field] = this.getDefaultValue(field, file);
                }
            }

            // 2. Garantir ID único
            if (!fixed.id) {
                fixed.id = this.generateFileId(file);
            }

            // 3. Normalizar relevanceScore
            if (fixed.relevanceScore) {
                fixed.relevanceScore = this.normalizeRelevanceScore(fixed.relevanceScore);
            } else if (fixed.preview) {
                // Calcular se não existir
                fixed.relevanceScore = KC.PreviewUtils?.calculatePreviewRelevance(fixed.preview) || 50;
            } else {
                fixed.relevanceScore = 50; // Default
            }

            // 4. Garantir preview válido
            if (!fixed.preview && fixed.content) {
                fixed.preview = KC.PreviewUtils?.extractSmartPreview(fixed.content) || {};
            } else if (fixed.preview && typeof fixed.preview === 'string') {
                // Converter string para objeto preview
                fixed.preview = { segment1: fixed.preview };
            }

            // 5. Validar content
            if (fixed.content && typeof fixed.content !== 'string') {
                KC.Logger?.warn('DataIntegrityManager', `Content não é string em ${file.name}`);
                fixed.content = String(fixed.content);
            }

            // 6. Tentar carregar content se tiver handle válido
            if (!fixed.content && fixed.handle && typeof fixed.handle.getFile === 'function') {
                try {
                    const fileObj = await fixed.handle.getFile();
                    fixed.content = await fileObj.text();
                    KC.Logger?.info('DataIntegrityManager', `Conteúdo carregado para ${file.name}`);
                } catch (error) {
                    KC.Logger?.warn('DataIntegrityManager', `Não foi possível carregar conteúdo de ${file.name}`);
                }
            }

            // 7. Garantir content mínimo do preview se não houver content
            if (!fixed.content && fixed.preview) {
                fixed.content = KC.PreviewUtils?.getTextPreview(fixed.preview) || fixed.name;
            }

            // 8. Validar categorias
            if (fixed.categories && !Array.isArray(fixed.categories)) {
                fixed.categories = [];
            }

            return fixed;
        }

        /**
         * Valida e corrige array de arquivos
         */
        async validateAndFixFiles(files) {
            if (!Array.isArray(files)) {
                KC.Logger?.error('DataIntegrityManager', 'Files não é um array');
                return;
            }

            const fixedFiles = [];
            for (const file of files) {
                const fixed = await this.ensureFileIntegrity(file);
                fixedFiles.push(fixed);
            }

            // Atualizar apenas se houver mudanças
            if (JSON.stringify(files) !== JSON.stringify(fixedFiles)) {
                KC.AppState.set('files', fixedFiles);
            }
        }

        /**
         * Normaliza relevance score para percentual
         */
        normalizeRelevanceScore(score) {
            if (typeof score !== 'number') {
                return 50;
            }
            
            // Se for decimal (0-1), converter para percentual
            if (score < 1) {
                return Math.round(score * 100);
            }
            
            // Garantir que está entre 0-100
            return Math.max(0, Math.min(100, Math.round(score)));
        }

        /**
         * Gera ID único para arquivo
         */
        generateFileId(file) {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substr(2, 9);
            const namePart = (file.name || 'unknown').replace(/[^a-z0-9]/gi, '').substr(0, 10);
            return `file_${timestamp}_${namePart}_${random}`;
        }

        /**
         * Retorna valor padrão para campo
         */
        getDefaultValue(field, file) {
            const defaults = {
                id: () => this.generateFileId(file),
                name: () => 'unnamed_file',
                path: () => '/' + (file.name || 'unnamed_file'),
                size: () => 0,
                lastModified: () => Date.now()
            };

            return defaults[field] ? defaults[field]() : null;
        }

        /**
         * Prepara dados para o pipeline garantindo consistência
         */
        async prepareDataForPipeline(files) {
            KC.Logger?.info('DataIntegrityManager', `Preparando ${files.length} arquivos para pipeline`);

            const preparedFiles = [];
            
            for (const file of files) {
                // Garantir integridade básica
                const fixed = await this.ensureFileIntegrity(file);
                
                // Validações específicas para pipeline
                if (!fixed.content || fixed.content.trim().length < 10) {
                    KC.Logger?.warn('DataIntegrityManager', `Arquivo ${file.name} tem conteúdo insuficiente`);
                    continue; // Pular arquivo
                }

                // Garantir que preview é objeto válido
                if (!fixed.preview || typeof fixed.preview !== 'object') {
                    fixed.preview = KC.PreviewUtils?.extractSmartPreview(fixed.content) || {
                        segment1: fixed.content.substring(0, 100)
                    };
                }

                preparedFiles.push(fixed);
            }

            KC.Logger?.info('DataIntegrityManager', `${preparedFiles.length} arquivos prontos para pipeline`);
            return preparedFiles;
        }

        /**
         * Valida dados antes de exportação
         */
        validateExportData(data) {
            const errors = [];

            if (!data.documents || !Array.isArray(data.documents)) {
                errors.push('Documents deve ser um array');
            }

            data.documents?.forEach((doc, index) => {
                if (!doc.id) errors.push(`Documento ${index} sem ID`);
                if (!doc.source?.fileName) errors.push(`Documento ${index} sem nome de arquivo`);
                if (!doc.chunks || !Array.isArray(doc.chunks)) {
                    errors.push(`Documento ${index} sem chunks válidos`);
                }
            });

            return {
                valid: errors.length === 0,
                errors: errors
            };
        }

        /**
         * Estatísticas de integridade
         */
        getIntegrityStats() {
            const files = KC.AppState.get('files') || [];
            
            return {
                totalFiles: files.length,
                withContent: files.filter(f => f.content).length,
                withPreview: files.filter(f => f.preview).length,
                withValidRelevance: files.filter(f => f.relevanceScore >= 0 && f.relevanceScore <= 100).length,
                withHandle: files.filter(f => f.handle).length,
                needsAttention: files.filter(f => !f.content || !f.preview).length
            };
        }
    }

    // Registrar no namespace KC
    KC.DataIntegrityManager = new DataIntegrityManager();
    KC.Logger?.info('DataIntegrityManager', 'Componente registrado com sucesso');

})(window);