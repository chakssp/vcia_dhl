import React, { useState, useEffect, useRef } from 'react';
import './Tooltip.css';

/**
 * Tooltip Component - Exibe informações detalhadas ao hover
 * 
 * Requisitos do Stakeholder:
 * - Mostrar informações principais sobre o arquivo
 * - Incluir botão '+info >>' para carregar na barra lateral
 * - Dados completos em Propriedades ao clicar
 */
const Tooltip = ({ 
  visible, 
  x, 
  y, 
  data, 
  onMoreInfo,
  onClose,
  onMouseEnter,
  onMouseLeave 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    // Reset expanded state when tooltip changes
    if (!visible) {
      setIsExpanded(false);
    }
  }, [visible]);

  if (!visible || !data) return null;

  // Extrair informações principais
  const {
    fileName = 'Sem nome',
    categories = [],
    relevanceScore = 0,
    intelligenceScore = 0,
    convergenceScore = 0,
    keywords = [],
    convergenceChains = [],
    enrichmentLevel = 'basic',
    lastModified = null
  } = data.payload || {};

  // Formatar data
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Calcular posição para não sair da tela
  const tooltipStyle = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 320),
    top: Math.min(y, window.innerHeight - 400),
    zIndex: 10000
  };

  return (
    <div 
      ref={tooltipRef}
      className="graph-tooltip"
      style={tooltipStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header com nome do arquivo */}
      <div className="tooltip-header">
        <span className="tooltip-filename">📄 {fileName}</span>
        <button 
          className="tooltip-close"
          onClick={onClose}
          title="Fechar"
        >
          ✕
        </button>
      </div>

      {/* Informações principais */}
      <div className="tooltip-body">
        {/* Scores */}
        <div className="tooltip-scores">
          <div className="score-item">
            <span className="score-label">Relevância:</span>
            <div className="score-bar">
              <div 
                className="score-fill relevance"
                style={{ width: `${relevanceScore}%` }}
              />
              <span className="score-value">{relevanceScore}%</span>
            </div>
          </div>
          
          <div className="score-item">
            <span className="score-label">Inteligência:</span>
            <div className="score-bar">
              <div 
                className="score-fill intelligence"
                style={{ width: `${intelligenceScore}%` }}
              />
              <span className="score-value">{intelligenceScore}%</span>
            </div>
          </div>
          
          <div className="score-item">
            <span className="score-label">Convergência:</span>
            <div className="score-bar">
              <div 
                className="score-fill convergence"
                style={{ width: `${convergenceScore}%` }}
              />
              <span className="score-value">{convergenceScore}%</span>
            </div>
          </div>
        </div>

        {/* Categorias */}
        {categories.length > 0 && (
          <div className="tooltip-section">
            <strong>Categorias:</strong>
            <div className="tooltip-tags">
              {categories.map((cat, idx) => (
                <span key={idx} className="category-tag">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Keywords (primeiras 5) */}
        {keywords.length > 0 && (
          <div className="tooltip-section">
            <strong>Keywords principais:</strong>
            <div className="tooltip-keywords">
              {keywords.slice(0, 5).map((kw, idx) => (
                <span key={idx} className="keyword-chip">
                  {kw}
                </span>
              ))}
              {keywords.length > 5 && (
                <span className="keyword-more">+{keywords.length - 5}</span>
              )}
            </div>
          </div>
        )}

        {/* Convergências */}
        {convergenceChains.length > 0 && (
          <div className="tooltip-section">
            <strong>Convergências detectadas:</strong>
            <div className="convergence-list">
              {convergenceChains.slice(0, 2).map((chain, idx) => (
                <div key={idx} className="convergence-item">
                  <span className="convergence-theme">{chain.theme}</span>
                  <span className="convergence-strength">
                    {Math.round(chain.strength * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadados */}
        <div className="tooltip-metadata">
          <div className="metadata-item">
            <span>Enriquecimento:</span>
            <span className={`enrichment-level ${enrichmentLevel}`}>
              {enrichmentLevel}
            </span>
          </div>
          <div className="metadata-item">
            <span>Modificado:</span>
            <span>{formatDate(lastModified)}</span>
          </div>
        </div>
      </div>

      {/* Footer com botão +info */}
      <div className="tooltip-footer">
        <button 
          className="btn-more-info"
          onClick={() => {
            onMoreInfo(data);
            onClose();
          }}
          title="Carregar todos os dados na barra lateral"
        >
          <span className="btn-icon">ℹ️</span>
          <span className="btn-text">+info</span>
          <span className="btn-arrow">»</span>
        </button>
      </div>
    </div>
  );
};

export default Tooltip;