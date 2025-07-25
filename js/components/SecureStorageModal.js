/**
 * SecureStorageModal.js
 * Modal para inicialização do armazenamento seguro
 * Solicita senha mestra ao usuário
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const logger = KC.Logger;

    class SecureStorageModal {
        constructor() {
            this.modalId = 'secure-storage-modal';
            this.isOpen = false;
            this.onSuccess = null;
            this.onCancel = null;
        }

        /**
         * Abre o modal de senha mestra
         * @param {Object} options - Opções do modal
         * @returns {Promise} Resolve com true se senha fornecida
         */
        open(options = {}) {
            return new Promise((resolve, reject) => {
                this.onSuccess = resolve;
                this.onCancel = reject;
                this.show(options);
            });
        }

        /**
         * Exibe o modal
         */
        show(options) {
            if (this.isOpen) return;

            const modal = document.createElement('div');
            modal.id = this.modalId;
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-container" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2>🔐 Armazenamento Seguro</h2>
                        <button class="modal-close" aria-label="Fechar">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="secure-storage-info">
                            <p>Para proteger suas API keys e dados sensíveis, o sistema usa criptografia AES-256.</p>
                            <p>Por favor, defina uma senha mestra para o armazenamento seguro:</p>
                        </div>
                        
                        <form id="secure-storage-form" class="secure-form">
                            <div class="form-group">
                                <label for="master-password">Senha Mestra</label>
                                <div class="password-input-wrapper">
                                    <input 
                                        type="password" 
                                        id="master-password" 
                                        name="masterPassword"
                                        class="form-control" 
                                        placeholder="Digite uma senha forte"
                                        minlength="8"
                                        required
                                        autocomplete="new-password"
                                    >
                                    <button type="button" class="toggle-password" aria-label="Mostrar senha">
                                        👁️
                                    </button>
                                </div>
                                <small class="form-text">Mínimo 8 caracteres. Use letras, números e símbolos.</small>
                            </div>

                            <div class="form-group">
                                <label for="confirm-password">Confirmar Senha</label>
                                <div class="password-input-wrapper">
                                    <input 
                                        type="password" 
                                        id="confirm-password" 
                                        name="confirmPassword"
                                        class="form-control" 
                                        placeholder="Confirme sua senha"
                                        minlength="8"
                                        required
                                        autocomplete="new-password"
                                    >
                                    <button type="button" class="toggle-password" aria-label="Mostrar senha">
                                        👁️
                                    </button>
                                </div>
                            </div>

                            <div class="password-strength">
                                <div class="strength-meter">
                                    <div class="strength-bar" id="strength-bar"></div>
                                </div>
                                <span class="strength-text" id="strength-text">Digite uma senha</span>
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary" disabled>
                                    Inicializar Armazenamento Seguro
                                </button>
                                <button type="button" class="btn btn-secondary cancel-btn">
                                    Cancelar
                                </button>
                            </div>
                        </form>

                        <div class="security-notice">
                            <strong>⚠️ Importante:</strong>
                            <ul>
                                <li>Esta senha não é recuperável. Guarde-a em local seguro.</li>
                                <li>Sem ela, não será possível acessar os dados criptografados.</li>
                                <li>A sessão expira após 30 minutos de inatividade.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            this.isOpen = true;
            this.attachEvents();
            this.focusFirstInput();
        }

        /**
         * Anexa eventos ao modal
         */
        attachEvents() {
            const modal = document.getElementById(this.modalId);
            const form = modal.querySelector('#secure-storage-form');
            const passwordInput = modal.querySelector('#master-password');
            const confirmInput = modal.querySelector('#confirm-password');
            const submitBtn = modal.querySelector('button[type="submit"]');
            const cancelBtn = modal.querySelector('.cancel-btn');
            const closeBtn = modal.querySelector('.modal-close');
            const toggleBtns = modal.querySelectorAll('.toggle-password');

            // Toggle de visibilidade de senha
            toggleBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const input = e.target.previousElementSibling;
                    const type = input.type === 'password' ? 'text' : 'password';
                    input.type = type;
                    e.target.textContent = type === 'password' ? '👁️' : '🙈';
                });
            });

            // Medidor de força da senha
            passwordInput.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
                this.validateForm();
            });

            confirmInput.addEventListener('input', () => {
                this.validateForm();
            });

            // Validação do formulário
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSubmit();
            });

            // Cancelar
            cancelBtn.addEventListener('click', () => this.close(false));
            closeBtn.addEventListener('click', () => this.close(false));

            // Fechar com ESC
            document.addEventListener('keydown', this.handleEscape);

            // Fechar clicando fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.close(false);
                }
            });
        }

        /**
         * Atualiza o medidor de força da senha
         */
        updatePasswordStrength(password) {
            const strengthBar = document.getElementById('strength-bar');
            const strengthText = document.getElementById('strength-text');
            
            let strength = 0;
            const checks = {
                length: password.length >= 8,
                lowercase: /[a-z]/.test(password),
                uppercase: /[A-Z]/.test(password),
                numbers: /[0-9]/.test(password),
                special: /[^A-Za-z0-9]/.test(password)
            };

            strength = Object.values(checks).filter(Boolean).length;

            const strengthLevels = [
                { level: 0, text: 'Digite uma senha', color: '#ddd', width: '0%' },
                { level: 1, text: 'Muito fraca', color: '#dc3545', width: '20%' },
                { level: 2, text: 'Fraca', color: '#fd7e14', width: '40%' },
                { level: 3, text: 'Média', color: '#ffc107', width: '60%' },
                { level: 4, text: 'Forte', color: '#28a745', width: '80%' },
                { level: 5, text: 'Muito forte', color: '#20c997', width: '100%' }
            ];

            const level = strengthLevels[strength];
            strengthBar.style.width = level.width;
            strengthBar.style.backgroundColor = level.color;
            strengthText.textContent = level.text;
            strengthText.style.color = level.color;
        }

        /**
         * Valida o formulário
         */
        validateForm() {
            const form = document.getElementById('secure-storage-form');
            const password = form.masterPassword.value;
            const confirm = form.confirmPassword.value;
            const submitBtn = form.querySelector('button[type="submit"]');

            const isValid = password.length >= 8 && password === confirm;
            submitBtn.disabled = !isValid;

            if (confirm && password !== confirm) {
                form.confirmPassword.setCustomValidity('As senhas não coincidem');
            } else {
                form.confirmPassword.setCustomValidity('');
            }
        }

        /**
         * Processa o envio do formulário
         */
        async handleSubmit() {
            const form = document.getElementById('secure-storage-form');
            const password = form.masterPassword.value;

            try {
                // Mostra loading
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Inicializando...';

                // Inicializa o armazenamento seguro
                const { default: SecureStorageManager } = await import('../managers/SecureStorageManager.js');
                const success = await SecureStorageManager.initialize(password);

                if (success) {
                    this.close(true);
                } else {
                    throw new Error('Falha ao inicializar armazenamento seguro');
                }
            } catch (error) {
                logger.error('SecureStorageModal', 'Erro ao inicializar', error);
                alert('Erro ao inicializar armazenamento seguro. Tente novamente.');
                
                // Restaura botão
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Inicializar Armazenamento Seguro';
            }
        }

        /**
         * Fecha o modal
         */
        close(success = false) {
            const modal = document.getElementById(this.modalId);
            if (modal) {
                modal.remove();
            }

            this.isOpen = false;
            document.removeEventListener('keydown', this.handleEscape);

            if (success && this.onSuccess) {
                this.onSuccess(true);
            } else if (!success && this.onCancel) {
                this.onCancel(new Error('Cancelado pelo usuário'));
            }
        }

        /**
         * Handler para tecla ESC
         */
        handleEscape = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close(false);
            }
        }

        /**
         * Foca no primeiro input
         */
        focusFirstInput() {
            setTimeout(() => {
                const firstInput = document.querySelector('#master-password');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 100);
        }
    }

    // Adiciona estilos CSS
    const style = document.createElement('style');
    style.textContent = `
        .secure-form {
            margin-top: 20px;
        }

        .password-input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        .password-input-wrapper input {
            padding-right: 40px;
        }

        .toggle-password {
            position: absolute;
            right: 10px;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 20px;
            padding: 5px;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        .toggle-password:hover {
            opacity: 1;
        }

        .password-strength {
            margin: 15px 0;
        }

        .strength-meter {
            height: 5px;
            background: #e9ecef;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 5px;
        }

        .strength-bar {
            height: 100%;
            width: 0%;
            transition: all 0.3s ease;
            border-radius: 3px;
        }

        .strength-text {
            font-size: 12px;
            font-weight: 500;
        }

        .security-notice {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin-top: 20px;
            font-size: 14px;
        }

        .security-notice ul {
            margin: 10px 0 0 20px;
            padding: 0;
        }

        .security-notice li {
            margin: 5px 0;
        }

        .secure-storage-info {
            background: #e3f2fd;
            border: 1px solid #bbdefb;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
        }

        .secure-storage-info p {
            margin: 5px 0;
        }
    `;
    document.head.appendChild(style);

    // Registra no namespace global
    KC.SecureStorageModal = new SecureStorageModal();

})(window);