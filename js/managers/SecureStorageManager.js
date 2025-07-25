/**
 * SecureStorageManager.js
 * Gerenciador de armazenamento seguro para dados sensíveis
 * Implementa criptografia automática para API keys e outras informações sensíveis
 */

import CryptoService from '../services/CryptoService.js';

export class SecureStorageManager {
    constructor() {
        this.storageKey = 'kc_secure_storage';
        this.metaKey = 'kc_secure_meta';
        this.sessionKey = null;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutos
        this.lastActivity = Date.now();
    }

    /**
     * Inicializa o gerenciador com uma senha mestra
     * @param {string} masterPassword - Senha mestra do usuário
     * @returns {Promise<boolean>} True se inicializado com sucesso
     */
    async initialize(masterPassword) {
        try {
            // Verifica suporte do navegador
            if (!CryptoService.isSupported()) {
                throw new Error('Navegador não suporta Web Crypto API');
            }

            // Deriva a chave de sessão
            this.sessionKey = await CryptoService.hash(masterPassword + navigator.userAgent);
            this.lastActivity = Date.now();

            // Verifica se já existe storage
            const meta = this.getMeta();
            if (!meta.initialized) {
                // Primeira inicialização
                meta.initialized = true;
                meta.createdAt = new Date().toISOString();
                meta.version = '1.0';
                this.setMeta(meta);
            }

            // Configura timer de timeout
            this.startSessionTimer();

            return true;
        } catch (error) {
            console.error('Erro ao inicializar SecureStorageManager:', error);
            return false;
        }
    }

    /**
     * Armazena um valor de forma segura
     * @param {string} key - Chave do item
     * @param {any} value - Valor a ser armazenado
     * @returns {Promise<boolean>} True se armazenado com sucesso
     */
    async setSecureItem(key, value) {
        try {
            this.checkSession();

            const data = JSON.stringify(value);
            const encrypted = await CryptoService.encrypt(data, this.sessionKey);

            const storage = this.getStorage();
            storage[key] = {
                data: encrypted,
                timestamp: Date.now(),
                checksum: await CryptoService.hash(encrypted)
            };

            localStorage.setItem(this.storageKey, JSON.stringify(storage));
            this.updateActivity();

            return true;
        } catch (error) {
            console.error('Erro ao armazenar item seguro:', error);
            return false;
        }
    }

    /**
     * Recupera um valor armazenado de forma segura
     * @param {string} key - Chave do item
     * @returns {Promise<any>} Valor descriptografado ou null
     */
    async getSecureItem(key) {
        try {
            this.checkSession();

            const storage = this.getStorage();
            const item = storage[key];

            if (!item) return null;

            // Verifica integridade
            const checksum = await CryptoService.hash(item.data);
            if (checksum !== item.checksum) {
                throw new Error('Integridade dos dados comprometida');
            }

            const decrypted = await CryptoService.decrypt(item.data, this.sessionKey);
            this.updateActivity();

            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Erro ao recuperar item seguro:', error);
            return null;
        }
    }

    /**
     * Remove um item do armazenamento seguro
     * @param {string} key - Chave do item
     * @returns {boolean} True se removido com sucesso
     */
    removeSecureItem(key) {
        try {
            this.checkSession();

            const storage = this.getStorage();
            delete storage[key];

            localStorage.setItem(this.storageKey, JSON.stringify(storage));
            this.updateActivity();

            return true;
        } catch (error) {
            console.error('Erro ao remover item seguro:', error);
            return false;
        }
    }

    /**
     * Lista todas as chaves armazenadas
     * @returns {string[]} Array de chaves
     */
    listKeys() {
        try {
            this.checkSession();
            const storage = this.getStorage();
            return Object.keys(storage);
        } catch (error) {
            console.error('Erro ao listar chaves:', error);
            return [];
        }
    }

    /**
     * Limpa todo o armazenamento seguro
     * @returns {boolean} True se limpo com sucesso
     */
    clearAll() {
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.metaKey);
            this.sessionKey = null;
            return true;
        } catch (error) {
            console.error('Erro ao limpar armazenamento:', error);
            return false;
        }
    }

    /**
     * Verifica se a sessão ainda está ativa
     */
    checkSession() {
        if (!this.sessionKey) {
            throw new Error('Sessão não inicializada');
        }

        if (Date.now() - this.lastActivity > this.sessionTimeout) {
            this.sessionKey = null;
            throw new Error('Sessão expirada');
        }
    }

    /**
     * Atualiza o timestamp da última atividade
     */
    updateActivity() {
        this.lastActivity = Date.now();
    }

    /**
     * Inicia o timer de timeout da sessão
     */
    startSessionTimer() {
        setInterval(() => {
            if (this.sessionKey && Date.now() - this.lastActivity > this.sessionTimeout) {
                this.sessionKey = null;
                console.log('Sessão expirada por inatividade');
            }
        }, 60000); // Verifica a cada minuto
    }

    /**
     * Recupera o storage criptografado
     * @returns {Object} Storage object
     */
    getStorage() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : {};
    }

    /**
     * Recupera os metadados
     * @returns {Object} Metadata object
     */
    getMeta() {
        const data = localStorage.getItem(this.metaKey);
        return data ? JSON.parse(data) : {};
    }

    /**
     * Armazena os metadados
     * @param {Object} meta - Metadados
     */
    setMeta(meta) {
        localStorage.setItem(this.metaKey, JSON.stringify(meta));
    }

    /**
     * Exporta todos os dados criptografados (para backup)
     * @returns {string} Dados exportados em JSON
     */
    exportData() {
        try {
            this.checkSession();
            return JSON.stringify({
                storage: this.getStorage(),
                meta: this.getMeta(),
                exportDate: new Date().toISOString()
            });
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            return null;
        }
    }

    /**
     * Importa dados de um backup
     * @param {string} jsonData - Dados em JSON
     * @returns {boolean} True se importado com sucesso
     */
    importData(jsonData) {
        try {
            this.checkSession();
            const data = JSON.parse(jsonData);
            
            localStorage.setItem(this.storageKey, JSON.stringify(data.storage));
            localStorage.setItem(this.metaKey, JSON.stringify(data.meta));
            
            return true;
        } catch (error) {
            console.error('Erro ao importar dados:', error);
            return false;
        }
    }
}

// Exporta instância singleton
export default new SecureStorageManager();