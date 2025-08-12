/**
 * FileUtils.js - Utilitários para Manipulação de Arquivos
 * 
 * Fornece funções para leitura de metadados, extração de conteúdo,
 * cálculo de hash e formatação de dados relacionados a arquivos
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class FileUtils {
        constructor() {
            // Extensões suportadas e seus tipos MIME
            // ORIGINAL - Preservado para rollback
            // this.supportedExtensions = {
            //     'md': { type: 'markdown', mime: 'text/markdown' },
            //     'txt': { type: 'text', mime: 'text/plain' },
            //     'docx': { type: 'word', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
            //     'pdf': { type: 'pdf', mime: 'application/pdf' }
            // };
            // NOVO - Adiciona suporte a gdoc
            this.supportedExtensions = {
                'md': { type: 'markdown', mime: 'text/markdown' },
                'txt': { type: 'text', mime: 'text/plain' },
                'docx': { type: 'word', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
                'pdf': { type: 'pdf', mime: 'application/pdf' },
                'gdoc': { type: 'google-doc', mime: 'application/vnd.google-apps.document', description: 'Google Workspace and AI Studio Prompts compatible' }
            };

            // Padrões para detecção de estrutura em Markdown
            this.markdownPatterns = {
                heading1: /^#\s+(.+)$/m,
                heading2: /^##\s+(.+)$/m,
                heading3: /^###\s+(.+)$/m,
                bold: /\*\*(.+?)\*\*/g,
                italic: /\*(.+?)\*/g,
                list: /^[\*\-]\s+(.+)$/m,
                numberedList: /^\d+\.\s+(.+)$/m,
                link: /\[(.+?)\]\((.+?)\)/g,
                image: /!\[(.+?)\]\((.+?)\)/g,
                code: /`(.+?)`/g,
                codeBlock: /```[\s\S]*?```/g,
                horizontalRule: /^---+$/m,
                blockquote: /^>\s+(.+)$/m,
                table: /\|.+\|/g
            };

            // Cache de hashes para evitar recálculo
            this.hashCache = new Map();
        }

        /**
         * Extrai metadados de um arquivo
         * @param {File} file - Objeto File do navegador
         * @returns {Object} Metadados do arquivo
         */
        async extractMetadata(file) {
            const metadata = {
                name: file.name,
                path: file.webkitRelativePath || file.name,
                size: file.size,
                sizeFormatted: this.formatFileSize(file.size),
                type: file.type,
                extension: this.getFileExtension(file.name),
                lastModified: file.lastModified,
                lastModifiedDate: new Date(file.lastModified),
                lastModifiedFormatted: this.formatDate(new Date(file.lastModified)),
                isSupported: this.isFileSupported(file.name),
                hash: null,
                preview: null
            };

            // Adiciona informações específicas do tipo
            const extension = metadata.extension.toLowerCase();
            if (this.supportedExtensions[extension]) {
                metadata.fileType = this.supportedExtensions[extension].type;
                metadata.mimeType = this.supportedExtensions[extension].mime;
            }

            return metadata;
        }

        /**
         * Lê o conteúdo de um arquivo
         * @param {File} file - Arquivo a ser lido
         * @param {Object} options - Opções de leitura
         * @returns {Promise<string>} Conteúdo do arquivo
         */
        async readFileContent(file, options = {}) {
            const { encoding = 'utf-8', maxSize = 10 * 1024 * 1024 } = options; // 10MB default

            // Verifica tamanho máximo
            if (file.size > maxSize) {
                throw new Error(`Arquivo muito grande: ${this.formatFileSize(file.size)} (máximo: ${this.formatFileSize(maxSize)})`);
            }

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(new Error('Erro ao ler arquivo: ' + e.target.error));
                
                // Para arquivos binários (PDF, DOCX), usa readAsArrayBuffer
                const extension = this.getFileExtension(file.name).toLowerCase();
                if (['pdf', 'docx'].includes(extension)) {
                    reader.readAsArrayBuffer(file);
                } else {
                    reader.readAsText(file, encoding);
                }
            });
        }

        /**
         * Calcula hash SHA-256 de um arquivo
         * @param {File|string} input - Arquivo ou conteúdo
         * @returns {Promise<string>} Hash hexadecimal
         */
        async calculateHash(input) {
            let content;
            
            if (input instanceof File) {
                // Verifica cache
                const cacheKey = `${input.name}_${input.size}_${input.lastModified}`;
                if (this.hashCache.has(cacheKey)) {
                    return this.hashCache.get(cacheKey);
                }
                
                content = await this.readFileContent(input);
            } else {
                content = input;
            }

            // Converte string para ArrayBuffer
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            
            // Calcula hash
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            // Armazena em cache se for arquivo
            if (input instanceof File) {
                const cacheKey = `${input.name}_${input.size}_${input.lastModified}`;
                this.hashCache.set(cacheKey, hashHex);
            }
            
            return hashHex;
        }

        /**
         * Extrai preview inteligente do conteúdo
         * @param {string} content - Conteúdo do arquivo
         * @param {Object} options - Opções de extração
         * @returns {Object} Preview estruturado
         */
        extractSmartPreview(content, options = {}) {
            const {
                maxLength = 150,
                segments = 5
            } = options;

            const preview = {
                firstParagraph: '',
                secondParagraph: '',
                lastBeforeColon: '',
                colonPhrase: '',
                firstAfterColon: '',
                highlights: [],
                structure: {
                    hasHeadings: false,
                    hasList: false,
                    hasCode: false,
                    hasLinks: false,
                    hasImages: false
                }
            };

            if (!content || typeof content !== 'string') {
                return preview;
            }

            // Divide conteúdo em linhas e parágrafos
            const lines = content.split('\n').filter(line => line.trim());
            const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());

            // 1. Primeiras 30 palavras
            const words = content.trim().split(/\s+/);
            preview.firstParagraph = words.slice(0, 30).join(' ');
            if (words.length > 30) preview.firstParagraph += '...';

            // 2. Segundo parágrafo completo
            if (paragraphs.length > 1) {
                preview.secondParagraph = paragraphs[1].trim();
            }

            // 3. Busca por frases com ":"
            const colonMatches = content.match(/([^.!?\n]*:(?![/\\])[^.!?\n]*)/g);
            if (colonMatches && colonMatches.length > 0) {
                const colonIndex = content.indexOf(colonMatches[0]);
                
                // Último parágrafo antes do ":"
                const beforeColon = content.substring(0, colonIndex);
                const beforeParagraphs = beforeColon.split(/\n\s*\n/).filter(p => p.trim());
                if (beforeParagraphs.length > 0) {
                    preview.lastBeforeColon = beforeParagraphs[beforeParagraphs.length - 1].trim();
                }
                
                // Frase com ":"
                preview.colonPhrase = colonMatches[0].trim();
                
                // Primeiro parágrafo após ":"
                const afterColon = content.substring(colonIndex + colonMatches[0].length);
                const afterWords = afterColon.trim().split(/\s+/);
                preview.firstAfterColon = afterWords.slice(0, 30).join(' ');
                if (afterWords.length > 30) preview.firstAfterColon += '...';
            }

            // Analisa estrutura do documento
            preview.structure.hasHeadings = this.markdownPatterns.heading1.test(content) || 
                                           this.markdownPatterns.heading2.test(content);
            preview.structure.hasList = this.markdownPatterns.list.test(content) || 
                                       this.markdownPatterns.numberedList.test(content);
            preview.structure.hasCode = this.markdownPatterns.code.test(content) || 
                                       this.markdownPatterns.codeBlock.test(content);
            preview.structure.hasLinks = this.markdownPatterns.link.test(content);
            preview.structure.hasImages = this.markdownPatterns.image.test(content);

            // Extrai highlights (títulos e texto em negrito)
            const headingMatches = content.match(this.markdownPatterns.heading1) || [];
            const boldMatches = content.match(this.markdownPatterns.bold) || [];
            
            // NOVO: Otimiza links - extrai apenas domínios principais
            const linkMatches = content.match(this.markdownPatterns.link) || [];
            const optimizedLinks = linkMatches.map(link => this.extractDomainFromLink(link)).slice(0, 3);
            
            preview.highlights = [...headingMatches, ...boldMatches, ...optimizedLinks].slice(0, 5);

            return preview;
        }

        /**
         * Extrai domínio principal de um link Markdown
         * @param {string} markdownLink - Link no formato [texto](url)
         * @returns {string} Domínio otimizado
         */
        extractDomainFromLink(markdownLink) {
            try {
                // Extrai URL do formato [texto](url)
                const urlMatch = markdownLink.match(/\[([^\]]*)\]\(([^)]*)\)/);
                if (!urlMatch || !urlMatch[2]) return markdownLink;
                
                let url = urlMatch[2].trim();
                const linkText = urlMatch[1] || '';
                
                // Remove encoding comum
                url = decodeURIComponent(url);
                
                // Adiciona protocolo se necessário
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }
                
                // Extrai domínio
                const urlObj = new URL(url);
                let domain = urlObj.hostname;
                
                // Remove www. se presente
                domain = domain.replace(/^www\./, '');
                
                // Retorna domínio otimizado com texto original se relevante
                return linkText && linkText !== domain ? 
                    `${linkText} (${domain})` : 
                    domain;
                    
            } catch (error) {
                // Fallback para links mal formados
                console.warn('FileUtils: Erro ao extrair domínio do link:', markdownLink);
                return markdownLink.substring(0, 50) + '...';
            }
        }

        /**
         * Verifica se arquivo é suportado
         * @param {string} filename - Nome do arquivo
         * @returns {boolean} True se suportado
         */
        isFileSupported(filename) {
            const extension = this.getFileExtension(filename).toLowerCase();
            return Object.keys(this.supportedExtensions).includes(extension);
        }

        /**
         * Obtém extensão do arquivo
         * @param {string} filename - Nome do arquivo
         * @returns {string} Extensão sem ponto
         */
        getFileExtension(filename) {
            const parts = filename.split('.');
            return parts.length > 1 ? parts.pop() : '';
        }

        /**
         * Formata tamanho de arquivo
         * @param {number} bytes - Tamanho em bytes
         * @returns {string} Tamanho formatado
         */
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        /**
         * Formata data
         * @param {Date} date - Data a formatar
         * @param {Object} options - Opções de formatação
         * @returns {string} Data formatada
         */
        formatDate(date, options = {}) {
            const {
                format = 'full', // full, short, relative
                locale = 'pt-BR'
            } = options;

            if (!(date instanceof Date) || isNaN(date)) {
                return 'Data inválida';
            }

            switch (format) {
                case 'short':
                    return date.toLocaleDateString(locale);
                    
                case 'relative':
                    return this.getRelativeTime(date);
                    
                case 'full':
                default:
                    return date.toLocaleString(locale, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
            }
        }

        /**
         * Obtém tempo relativo
         * @param {Date} date - Data para comparar
         * @returns {string} Tempo relativo
         */
        getRelativeTime(date) {
            const now = new Date();
            const diff = now - date;
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            const months = Math.floor(days / 30);
            const years = Math.floor(days / 365);

            if (seconds < 60) return 'Agora mesmo';
            if (minutes < 60) return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
            if (hours < 24) return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
            if (days < 30) return `${days} dia${days > 1 ? 's' : ''} atrás`;
            if (months < 12) return `${months} ${months > 1 ? 'meses' : 'mês'} atrás`;
            return `${years} ano${years > 1 ? 's' : ''} atrás`;
        }

        /**
         * Valida caminho de arquivo
         * @param {string} path - Caminho a validar
         * @returns {Object} Resultado da validação
         */
        validatePath(path) {
            const result = {
                isValid: true,
                isAbsolute: false,
                normalized: '',
                errors: []
            };

            if (!path || typeof path !== 'string') {
                result.isValid = false;
                result.errors.push('Caminho inválido');
                return result;
            }

            // Verifica se é caminho absoluto
            result.isAbsolute = /^([a-zA-Z]:[\\/]|[\\/])/.test(path);
            
            // Normaliza separadores
            result.normalized = path.replace(/[\\/]+/g, '/');
            
            // Remove caracteres perigosos
            const dangerous = /[<>:"|?*\0]/g;
            if (dangerous.test(path)) {
                result.isValid = false;
                result.errors.push('Caminho contém caracteres inválidos');
            }

            return result;
        }

        /**
         * Converte caminho com variáveis de ambiente
         * @param {string} path - Caminho com variáveis
         * @returns {string} Caminho expandido
         */
        expandPath(path) {
            if (!path) return path;

            // Substitui variáveis comuns do Windows
            let expanded = path;
            
            // Simula expansão de variáveis (em produção, isso seria feito no backend)
            const variables = {
                '%USERPROFILE%': '/home/user',
                '%APPDATA%': '/home/user/.config',
                '%LOCALAPPDATA%': '/home/user/.local',
                '$HOME': '/home/user',
                '~': '/home/user'
            };

            Object.entries(variables).forEach(([key, value]) => {
                expanded = expanded.replace(new RegExp(key, 'gi'), value);
            });

            return expanded;
        }

        /**
         * Extrai informações de vaults do Obsidian
         * @param {string} obsidianJson - Conteúdo do obsidian.json
         * @returns {Array} Lista de vaults
         */
        parseObsidianVaults(obsidianJson) {
            try {
                const data = JSON.parse(obsidianJson);
                const vaults = [];

                if (data.vaults) {
                    Object.entries(data.vaults).forEach(([id, vault]) => {
                        if (vault.path) {
                            vaults.push({
                                id,
                                path: vault.path,
                                timestamp: vault.ts,
                                isOpen: vault.open || false,
                                name: vault.path.split(/[\\/]/).pop()
                            });
                        }
                    });
                }

                return vaults;
            } catch (error) {
                console.error('Erro ao parsear obsidian.json:', error);
                return [];
            }
        }
    }

    // Cria instância singleton
    KC.FileUtils = new FileUtils();

})(window);