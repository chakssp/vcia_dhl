/**
 * ThemeManager.js - Gerenciador de Temas (Dark/Light Mode)
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class ThemeManager {
        constructor() {
            this.currentTheme = 'dark'; // Dark mode por padrão
            this.toggleButton = null;
            this.themeIcon = null;
        }

        /**
         * Inicializa o gerenciador de temas
         */
        initialize() {
            // Recupera tema salvo ou usa dark por padrão
            this.currentTheme = localStorage.getItem('kc-theme') || 'dark';
            
            // Aplica tema inicial
            this.applyTheme(this.currentTheme);
            
            // Configura o botão de toggle
            this.setupToggleButton();
            
            KC.Logger?.info('ThemeManager', `Tema inicializado: ${this.currentTheme}`);
        }

        /**
         * Configura o botão de toggle
         */
        setupToggleButton() {
            this.toggleButton = document.getElementById('theme-toggle');
            this.themeIcon = document.getElementById('theme-icon');
            
            if (this.toggleButton) {
                this.toggleButton.addEventListener('click', () => this.toggleTheme());
                this.updateIcon();
            }
        }

        /**
         * Alterna entre dark e light mode
         */
        toggleTheme() {
            this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
            this.applyTheme(this.currentTheme);
            this.updateIcon();
            
            // Salva preferência
            localStorage.setItem('kc-theme', this.currentTheme);
            
            // Emite evento
            KC.EventBus?.emit('theme:changed', { theme: this.currentTheme });
            
            KC.Logger?.info('ThemeManager', `Tema alterado para: ${this.currentTheme}`);
        }

        /**
         * Aplica o tema
         */
        applyTheme(theme) {
            if (theme === 'light') {
                document.body.classList.add('light-mode');
            } else {
                document.body.classList.remove('light-mode');
            }
        }

        /**
         * Atualiza o ícone do botão
         */
        updateIcon() {
            if (this.themeIcon) {
                this.themeIcon.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
            }
        }

        /**
         * Obtém o tema atual
         */
        getCurrentTheme() {
            return this.currentTheme;
        }

        /**
         * Define um tema específico
         */
        setTheme(theme) {
            if (theme === 'dark' || theme === 'light') {
                this.currentTheme = theme;
                this.applyTheme(theme);
                this.updateIcon();
                localStorage.setItem('kc-theme', theme);
                KC.EventBus?.emit('theme:changed', { theme });
            }
        }
    }

    // Registra no namespace global
    KC.ThemeManager = new ThemeManager();
    KC.Logger?.info('ThemeManager', 'Componente registrado com sucesso');

})(window);