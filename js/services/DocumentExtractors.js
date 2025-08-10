/**
 * DocumentExtractors.js - Extractors para diferentes tipos de documentos
 * 
 * Sistema de extração de conteúdo para PDF, DOCX, XLSX, PST etc.
 * Versão inicial com capacidades básicas e preparação para bibliotecas futuras
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    class DocumentExtractors {
        constructor() {
            // Registro de extractors disponíveis
            this.extractors = new Map();
            
            // Capacidades atuais
            this.capabilities = {
                '.txt': { supported: true, method: 'native', confidence: 100 },
                '.md': { supported: true, method: 'native', confidence: 100 },
                '.json': { supported: true, method: 'native', confidence: 100 },
                '.html': { supported: true, method: 'native', confidence: 95 },
                '.xml': { supported: true, method: 'native', confidence: 90 },
                '.csv': { supported: true, method: 'native', confidence: 95 },
                '.pdf': { supported: false, method: 'pdf.js', confidence: 0, futureSupport: true },
                '.docx': { supported: false, method: 'mammoth.js', confidence: 0, futureSupport: true },
                '.doc': { supported: false, method: 'legacy', confidence: 0, futureSupport: false },
                '.xlsx': { supported: false, method: 'sheetjs', confidence: 0, futureSupport: true },
                '.xls': { supported: false, method: 'legacy', confidence: 0, futureSupport: false },
                '.pptx': { supported: false, method: 'pptxgenjs', confidence: 0, futureSupport: true },
                '.ppt': { supported: false, method: 'legacy', confidence: 0, futureSupport: false },
                '.pst': { supported: false, method: 'libpst', confidence: 0, futureSupport: true },
                '.msg': { supported: false, method: 'msg-reader', confidence: 0, futureSupport: true },
                '.eml': { supported: true, method: 'native-email', confidence: 85 },
                '.rtf': { supported: false, method: 'rtf-parser', confidence: 0, futureSupport: true },
                '.odt': { supported: false, method: 'odf-parser', confidence: 0, futureSupport: true }
            };

            // Estatísticas de extração
            this.stats = {
                totalExtractions: 0,
                successfulExtractions: 0,
                failedExtractions: 0,
                extractionsByType: {},
                averageExtractionTime: 0
            };

            this.initialize();
        }

        /**
         * Inicializa os extractors
         */
        initialize() {
            // Registra extractors nativos
            this.registerNativeExtractors();
            
            // Prepara para extractors futuros
            this.prepareFutureExtractors();
            
            Logger.info('DocumentExtractors', 'Sistema de extractors inicializado', {
                supportedTypes: Object.keys(this.capabilities).filter(k => this.capabilities[k].supported)
            });
        }

        /**
         * Registra extractors nativos (sem bibliotecas externas)
         */
        registerNativeExtractors() {
            // Texto simples
            this.registerExtractor('.txt', async (file) => {
                return await this.extractText(file);
            });

            // Markdown
            this.registerExtractor('.md', async (file) => {
                const text = await this.extractText(file);
                return this.enhanceMarkdownContent(text);
            });

            // JSON
            this.registerExtractor('.json', async (file) => {
                const text = await this.extractText(file);
                try {
                    const json = JSON.parse(text);
                    return this.jsonToText(json);
                } catch (e) {
                    return text;
                }
            });

            // HTML
            this.registerExtractor('.html', async (file) => {
                const html = await this.extractText(file);
                return this.extractTextFromHTML(html);
            });

            // XML
            this.registerExtractor('.xml', async (file) => {
                const xml = await this.extractText(file);
                return this.extractTextFromXML(xml);
            });

            // CSV
            this.registerExtractor('.csv', async (file) => {
                const csv = await this.extractText(file);
                return this.extractTextFromCSV(csv);
            });

            // EML (Email simples)
            this.registerExtractor('.eml', async (file) => {
                const eml = await this.extractText(file);
                return this.extractTextFromEML(eml);
            });
        }

        /**
         * Prepara extractors futuros (placeholders)
         */
        prepareFutureExtractors() {
            // PDF - Preparação para pdf.js
            this.registerExtractor('.pdf', async (file) => {
                return this.createPlaceholderExtraction(file, 'PDF', {
                    library: 'pdf.js',
                    url: 'https://mozilla.github.io/pdf.js/',
                    complexity: 'alta',
                    estimatedContent: this.estimatePDFContent(file)
                });
            });

            // DOCX - Preparação para mammoth.js
            this.registerExtractor('.docx', async (file) => {
                return this.createPlaceholderExtraction(file, 'Word', {
                    library: 'mammoth.js',
                    url: 'https://github.com/mwilliamson/mammoth.js',
                    complexity: 'média',
                    estimatedContent: this.estimateDOCXContent(file)
                });
            });

            // XLSX - Preparação para SheetJS
            this.registerExtractor('.xlsx', async (file) => {
                return this.createPlaceholderExtraction(file, 'Excel', {
                    library: 'SheetJS',
                    url: 'https://sheetjs.com/',
                    complexity: 'média',
                    estimatedContent: this.estimateXLSXContent(file)
                });
            });

            // PST - Preparação para libpst.js
            this.registerExtractor('.pst', async (file) => {
                return this.createPlaceholderExtraction(file, 'Outlook', {
                    library: 'libpst.js',
                    url: 'https://github.com/libpst/libpst',
                    complexity: 'muito alta',
                    estimatedContent: this.estimatePSTContent(file)
                });
            });
        }

        /**
         * Registra um extractor
         */
        registerExtractor(extension, extractorFunction) {
            this.extractors.set(extension, extractorFunction);
        }

        /**
         * Extrai conteúdo de um arquivo
         */
        async extract(file) {
            const startTime = Date.now();
            const extension = this.getFileExtension(file.name);
            
            try {
                // Verifica se há extractor disponível
                if (!this.extractors.has(extension)) {
                    throw new Error(`Extractor não disponível para ${extension}`);
                }

                // Executa extração
                const extractor = this.extractors.get(extension);
                const result = await extractor(file);

                // Atualiza estatísticas
                this.updateStats(extension, true, Date.now() - startTime);

                return {
                    success: true,
                    content: result.content || result,
                    metadata: result.metadata || {},
                    confidence: this.capabilities[extension]?.confidence || 0,
                    method: this.capabilities[extension]?.method || 'unknown',
                    extractionTime: Date.now() - startTime
                };

            } catch (error) {
                Logger.error('DocumentExtractors', `Erro ao extrair ${file.name}`, error);
                
                // Atualiza estatísticas
                this.updateStats(extension, false, Date.now() - startTime);

                return {
                    success: false,
                    error: error.message,
                    content: '',
                    metadata: {},
                    confidence: 0,
                    method: 'failed',
                    extractionTime: Date.now() - startTime
                };
            }
        }

        /**
         * Extrai texto básico
         */
        async extractText(file) {
            if (file.handle && file.handle.getFile) {
                const fileObj = await file.handle.getFile();
                return await fileObj.text();
            } else if (file.content) {
                return file.content;
            } else {
                throw new Error('Não foi possível acessar o conteúdo do arquivo');
            }
        }

        /**
         * Melhora conteúdo Markdown
         */
        enhanceMarkdownContent(text) {
            const lines = text.split('\n');
            const enhanced = {
                content: text,
                metadata: {
                    headers: [],
                    links: [],
                    codeBlocks: 0,
                    lists: 0,
                    tables: 0
                }
            };

            lines.forEach(line => {
                // Headers
                if (line.match(/^#{1,6}\s+/)) {
                    enhanced.metadata.headers.push(line.replace(/^#{1,6}\s+/, ''));
                }
                // Links
                const links = line.match(/\[([^\]]+)\]\(([^)]+)\)/g);
                if (links) {
                    enhanced.metadata.links.push(...links);
                }
                // Code blocks
                if (line.startsWith('```')) {
                    enhanced.metadata.codeBlocks++;
                }
                // Lists
                if (line.match(/^[\*\-\+]\s+/) || line.match(/^\d+\.\s+/)) {
                    enhanced.metadata.lists++;
                }
                // Tables
                if (line.includes('|') && line.match(/\|.*\|.*\|/)) {
                    enhanced.metadata.tables++;
                }
            });

            return enhanced;
        }

        /**
         * Converte JSON para texto
         */
        jsonToText(json, indent = 0) {
            const lines = [];
            const spacing = '  '.repeat(indent);

            if (typeof json === 'object' && json !== null) {
                if (Array.isArray(json)) {
                    json.forEach(item => {
                        lines.push(this.jsonToText(item, indent));
                    });
                } else {
                    Object.entries(json).forEach(([key, value]) => {
                        if (typeof value === 'object') {
                            lines.push(`${spacing}${key}:`);
                            lines.push(this.jsonToText(value, indent + 1));
                        } else {
                            lines.push(`${spacing}${key}: ${value}`);
                        }
                    });
                }
            } else {
                lines.push(`${spacing}${json}`);
            }

            return lines.join('\n');
        }

        /**
         * Extrai texto de HTML
         */
        extractTextFromHTML(html) {
            const div = document.createElement('div');
            div.innerHTML = html;
            
            // Remove scripts e styles
            div.querySelectorAll('script, style').forEach(el => el.remove());
            
            // Extrai texto
            const text = div.textContent || div.innerText || '';
            
            // Extrai metadata
            const metadata = {
                title: div.querySelector('title')?.textContent || '',
                headers: Array.from(div.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent),
                links: Array.from(div.querySelectorAll('a[href]')).map(a => ({
                    text: a.textContent,
                    href: a.href
                })),
                images: Array.from(div.querySelectorAll('img[src]')).map(img => ({
                    alt: img.alt,
                    src: img.src
                }))
            };

            return {
                content: text.trim(),
                metadata: metadata
            };
        }

        /**
         * Extrai texto de XML
         */
        extractTextFromXML(xml) {
            // Remove tags XML mantendo conteúdo
            const text = xml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            
            return {
                content: text,
                metadata: {
                    originalLength: xml.length,
                    extractedLength: text.length
                }
            };
        }

        /**
         * Extrai texto de CSV
         */
        extractTextFromCSV(csv) {
            const lines = csv.split('\n');
            const headers = lines[0]?.split(',') || [];
            
            return {
                content: csv,
                metadata: {
                    rows: lines.length,
                    columns: headers.length,
                    headers: headers
                }
            };
        }

        /**
         * Extrai texto de EML
         */
        extractTextFromEML(eml) {
            const lines = eml.split('\n');
            const metadata = {
                from: '',
                to: '',
                subject: '',
                date: ''
            };
            
            let bodyStart = false;
            let body = [];
            
            lines.forEach(line => {
                if (!bodyStart) {
                    if (line.startsWith('From:')) metadata.from = line.substring(5).trim();
                    if (line.startsWith('To:')) metadata.to = line.substring(3).trim();
                    if (line.startsWith('Subject:')) metadata.subject = line.substring(8).trim();
                    if (line.startsWith('Date:')) metadata.date = line.substring(5).trim();
                    if (line === '') bodyStart = true;
                } else {
                    body.push(line);
                }
            });

            return {
                content: body.join('\n'),
                metadata: metadata
            };
        }

        /**
         * Cria extração placeholder para tipos não suportados
         */
        createPlaceholderExtraction(file, type, info) {
            const placeholder = `
[ARQUIVO ${type.toUpperCase()} NÃO PROCESSÁVEL]

📁 Arquivo: ${file.name}
📊 Tamanho: ${this.formatFileSize(file.size)}
📅 Modificado: ${new Date(file.lastModified).toLocaleDateString('pt-BR')}

⚠️ EXTRAÇÃO PENDENTE
Este arquivo contém dados importantes mas requer uma biblioteca específica para extração.

📚 Biblioteca Necessária: ${info.library}
🔗 Referência: ${info.url}
⚙️ Complexidade de Implementação: ${info.complexity}

${info.estimatedContent}

💡 POTENCIAL DE VALOR
Baseado nas características do arquivo, este documento provavelmente contém:
- Informações estruturadas importantes
- Dados históricos valiosos
- Conteúdo rico para análise

🔄 STATUS: Aguardando implementação de extractor
            `.trim();

            return {
                content: placeholder,
                metadata: {
                    type: type,
                    originalFile: file.name,
                    size: file.size,
                    requiresExtractor: true,
                    extractorInfo: info,
                    placeholderGenerated: new Date().toISOString()
                }
            };
        }

        /**
         * Estima conteúdo de PDF
         */
        estimatePDFContent(file) {
            const pages = Math.max(1, Math.floor(file.size / 3000)); // Estimativa grosseira
            return `
📄 ESTIMATIVA DE CONTEÚDO PDF
- Páginas estimadas: ~${pages}
- Possível conteúdo: Documentos, relatórios, apresentações
- Valor potencial: ALTO (documentos formais geralmente contêm decisões importantes)
            `;
        }

        /**
         * Estima conteúdo de DOCX
         */
        estimateDOCXContent(file) {
            const pages = Math.max(1, Math.floor(file.size / 5000));
            return `
📝 ESTIMATIVA DE CONTEÚDO WORD
- Páginas estimadas: ~${pages}
- Possível conteúdo: Documentos elaborados, contratos, propostas
- Valor potencial: MUITO ALTO (documentos Word geralmente são bem estruturados)
            `;
        }

        /**
         * Estima conteúdo de XLSX
         */
        estimateXLSXContent(file) {
            const sheets = Math.max(1, Math.floor(file.size / 50000));
            return `
📊 ESTIMATIVA DE CONTEÚDO EXCEL
- Planilhas estimadas: ~${sheets}
- Possível conteúdo: Dados financeiros, análises, métricas
- Valor potencial: ALTO (dados estruturados e análises)
            `;
        }

        /**
         * Estima conteúdo de PST
         */
        estimatePSTContent(file) {
            const emails = Math.max(100, Math.floor(file.size / 5000));
            return `
📧 ESTIMATIVA DE CONTEÚDO OUTLOOK
- Emails estimados: ~${emails}
- Possível conteúdo: Comunicações, decisões, histórico de projetos
- Valor potencial: EXTREMAMENTE ALTO (histórico completo de comunicações)
- Período: Possivelmente anos de correspondências
            `;
        }

        /**
         * Verifica se pode extrair
         */
        canExtract(fileName) {
            const extension = this.getFileExtension(fileName);
            return this.capabilities[extension]?.supported || false;
        }

        /**
         * Obtém informações de capacidade
         */
        getCapabilityInfo(fileName) {
            const extension = this.getFileExtension(fileName);
            return this.capabilities[extension] || {
                supported: false,
                method: 'unknown',
                confidence: 0,
                futureSupport: false
            };
        }

        /**
         * Obtém extensão do arquivo
         */
        getFileExtension(fileName) {
            const lastDot = fileName.lastIndexOf('.');
            return lastDot > 0 ? fileName.substring(lastDot).toLowerCase() : '';
        }

        /**
         * Formata tamanho de arquivo
         */
        formatFileSize(bytes) {
            if (!bytes) return '0 B';
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }

        /**
         * Atualiza estatísticas
         */
        updateStats(extension, success, time) {
            this.stats.totalExtractions++;
            
            if (success) {
                this.stats.successfulExtractions++;
            } else {
                this.stats.failedExtractions++;
            }

            if (!this.stats.extractionsByType[extension]) {
                this.stats.extractionsByType[extension] = {
                    total: 0,
                    successful: 0,
                    failed: 0,
                    averageTime: 0
                };
            }

            const typeStats = this.stats.extractionsByType[extension];
            typeStats.total++;
            if (success) typeStats.successful++;
            else typeStats.failed++;
            
            // Atualiza média de tempo
            typeStats.averageTime = (typeStats.averageTime * (typeStats.total - 1) + time) / typeStats.total;
            
            // Atualiza média geral
            this.stats.averageExtractionTime = 
                (this.stats.averageExtractionTime * (this.stats.totalExtractions - 1) + time) / 
                this.stats.totalExtractions;
        }

        /**
         * Obtém estatísticas
         */
        getStats() {
            return {
                ...this.stats,
                successRate: this.stats.totalExtractions > 0 ? 
                    (this.stats.successfulExtractions / this.stats.totalExtractions * 100).toFixed(2) + '%' : 
                    '0%'
            };
        }

        /**
         * Lista capacidades atuais
         */
        listCapabilities() {
            const supported = [];
            const pending = [];
            const unsupported = [];

            Object.entries(this.capabilities).forEach(([ext, info]) => {
                const capability = {
                    extension: ext,
                    ...info
                };

                if (info.supported) {
                    supported.push(capability);
                } else if (info.futureSupport) {
                    pending.push(capability);
                } else {
                    unsupported.push(capability);
                }
            });

            return {
                supported,
                pending,
                unsupported,
                summary: {
                    totalTypes: Object.keys(this.capabilities).length,
                    supportedCount: supported.length,
                    pendingCount: pending.length,
                    unsupportedCount: unsupported.length
                }
            };
        }
    }

    // Exporta para o namespace KC
    KC.DocumentExtractors = new DocumentExtractors();

    console.log('✅ DocumentExtractors inicializado com suporte para:', 
        KC.DocumentExtractors.listCapabilities().summary);

})(window);