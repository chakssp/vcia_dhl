/**
 * ContentAccessUtils.js - Utilitário Central para Acesso a Conteúdo de Arquivos
 * 
 * Solução definitiva para o problema de acesso a file.content que foi removido
 * por questões de otimização de memória.
 * 
 * AIDEV-NOTE: content-access-central; função central para acessar conteúdo de arquivos
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    /**
     * Função central para obter conteúdo de arquivo de qualquer fonte disponível
     * @param {Object} file - Objeto arquivo
     * @returns {Promise<string|null>} Conteúdo do arquivo ou null
     * AIDEV-NOTE: multi-source-content; busca conteúdo em múltiplas fontes
     */
    async function getFileContent(file) {
        if (!file) return null;
        
        try {
            // 1. Tenta conteúdo direto
            if (file.content && typeof file.content === 'string' && file.content.length > 10) {
                Logger?.debug('ContentAccessUtils', 'Conteúdo obtido de file.content');
                return file.content;
            }
            
            // 2. Tenta preview
            if (file.preview && typeof file.preview === 'string' && file.preview.length > 10) {
                Logger?.debug('ContentAccessUtils', 'Conteúdo obtido de file.preview');
                return file.preview;
            }
            
            // 3. Tenta smartPreview
            if (file.smartPreview?.combinedText) {
                Logger?.debug('ContentAccessUtils', 'Conteúdo obtido de smartPreview');
                return file.smartPreview.combinedText;
            }
            
            // 4. Busca no DOM
            const fileId = file.id || file.name;
            if (fileId) {
                // Busca elemento do arquivo
                let fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
                
                if (!fileElement) {
                    // AIDEV-NOTE: dom-class-fix; corrigido de .file-item para .file-entry
                    fileElement = Array.from(document.querySelectorAll('.file-entry')).find(el => {
                        const fileName = el.querySelector('.file-name')?.textContent;
                        return fileName === file.name;
                    });
                }
                
                if (fileElement) {
                    // Tenta várias fontes no DOM
                    const sources = [
                        () => fileElement.getAttribute('data-full-content'),
                        () => fileElement.querySelector('.content-preview')?.textContent,
                        () => fileElement.querySelector('.file-preview')?.textContent,
                        () => fileElement.querySelector('.hidden-content')?.textContent,
                        () => fileElement.querySelector('[data-content]')?.getAttribute('data-content')
                    ];
                    
                    for (const source of sources) {
                        try {
                            const content = source();
                            if (content && content.length > 10) {
                                Logger?.debug('ContentAccessUtils', 'Conteúdo obtido do DOM');
                                return content;
                            }
                        } catch (e) {
                            // Continue tentando
                        }
                    }
                }
            }
            
            // 5. Busca no AppState (pode ter versão cacheada)
            const files = KC.AppState?.get('files') || [];
            const stateFile = files.find(f => 
                (f.id && f.id === file.id) || 
                (f.name && f.name === file.name)
            );
            
            if (stateFile?.content || stateFile?.preview) {
                Logger?.debug('ContentAccessUtils', 'Conteúdo obtido do AppState');
                return stateFile.content || stateFile.preview;
            }
            
            // 6. Última tentativa - re-leitura se possível
            if (file.handle && typeof file.handle.getFile === 'function') {
                try {
                    Logger?.warning('ContentAccessUtils', `Re-lendo arquivo: ${file.name}`);
                    const fileData = await file.handle.getFile();
                    const text = await fileData.text();
                    if (text) {
                        // Cache no DOM para futuras leituras
                        const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
                        if (fileElement) {
                            fileElement.setAttribute('data-full-content', text.substring(0, 100000));
                        }
                        return text;
                    }
                } catch (error) {
                    Logger?.debug('ContentAccessUtils', 'Re-leitura falhou (esperado):', error.message);
                }
            }
            
            // Retorna nome do arquivo como fallback
            Logger?.debug('ContentAccessUtils', 'Usando nome do arquivo como fallback');
            return file.name || '';
            
        } catch (error) {
            Logger?.error('ContentAccessUtils', 'Erro ao obter conteúdo', {
                file: file?.name,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Prepara arquivo garantindo que tenha conteúdo acessível
     * @param {Object} file - Arquivo original
     * @returns {Object} Arquivo com conteúdo garantido
     */
    async function ensureFileContent(file) {
        if (!file) return file;
        
        // Se já tem conteúdo ou preview, retorna como está
        if (file.content || file.preview) {
            return file;
        }
        
        // Busca conteúdo
        const content = await getFileContent(file);
        if (content) {
            // Retorna cópia com preview preenchido
            return {
                ...file,
                preview: content
            };
        }
        
        return file;
    }

    /**
     * Verifica disponibilidade de conteúdo para um arquivo
     * @param {Object} file - Arquivo para verificar
     * @returns {Object} Status de disponibilidade
     */
    async function checkContentAvailability(file) {
        const status = {
            hasContent: false,
            contentSource: null,
            contentLength: 0
        };
        
        if (!file) return status;
        
        if (file.content) {
            status.hasContent = true;
            status.contentSource = 'content';
            status.contentLength = file.content.length;
        } else if (file.preview) {
            status.hasContent = true;
            status.contentSource = 'preview';
            status.contentLength = file.preview.length;
        } else if (file.smartPreview?.combinedText) {
            status.hasContent = true;
            status.contentSource = 'smartPreview';
            status.contentLength = file.smartPreview.combinedText.length;
        } else {
            // Tenta obter de outras fontes
            const content = await getFileContent(file);
            if (content) {
                status.hasContent = true;
                status.contentSource = 'dynamic';
                status.contentLength = content.length;
            }
        }
        
        return status;
    }

    // Registra utilidades no namespace
    KC.ContentAccessUtils = {
        getFileContent,
        ensureFileContent,
        checkContentAvailability
    };

    // Também disponibiliza diretamente no KC para conveniência
    KC.getFileContent = getFileContent;

    Logger?.info('ContentAccessUtils', 'Utilitário de acesso a conteúdo carregado');

})(window);