/**
 * QueueProgressVisualization.js - Visualização de Progresso da Fila Evolutiva
 * 
 * Componente para visualizar o progresso da fila de evolução em tempo real
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class QueueProgressVisualization {
        constructor() {
            this.container = null;
            this.updateInterval = null;
            this.chartData = {
                labels: [],
                processed: [],
                pending: [],
                failed: []
            };
            this.maxDataPoints = 50;
        }

        /**
         * Inicializa a visualização
         */
        initialize(containerId) {
            this.container = document.getElementById(containerId);
            if (!this.container) {
                console.error('Container não encontrado:', containerId);
                return;
            }

            this.render();
            this.startAutoUpdate();
        }

        /**
         * Renderiza a interface de visualização
         */
        render() {
            const stats = KC.EvolutionQueue ? KC.EvolutionQueue.getStats() : this.getMockStats();
            
            this.container.innerHTML = `
                <div class="queue-progress-container" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 15px;
                    padding: 20px;
                    color: white;
                    margin: 20px 0;
                ">
                    <h3 style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                        <span>📊</span> Progresso da Fila Evolutiva
                        <span style="
                            background: rgba(255,255,255,0.2);
                            padding: 4px 12px;
                            border-radius: 20px;
                            font-size: 0.8em;
                            margin-left: auto;
                        ">
                            Atualização em tempo real
                        </span>
                    </h3>

                    <!-- Estatísticas Principais -->
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 15px;
                        margin-bottom: 25px;
                    ">
                        ${this.renderStatCard('Total na Fila', stats.totalInQueue, '#fbbf24')}
                        ${this.renderStatCard('Processados', stats.totalProcessed, '#4ade80')}
                        ${this.renderStatCard('Pendentes', stats.totalPending, '#f97316')}
                        ${this.renderStatCard('Falhas', stats.totalFailed, '#ef4444')}
                    </div>

                    <!-- Filas por Prioridade -->
                    <div style="margin-bottom: 25px;">
                        <h4 style="margin-bottom: 15px; opacity: 0.9;">Distribuição por Prioridade</h4>
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(4, 1fr);
                            gap: 10px;
                        ">
                            ${this.renderPriorityQueue('Crítica', stats.queueSizes.critical, '#dc2626')}
                            ${this.renderPriorityQueue('Alta', stats.queueSizes.high, '#f97316')}
                            ${this.renderPriorityQueue('Média', stats.queueSizes.medium, '#fbbf24')}
                            ${this.renderPriorityQueue('Baixa', stats.queueSizes.low, '#6b7280')}
                        </div>
                    </div>

                    <!-- Capacidades de Extração -->
                    <div style="margin-bottom: 25px;">
                        <h4 style="margin-bottom: 15px; opacity: 0.9;">Capacidades de Extração</h4>
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                            gap: 10px;
                        ">
                            ${this.renderCapabilities(stats.capabilities)}
                        </div>
                    </div>

                    <!-- Gráfico de Progresso -->
                    <div style="
                        background: rgba(0,0,0,0.2);
                        border-radius: 10px;
                        padding: 15px;
                        margin-bottom: 20px;
                    ">
                        <h4 style="margin-bottom: 15px; opacity: 0.9;">Taxa de Processamento (últimos 5 minutos)</h4>
                        <div id="progress-chart" style="height: 200px; position: relative;">
                            ${this.renderProgressChart()}
                        </div>
                    </div>

                    <!-- Arquivos em Processamento -->
                    <div style="
                        background: rgba(0,0,0,0.2);
                        border-radius: 10px;
                        padding: 15px;
                    ">
                        <h4 style="margin-bottom: 15px; opacity: 0.9;">
                            Processando Agora
                            ${stats.currentlyProcessing > 0 ? `
                                <span style="
                                    display: inline-block;
                                    width: 10px;
                                    height: 10px;
                                    background: #4ade80;
                                    border-radius: 50%;
                                    margin-left: 10px;
                                    animation: pulse 1.5s infinite;
                                "></span>
                            ` : ''}
                        </h4>
                        <div id="current-processing">
                            ${this.renderCurrentProcessing(stats.currentItems)}
                        </div>
                    </div>

                    <!-- Próximos na Fila -->
                    <div style="
                        background: rgba(0,0,0,0.2);
                        border-radius: 10px;
                        padding: 15px;
                        margin-top: 15px;
                    ">
                        <h4 style="margin-bottom: 15px; opacity: 0.9;">Próximos na Fila</h4>
                        <div id="next-in-queue">
                            ${this.renderNextInQueue(stats.nextItems)}
                        </div>
                    </div>

                    <!-- Botões de Controle -->
                    <div style="
                        display: flex;
                        gap: 10px;
                        margin-top: 20px;
                    ">
                        <button onclick="KC.QueueProgressVisualization.processNext()" style="
                            background: #4ade80;
                            color: #1e293b;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            font-weight: bold;
                            cursor: pointer;
                        ">
                            ▶️ Processar Próximo
                        </button>
                        <button onclick="KC.QueueProgressVisualization.processAll()" style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            font-weight: bold;
                            cursor: pointer;
                        ">
                            ⚡ Processar Todos
                        </button>
                        <button onclick="KC.QueueProgressVisualization.clearCompleted()" style="
                            background: #6b7280;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            font-weight: bold;
                            cursor: pointer;
                        ">
                            🗑️ Limpar Processados
                        </button>
                    </div>
                </div>

                <style>
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                </style>
            `;
        }

        /**
         * Renderiza card de estatística
         */
        renderStatCard(label, value, color) {
            return `
                <div style="
                    background: rgba(0,0,0,0.3);
                    border-radius: 10px;
                    padding: 15px;
                    text-align: center;
                ">
                    <div style="
                        font-size: 2em;
                        font-weight: bold;
                        color: ${color};
                        margin-bottom: 5px;
                    ">${value}</div>
                    <div style="
                        font-size: 0.9em;
                        opacity: 0.8;
                    ">${label}</div>
                </div>
            `;
        }

        /**
         * Renderiza fila de prioridade
         */
        renderPriorityQueue(label, count, color) {
            const percentage = Math.min((count / 100) * 100, 100);
            return `
                <div style="
                    background: rgba(0,0,0,0.3);
                    border-radius: 8px;
                    padding: 10px;
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 5px;
                    ">
                        <span style="font-size: 0.85em;">${label}</span>
                        <span style="font-weight: bold; color: ${color};">${count}</span>
                    </div>
                    <div style="
                        height: 4px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 2px;
                        overflow: hidden;
                    ">
                        <div style="
                            height: 100%;
                            width: ${percentage}%;
                            background: ${color};
                            transition: width 0.3s;
                        "></div>
                    </div>
                </div>
            `;
        }

        /**
         * Renderiza capacidades
         */
        renderCapabilities(capabilities = {}) {
            const types = {
                '.md': { supported: true, label: 'MD' },
                '.txt': { supported: true, label: 'TXT' },
                '.pdf': { supported: false, label: 'PDF' },
                '.docx': { supported: false, label: 'DOCX' },
                '.xlsx': { supported: false, label: 'XLSX' },
                '.pst': { supported: false, label: 'PST' }
            };

            return Object.entries(types).map(([ext, info]) => `
                <div style="
                    background: rgba(0,0,0,0.3);
                    border-radius: 8px;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <div style="
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: ${info.supported ? '#4ade80' : '#ef4444'};
                    "></div>
                    <span style="font-size: 0.85em;">${info.label}</span>
                </div>
            `).join('');
        }

        /**
         * Renderiza gráfico de progresso
         */
        renderProgressChart() {
            const width = 100;
            const height = 100;
            const points = this.generateChartPoints();
            
            return `
                <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
                    <!-- Grid -->
                    ${this.renderGrid(width, height)}
                    
                    <!-- Linha de processados -->
                    <polyline
                        points="${points.processed}"
                        fill="none"
                        stroke="#4ade80"
                        stroke-width="2"
                    />
                    
                    <!-- Linha de pendentes -->
                    <polyline
                        points="${points.pending}"
                        fill="none"
                        stroke="#f97316"
                        stroke-width="2"
                    />
                    
                    <!-- Legenda -->
                    <g transform="translate(10, 10)">
                        <rect x="0" y="0" width="15" height="3" fill="#4ade80"/>
                        <text x="20" y="3" fill="white" font-size="8">Processados</text>
                        
                        <rect x="0" y="8" width="15" height="3" fill="#f97316"/>
                        <text x="20" y="11" fill="white" font-size="8">Pendentes</text>
                    </g>
                </svg>
            `;
        }

        /**
         * Renderiza grid do gráfico
         */
        renderGrid(width, height) {
            let grid = '';
            // Linhas horizontais
            for (let i = 0; i <= 4; i++) {
                const y = (height / 4) * i;
                grid += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`;
            }
            // Linhas verticais
            for (let i = 0; i <= 10; i++) {
                const x = (width / 10) * i;
                grid += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`;
            }
            return grid;
        }

        /**
         * Gera pontos para o gráfico
         */
        generateChartPoints() {
            const data = this.getHistoricalData();
            const width = 100;
            const height = 100;
            const maxValue = Math.max(...data.processed, ...data.pending, 1);
            
            const processedPoints = data.processed.map((value, index) => {
                const x = (width / (data.processed.length - 1)) * index;
                const y = height - (value / maxValue) * height;
                return `${x},${y}`;
            }).join(' ');
            
            const pendingPoints = data.pending.map((value, index) => {
                const x = (width / (data.pending.length - 1)) * index;
                const y = height - (value / maxValue) * height;
                return `${x},${y}`;
            }).join(' ');
            
            return {
                processed: processedPoints,
                pending: pendingPoints
            };
        }

        /**
         * Renderiza arquivos em processamento
         */
        renderCurrentProcessing(items = []) {
            if (items.length === 0) {
                return '<div style="opacity: 0.6;">Nenhum arquivo em processamento</div>';
            }

            return items.map(item => `
                <div style="
                    background: rgba(0,0,0,0.2);
                    border-radius: 6px;
                    padding: 10px;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                ">
                    <div style="
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        background: #4ade80;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        animation: pulse 1s infinite;
                    ">
                        ⚙️
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold;">${item.name}</div>
                        <div style="font-size: 0.85em; opacity: 0.7;">
                            Score: ${item.score}% | Tempo: ${item.timeElapsed}s
                        </div>
                    </div>
                    <div style="
                        width: 100px;
                        height: 4px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 2px;
                        overflow: hidden;
                    ">
                        <div style="
                            height: 100%;
                            width: ${item.progress}%;
                            background: #4ade80;
                            transition: width 0.3s;
                        "></div>
                    </div>
                </div>
            `).join('');
        }

        /**
         * Renderiza próximos na fila
         */
        renderNextInQueue(items = []) {
            if (items.length === 0) {
                return '<div style="opacity: 0.6;">Fila vazia</div>';
            }

            return items.slice(0, 5).map((item, index) => `
                <div style="
                    background: rgba(0,0,0,0.2);
                    border-radius: 6px;
                    padding: 10px;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    opacity: ${1 - (index * 0.15)};
                ">
                    <div style="
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        background: ${this.getPriorityColor(item.priority)};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                    ">
                        ${index + 1}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold;">${item.name}</div>
                        <div style="font-size: 0.85em; opacity: 0.7;">
                            Prioridade: ${item.priority} | Score: ${item.score}%
                        </div>
                    </div>
                </div>
            `).join('');
        }

        /**
         * Obtém cor da prioridade
         */
        getPriorityColor(priority) {
            const colors = {
                critical: '#dc2626',
                high: '#f97316',
                medium: '#fbbf24',
                low: '#6b7280'
            };
            return colors[priority] || '#6b7280';
        }

        /**
         * Inicia atualização automática
         */
        startAutoUpdate() {
            this.updateInterval = setInterval(() => {
                this.updateStats();
            }, 2000); // Atualiza a cada 2 segundos
        }

        /**
         * Para atualização automática
         */
        stopAutoUpdate() {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        }

        /**
         * Atualiza estatísticas
         */
        updateStats() {
            if (!this.container) return;

            const stats = KC.EvolutionQueue ? KC.EvolutionQueue.getStats() : this.getMockStats();
            
            // Atualiza dados do gráfico
            this.updateChartData(stats);
            
            // Re-renderiza apenas as partes que mudaram
            this.render();
        }

        /**
         * Atualiza dados do gráfico
         */
        updateChartData(stats) {
            const now = new Date().toLocaleTimeString();
            
            this.chartData.labels.push(now);
            this.chartData.processed.push(stats.totalProcessed);
            this.chartData.pending.push(stats.totalPending);
            this.chartData.failed.push(stats.totalFailed);
            
            // Mantém apenas os últimos N pontos
            if (this.chartData.labels.length > this.maxDataPoints) {
                this.chartData.labels.shift();
                this.chartData.processed.shift();
                this.chartData.pending.shift();
                this.chartData.failed.shift();
            }
        }

        /**
         * Obtém dados históricos
         */
        getHistoricalData() {
            if (this.chartData.processed.length === 0) {
                // Dados simulados se não houver histórico
                return {
                    processed: [10, 15, 25, 30, 45, 50, 55, 65, 70, 75],
                    pending: [90, 85, 75, 70, 55, 50, 45, 35, 30, 25]
                };
            }
            
            return {
                processed: this.chartData.processed.slice(-10),
                pending: this.chartData.pending.slice(-10)
            };
        }

        /**
         * Obtém estatísticas mock
         */
        getMockStats() {
            return {
                totalInQueue: 45,
                totalProcessed: 123,
                totalPending: 32,
                totalFailed: 2,
                currentlyProcessing: 3,
                queueSizes: {
                    critical: 5,
                    high: 12,
                    medium: 20,
                    low: 8
                },
                capabilities: {
                    '.md': true,
                    '.txt': true,
                    '.pdf': false,
                    '.docx': false,
                    '.xlsx': false,
                    '.pst': false
                },
                currentItems: [
                    { name: 'projeto-2024.md', score: 85, timeElapsed: 2.3, progress: 65 },
                    { name: 'notas-reuniao.txt', score: 72, timeElapsed: 1.1, progress: 30 },
                    { name: 'decisao-critica.md', score: 95, timeElapsed: 0.5, progress: 15 }
                ],
                nextItems: [
                    { name: 'contrato-importante.pdf', priority: 'critical', score: 0 },
                    { name: 'analise-financeira.xlsx', priority: 'high', score: 0 },
                    { name: 'backup-emails.pst', priority: 'high', score: 0 },
                    { name: 'readme.md', priority: 'medium', score: 65 },
                    { name: 'old-notes.txt', priority: 'low', score: 25 }
                ]
            };
        }

        /**
         * Processa próximo item
         */
        async processNext() {
            if (KC.EvolutionQueue) {
                const result = await KC.EvolutionQueue.processNext();
                console.log('Processado:', result);
                this.updateStats();
            }
        }

        /**
         * Processa todos os itens
         */
        async processAll() {
            if (KC.EvolutionQueue) {
                const results = await KC.EvolutionQueue.processBatch(100);
                console.log('Processados:', results.length, 'itens');
                this.updateStats();
            }
        }

        /**
         * Limpa itens processados
         */
        clearCompleted() {
            if (KC.EvolutionQueue) {
                KC.EvolutionQueue.clearProcessed();
                this.updateStats();
            }
        }

        /**
         * Destrutor
         */
        destroy() {
            this.stopAutoUpdate();
            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    }

    // Exporta para o namespace KC
    KC.QueueProgressVisualization = new QueueProgressVisualization();

    console.log('✅ QueueProgressVisualization inicializado');

})(window);