/**
 * BrowserCompatibility.js - Verificação de Compatibilidade com File System Access API
 * 
 * Verifica suporte do navegador e oferece fallbacks quando necessário
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator = window.KnowledgeConsolidator || {};

    class BrowserCompatibility {
        constructor() {
            this.support = this._checkSupport();
        }

        /**
         * Verifica suporte completo do navegador
         */
        _checkSupport() {
            const hasDirectoryPicker = 'showDirectoryPicker' in window;
            const hasFilePicker = 'showOpenFilePicker' in window;
            const hasFileSystemWritableFileStream = 'FileSystemWritableFileStream' in window;
            
            const browser = this._detectBrowser();
            
            return {
                fileSystemAccess: hasDirectoryPicker && hasFilePicker,
                directoryPicker: hasDirectoryPicker,
                filePicker: hasFilePicker,
                writableStreams: hasFileSystemWritableFileStream,
                browser: browser,
                version: this._getBrowserVersion(browser),
                platform: navigator.platform,
                userAgent: navigator.userAgent
            };
        }

        /**
         * Detecta o navegador atual
         */
        _detectBrowser() {
            const userAgent = navigator.userAgent;
            
            if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
                return 'Chrome';
            } else if (userAgent.includes('Edg')) {
                return 'Edge';
            } else if (userAgent.includes('Firefox')) {
                return 'Firefox';
            } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
                return 'Safari';
            } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
                return 'Opera';
            }
            
            return 'Unknown';
        }

        /**
         * Obtém a versão do navegador
         */
        _getBrowserVersion(browser) {
            const userAgent = navigator.userAgent;
            let version = 'Unknown';
            
            try {
                if (browser === 'Chrome') {
                    const match = userAgent.match(/Chrome\/(\d+)/);
                    version = match ? match[1] : 'Unknown';
                } else if (browser === 'Edge') {
                    const match = userAgent.match(/Edg\/(\d+)/);
                    version = match ? match[1] : 'Unknown';
                } else if (browser === 'Firefox') {
                    const match = userAgent.match(/Firefox\/(\d+)/);
                    version = match ? match[1] : 'Unknown';
                } else if (browser === 'Opera') {
                    const match = userAgent.match(/OPR\/(\d+)/);
                    version = match ? match[1] : 'Unknown';
                }
            } catch (error) {
                console.warn('Erro ao detectar versão do navegador:', error);
            }
            
            return version;
        }

        /**
         * Verifica se o navegador suporta File System Access API
         */
        isSupported() {
            return this.support.fileSystemAccess;
        }

        /**
         * Obtém informações completas de compatibilidade
         */
        getCompatibilityInfo() {
            const isSupported = this.isSupported();
            
            return {
                supported: isSupported,
                browser: this.support.browser,
                version: this.support.version,
                platform: this.support.platform,
                capabilities: {
                    directoryAccess: this.support.directoryPicker,
                    fileAccess: this.support.filePicker,
                    writableStreams: this.support.writableStreams
                },
                recommendations: this._getRecommendations(isSupported),
                fallbackOptions: this._getFallbackOptions(isSupported)
            };
        }

        /**
         * Obtém recomendações baseadas na compatibilidade
         */
        _getRecommendations(isSupported) {
            if (isSupported) {
                return {
                    status: 'compatible',
                    message: 'Seu navegador suporta todas as funcionalidades necessárias',
                    action: 'ready'
                };
            }

            return {
                status: 'incompatible',
                message: 'Seu navegador não suporta acesso direto ao sistema de arquivos',
                recommendedBrowsers: [
                    'Google Chrome 86+',
                    'Microsoft Edge 86+',
                    'Opera 72+'
                ],
                currentLimitations: [
                    'Sem acesso direto a diretórios',
                    'Sem detecção automática do Obsidian',
                    'Funcionalidade limitada de descoberta'
                ],
                action: 'upgrade_or_fallback'
            };
        }

        /**
         * Obtém opções de fallback
         */
        _getFallbackOptions(isSupported) {
            if (isSupported) {
                return null;
            }

            return {
                manualUpload: {
                    available: true,
                    description: 'Upload manual de arquivos individuais',
                    limitations: ['Sem scanning automático', 'Sem estrutura de diretórios']
                },
                dragAndDrop: {
                    available: true,
                    description: 'Arrastar e soltar arquivos na interface',
                    limitations: ['Máximo 100 arquivos por vez', 'Sem metadados de diretório']
                },
                bulkUpload: {
                    available: false,
                    description: 'Upload em lote (não disponível)',
                    limitations: ['Não suportado pelo navegador']
                }
            };
        }

        /**
         * Mostra modal de compatibilidade
         */
        showCompatibilityModal() {
            const info = this.getCompatibilityInfo();
            
            if (info.supported) {
                this._showSupportedModal(info);
            } else {
                this._showUnsupportedModal(info);
            }
        }

        /**
         * Modal para navegadores suportados
         */
        _showSupportedModal(info) {
            const modalContent = `
                <div class="compatibility-modal supported">
                    <div class="modal-header">
                        <h2>✅ Navegador Compatível</h2>
                    </div>
                    <div class="modal-body">
                        <div class="browser-info">
                            <p><strong>Navegador:</strong> ${info.browser} ${info.version}</p>
                            <p><strong>Plataforma:</strong> ${info.platform}</p>
                        </div>
                        <div class="capabilities">
                            <h3>Funcionalidades Disponíveis:</h3>
                            <ul>
                                <li>✅ Acesso direto a diretórios</li>
                                <li>✅ Detecção automática do Obsidian</li>
                                <li>✅ Scanning recursivo de arquivos</li>
                                <li>✅ Metadados completos de arquivos</li>
                            </ul>
                        </div>
                        <div class="security-info">
                            <h3>🔒 Informações de Segurança:</h3>
                            <p>Todas as operações são realizadas localmente no seu navegador. 
                            Você controla as permissões de acesso aos seus arquivos.</p>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-primary" onclick="KC.ModalManager.closeModal()">
                            Entendido
                        </button>
                    </div>
                </div>
            `;

            this._showModal(modalContent);
        }

        /**
         * Modal para navegadores não suportados
         */
        _showUnsupportedModal(info) {
            const modalContent = `
                <div class="compatibility-modal unsupported">
                    <div class="modal-header">
                        <h2>⚠️ Navegador com Limitações</h2>
                    </div>
                    <div class="modal-body">
                        <div class="browser-info">
                            <p><strong>Navegador:</strong> ${info.browser} ${info.version}</p>
                            <p><strong>Status:</strong> Funcionalidade limitada</p>
                        </div>
                        <div class="recommendations">
                            <h3>📋 Navegadores Recomendados:</h3>
                            <ul>
                                ${info.recommendations.recommendedBrowsers.map(browser => 
                                    `<li>${browser}</li>`
                                ).join('')}
                            </ul>
                        </div>
                        <div class="limitations">
                            <h3>❌ Limitações Atuais:</h3>
                            <ul>
                                ${info.recommendations.currentLimitations.map(limitation => 
                                    `<li>${limitation}</li>`
                                ).join('')}
                            </ul>
                        </div>
                        <div class="fallback-options">
                            <h3>🔄 Opções Disponíveis:</h3>
                            <ul>
                                <li>📁 Upload manual de arquivos</li>
                                <li>🖱️ Arrastar e soltar arquivos</li>
                                <li>📝 Inserção manual de texto</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="KC.ModalManager.closeModal()">
                            Continuar com Limitações
                        </button>
                        <button class="btn btn-primary" onclick="window.open('https://www.google.com/chrome/', '_blank')">
                            Baixar Chrome
                        </button>
                    </div>
                </div>
            `;

            this._showModal(modalContent);
        }

        /**
         * Exibe modal genérico
         */
        _showModal(content) {
            // Integração com o sistema de modais existente
            if (KC.ModalManager) {
                KC.ModalManager.showModal('compatibility', content);
            } else {
                // Fallback simples
                const modal = document.createElement('div');
                modal.className = 'compatibility-modal-overlay';
                modal.innerHTML = content;
                document.body.appendChild(modal);
            }
        }

        /**
         * Solicita permissões de acesso a diretórios
         */
        async requestDirectoryAccess(options = {}) {
            if (!this.isSupported()) {
                throw new Error('File System Access API não suportada');
            }

            try {
                const defaultOptions = {
                    id: 'knowledge-consolidator',
                    mode: 'read',
                    startIn: 'documents'
                };

                const finalOptions = { ...defaultOptions, ...options };
                
                const directoryHandle = await window.showDirectoryPicker(finalOptions);
                
                return {
                    success: true,
                    handle: directoryHandle,
                    name: directoryHandle.name,
                    message: `Acesso concedido ao diretório: ${directoryHandle.name}`
                };

            } catch (error) {
                if (error.name === 'AbortError') {
                    return {
                        success: false,
                        error: 'cancelled',
                        message: 'Usuário cancelou a seleção'
                    };
                }

                return {
                    success: false,
                    error: error.name,
                    message: `Erro ao acessar diretório: ${error.message}`
                };
            }
        }

        /**
         * Verifica se as permissões já foram concedidas para um diretório
         */
        async verifyPermissions(directoryHandle, mode = 'read') {
            try {
                const permission = await directoryHandle.queryPermission({ mode });
                return permission === 'granted';
            } catch (error) {
                return false;
            }
        }

        /**
         * Solicita permissões para um diretório já obtido
         */
        async requestPermissions(directoryHandle, mode = 'read') {
            try {
                const permission = await directoryHandle.requestPermission({ mode });
                return permission === 'granted';
            } catch (error) {
                return false;
            }
        }
    }

    // Registra no namespace global
    KC.BrowserCompatibility = BrowserCompatibility;

    // Cria instância singleton
    KC.compatibility = new BrowserCompatibility();

})(window);