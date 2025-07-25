/**
 * CryptoService.js
 * Serviço de criptografia segura para dados sensíveis
 * Usa Web Crypto API com AES-GCM
 */

export class CryptoService {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12; // 96 bits para GCM
        this.saltLength = 16; // 128 bits
        this.iterations = 100000; // PBKDF2 iterations
    }

    /**
     * Deriva uma chave criptográfica a partir de uma senha
     * @param {string} password - Senha para derivação
     * @param {Uint8Array} salt - Salt para PBKDF2
     * @returns {Promise<CryptoKey>} Chave derivada
     */
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: this.algorithm, length: this.keyLength },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Criptografa dados usando AES-GCM
     * @param {string} plaintext - Texto a ser criptografado
     * @param {string} password - Senha para criptografia
     * @returns {Promise<string>} Dados criptografados em base64
     */
    async encrypt(plaintext, password) {
        try {
            const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            const key = await this.deriveKey(password, salt);

            const encoder = new TextEncoder();
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                encoder.encode(plaintext)
            );

            // Combina salt + iv + ciphertext
            const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(encrypted), salt.length + iv.length);

            // Retorna como base64
            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Erro na criptografia:', error);
            throw new Error('Falha ao criptografar dados');
        }
    }

    /**
     * Descriptografa dados usando AES-GCM
     * @param {string} ciphertext - Dados criptografados em base64
     * @param {string} password - Senha para descriptografia
     * @returns {Promise<string>} Texto descriptografado
     */
    async decrypt(ciphertext, password) {
        try {
            // Decodifica de base64
            const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

            // Extrai salt, iv e ciphertext
            const salt = combined.slice(0, this.saltLength);
            const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
            const encrypted = combined.slice(this.saltLength + this.ivLength);

            const key = await this.deriveKey(password, salt);

            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                encrypted
            );

            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Erro na descriptografia:', error);
            throw new Error('Falha ao descriptografar dados - senha incorreta ou dados corrompidos');
        }
    }

    /**
     * Gera um hash SHA-256 de uma string
     * @param {string} message - Mensagem para hash
     * @returns {Promise<string>} Hash em hexadecimal
     */
    async hash(message) {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Gera uma senha aleatória forte
     * @param {number} length - Comprimento da senha
     * @returns {string} Senha gerada
     */
    generatePassword(length = 32) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        const values = crypto.getRandomValues(new Uint8Array(length));
        return Array.from(values, byte => charset[byte % charset.length]).join('');
    }

    /**
     * Verifica se o navegador suporta Web Crypto API
     * @returns {boolean} True se suportado
     */
    static isSupported() {
        return typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.encrypt === 'function';
    }
}

// Exporta instância singleton
export default new CryptoService();