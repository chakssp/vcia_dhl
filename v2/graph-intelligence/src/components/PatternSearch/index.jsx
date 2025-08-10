import React, { useState, useCallback, useEffect } from 'react';
import './PatternSearch.css';

/**
 * PatternSearch Component - Pesquisa por padrões de arquivo
 * 
 * Requisitos do Stakeholder:
 * - Permitir patterns como: *.md, *parte_*nome*arquivo.md, pasta/*
 * - Traçar padrões de maior relevância para o fluxo
 * - Destacar resultados no canvas
 */
const PatternSearch = ({ 
  nodes,
  onPatternMatch,
  onHighlight,
  onClearHighlight,
  onApplyToCanvas,
  onApplyToFields
}) => {
  const [pattern, setPattern] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [matches, setMatches] = useState([]);
  const [searchState, setSearchState] = useState('idle'); // idle | typing | applying | applied | error
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestions, setSuggestions] = useState([
    '*.md',
    '*.txt',
    '*.json',
    'docs/*',
    '*report*',
    '*analysis*',
    'data/*.csv',
    '*_v2*'
  ]);

  // Converter pattern para regex
  const patternToRegex = (pattern) => {
    // Escapar caracteres especiais exceto * e /
    let regexStr = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/');
    
    // Se não começa com *, adicionar ^ para match do início
    if (!pattern.startsWith('*')) {
      regexStr = '^' + regexStr;
    }
    
    // Se não termina com *, adicionar $ para match do fim
    if (!pattern.endsWith('*')) {
      regexStr = regexStr + '$';
    }
    
    return new RegExp(regexStr, 'i');
  };

  // PATTERN SEARCH V2: Agrupar chunks por arquivo
  const groupNodesByFile = useCallback((matchedNodes) => {
    const fileGroups = {};
    
    matchedNodes.forEach(node => {
      const fileName = node.data?.fileName || node.data?.label || node.id;
      
      if (!fileGroups[fileName]) {
        fileGroups[fileName] = {
          fileName,
          chunks: [],
          totalChunks: 0,
          primaryNode: null,
          // V2: Análise de convergência
          keywords: new Set(),
          categories: new Set(),
          convergenceScore: 0
        };
      }
      
      fileGroups[fileName].chunks.push(node);
      fileGroups[fileName].totalChunks++;
      
      // Coletar keywords e categorias para análise
      if (node.data?.keywords) {
        node.data.keywords.forEach(kw => fileGroups[fileName].keywords.add(kw));
      }
      if (node.data?.categories) {
        node.data.categories.forEach(cat => fileGroups[fileName].categories.add(cat));
      }
      
      // Usar chunk 0 ou primeiro como principal
      if (!fileGroups[fileName].primaryNode || node.data?.chunkIndex === 0) {
        fileGroups[fileName].primaryNode = node;
      }
    });
    
    // Converter Sets para Arrays
    Object.values(fileGroups).forEach(group => {
      group.keywords = Array.from(group.keywords);
      group.categories = Array.from(group.categories);
      group.convergenceScore = group.keywords.length * 0.3 + group.categories.length * 0.2 + group.totalChunks * 0.1;
    });
    
    return fileGroups;
  }, []);

  // PATTERN SEARCH V2: Analisar convergências
  const analyzeConvergence = useCallback((fileGroups) => {
    const convergenceData = {
      clusters: [],
      suggestedConnections: [],
      convergenceChains: []
    };
    
    // Identificar clusters baseados em keywords comuns
    const fileArray = Object.values(fileGroups);
    fileArray.forEach((file, i) => {
      fileArray.slice(i + 1).forEach(otherFile => {
        const commonKeywords = file.keywords.filter(kw => 
          otherFile.keywords.includes(kw)
        );
        
        if (commonKeywords.length > 2) {
          convergenceData.suggestedConnections.push({
            source: file.fileName,
            target: otherFile.fileName,
            reason: 'keywords',
            commonKeywords,
            confidence: (commonKeywords.length / Math.max(file.keywords.length, otherFile.keywords.length))
          });
        }
      });
    });
    
    return convergenceData;
  }, []);

  // Aplicar pattern aos nós - V2: Com análise de convergência
  const applyPattern = useCallback(() => {
    if (!pattern || pattern.trim() === '') {
      setMatches([]);
      setSearchState('idle');
      setErrorMessage('');
      onClearHighlight();
      return;
    }

    setSearchState('applying');
    setErrorMessage('');

    try {
      const regex = patternToRegex(pattern);
      
      // Filtrar nós que fazem match
      const matchedNodes = nodes.filter(node => {
        const fileName = node.data?.fileName || node.data?.label || '';
        const filePath = node.data?.filePath || '';
        return regex.test(fileName) || regex.test(filePath);
      });

      // V2: Agrupar por arquivo único
      const fileGroups = groupNodesByFile(matchedNodes);
      
      // V2: Analisar convergências
      const convergenceData = analyzeConvergence(fileGroups);
      
      // Preparar resultado agrupado
      const groupedResults = Object.values(fileGroups).map(group => ({
        ...group,
        convergence: convergenceData
      }));

      setMatches(groupedResults);
      
      // Callback com dados agrupados
      if (onPatternMatch) {
        onPatternMatch(groupedResults);
      }
      
      // Destacar nós primários de cada grupo
      if (groupedResults.length > 0) {
        const primaryNodeIds = groupedResults.map(g => g.primaryNode.id);
        onHighlight(primaryNodeIds);
        setSearchState('applied');
        
        console.log('🎯 Pattern Search V2:', {
          pattern,
          filesFound: groupedResults.length,
          totalChunks: matchedNodes.length,
          convergences: convergenceData.suggestedConnections.length
        });
      } else {
        setSearchState('error');
        setErrorMessage('Nenhum arquivo corresponde ao pattern');
      }

      // Atualizar sugestões
      setSuggestions(currentSuggestions => {
        if (!currentSuggestions.includes(pattern) && groupedResults.length > 0) {
          return [pattern, ...currentSuggestions].slice(0, 10);
        }
        return currentSuggestions;
      });
    } catch (error) {
      console.error('Pattern inválido:', error);
      setMatches([]);
      setSearchState('error');
      setErrorMessage('Pattern inválido. Use * como wildcard.');
    }
  }, [pattern, nodes, onPatternMatch, onHighlight, onClearHighlight, groupNodesByFile, analyzeConvergence]);

  // Aplicar pattern ao pressionar Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      applyPattern();
      setIsActive(true);
    } else if (e.key === 'Escape') {
      clearPattern();
    }
  };

  // Limpar pattern
  const clearPattern = () => {
    setPattern('');
    setMatches([]);
    setIsActive(false);
    setSearchState('idle');
    setErrorMessage('');
    onClearHighlight();
  };

  // PATTERN SEARCH V2: Aplicar ao Canvas
  const applyToCanvasAndFields = useCallback(() => {
    if (matches.length === 0) return;
    
    console.log('🎯 Pattern Search V2 - Aplicando ao Canvas:', {
      arquivos: matches.length,
      pattern,
      totalChunks: matches.reduce((acc, m) => acc + m.totalChunks, 0)
    });
    
    // NOVA ARQUITETURA: Criar ChunkNodes
    const chunkNodesToAdd = [];
    let xPosition = 100;
    let yPosition = 100;
    
    matches.forEach((group, groupIndex) => {
      // Adicionar todos os chunks como ChunkNodes
      group.chunks.forEach((chunk, chunkIndex) => {
        const chunkNode = {
          id: `chunk-${chunk.id || Math.random().toString(36).substr(2, 9)}`,
          type: 'chunkNode',  // IMPORTANTE: Usar o novo tipo de nó
          position: {
            x: xPosition + (chunkIndex * 50),
            y: yPosition + (groupIndex * 150)
          },
          data: {
            ...chunk.data,
            label: chunk.data?.fileName || 'Chunk',
            nodeType: 'chunk',
            score: group.convergenceScore
          }
        };
        chunkNodesToAdd.push(chunkNode);
      });
    });
    
    // Aplicar ao Canvas
    if (onApplyToCanvas) {
      onApplyToCanvas({
        nodes: chunkNodesToAdd,
        pattern,
        groups: matches,
        convergences: matches[0]?.convergence || null,
        nodeType: 'chunk'  // Indicar que são ChunkNodes
      });
    }
    
    // Feedback visual
    setSearchState('applied');
    
    // Notificar usuário
    console.log('✅ ChunkNodes adicionados ao Canvas:', chunkNodesToAdd.length);
  }, [matches, pattern, onApplyToCanvas]);

  // Aplicar sugestão
  const applySuggestion = (sug) => {
    setPattern(sug);
    setTimeout(() => {
      applyPattern();
      setIsActive(true);
    }, 100);
  };

  // Auto-aplicar após delay com feedback de estado - CORREÇÃO: Prevenir loop infinito
  useEffect(() => {
    // Usar flag para evitar aplicar múltiplas vezes
    let shouldApply = true;
    
    if (pattern && pattern.length > 0) {
      setSearchState('typing');
      
      const timer = setTimeout(() => {
        if (shouldApply && pattern && pattern.length > 2) {
          applyPattern();
        }
      }, 800); // Aumentado para 800ms para dar mais tempo de digitação
      
      return () => {
        shouldApply = false;
        clearTimeout(timer);
      };
    } else {
      setSearchState('idle');
      setMatches([]);
      setErrorMessage('');
    }
    
    // Dependências estáveis sem applyPattern no array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern]); // Apenas pattern como dependência

  return (
    <div className="pattern-search-container">
      <div className="pattern-search-header">
        <h3>🔍 Pesquisa por Pattern</h3>
        <span className="pattern-help" title="Use * como wildcard. Ex: *.md, pasta/*, *nome*">
          ❓
        </span>
      </div>

      <div className="pattern-input-group">
        <input
          type="text"
          className={`pattern-input state-${searchState} ${isActive ? 'active' : ''}`}
          placeholder="Digite pattern... (Enter para aplicar)"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        
        {pattern && (
          <button 
            className="pattern-clear"
            onClick={clearPattern}
            title="Limpar"
          >
            ✕
          </button>
        )}
        
        <button 
          className="pattern-apply"
          onClick={applyPattern}
          title="Aplicar pattern"
        >
          🔍
        </button>
      </div>

      {/* Feedback de estado */}
      <div className="pattern-status">
        {searchState === 'typing' && (
          <span className="status-typing">⏳ Digitando...</span>
        )}
        {searchState === 'applying' && (
          <span className="status-applying">🔄 Aplicando pattern...</span>
        )}
        {searchState === 'applied' && (
          <span className="status-applied">✅ {matches.length} resultado{matches.length !== 1 ? 's' : ''} encontrado{matches.length !== 1 ? 's' : ''}</span>
        )}
        {searchState === 'error' && (
          <span className="status-error">❌ {errorMessage}</span>
        )}
      </div>

      {/* Resultados */}
      {isActive && matches.length > 0 && (
        <div className="pattern-results">
          <div className="results-header">
            <span className="results-count">
              {matches.length} arquivo{matches.length !== 1 ? 's' : ''} encontrado{matches.length !== 1 ? 's' : ''}
            </span>
            <div className="results-actions">
              <button 
                className="pattern-apply-to-canvas"
                onClick={applyToCanvasAndFields}
                title="Aplicar filtro ao Canvas e Campos"
              >
                ✅ APLICAR
              </button>
              <button 
                className="results-clear"
                onClick={clearPattern}
              >
                Limpar
              </button>
            </div>
          </div>
          
          <div className="results-list">
            {matches.slice(0, 5).map((group) => (
              <div 
                key={group.primaryNode.id} 
                className="result-item"
                onClick={() => onHighlight([group.primaryNode.id])}
              >
                <span className="result-icon">📄</span>
                <div className="result-details">
                  <span className="result-name">
                    {group.fileName}
                  </span>
                  <div className="result-meta">
                    <span className="result-chunks">{group.totalChunks} chunk{group.totalChunks !== 1 ? 's' : ''}</span>
                    {group.keywords.length > 0 && (
                      <span className="result-keywords" title={group.keywords.join(', ')}>
                        🔑 {group.keywords.length}
                      </span>
                    )}
                    {group.convergenceScore > 0 && (
                      <span className="result-convergence" title={`Score: ${group.convergenceScore.toFixed(1)}`}>
                        🎯 {Math.round(group.convergenceScore * 10)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {matches.length > 5 && (
              <div className="results-more">
                +{matches.length - 5} mais arquivos...
              </div>
            )}
          </div>
          
          {/* Mostrar convergências detectadas */}
          {matches.some(m => m.convergence?.suggestedConnections?.length > 0) && (
            <div className="convergence-summary">
              <div className="convergence-title">🔗 Convergências Detectadas</div>
              <div className="convergence-count">
                {matches.reduce((acc, m) => acc + (m.convergence?.suggestedConnections?.length || 0), 0)} possíveis conexões
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sugestões */}
      {!isActive && (
        <div className="pattern-suggestions">
          <div className="suggestions-label">Sugestões rápidas:</div>
          <div className="suggestions-grid">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                className="suggestion-chip"
                onClick={() => applySuggestion(sug)}
                title={`Aplicar pattern: ${sug}`}
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info sobre patterns */}
      <div className="pattern-info">
        <strong>Dica:</strong> Este filtro ajuda a identificar padrões 
        de maior relevância para o fluxo que está sendo construído.
        Use <code>*</code> como wildcard para matches parciais.
      </div>
    </div>
  );
};

export default PatternSearch;