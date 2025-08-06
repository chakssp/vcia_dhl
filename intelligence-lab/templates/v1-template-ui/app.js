/**
 * Intelligence Lab UI v1.0 - Consolidated JavaScript
 * Data: 29/07/2025
 * 
 * Este arquivo implementa toda a lógica interativa para o template consolidado
 * Inclui: navegação por tabs, demos interativos, manipulação de dados
 */

// ===================================
// 1. GLOBAL NAMESPACE
// ===================================

window.IntelligenceLab = window.IntelligenceLab || {};

// ===================================
// 2. DATA STRUCTURES (from data-schema.md)
// ===================================

const MockData = {
    // Dados de exemplo baseados no schema
    aggregatedData: {
        files: [
            {
                id: 'file-001',
                name: 'projeto-ia-decisao.md',
                path: '/knowledge/projetos/projeto-ia-decisao.md',
                categories: new Set(['Breakthrough Técnico', 'Momento Decisivo']),
                analysisType: 'Breakthrough Técnico',
                relevanceScore: 92,
                createdAt: new Date('2025-01-15'),
                size: 15420,
                entities: new Set(['AI', 'Machine Learning', 'Decision Support'])
            },
            {
                id: 'file-002',
                name: 'evolucao-arquitetura.md',
                path: '/knowledge/tech/evolucao-arquitetura.md',
                categories: new Set(['Evolução Conceitual']),
                analysisType: 'Evolução Conceitual',
                relevanceScore: 85,
                createdAt: new Date('2025-02-20'),
                size: 22100,
                entities: new Set(['Microservices', 'Cloud Native', 'Kubernetes'])
            }
        ],
        entities: [
            {
                name: 'AI',
                type: 'technology',
                occurrences: 156,
                influence: 0.92,
                categories: new Set(['Breakthrough Técnico', 'Insight Estratégico']),
                metrics: {
                    degree: 23,
                    pagerank: 0.045,
                    betweenness: 0.178
                }
            },
            {
                name: 'Machine Learning',
                type: 'technology',
                occurrences: 89,
                influence: 0.78,
                categories: new Set(['Breakthrough Técnico']),
                metrics: {
                    degree: 15,
                    pagerank: 0.032,
                    betweenness: 0.145
                }
            }
        ],
        categories: [
            {
                name: 'Breakthrough Técnico',
                id: 'cat-breakthrough',
                type: 'semantic',
                count: 12,
                color: '#7c3aed',
                icon: '🚀'
            },
            {
                name: 'Evolução Conceitual',
                id: 'cat-evolution',
                type: 'semantic',
                count: 8,
                color: '#2563eb',
                icon: '📈'
            },
            {
                name: 'Momento Decisivo',
                id: 'cat-moment',
                type: 'semantic',
                count: 5,
                color: '#dc2626',
                icon: '🎯'
            },
            {
                name: 'Insight Estratégico',
                id: 'cat-insight',
                type: 'semantic',
                count: 9,
                color: '#059669',
                icon: '💡'
            },
            {
                name: 'Aprendizado Geral',
                id: 'cat-learning',
                type: 'semantic',
                count: 15,
                color: '#d97706',
                icon: '📚'
            }
        ],
        stats: {
            totalFiles: 39,
            totalChunks: 2238,
            totalEntities: 1511,
            totalCategories: 10,
            avgChunksPerFile: 57.38,
            avgRelevance: 79.72,
            analysisDistribution: {
                'Breakthrough Técnico': 12,
                'Evolução Conceitual': 8,
                'Momento Decisivo': 5,
                'Insight Estratégico': 9,
                'Aprendizado Geral': 5
            },
            topEntities: [
                { name: 'The Generated Answer', count: 89, influence: 0.92 },
                { name: 'Correct Answer', count: 76, influence: 0.88 },
                { name: 'Evaluating End', count: 54, influence: 0.75 }
            ]
        }
    }
};

// ===================================
// 3. VIEW MANAGEMENT
// ===================================

class ViewManager {
    constructor() {
        this.currentView = 'components';
        this.views = ['components', 'layout', 'data', 'comparison', 'docs'];
        this.init();
    }

    init() {
        // Setup tab listeners
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Initialize first view
        this.switchView('components');
    }

    switchView(viewName) {
        // Update tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.demo-container').forEach(container => {
            container.style.display = 'none';
        });

        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.style.display = 'block';
            this.currentView = viewName;

            // Trigger view-specific updates
            this.onViewChange(viewName);
        }
    }

    onViewChange(viewName) {
        switch(viewName) {
            case 'data':
                this.updateDataView();
                break;
            case 'layout':
                this.animateLayout();
                break;
        }
    }

    updateDataView() {
        // Syntax highlighting for JSON
        document.querySelectorAll('.json-preview code').forEach(block => {
            // Simple syntax highlighting
            block.innerHTML = block.innerHTML
                .replace(/"(\w+)":/g, '"<span class="type">$1</span>":')
                .replace(/: "([^"]+)"/g, ': "<span class="value">$1</span>"')
                .replace(/: (\d+)/g, ': <span class="number">$1</span>');
        });
    }

    animateLayout() {
        // Animate layout demo on view
        const miniCards = document.querySelectorAll('.mini-card');
        miniCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(10px)';
            setTimeout(() => {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
}

// ===================================
// 4. DENSITY MANAGER
// ===================================

class DensityManager {
    constructor() {
        this.currentDensity = 'normal';
        this.densities = {
            compact: {
                class: 'compact-mode',
                sidebarWidth: '150px',
                fontSize: '0.875'
            },
            normal: {
                class: '',
                sidebarWidth: '180px',
                fontSize: '1'
            },
            comfortable: {
                class: 'expanded-mode',
                sidebarWidth: '220px',
                fontSize: '1.125'
            }
        };
    }

    setDensity(mode) {
        const body = document.body;
        
        // Remove all density classes
        Object.values(this.densities).forEach(density => {
            if (density.class) {
                body.classList.remove(density.class);
            }
        });

        // Add new density class
        if (this.densities[mode].class) {
            body.classList.add(this.densities[mode].class);
        }

        this.currentDensity = mode;
        
        // Update CSS variables
        document.documentElement.style.setProperty('--sidebar-width', this.densities[mode].sidebarWidth);
        
        // Trigger resize event for any components that need to recalculate
        window.dispatchEvent(new Event('resize'));
        
        // Show notification
        this.showNotification(`Densidade alterada para: ${mode}`);
    }

    showNotification(message) {
        // Simple notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            z-index: 1200;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

// ===================================
// 5. DATA EXPLORER
// ===================================

class DataExplorer {
    constructor() {
        this.data = MockData.aggregatedData;
    }

    showDataExplorer() {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3>🔍 Data Explorer - Estrutura Completa</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div style="display: grid; gap: 1rem;">
                    <div class="card">
                        <h4>📊 Estatísticas Gerais</h4>
                        <div class="metrics-grid" style="grid-template-columns: repeat(4, 1fr);">
                            <div class="metric-card">
                                <div class="metric-value">${this.data.stats.totalFiles}</div>
                                <div class="metric-label">Arquivos</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value">${this.data.stats.totalEntities}</div>
                                <div class="metric-label">Entidades</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value">${this.data.stats.avgRelevance}%</div>
                                <div class="metric-label">Relevância Média</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value">${this.data.stats.avgChunksPerFile}</div>
                                <div class="metric-label">Chunks/Arquivo</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h4>🏷️ Distribuição por Categoria</h4>
                        <div class="category-grid">
                            ${this.data.categories.map(cat => `
                                <div class="category-badge cat-${cat.id.replace('cat-', '')}">
                                    ${cat.icon} ${cat.name} (${cat.count})
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="card">
                        <h4>🌟 Top Entidades</h4>
                        <table class="responsive-table">
                            <thead>
                                <tr>
                                    <th>Entidade</th>
                                    <th>Ocorrências</th>
                                    <th>Influência</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.data.stats.topEntities.map(entity => `
                                    <tr>
                                        <td>${entity.name}</td>
                                        <td>${entity.count}</td>
                                        <td>${(entity.influence * 100).toFixed(0)}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    exportSchema() {
        // Export schema as JSON
        const schema = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            structure: {
                files: {
                    type: 'Array<File>',
                    fields: ['id', 'name', 'path', 'categories', 'analysisType', 'relevanceScore']
                },
                entities: {
                    type: 'Array<Entity>',
                    fields: ['name', 'type', 'occurrences', 'influence', 'metrics']
                },
                categories: {
                    type: 'Array<Category>',
                    fields: ['name', 'id', 'type', 'count', 'color', 'icon']
                },
                stats: {
                    type: 'Statistics',
                    fields: ['totalFiles', 'totalEntities', 'avgRelevance', 'analysisDistribution']
                }
            },
            data: this.data
        };

        // Download as JSON
        const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `intelligence-lab-schema-v1-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        // Show notification
        const densityManager = new DensityManager();
        densityManager.showNotification('Schema exportado com sucesso!');
    }
}

// ===================================
// 6. INTERACTIVE DEMOS
// ===================================

class InteractiveDemos {
    constructor() {
        this.setupDemos();
    }

    setupDemos() {
        // Add hover effects to demo boxes
        document.querySelectorAll('.demo-box').forEach(box => {
            box.addEventListener('mouseenter', (e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = 'var(--shadow-lg)';
            });
            
            box.addEventListener('mouseleave', (e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
            });
        });

        // Animate metrics on hover
        document.querySelectorAll('.metric-card').forEach(card => {
            card.addEventListener('mouseenter', (e) => {
                const value = e.currentTarget.querySelector('.metric-value');
                if (value) {
                    value.style.transform = 'scale(1.1)';
                    value.style.transition = 'transform 0.2s ease';
                }
            });
            
            card.addEventListener('mouseleave', (e) => {
                const value = e.currentTarget.querySelector('.metric-value');
                if (value) {
                    value.style.transform = 'scale(1)';
                }
            });
        });

        // Category badges interaction
        document.querySelectorAll('.category-badge').forEach(badge => {
            badge.style.cursor = 'pointer';
            badge.addEventListener('click', (e) => {
                const categoryName = e.target.textContent.trim();
                this.showCategoryDetails(categoryName);
            });
        });
    }

    showCategoryDetails(categoryName) {
        // Simple alert for demo
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>📊 Detalhes da Categoria</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="card">
                    <h4>${categoryName}</h4>
                    <p>Esta categoria representa arquivos e entidades relacionados a ${categoryName.toLowerCase()}.</p>
                    <div class="metrics-grid" style="grid-template-columns: repeat(2, 1fr); margin-top: 1rem;">
                        <div class="metric-card">
                            <div class="metric-value">${Math.floor(Math.random() * 20) + 5}</div>
                            <div class="metric-label">Arquivos</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${Math.floor(Math.random() * 100) + 20}</div>
                            <div class="metric-label">Entidades</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// ===================================
// 7. INITIALIZATION
// ===================================

class App {
    constructor() {
        this.viewManager = new ViewManager();
        this.densityManager = new DensityManager();
        this.dataExplorer = new DataExplorer();
        this.demos = new InteractiveDemos();
        
        // Expose methods globally
        window.IntelligenceLab.setDensity = (mode) => this.densityManager.setDensity(mode);
        window.IntelligenceLab.showDataExplorer = () => this.dataExplorer.showDataExplorer();
        window.IntelligenceLab.exportSchema = () => this.dataExplorer.exportSchema();
        
        this.init();
    }

    init() {
        // Add CSS animations
        this.addAnimations();
        
        // Setup scroll behavior
        this.setupSmoothScroll();
        
        // Initialize tooltips
        this.initTooltips();
        
        console.log('🚀 Intelligence Lab UI v1.0 - Template Consolidado carregado!');
    }

    addAnimations() {
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .demo-container {
                animation: fadeIn 0.3s ease;
            }
            
            .view-active {
                display: block !important;
            }
        `;
        document.head.appendChild(style);
    }

    setupSmoothScroll() {
        // Smooth scroll for internal links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    initTooltips() {
        // Simple tooltip implementation
        document.querySelectorAll('[title]').forEach(element => {
            const title = element.getAttribute('title');
            element.removeAttribute('title');
            
            element.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = title;
                tooltip.style.cssText = `
                    position: absolute;
                    background: var(--bg-modal);
                    color: var(--text-primary);
                    padding: 0.5rem 0.75rem;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--border-default);
                    font-size: var(--font-sm);
                    pointer-events: none;
                    z-index: var(--z-tooltip);
                    box-shadow: var(--shadow-lg);
                `;
                
                document.body.appendChild(tooltip);
                
                const rect = e.target.getBoundingClientRect();
                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;
                
                element._tooltip = tooltip;
            });
            
            element.addEventListener('mouseleave', (e) => {
                if (element._tooltip) {
                    element._tooltip.remove();
                    delete element._tooltip;
                }
            });
        });
    }
}

// ===================================
// 8. UTILITIES
// ===================================

const Utils = {
    // Format numbers with commas
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    // Format bytes to human readable
    formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },

    // Format date
    formatDate(date) {
        return new Date(date).toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Generate random data for demos
    generateRandomMetric(min = 0, max = 100) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};

// ===================================
// 9. START APPLICATION
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    const app = new App();
    
    // Log initialization
    console.log('Intelligence Lab UI v1.0 initialized');
    console.log('Available methods:');
    console.log('- IntelligenceLab.setDensity(mode)');
    console.log('- IntelligenceLab.showDataExplorer()');
    console.log('- IntelligenceLab.exportSchema()');
});