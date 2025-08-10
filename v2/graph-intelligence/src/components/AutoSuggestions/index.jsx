import React, { useState, useEffect } from 'react';
import './AutoSuggestions.css';

/**
 * AutoSuggestions Component - Sugestões incrementais para o canvas
 * 
 * Requisitos do Stakeholder:
 * - Apresentar opções elegíveis (cadeia de informações) no Canvas
 * - Aprovação manual dos pontos relevantes
 * - Ativado via botão direito sobre campo no canvas
 * - Sugerir auto-incremental para o schema sendo criado
 */
const AutoSuggestions = ({ 
  targetNode,
  qdrantData,
  existingNodes,
  analysis,
  onApprove,
  onReject,
  onClose,
  position
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (targetNode && analysis) {
      generateSuggestions();
    }
  }, [targetNode, analysis]);

  // Gerar sugestões baseadas no nó alvo
  const generateSuggestions = () => {
    if (!targetNode || !qdrantData) return;

    const targetData = targetNode.data;
    const newSuggestions = [];

    // 1. Sugestões por Keywords em comum
    if (targetData.keywords && targetData.keywords.length > 0) {
      const keywordMatches = qdrantData
        .filter(point => {
          // Não sugerir nós já existentes
          const exists = existingNodes.some(n => n.id === point.id);
          if (exists) return false;

          const pointKeywords = point.payload?.metadata?.keywords || [];
          const commonKeywords = targetData.keywords.filter(kw => 
            pointKeywords.includes(kw)
          );
          return commonKeywords.length > 0;
        })
        .map(point => ({
          id: point.id,
          type: 'keyword',
          reason: 'Keywords em comum',
          data: point.payload,
          relevance: calculateRelevance(targetData, point.payload),
          commonElements: point.payload?.metadata?.keywords?.filter(kw => 
            targetData.keywords.includes(kw)
          ) || []
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 3);

      newSuggestions.push(...keywordMatches);
    }

    // 2. Sugestões por Categoria
    if (targetData.categories && targetData.categories.length > 0) {
      const categoryMatches = qdrantData
        .filter(point => {
          const exists = existingNodes.some(n => n.id === point.id);
          if (exists) return false;

          const pointCategories = point.payload?.categories || [];
          return targetData.categories.some(cat => pointCategories.includes(cat));
        })
        .map(point => ({
          id: point.id,
          type: 'category',
          reason: 'Mesma categoria',
          data: point.payload,
          relevance: calculateRelevance(targetData, point.payload),
          commonElements: point.payload?.categories?.filter(cat => 
            targetData.categories.includes(cat)
          ) || []
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 2);

      newSuggestions.push(...categoryMatches);
    }

    // 3. Sugestões por Convergência
    if (targetData.convergenceChains && targetData.convergenceChains.length > 0) {
      const convergenceMatches = targetData.convergenceChains
        .flatMap(chain => {
          return chain.participants
            .filter(participantId => {
              const exists = existingNodes.some(n => n.id === participantId);
              return !exists;
            })
            .map(participantId => {
              const pointData = qdrantData.find(p => p.id === participantId);
              if (!pointData) return null;

              return {
                id: participantId,
                type: 'convergence',
                reason: `Convergência: ${chain.theme}`,
                data: pointData.payload,
                relevance: chain.strength,
                commonElements: [chain.theme]
              };
            })
            .filter(Boolean);
        })
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 2);

      newSuggestions.push(...convergenceMatches);
    }

    // 4. Sugestões por Score de Inteligência
    const intelligentMatches = qdrantData
      .filter(point => {
        const exists = existingNodes.some(n => n.id === point.id);
        if (exists) return false;

        const scoreDiff = Math.abs(
          (point.payload?.intelligenceScore || 0) - 
          (targetData.intelligenceScore || 0)
        );
        return scoreDiff < 20; // Similar intelligence level
      })
      .map(point => ({
        id: point.id,
        type: 'intelligence',
        reason: 'Nível de inteligência similar',
        data: point.payload,
        relevance: 100 - Math.abs(
          (point.payload?.intelligenceScore || 0) - 
          (targetData.intelligenceScore || 0)
        ),
        commonElements: [`Score: ${point.payload?.intelligenceScore || 0}%`]
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 2);

    newSuggestions.push(...intelligentMatches);

    // Remover duplicatas e limitar total
    const uniqueSuggestions = Array.from(
      new Map(newSuggestions.map(s => [s.id, s])).values()
    ).slice(0, 8);

    setSuggestions(uniqueSuggestions);
  };

  // Calcular relevância entre dois pontos
  const calculateRelevance = (data1, data2) => {
    let score = 0;
    
    // Keywords em comum
    const keywords1 = data1.keywords || [];
    const keywords2 = data2?.metadata?.keywords || [];
    const commonKeywords = keywords1.filter(k => keywords2.includes(k));
    score += commonKeywords.length * 10;

    // Categorias em comum
    const cats1 = data1.categories || [];
    const cats2 = data2?.categories || [];
    const commonCats = cats1.filter(c => cats2.includes(c));
    score += commonCats.length * 15;

    // Scores similares
    const scoreDiff = Math.abs(
      (data1.relevanceScore || 0) - (data2?.relevanceScore || 0)
    );
    score += Math.max(0, 100 - scoreDiff);

    return Math.min(100, score);
  };

  // Toggle seleção de sugestão
  const toggleSelection = (suggestionId) => {
    const newSelection = new Set(selectedSuggestions);
    if (newSelection.has(suggestionId)) {
      newSelection.delete(suggestionId);
    } else {
      newSelection.add(suggestionId);
    }
    setSelectedSuggestions(newSelection);
  };

  // Aprovar sugestões selecionadas
  const handleApprove = () => {
    const approved = suggestions.filter(s => selectedSuggestions.has(s.id));
    onApprove(approved);
  };

  // Selecionar todas
  const selectAll = () => {
    setSelectedSuggestions(new Set(suggestions.map(s => s.id)));
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedSuggestions(new Set());
  };

  if (!targetNode || suggestions.length === 0) return null;

  return (
    <div 
      className="auto-suggestions-container"
      style={{
        position: 'absolute',
        left: position?.x || 100,
        top: position?.y || 100,
        zIndex: 9999
      }}
    >
      <div className="suggestions-header">
        <h3>🎯 Sugestões Auto-Incrementais</h3>
        <button className="suggestions-close" onClick={onClose}>✕</button>
      </div>

      <div className="suggestions-info">
        <p>
          Pontos relevantes para <strong>{targetNode.data?.fileName || targetNode.id}</strong>
        </p>
        <p className="info-hint">
          Selecione os itens para adicionar ao schema
        </p>
      </div>

      <div className="suggestions-controls">
        <button onClick={selectAll} className="btn-select-all">
          ☑️ Todos
        </button>
        <button onClick={clearSelection} className="btn-clear">
          ⬜ Limpar
        </button>
        <span className="selection-count">
          {selectedSuggestions.size}/{suggestions.length} selecionados
        </span>
      </div>

      <div className={`suggestions-list ${isExpanded ? 'expanded' : ''}`}>
        {suggestions.map((suggestion) => (
          <div 
            key={suggestion.id}
            className={`suggestion-item ${selectedSuggestions.has(suggestion.id) ? 'selected' : ''}`}
            onClick={() => toggleSelection(suggestion.id)}
          >
            <div className="suggestion-checkbox">
              {selectedSuggestions.has(suggestion.id) ? '☑️' : '⬜'}
            </div>
            
            <div className="suggestion-content">
              <div className="suggestion-title">
                {suggestion.data?.fileName || suggestion.id}
              </div>
              
              <div className="suggestion-reason">
                <span className={`reason-badge ${suggestion.type}`}>
                  {suggestion.reason}
                </span>
                <span className="relevance-score">
                  {Math.round(suggestion.relevance)}% relevante
                </span>
              </div>

              {suggestion.commonElements.length > 0 && (
                <div className="suggestion-common">
                  {suggestion.commonElements.slice(0, 3).map((elem, idx) => (
                    <span key={idx} className="common-tag">
                      {elem}
                    </span>
                  ))}
                </div>
              )}

              <div className="suggestion-scores">
                {suggestion.data?.relevanceScore && (
                  <span className="mini-score">
                    R: {suggestion.data.relevanceScore}%
                  </span>
                )}
                {suggestion.data?.intelligenceScore && (
                  <span className="mini-score">
                    I: {suggestion.data.intelligenceScore}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {suggestions.length > 3 && (
        <button 
          className="btn-expand"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '⬆️ Recolher' : '⬇️ Ver mais'}
        </button>
      )}

      <div className="suggestions-footer">
        <button 
          className="btn-reject"
          onClick={onReject}
        >
          ❌ Rejeitar
        </button>
        <button 
          className="btn-approve"
          onClick={handleApprove}
          disabled={selectedSuggestions.size === 0}
        >
          ✅ Aprovar ({selectedSuggestions.size})
        </button>
      </div>
    </div>
  );
};

export default AutoSuggestions;