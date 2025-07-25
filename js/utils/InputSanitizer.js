/**
 * InputSanitizer.js
 * Utilitário para sanitização de entradas de usuário
 * Previne XSS e outras vulnerabilidades de injeção
 */

export class InputSanitizer {
    constructor() {
        // Mapeamento de caracteres HTML perigosos
        this.htmlEscapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };

        // Regex para detectar tentativas de XSS
        this.xssPatterns = [
            /<script[^>]*>[\s\S]*?<\/script>/gi,
            /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi, // onclick, onload, etc.
            /<embed[^>]*>/gi,
            /<object[^>]*>/gi,
            /data:text\/html/gi,
            /vbscript:/gi
        ];

        // Whitelist de caracteres para nomes de arquivo
        this.fileNameWhitelist = /^[a-zA-Z0-9\-_.\s()]+$/;

        // Whitelist de caracteres para categorias
        this.categoryWhitelist = /^[a-zA-Z0-9\-_\s/àáâãäåèéêëìíîïòóôõöùúûüñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÑÇ]+$/;
    }

    /**
     * Escapa caracteres HTML perigosos
     * @param {string} str - String para escapar
     * @returns {string} String escapada
     */
    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        
        return str.replace(/[&<>"'\/]/g, (char) => this.htmlEscapeMap[char]);
    }

    /**
     * Remove tags HTML completamente
     * @param {string} str - String com possível HTML
     * @returns {string} String sem tags HTML
     */
    stripHtml(str) {
        if (typeof str !== 'string') return '';
        
        // Remove todas as tags HTML
        return str.replace(/<[^>]*>/g, '');
    }

    /**
     * Detecta tentativas de XSS
     * @param {string} str - String para verificar
     * @returns {boolean} True se detectar padrões XSS
     */
    detectXSS(str) {
        if (typeof str !== 'string') return false;
        
        return this.xssPatterns.some(pattern => pattern.test(str));
    }

    /**
     * Sanitiza nome de arquivo
     * @param {string} fileName - Nome do arquivo
     * @returns {string} Nome sanitizado
     */
    sanitizeFileName(fileName) {
        if (typeof fileName !== 'string') return '';
        
        // Remove path traversal
        fileName = fileName.replace(/\.\./g, '');
        fileName = fileName.replace(/[\/\\]/g, '_');
        
        // Remove caracteres não permitidos
        fileName = fileName.replace(/[^a-zA-Z0-9\-_.\s()]/g, '');
        
        // Limita comprimento
        if (fileName.length > 255) {
            const ext = fileName.substring(fileName.lastIndexOf('.'));
            fileName = fileName.substring(0, 250) + ext;
        }
        
        return fileName.trim();
    }

    /**
     * Sanitiza nome de categoria
     * @param {string} category - Nome da categoria
     * @returns {string} Categoria sanitizada
     */
    sanitizeCategory(category) {
        if (typeof category !== 'string') return '';
        
        // Remove espaços extras
        category = category.trim().replace(/\s+/g, ' ');
        
        // Remove caracteres não permitidos (mantém acentos)
        category = category.replace(/[^a-zA-Z0-9\-_\s/àáâãäåèéêëìíîïòóôõöùúûüñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÑÇ]/g, '');
        
        // Limita comprimento
        if (category.length > 100) {
            category = category.substring(0, 100);
        }
        
        return category;
    }

    /**
     * Sanitiza caminho de arquivo
     * @param {string} path - Caminho do arquivo
     * @returns {string} Caminho sanitizado
     */
    sanitizePath(path) {
        if (typeof path !== 'string') return '';
        
        // Remove tentativas de path traversal
        path = path.replace(/\.\./g, '');
        
        // Normaliza separadores
        path = path.replace(/\\/g, '/');
        
        // Remove múltiplas barras
        path = path.replace(/\/+/g, '/');
        
        // Remove caracteres perigosos
        path = path.replace(/[<>"|?*]/g, '');
        
        return path;
    }

    /**
     * Sanitiza texto para exibição segura
     * @param {string} text - Texto para sanitizar
     * @param {Object} options - Opções de sanitização
     * @returns {string} Texto sanitizado
     */
    sanitizeText(text, options = {}) {
        if (typeof text !== 'string') return '';
        
        const {
            allowHtml = false,
            maxLength = 10000,
            allowLineBreaks = true
        } = options;
        
        // Limita comprimento
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + '...';
        }
        
        // Remove ou escapa HTML
        if (!allowHtml) {
            text = this.escapeHtml(text);
        }
        
        // Converte quebras de linha se permitido
        if (allowLineBreaks) {
            text = text.replace(/\n/g, '<br>');
        }
        
        return text;
    }

    /**
     * Valida e sanitiza JSON
     * @param {string} jsonStr - String JSON
     * @returns {Object|null} Objeto parseado ou null se inválido
     */
    sanitizeJSON(jsonStr) {
        try {
            // Tenta fazer parse
            const obj = JSON.parse(jsonStr);
            
            // Re-serializa para remover possíveis injeções
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.warn('JSON inválido:', error);
            return null;
        }
    }

    /**
     * Sanitiza array de strings
     * @param {Array} arr - Array para sanitizar
     * @param {Function} sanitizeFunc - Função de sanitização para cada item
     * @returns {Array} Array sanitizado
     */
    sanitizeArray(arr, sanitizeFunc = this.escapeHtml.bind(this)) {
        if (!Array.isArray(arr)) return [];
        
        return arr.map(item => {
            if (typeof item === 'string') {
                return sanitizeFunc(item);
            }
            return item;
        });
    }

    /**
     * Valida URL
     * @param {string} url - URL para validar
     * @returns {boolean} True se URL válida
     */
    isValidUrl(url) {
        try {
            const u = new URL(url);
            return ['http:', 'https:'].includes(u.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Sanitiza URL
     * @param {string} url - URL para sanitizar
     * @returns {string} URL sanitizada ou string vazia
     */
    sanitizeUrl(url) {
        if (!this.isValidUrl(url)) return '';
        
        try {
            const u = new URL(url);
            // Reconstrói URL apenas com partes seguras
            return u.origin + u.pathname + u.search;
        } catch {
            return '';
        }
    }

    /**
     * Cria elemento DOM seguro com texto
     * @param {string} tag - Tag HTML
     * @param {string} text - Texto do elemento
     * @param {Object} attributes - Atributos seguros
     * @returns {HTMLElement} Elemento DOM
     */
    createSafeElement(tag, text, attributes = {}) {
        const element = document.createElement(tag);
        
        // Define texto de forma segura
        element.textContent = text;
        
        // Adiciona atributos seguros
        const safeAttributes = ['class', 'id', 'data-id', 'aria-label', 'role'];
        Object.entries(attributes).forEach(([key, value]) => {
            if (safeAttributes.includes(key.toLowerCase())) {
                element.setAttribute(key, String(value));
            }
        });
        
        return element;
    }
}

// Exporta instância singleton
export default new InputSanitizer();