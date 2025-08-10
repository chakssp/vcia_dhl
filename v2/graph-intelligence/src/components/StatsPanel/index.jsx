import React, { useState, useEffect, useCallback } from 'react';
import './StatsPanel.css';

/**
 * StatsPanel Component - Painel de estatísticas em tempo real
 * 
 * Requisitos do Stakeholder:
 * - Mostrar métricas em tempo real (nós, edges, convergências)
 * - Botão manual de Refresh
 * - Checkbox de auto-refresh (30s interval)
 * - Opção de inserir estatísticas como nós no canvas
 */
const StatsPanel = ({ 
  nodes = [], 
  edges = [], 
  analysis = null,
  onInsertStatsAsNode,
  onRefresh
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Calculate real-time metrics
  const calculateMetrics = useCallback(() => {
    const metrics = {
      nodes: {
        total: nodes.length,
        selected: nodes.filter(n => n.selected).length,
        types: nodes.reduce((acc, node) => {
          const type = node.type || 'default';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {})
      },
      edges: {
        total: edges.length,
        selected: edges.filter(e => e.selected).length,
        animated: edges.filter(e => e.animated).length,
        types: edges.reduce((acc, edge) => {
          const type = edge.type || 'default';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {})
      },
      convergences: analysis ? {
        total: analysis.convergences?.length || 0,
        strong: analysis.convergences?.filter(c => c.strength > 0.7).length || 0,
        medium: analysis.convergences?.filter(c => c.strength > 0.4 && c.strength <= 0.7).length || 0,
        weak: analysis.convergences?.filter(c => c.strength <= 0.4).length || 0,
        themes: analysis.convergences?.map(c => c.theme).slice(0, 5) || []
      } : null,
      keywords: analysis ? {
        total: analysis.keywords?.length || 0,
        topKeywords: analysis.keywords?.slice(0, 5) || []
      } : null,
      categories: analysis ? {
        total: Object.keys(analysis.categories || {}).length,
        topCategories: Object.entries(analysis.categories || {})
          .sort(([,a], [,b]) => b.count - a.count)
          .slice(0, 5)
      } : null
    };

    return metrics;
  }, [nodes, edges, analysis]);

  const [metrics, setMetrics] = useState(calculateMetrics());

  // Update metrics when data changes
  useEffect(() => {
    setMetrics(calculateMetrics());
  }, [calculateMetrics]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        handleRefresh();
      }, 30000); // 30 seconds

      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh]);

  const handleRefresh = useCallback(() => {
    setLastRefresh(Date.now());
    setMetrics(calculateMetrics());
    if (onRefresh) {
      onRefresh();
    }
    console.log('📊 Stats refreshed at', new Date().toLocaleTimeString());
  }, [calculateMetrics, onRefresh]);

  const handleInsertStats = useCallback(() => {
    const statsData = {
      timestamp: new Date().toISOString(),
      metrics: metrics,
      summary: `${metrics.nodes.total} nós, ${metrics.edges.total} conexões, ${metrics.convergences?.total || 0} convergências`
    };

    if (onInsertStatsAsNode) {
      onInsertStatsAsNode(statsData);
    }
  }, [metrics, onInsertStatsAsNode]);

  if (isMinimized) {
    return (
      <div className="stats-panel minimized">
        <button 
          className="toggle-btn"
          onClick={() => setIsMinimized(false)}
          title="Expandir painel de estatísticas"
        >
          📊
        </button>
      </div>
    );
  }

  return (
    <div className="stats-panel">
      <header className="stats-panel-header">
        <h3>📊 Estatísticas</h3>
        <div className="header-controls">
          <button 
            className="refresh-btn"
            onClick={handleRefresh}
            title="Atualizar estatísticas"
          >
            🔄
          </button>
          <button 
            className="toggle-btn"
            onClick={() => setIsMinimized(true)}
            title="Minimizar painel"
          >
            ✕
          </button>
        </div>
      </header>

      <div className="stats-content">
        {/* Auto-refresh controls */}
        <div className="auto-refresh-controls">
          <label className="auto-refresh-toggle">
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh (30s)</span>
          </label>
          <span className="last-refresh">
            Última atualização: {new Date(lastRefresh).toLocaleTimeString()}
          </span>
        </div>

        {/* Nodes Statistics */}
        <div className="stat-section">
          <h4>🔵 Nós</h4>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{metrics.nodes.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Selecionados:</span>
              <span className="stat-value">{metrics.nodes.selected}</span>
            </div>
          </div>
          
          {Object.keys(metrics.nodes.types).length > 0 && (
            <div className="stat-breakdown">
              <strong>Por tipo:</strong>
              {Object.entries(metrics.nodes.types).map(([type, count]) => (
                <div key={type} className="breakdown-item">
                  <span>{type}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edges Statistics */}
        <div className="stat-section">
          <h4>🔗 Conexões</h4>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{metrics.edges.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Animadas:</span>
              <span className="stat-value">{metrics.edges.animated}</span>
            </div>
          </div>
        </div>

        {/* Convergences Statistics */}
        {metrics.convergences && (
          <div className="stat-section">
            <h4>🌐 Convergências</h4>
            <div className="stat-grid">
              <div className="stat-item">
                <span className="stat-label">Total:</span>
                <span className="stat-value">{metrics.convergences.total}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Fortes:</span>
                <span className="stat-value strong">{metrics.convergences.strong}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Médias:</span>
                <span className="stat-value medium">{metrics.convergences.medium}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Fracas:</span>
                <span className="stat-value weak">{metrics.convergences.weak}</span>
              </div>
            </div>
            
            {metrics.convergences.themes.length > 0 && (
              <div className="stat-breakdown">
                <strong>Principais temas:</strong>
                {metrics.convergences.themes.map((theme, idx) => (
                  <div key={idx} className="theme-item">
                    {theme}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Keywords Statistics */}
        {metrics.keywords && metrics.keywords.total > 0 && (
          <div className="stat-section">
            <h4>🔤 Keywords</h4>
            <div className="stat-item">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{metrics.keywords.total}</span>
            </div>
            
            <div className="stat-breakdown">
              <strong>Top keywords:</strong>
              {metrics.keywords.topKeywords.map((kw, idx) => (
                <div key={idx} className="keyword-item">
                  <span>{kw.keyword}</span>
                  <span className="keyword-count">({kw.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories Statistics */}
        {metrics.categories && metrics.categories.total > 0 && (
          <div className="stat-section">
            <h4>📊 Categorias</h4>
            <div className="stat-item">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{metrics.categories.total}</span>
            </div>
            
            <div className="stat-breakdown">
              <strong>Principais:</strong>
              {metrics.categories.topCategories.map(([cat, data], idx) => (
                <div key={idx} className="category-item">
                  <span>{data.icon} {cat}</span>
                  <span className="category-count">({data.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="stats-actions">
          <button 
            className="action-btn primary"
            onClick={handleInsertStats}
            title="Inserir essas estatísticas como um nó no canvas"
          >
            📌 Inserir no Canvas
          </button>
          <button 
            className="action-btn secondary"
            onClick={handleRefresh}
          >
            🔄 Atualizar Agora
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;