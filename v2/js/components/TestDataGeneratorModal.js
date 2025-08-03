/**
 * Test Data Generator Modal Component
 * Interface visual para o gerador de dados de teste brasileiros
 * 
 * Funcionalidades:
 * - Seleção de cenários brasileiros
 * - Configuração de parâmetros de geração
 * - Preview de arquivos que serão gerados
 * - Geração e importação automática
 * - Exportação de configurações
 * 
 * @version 1.0.0
 * @author Claude Code
 * @date 2025-08-03
 */

import EventBus from '../core/EventBus.js';
import AppState from '../core/AppState.js';
import TestDataGeneratorBR from '../services/TestDataGeneratorBR.js';

export class TestDataGeneratorModal {
  constructor() {
    this.selectedScenario = null;
    this.previewData = null;
    this.isGenerating = false;
    this.settings = { ...TestDataGeneratorBR.generationSettings };
  }

  render() {
    return `
      <div class="test-data-generator-modal">
        <div class="modal-header">
          <h2>🎭 Gerador de Dados de Teste Brasileiros</h2>
          <p class="modal-subtitle">Crie cenários realistas com contexto 100% brasileiro</p>
        </div>

        <div class="modal-content">
          <!-- Seleção de Cenários -->
          <section class="scenario-selection">
            <h3>📋 Selecione o Cenário</h3>
            <div class="scenario-grid">
              ${this.renderScenarioCards()}
            </div>
          </section>

          <!-- Configurações de Geração -->
          <section class="generation-settings">
            <h3>⚙️ Configurações de Geração</h3>
            <div class="settings-grid">
              <div class="setting-group">
                <label for="file-count">
                  📁 Quantidade de Arquivos
                  <input 
                    type="number" 
                    id="file-count" 
                    min="5" 
                    max="500" 
                    value="${this.settings.fileCount}"
                    onchange="testDataModal.updateSetting('fileCount', parseInt(this.value))"
                  />
                </label>
                <span class="setting-hint">Recomendado: 25-100 arquivos</span>
              </div>

              <div class="setting-group">
                <label for="date-start">
                  📅 Período - De:
                  <input 
                    type="date" 
                    id="date-start" 
                    value="${this.settings.dateRange.start}"
                    onchange="testDataModal.updateDateRange('start', this.value)"
                  />
                </label>
              </div>

              <div class="setting-group">
                <label for="date-end">
                  📅 Até:
                  <input 
                    type="date" 
                    id="date-end" 
                    value="${this.settings.dateRange.end}"
                    onchange="testDataModal.updateDateRange('end', this.value)"
                  />
                </label>
              </div>

              <div class="setting-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    id="enrich-data" 
                    ${this.settings.enrichWithRealData ? 'checked' : ''}
                    onchange="testDataModal.updateSetting('enrichWithRealData', this.checked)"
                  />
                  🌐 Enriquecer com APIs brasileiras
                </label>
                <span class="setting-hint">Receita Federal, BACEN, IBGE</span>
              </div>

              <div class="setting-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    id="auto-categories" 
                    ${this.settings.autoCategories ? 'checked' : ''}
                    onchange="testDataModal.updateSetting('autoCategories', this.checked)"
                  />
                  🏷️ Gerar categorias automaticamente
                </label>
                <span class="setting-hint">Criar categorias baseadas no cenário</span>
              </div>
            </div>
          </section>

          <!-- Preview -->
          <section class="preview-section">
            <h3>👁️ Preview dos Dados</h3>
            <div class="preview-controls">
              <button 
                class="btn-preview" 
                onclick="testDataModal.generatePreview()"
                ${!this.selectedScenario ? 'disabled' : ''}
              >
                🔍 Gerar Preview (5 arquivos)
              </button>
              <button 
                class="btn-refresh" 
                onclick="testDataModal.refreshPreview()"
                ${!this.previewData ? 'disabled' : ''}
              >
                🔄 Atualizar Preview
              </button>
            </div>
            <div class="preview-content">
              ${this.renderPreview()}
            </div>
          </section>

          <!-- Estatísticas -->
          ${this.renderStatistics()}
        </div>

        <div class="modal-actions">
          <div class="action-buttons">
            <button 
              class="btn-generate primary" 
              onclick="testDataModal.generate()"
              ${!this.selectedScenario || this.isGenerating ? 'disabled' : ''}
            >
              ${this.isGenerating ? '⏳ Gerando...' : '🚀 Gerar e Importar'}
            </button>
            
            <button 
              class="btn-export secondary" 
              onclick="testDataModal.exportConfig()"
            >
              💾 Exportar Config
            </button>
            
            <button 
              class="btn-cancel" 
              onclick="testDataModal.close()"
            >
              ❌ Cancelar
            </button>
          </div>
          
          <div class="progress-container ${this.isGenerating ? 'visible' : 'hidden'}">
            <div class="progress-bar">
              <div class="progress-fill" id="generation-progress"></div>
            </div>
            <span class="progress-text" id="progress-text">Preparando geração...</span>
          </div>
        </div>
      </div>
    `;
  }

  renderScenarioCards() {
    const scenarios = TestDataGeneratorBR.listScenarios();
    
    return scenarios.map(scenario => `
      <div 
        class="scenario-card ${this.selectedScenario === scenario.id ? 'selected' : ''}"
        onclick="testDataModal.selectScenario('${scenario.id}')"
      >
        <div class="scenario-icon">${scenario.icon}</div>
        <div class="scenario-content">
          <h4>${scenario.name}</h4>
          <p>${scenario.description}</p>
          ${this.renderScenarioDetails(scenario.id)}
        </div>
      </div>
    `).join('');
  }

  renderScenarioDetails(scenarioId) {
    const scenario = TestDataGeneratorBR.getScenario(scenarioId);
    if (!scenario) return '';

    const companies = scenario.companies.slice(0, 3).join(', ');
    const moreCount = scenario.companies.length - 3;
    
    return `
      <div class="scenario-details">
        <div class="scenario-tags">
          <span class="tag">📊 ${scenario.fileTypes.length} tipos de arquivo</span>
          <span class="tag">🏷️ ${scenario.categories.length} categorias</span>
        </div>
        <div class="scenario-companies">
          <strong>Empresas:</strong> ${companies}${moreCount > 0 ? ` +${moreCount} mais` : ''}
        </div>
      </div>
    `;
  }

  renderPreview() {
    if (!this.previewData) {
      return `
        <div class="preview-placeholder">
          <div class="placeholder-icon">📄</div>
          <p>Selecione um cenário e clique em "Gerar Preview" para ver exemplos de arquivos</p>
        </div>
      `;
    }

    return `
      <div class="preview-files">
        <div class="preview-header">
          <h4>📁 Arquivos que serão gerados (${this.previewData.files.length} de ${this.settings.fileCount})</h4>
          <span class="preview-scenario">${this.previewData.scenario}</span>
        </div>
        
        <div class="file-list">
          ${this.previewData.files.map(file => this.renderPreviewFile(file)).join('')}
        </div>
        
        <div class="preview-footer">
          <span class="preview-note">
            💡 Esta é apenas uma amostra. A geração completa criará ${this.settings.fileCount} arquivos únicos.
          </span>
        </div>
      </div>
    `;
  }

  renderPreviewFile(file) {
    const sizeKB = Math.round(file.size / 1024);
    const date = new Date(file.lastModified).toLocaleDateString('pt-BR');
    
    return `
      <div class="preview-file">
        <div class="file-icon">📄</div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-meta">
            <span class="file-size">${sizeKB} KB</span>
            <span class="file-date">${date}</span>
            <span class="file-category">${file.metadata.categories}</span>
          </div>
          <div class="file-preview">${file.preview}</div>
          <div class="file-keywords">
            ${file.metadata.keywords.slice(0, 5).map(kw => `<span class="keyword">${kw}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderStatistics() {
    if (!this.previewData || !this.previewData.statistics) {
      return '';
    }

    const stats = this.previewData.statistics;
    
    return `
      <section class="statistics-section">
        <h3>📊 Estatísticas do Preview</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${this.previewData.files.length}</div>
            <div class="stat-label">Arquivos</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Object.keys(stats.byType).length}</div>
            <div class="stat-label">Tipos</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Object.keys(stats.byCategory).length}</div>
            <div class="stat-label">Categorias</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${Math.round(stats.averageSize / 1024)} KB</div>
            <div class="stat-label">Tamanho Médio</div>
          </div>
        </div>
        
        <div class="stats-details">
          <div class="stats-column">
            <h4>Por Tipo de Arquivo</h4>
            <div class="stats-list">
              ${Object.entries(stats.byType).map(([type, count]) => 
                `<div class="stats-item">
                  <span class="stats-name">.${type}</span>
                  <span class="stats-count">${count}</span>
                </div>`
              ).join('')}
            </div>
          </div>
          
          <div class="stats-column">
            <h4>Por Categoria</h4>
            <div class="stats-list">
              ${Object.entries(stats.byCategory).map(([category, count]) => 
                `<div class="stats-item">
                  <span class="stats-name">${category}</span>
                  <span class="stats-count">${count}</span>
                </div>`
              ).join('')}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // Event handlers
  selectScenario(scenarioId) {
    this.selectedScenario = scenarioId;
    this.previewData = null; // Clear previous preview
    this.updateModal();
    
    console.log(`📋 Cenário selecionado: ${scenarioId}`);
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    console.log(`⚙️ Configuração atualizada: ${key} = ${value}`);
    
    // Update TestDataGeneratorBR settings
    TestDataGeneratorBR.updateSettings({ [key]: value });
  }

  updateDateRange(type, value) {
    this.settings.dateRange[type] = value;
    console.log(`📅 Data ${type} atualizada: ${value}`);
    
    TestDataGeneratorBR.updateSettings({ 
      dateRange: this.settings.dateRange 
    });
  }

  async generatePreview() {
    if (!this.selectedScenario) {
      alert('Por favor, selecione um cenário primeiro.');
      return;
    }

    try {
      console.log('🔍 Gerando preview...');
      this.previewData = await TestDataGeneratorBR.preview(this.selectedScenario, 5);
      this.updateModal();
      
      console.log('✅ Preview gerado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao gerar preview:', error);
      alert('Erro ao gerar preview. Verifique o console para detalhes.');
    }
  }

  async refreshPreview() {
    await this.generatePreview();
  }

  async generate() {
    if (!this.selectedScenario) {
      alert('Por favor, selecione um cenário primeiro.');
      return;
    }

    try {
      this.isGenerating = true;
      this.updateModal();
      
      // Start progress tracking
      this.startProgressTracking();
      
      console.log(`🚀 Iniciando geração de ${this.settings.fileCount} arquivos...`);
      
      const result = await TestDataGeneratorBR.generateScenarioData(
        this.selectedScenario, 
        this.settings
      );
      
      // Import to application
      TestDataGeneratorBR.importToApp(result.files);
      
      // Show success
      this.showSuccess(result);
      
      // Close modal after delay
      setTimeout(() => this.close(), 2000);
      
    } catch (error) {
      console.error('❌ Erro na geração:', error);
      alert('Erro na geração. Verifique o console para detalhes.');
    } finally {
      this.isGenerating = false;
      this.updateModal();
    }
  }

  startProgressTracking() {
    let progress = 0;
    const progressBar = document.getElementById('generation-progress');
    const progressText = document.getElementById('progress-text');
    
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 95) progress = 95;
      
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      
      if (progressText) {
        if (progress < 30) {
          progressText.textContent = 'Preparando dados brasileiros...';
        } else if (progress < 60) {
          progressText.textContent = 'Gerando conteúdo...';
        } else if (progress < 90) {
          progressText.textContent = 'Aplicando formatação BR...';
        } else {
          progressText.textContent = 'Finalizando...';
        }
      }
      
      if (!this.isGenerating) {
        clearInterval(interval);
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = 'Concluído!';
      }
    }, 200);
  }

  showSuccess(result) {
    const message = `
      ✅ Geração concluída com sucesso!
      
      📊 Estatísticas:
      • ${result.files.length} arquivos criados
      • ${result.metadata.categories.length} categorias
      • ${result.metadata.fileTypes.length} tipos de arquivo
      • ${Math.round(result.metadata.totalSize / 1024)} KB total
      
      Os arquivos foram importados automaticamente para o Knowledge Consolidator.
    `;
    
    console.log(message);
    alert(message.replace(/•/g, '-'));
  }

  exportConfig() {
    TestDataGeneratorBR.exportConfiguration();
  }

  updateModal() {
    const modal = document.querySelector('.test-data-generator-modal');
    if (modal) {
      modal.innerHTML = this.render();
    }
  }

  close() {
    EventBus.emit('modal:close');
  }

  // Initialize when modal is shown
  initialize(modalElement) {
    // Setup any additional event listeners or initialization
    window.testDataModal = this; // Make available globally for onclick handlers
    
    console.log('🎭 Test Data Generator Modal initialized');
  }

  // CSS Styles for the modal
  getStyles() {
    return `
      <style>
        .test-data-generator-modal {
          max-width: 1200px;
          max-height: 90vh;
          overflow-y: auto;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .modal-header {
          text-align: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0 0 0.5rem 0;
          color: #1f2937;
          font-size: 1.8rem;
        }

        .modal-subtitle {
          color: #6b7280;
          margin: 0;
          font-size: 1rem;
        }

        .modal-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* Scenario Selection */
        .scenario-selection h3 {
          margin: 0 0 1rem 0;
          color: #1f2937;
        }

        .scenario-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .scenario-card {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .scenario-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .scenario-card.selected {
          border-color: #3b82f6;
          background: #eff6ff;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        }

        .scenario-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .scenario-content h4 {
          margin: 0 0 0.5rem 0;
          color: #1f2937;
          font-size: 1.1rem;
        }

        .scenario-content p {
          margin: 0 0 1rem 0;
          color: #6b7280;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .scenario-details {
          font-size: 0.85rem;
        }

        .scenario-tags {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .tag {
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          color: #374151;
        }

        .scenario-companies {
          color: #6b7280;
          line-height: 1.3;
        }

        /* Settings */
        .generation-settings h3 {
          margin: 0 0 1rem 0;
          color: #1f2937;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .setting-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .setting-group label {
          font-weight: 500;
          color: #374151;
          font-size: 0.9rem;
        }

        .setting-group input[type="number"],
        .setting-group input[type="date"] {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9rem;
          margin-top: 0.25rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          margin: 0;
        }

        .setting-hint {
          font-size: 0.75rem;
          color: #9ca3af;
          font-style: italic;
        }

        /* Preview Section */
        .preview-section h3 {
          margin: 0 0 1rem 0;
          color: #1f2937;
        }

        .preview-controls {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .btn-preview, .btn-refresh {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .btn-preview:hover:not(:disabled),
        .btn-refresh:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .btn-preview:disabled,
        .btn-refresh:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .preview-content {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          min-height: 200px;
          background: #fafafa;
        }

        .preview-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #9ca3af;
        }

        .placeholder-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .preview-files {
          padding: 1rem;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .preview-header h4 {
          margin: 0;
          color: #1f2937;
        }

        .preview-scenario {
          font-size: 0.9rem;
          color: #6b7280;
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 300px;
          overflow-y: auto;
        }

        .preview-file {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .file-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .file-info {
          flex: 1;
          min-width: 0;
        }

        .file-name {
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 0.25rem;
          font-size: 0.9rem;
        }

        .file-meta {
          display: flex;
          gap: 1rem;
          margin-bottom: 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .file-preview {
          font-size: 0.8rem;
          color: #4b5563;
          line-height: 1.4;
          margin-bottom: 0.5rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .file-keywords {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        .keyword {
          background: #dbeafe;
          color: #1d4ed8;
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.7rem;
        }

        .preview-footer {
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid #e5e7eb;
        }

        .preview-note {
          font-size: 0.85rem;
          color: #6b7280;
          font-style: italic;
        }

        /* Statistics */
        .statistics-section h3 {
          margin: 0 0 1rem 0;
          color: #1f2937;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          text-align: center;
          padding: 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .stats-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .stats-column h4 {
          margin: 0 0 0.75rem 0;
          color: #1f2937;
          font-size: 1rem;
        }

        .stats-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .stats-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: #f9fafb;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .stats-name {
          color: #374151;
        }

        .stats-count {
          color: #6b7280;
          font-weight: 500;
        }

        /* Modal Actions */
        .modal-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 2px solid #e5e7eb;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .btn-generate {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 1rem;
        }

        .btn-generate:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .btn-generate:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }

        .btn-export {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-export:hover {
          background: #e5e7eb;
        }

        .btn-cancel {
          background: transparent;
          color: #6b7280;
          border: 1px solid #d1d5db;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: #f9fafb;
          color: #374151;
        }

        .progress-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: opacity 0.3s;
        }

        .progress-container.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .progress-container.visible {
          opacity: 1;
        }

        .progress-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          width: 0%;
          transition: width 0.3s ease;
        }

        .progress-text {
          text-align: center;
          font-size: 0.9rem;
          color: #6b7280;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .scenario-grid {
            grid-template-columns: 1fr;
          }
          
          .settings-grid {
            grid-template-columns: 1fr;
          }
          
          .stats-details {
            grid-template-columns: 1fr;
          }
          
          .action-buttons {
            flex-direction: column;
          }
        }
      </style>
    `;
  }
}

export default TestDataGeneratorModal;