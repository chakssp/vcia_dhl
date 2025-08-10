import React, { useState, useEffect } from 'react';
import './FieldSelector.css';
import qdrantService from '../../services/QdrantService';
import PatternSearch from '../PatternSearch';

/**
 * FieldSelector - Painel de seleção de campos do Qdrant
 * 
 * Requisitos:
 * - Checkbox com linha INTEIRA clicável
 * - Drag & drop para o canvas
 * - Busca/filtro de campos
 * - Botão minimizar [<]
 */
const FieldSelector = ({ onFieldDrag, patternHandlers }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFields, setSelectedFields] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState(new Set(['identificacao', 'arquivo', 'conteudo']));
  const [patternFilter, setPatternFilter] = useState(null); // Pattern Search V2 filter
  const [qdrantPoints, setQdrantPoints] = useState([]); // Pontos do Qdrant para Pattern Search

  // Mapeamento de campos em categorias
  const fieldCategories = {
    identificacao: {
      label: '🔑 Identificação',
      fields: ['id', 'documentId', 'chunkId', 'originalChunkId', 'contentHash']
    },
    arquivo: {
      label: '📁 Arquivo',
      fields: ['fileName', 'filePath', 'size']
    },
    conteudo: {
      label: '📝 Conteúdo',
      fields: ['chunkIndex', 'chunkText', 'content']
    },
    categorizacao: {
      label: '🏷️ Categorização',
      fields: ['categories', 'analysisType', 'intelligenceType']
    },
    scores: {
      label: '📊 Scores',
      fields: ['relevanceScore', 'intelligenceScore', 'convergenceScore', 'impactScore']
    },
    convergencia: {
      label: '🔗 Convergência',
      fields: ['convergenceChains', 'convergenceChains.theme', 'convergenceChains.participants', 'convergenceChains.strength']
    },
    keywords: {
      label: '🔤 Keywords',
      fields: ['metadata.keywords', 'metadata.semanticDensity']
    },
    enriquecimento: {
      label: '✨ Enriquecimento',
      fields: ['enrichmentLevel', 'enrichmentMetadata.insightCount', 'enrichmentMetadata.hasBreakthrough']
    },
    versionamento: {
      label: '🔄 Versionamento',
      fields: ['version', 'mergeCount', 'insertedAt', 'lastModified']
    }
  };

  // Carregar campos e pontos do Qdrant
  useEffect(() => {
    loadFields();
    loadQdrantPoints();
  }, []);

  const loadFields = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // SEM FALLBACK! Se falhar, mostra erro
      const qdrantFields = await qdrantService.getFields();
      setFields(qdrantFields);
      console.log('Campos carregados:', qdrantFields);
    } catch (error) {
      console.error('Erro ao carregar campos:', error);
      setError(error.message);
      // NÃO usar dados mock! Mostrar erro real
    } finally {
      setLoading(false);
    }
  };
  
  const loadQdrantPoints = async () => {
    try {
      console.log('🔍 Carregando pontos do Qdrant para Pattern Search...');
      const points = await qdrantService.getData(100); // Buscar 100 pontos
      
      // Converter pontos do Qdrant para formato de nós para Pattern Search
      const nodesFromPoints = points.map(point => ({
        id: point.id || Math.random().toString(36).substr(2, 9),
        data: {
          ...point.payload,
          fileName: point.payload?.fileName || point.payload?.title || 'Sem nome',
          filePath: point.payload?.filePath || '',
          keywords: point.payload?.keywords || [],
          categories: point.payload?.categories || [],
          chunkIndex: point.payload?.chunkIndex || 0,
          payload: point.payload // Manter payload original
        }
      }));
      
      setQdrantPoints(nodesFromPoints);
      console.log('✅ Carregados', nodesFromPoints.length, 'pontos para Pattern Search');
    } catch (error) {
      console.error('❌ Erro ao carregar pontos do Qdrant:', error);
      // Não é crítico se falhar, Pattern Search simplesmente não terá dados
    }
  };

  // Toggle grupo expandido
  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Toggle seleção de campo para FILTRO
  const toggleFieldSelection = (fieldPath) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(fieldPath)) {
      newSelected.delete(fieldPath);
    } else {
      newSelected.add(fieldPath);
    }
    setSelectedFields(newSelected);
    
    // NOVA LÓGICA: Aplicar filtro imediatamente
    applyFieldFilter(newSelected);
  };
  
  // Aplicar filtro baseado em campos selecionados
  const applyFieldFilter = (selectedFieldsSet) => {
    console.log('🎯 Aplicando filtro de campos:', Array.from(selectedFieldsSet));
    // Filtrar chunks que têm esses campos
    const filteredChunks = qdrantPoints.filter(chunk => {
      return Array.from(selectedFieldsSet).some(fieldPath => {
        // Verificar se o chunk tem esse campo no payload
        const pathParts = fieldPath.split('.');
        let current = chunk.data;
        for (const part of pathParts) {
          if (current && current[part] !== undefined) {
            current = current[part];
          } else {
            return false;
          }
        }
        return true;
      });
    });
    
    console.log(`✅ Filtrados ${filteredChunks.length} chunks de ${qdrantPoints.length}`);
    // TODO: Atualizar visualização no canvas
  };
  
  // Criar nó de análise para um campo
  const createAnalysisNode = (fieldPath) => {
    console.log('📊 Criando nó de análise para:', fieldPath);
    
    // Coletar dados agregados do campo
    const aggregatedData = {};
    qdrantPoints.forEach(chunk => {
      const pathParts = fieldPath.split('.');
      let value = chunk.data;
      for (const part of pathParts) {
        if (value && value[part] !== undefined) {
          value = value[part];
        } else {
          return;
        }
      }
      
      // Agregar valores
      if (Array.isArray(value)) {
        value.forEach(item => {
          const key = String(item);
          aggregatedData[key] = (aggregatedData[key] || 0) + 1;
        });
      } else if (value !== null && value !== undefined) {
        const key = String(value);
        aggregatedData[key] = (aggregatedData[key] || 0) + 1;
      }
    });
    
    // Criar evento customizado para o GraphCanvas adicionar nó de análise
    const event = new CustomEvent('createAnalysisNode', {
      detail: {
        fieldPath,
        analysisType: fieldPath.includes('keyword') ? 'keyword-cloud' : 
                      fieldPath.includes('categor') ? 'category-summary' : 
                      'statistics',
        aggregatedData,
        sourceChunks: qdrantPoints.filter(p => {
          const pathParts = fieldPath.split('.');
          let current = p.data;
          for (const part of pathParts) {
            if (current && current[part] !== undefined) {
              current = current[part];
            } else {
              return false;
            }
          }
          return true;
        }).map(p => p.id)
      }
    });
    window.dispatchEvent(event);
  };

  // Iniciar drag
  const handleDragStart = (e, field) => {
    e.dataTransfer.setData('field', JSON.stringify(field));
    e.dataTransfer.effectAllowed = 'copy';
    // Adicionar classe para prevenir overflow durante drag
    document.body.classList.add('dragging');
  };
  
  // Finalizar drag
  const handleDragEnd = () => {
    // Remover classe quando drag terminar
    document.body.classList.remove('dragging');
  };

  // Filtrar campos pela busca (NÃO pelo pattern)
  const filterFields = (fields, term) => {
    let filtered = fields;
    
    // Filtrar APENAS por termo de busca
    if (term) {
      filtered = filtered.filter(f => 
        f.path.toLowerCase().includes(term.toLowerCase())
      );
    }
    
    // Pattern Search apenas destaca, não filtra
    // Os campos destacados são mostrados via selectedFields
    
    return filtered;
  };
  
  // Handler para aplicar filtros do Pattern Search
  const handlePatternFilter = (filterData) => {
    console.log('🎯 FieldSelector: Destacando campos do Pattern Search', filterData);
    
    // NÃO filtrar exclusivamente - apenas destacar/selecionar
    if (filterData.fields && filterData.fields.length > 0) {
      // Adicionar campos aos selecionados ao invés de esconder outros
      const newSelected = new Set(selectedFields);
      filterData.fields.forEach(field => {
        // Adicionar apenas campos que existem nas categorias
        Object.values(fieldCategories).forEach(category => {
          if (category.fields.includes(field)) {
            newSelected.add(field);
          }
        });
      });
      setSelectedFields(newSelected);
      
      // Expandir grupos que contêm campos selecionados
      const groupsToExpand = new Set(expandedGroups);
      Object.entries(fieldCategories).forEach(([groupKey, group]) => {
        if (group.fields.some(f => filterData.fields.includes(f))) {
          groupsToExpand.add(groupKey);
        }
      });
      setExpandedGroups(groupsToExpand);
      
      // Marcar campos para destaque visual mas manter todos visíveis
      setPatternFilter({ ...filterData, exclusive: false, highlight: true });
    }
  };
  
  // Handler para aplicar Pattern Search ao Canvas
  const handleApplyToCanvas = (filterData) => {
    console.log('🎯 Pattern Search - Aplicando ao Canvas:', filterData);
    
    if (!filterData || !filterData.nodes || filterData.nodes.length === 0) {
      console.warn('⚠️ Nenhum nó para adicionar ao canvas');
      return;
    }
    
    // Se temos patternHandlers do GraphCanvas, usar ele
    if (patternHandlers?.handleApplyToCanvas) {
      patternHandlers.handleApplyToCanvas(filterData);
    } else {
      console.error('❌ handleApplyToCanvas não disponível do GraphCanvas');
      // Alternativa: criar um evento customizado para o GraphCanvas capturar
      const event = new CustomEvent('patternSearchApply', { 
        detail: filterData 
      });
      window.dispatchEvent(event);
    }
  };

  // Renderizar campo individual
  const renderField = (fieldPath, fieldData) => {
    const isSelected = selectedFields.has(fieldPath);
    const isHighlighted = patternFilter?.highlight && patternFilter?.fields?.includes(fieldPath);
    
    return (
      <div
        key={fieldPath}
        className={`field-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'pattern-highlighted' : ''}`}
        title={isHighlighted ? 'Campo destacado pelo Pattern Search' : fieldPath}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleFieldSelection(fieldPath)}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="field-name" onClick={() => toggleFieldSelection(fieldPath)}>
          {isHighlighted && '🎯 '}
          {fieldPath}
        </span>
        {fieldData && (
          <span className="field-type">{fieldData.type}</span>
        )}
        <div className="field-actions">
          <button 
            className="field-action-btn filter-btn"
            onClick={() => toggleFieldSelection(fieldPath)}
            title="Filtrar chunks com este campo"
          >
            🔍
          </button>
          <button 
            className="field-action-btn analysis-btn"
            onClick={() => createAnalysisNode(fieldPath)}
            title="Criar nó de análise"
          >
            📊
          </button>
        </div>
      </div>
    );
  };

  if (isMinimized) {
    return (
      <aside className="field-selector minimized">
        <button 
          className="toggle-btn"
          onClick={() => setIsMinimized(false)}
          title="Expandir painel"
        >
          {'>'}
        </button>
      </aside>
    );
  }

  return (
    <aside className="field-selector">
      <header className="field-selector-header">
        <button 
          className="toggle-btn"
          onClick={() => setIsMinimized(true)}
          title="Minimizar painel"
        >
          {'<'}
        </button>
        <h2>Campos do Qdrant</h2>
      </header>

      {/* Pattern Search Integration */}
      {patternHandlers && (
        <div className="pattern-search-section">
          <PatternSearch
            nodes={qdrantPoints}
            onPatternMatch={patternHandlers?.handlePatternMatch || ((matches) => console.log('Pattern matches:', matches))}
            onHighlight={patternHandlers?.handleHighlightNodes || (() => {})}
            onClearHighlight={patternHandlers?.handleClearHighlight || (() => {})}
            onApplyToCanvas={handleApplyToCanvas}
            onApplyToFields={handlePatternFilter}
          />
        </div>
      )}

      <div className="field-search">
        <input
          type="search"
          placeholder="🔍 Buscar campo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && (
        <div className="error-message">
          ⚠️ ❌ ERRO: Falha ao buscar campos
          {error.includes('500') && (
            <div className="error-details">
              (status 500) - Servidor Qdrant não está acessível
              <br />
              <small>Verifique se o Qdrant está rodando em http://qdr.vcia.com.br:6333</small>
            </div>
          )}
          <button onClick={loadFields} className="retry-button">Tentar novamente</button>
        </div>
      )}

      {loading && (
        <div className="loading">
          🔄 Carregando campos do Qdrant...
        </div>
      )}

      {!loading && !error && (
        <div className="field-groups">
          {Object.entries(fieldCategories).map(([groupKey, group]) => {
            const groupFields = filterFields(
              group.fields.map(f => ({ path: f })),
              searchTerm
            ).map(f => f.path);
            
            if (groupFields.length === 0 && searchTerm) return null;
            
            return (
              <div key={groupKey} className="field-group">
                <div 
                  className="field-group-header"
                  onClick={() => toggleGroup(groupKey)}
                >
                  <span className="expand-icon">
                    {expandedGroups.has(groupKey) ? '▼' : '▶'}
                  </span>
                  <span className="group-label">{group.label}</span>
                  <span className="field-count">({groupFields.length})</span>
                </div>
                
                {expandedGroups.has(groupKey) && (
                  <div className="field-group-content">
                    {groupFields.map(fieldPath => {
                      const fieldData = fields.find(f => f.path === fieldPath);
                      return renderField(fieldPath, fieldData);
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <footer className="field-selector-footer">
        <button 
          className="select-all-btn"
          onClick={() => {
            const allFields = Object.values(fieldCategories)
              .flatMap(g => g.fields);
            setSelectedFields(new Set(allFields));
          }}
        >
          + Selecionar Todos
        </button>
        <button 
          className="clear-btn"
          onClick={() => setSelectedFields(new Set())}
        >
          - Limpar Seleção
        </button>
      </footer>
    </aside>
  );
};

export default FieldSelector;