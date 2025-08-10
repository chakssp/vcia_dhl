import React, { useState } from 'react';
import './PropertyPanel.css';

/**
 * PropertyPanel - Painel de propriedades
 * 
 * Requisitos:
 * - Mostrar detalhes do nó selecionado
 * - Analisar relações
 * - Botão minimizar [>]
 * - Tab de estatísticas integrada
 */
const PropertyPanel = ({ selectedNode, selectedEdge, fullNodeData, onClearFullData, graphStats }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState('stats'); // Começar com stats por padrão
  const [displayData, setDisplayData] = useState(null);
  const [hasFullDataContext, setHasFullDataContext] = useState(false);

  // Use fullNodeData if available, otherwise use selectedNode
  React.useEffect(() => {
    if (fullNodeData) {
      setDisplayData(fullNodeData);
      setHasFullDataContext(true);
      setActiveTab('complete'); // Switch to complete data tab
    } else if (selectedNode) {
      setDisplayData(selectedNode);
      if (!hasFullDataContext) {
        setActiveTab('summary');
      }
    } else {
      setDisplayData(null);
      setHasFullDataContext(false);
    }
  }, [fullNodeData, selectedNode, hasFullDataContext]);

  if (isMinimized) {
    return (
      <aside className="property-panel minimized">
        <button 
          className="toggle-btn"
          onClick={() => setIsMinimized(false)}
          title="Expandir painel"
        >
          {'<'}
        </button>
      </aside>
    );
  }

  const hasSelection = selectedNode || selectedEdge || fullNodeData;

  return (
    <aside className="property-panel">
      <header className="property-panel-header">
        <h2>Propriedades</h2>
        <button 
          className="toggle-btn"
          onClick={() => setIsMinimized(true)}
          title="Minimizar painel"
        >
          {'>'}
        </button>
      </header>

      {/* Sempre mostrar tabs, não apenas quando há seleção */}
      <div className="property-tabs">
        <button 
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Estatísticas
        </button>
        <button 
          className={`tab ${activeTab === 'summary' ? 'active' : ''} ${!hasSelection ? 'disabled' : ''}`}
          onClick={() => hasSelection && setActiveTab('summary')}
          disabled={!hasSelection}
        >
          📝 Resumo
        </button>
        <button 
          className={`tab ${activeTab === 'relations' ? 'active' : ''}`}
          onClick={() => setActiveTab('relations')}
        >
          🔗 Relações
        </button>
        <button 
          className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          🔍 Análise
        </button>
      </div>

      {activeTab === 'stats' ? (
        <div className="property-content stats-content">
          <div className="property-group">
            <h3>📊 Estatísticas do Grafo</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Nós no Canvas:</span>
                <span className="stat-value">{graphStats?.nodeCount || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Conexões:</span>
                <span className="stat-value">{graphStats?.edgeCount || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Campos Selecionados:</span>
                <span className="stat-value">{graphStats?.selectedFields || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Convergências:</span>
                <span className="stat-value">{graphStats?.convergences || 0}</span>
              </div>
            </div>
          </div>
          
          {graphStats?.topKeywords && (
            <div className="property-group">
              <h3>🔤 Top Keywords</h3>
              <div className="keywords-list">
                {graphStats.topKeywords.slice(0, 10).map((kw, idx) => (
                  <span key={idx} className="keyword-tag">
                    {kw.keyword} ({kw.count})
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {graphStats?.categories && (
            <div className="property-group">
              <h3>📁 Categorias</h3>
              <div className="categories-list">
                {Object.entries(graphStats.categories).map(([cat, count]) => (
                  <div key={cat} className="category-item">
                    <span className="category-name">{cat}:</span>
                    <span className="category-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !hasSelection ? (
        <div className="no-selection">
          <p>📌 Selecione um nó ou conexão para ver detalhes</p>
          <p>💡 Clique no botão [❓] do nó para informações rápidas</p>
          <p>ℹ️ Use "+info »" no tooltip para carregar dados completos aqui</p>
        </div>
      ) : (
        <>
          {/* Context Breadcrumb */}
          {hasFullDataContext && (
            <div className="context-breadcrumb">
              <span className="breadcrumb-icon">👁️</span>
              <span className="breadcrumb-text">Tooltip → Dados Completos</span>
              <button 
                className="breadcrumb-close"
                onClick={() => {
                  onClearFullData();
                  setHasFullDataContext(false);
                  setActiveTab('summary');
                }}
                title="Fechar contexto de dados completos"
              >
                ✕
              </button>
            </div>
          )}

          <div className="property-content">
            {activeTab === 'summary' && selectedNode && (
              <div className="properties-view">
                <div className="property-group">
                  <h3>Informações Básicas</h3>
                  <div className="property-item">
                    <span className="property-label">ID:</span>
                    <span className="property-value">{selectedNode.id}</span>
                  </div>
                  <div className="property-item">
                    <span className="property-label">Campo:</span>
                    <span className="property-value">{selectedNode.data?.label}</span>
                  </div>
                  <div className="property-item">
                    <span className="property-label">Tipo:</span>
                    <span className="property-value">{selectedNode.data?.field?.type}</span>
                  </div>
                </div>

                {selectedNode.data?.field?.example && (
                  <div className="property-group">
                    <h3>Exemplo de Valor</h3>
                    <div className="property-example">
                      {JSON.stringify(selectedNode.data.field.example, null, 2)}
                    </div>
                  </div>
                )}

                {selectedNode.data?.field?.keywords && (
                  <div className="property-group">
                    <h3>Keywords</h3>
                    <div className="keywords-list">
                      {selectedNode.data.field.keywords.map((kw, idx) => (
                        <span key={idx} className="keyword-tag">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'relations' && selectedNode && (
              <div className="relations-view">
                <div className="property-group">
                  <h3>🔗 Conexões Sugeridas</h3>
                  <div className="suggestion-list">
                    <div className="suggestion-item">
                      <span className="suggestion-type">Por Keywords</span>
                      <span className="suggestion-count">3 possíveis</span>
                    </div>
                    <div className="suggestion-item">
                      <span className="suggestion-type">Por Categoria</span>
                      <span className="suggestion-count">5 possíveis</span>
                    </div>
                    <div className="suggestion-item">
                      <span className="suggestion-type">Por Score</span>
                      <span className="suggestion-count">2 possíveis</span>
                    </div>
                  </div>
                  <button className="action-btn">
                    🔍 Buscar Conexões
                  </button>
                </div>

                <div className="property-group">
                  <h3>📊 Conexões Atuais</h3>
                  <p className="info-text">Nenhuma conexão estabelecida</p>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && selectedNode && (
              <div className="analysis-view">
                <div className="property-group">
                  <h3>📈 Análise de Relevância</h3>
                  <div className="score-item">
                    <span className="score-label">Relevância:</span>
                    <div className="score-bar">
                      <div className="score-fill" style={{width: '75%'}}></div>
                    </div>
                    <span className="score-value">75%</span>
                  </div>
                  <div className="score-item">
                    <span className="score-label">Inteligência:</span>
                    <div className="score-bar">
                      <div className="score-fill" style={{width: '60%'}}></div>
                    </div>
                    <span className="score-value">60%</span>
                  </div>
                  <div className="score-item">
                    <span className="score-label">Convergência:</span>
                    <div className="score-bar">
                      <div className="score-fill" style={{width: '85%'}}></div>
                    </div>
                    <span className="score-value">85%</span>
                  </div>
                </div>

                <div className="property-group">
                  <h3>💡 Insights</h3>
                  <ul className="insights-list">
                    <li>Alto potencial de convergência</li>
                    <li>3 keywords em comum com outros nós</li>
                    <li>Parte de 2 cadeias de convergência</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'complete' && fullNodeData && (
              <div className="full-data-view">
                <div className="property-group">
                  <h3>Dados Completos do Nó</h3>
                  <div className="property-item">
                    <span className="property-label">ID:</span>
                    <span className="property-value">{fullNodeData.id}</span>
                  </div>
                  
                  {/* Display all payload data */}
                  {fullNodeData.data?.payload && (
                    <div className="payload-data">
                      <h4>Payload Qdrant:</h4>
                      <div className="json-viewer">
                        <pre>
                          {JSON.stringify(fullNodeData.data.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {/* Display node data */}
                  {fullNodeData.data && (
                    <div className="node-data">
                      <h4>Dados do Nó:</h4>
                      <div className="json-viewer">
                        <pre>
                          {JSON.stringify(fullNodeData.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {/* Display additional metadata */}
                  <div className="metadata-section">
                    <h4>Metadados:</h4>
                    <div className="property-item">
                      <span className="property-label">Posição:</span>
                      <span className="property-value">
                        ({Math.round(fullNodeData.position?.x || 0)}, {Math.round(fullNodeData.position?.y || 0)})
                      </span>
                    </div>
                    <div className="property-item">
                      <span className="property-label">Tipo:</span>
                      <span className="property-value">{fullNodeData.type || 'default'}</span>
                    </div>
                    <div className="property-item">
                      <span className="property-label">Selecionado:</span>
                      <span className="property-value">{fullNodeData.selected ? 'Sim' : 'Não'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedEdge && (
              <div className="edge-properties">
                <div className="property-group">
                  <h3>Conexão</h3>
                  <div className="property-item">
                    <span className="property-label">De:</span>
                    <span className="property-value">{selectedEdge.source}</span>
                  </div>
                  <div className="property-item">
                    <span className="property-label">Para:</span>
                    <span className="property-value">{selectedEdge.target}</span>
                  </div>
                  <div className="property-item">
                    <span className="property-label">Tipo:</span>
                    <span className="property-value">Manual</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};

export default PropertyPanel;