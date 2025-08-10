import React from 'react';
import { Handle } from 'reactflow';
import { sanitizeNodeData, createSafeDisplayName } from '../../utils/sanitizationUtils.js';
import ChunkNode from './ChunkNode';
import AnalysisNode from './AnalysisNode';

/**
 * Custom Node Types para React Flow
 * Definidos em módulo separado para evitar recriação e avisos de performance
 * 
 * SECURITY: All data.label and user inputs are sanitized to prevent XSS
 */

// Nó de campo do Qdrant
const QdrantFieldNode = ({ data, selected, id }) => {
  // Handler for info button click
  const handleInfoClick = (e) => {
    e.stopPropagation(); // Prevent node selection
    if (data.onInfoClick && typeof data.onInfoClick === 'function') {
      data.onInfoClick(e, { id, ...data });
    }
  };
  // Sanitize all data to prevent XSS attacks
  const sanitizedData = sanitizeNodeData(data);
  const safeLabel = createSafeDisplayName(sanitizedData.label, 'Unknown Field');
  const safeExample = sanitizedData.field?.example ? 
    createSafeDisplayName(String(sanitizedData.field.example).substring(0, 50), '') : 
    '';

  return (
    <>
      {/* Handle de ENTRADA (topo) - aceita conexões */}
      <Handle
        type="target"
        position="top"
        id="target-top"
        isConnectable={true}
      />
      
      <div className={`qdrant-node ${selected ? 'selected' : ''}`}>
        <div className="node-header">
          {sanitizedData.type === 'array' ? '📚' : 
           sanitizedData.type === 'string' ? '📝' : 
           sanitizedData.type === 'number' ? '🔢' : '📦'}
          <span className="node-label">{safeLabel}</span>
          <button 
            className="node-info-btn"
            onClick={handleInfoClick}
            title="Ver informações detalhadas"
          >
            ❓
          </button>
        </div>
        {safeExample && (
          <div className="node-preview">
            {safeExample}
            {sanitizedData.field?.example && String(sanitizedData.field.example).length > 50 && '...'}
          </div>
        )}
      </div>
    
      {/* Handles de SAÍDA - podem conectar a outros nós */}
      <Handle
        type="source"
        position="bottom"
        id="source-bottom"
        isConnectable={true}
      />
      <Handle
        type="source"
        position="left"
        id="source-left"
        isConnectable={true}
      />
      <Handle
        type="source"
        position="right"
        id="source-right"
        isConnectable={true}
      />
      
      {/* Handle de ENTRADA adicional (esquerda) para conexões bidirecionais */}
      <Handle
        type="target"
        position="left"
        id="target-left"
        isConnectable={true}
      />
      
      {/* Handle de ENTRADA adicional (direita) para conexões bidirecionais */}
      <Handle
        type="target"
        position="right"
        id="target-right"
        isConnectable={true}
      />
    </>
  );
};

// Nó de ANOTAÇÃO - para adicionar texto livre
const AnnotationNode = ({ data, selected, id }) => {
  // Sanitize annotation data to prevent XSS
  const sanitizedData = sanitizeNodeData(data);
  const safeText = createSafeDisplayName(sanitizedData.text, '');

  const handleTextChange = (e) => {
    const sanitizedValue = createSafeDisplayName(e.target.value, '');
    if (data.onChange && typeof data.onChange === 'function') {
      data.onChange(sanitizedValue);
    }
  };

  return (
    <>
      <Handle 
        type="target" 
        position="top"
        id="target-top"
        isConnectable={true}
      />
      
      <div className={`annotation-node ${selected ? 'selected' : ''}`}>
        <div className="annotation-header">
          📝 Anotação
        </div>
        <textarea
          className="annotation-content"
          placeholder="Digite sua anotação aqui..."
          defaultValue={safeText}
          onChange={handleTextChange}
          maxLength={500}
        />
      </div>
      
      <Handle 
        type="source" 
        position="bottom"
        id="source-bottom"
        isConnectable={true}
      />
    </>
  );
};

// Nó ORGANIZADOR - quadrado para agrupar visualmente
const GroupBoxNode = ({ data, selected }) => {
  // Sanitize group box data
  const sanitizedData = sanitizeNodeData(data);
  const safeLabel = createSafeDisplayName(sanitizedData.label, 'Grupo');
  
  // Validate and sanitize style properties
  const safeWidth = typeof sanitizedData.width === 'number' && sanitizedData.width > 0 ? 
    Math.min(sanitizedData.width, 1000) : 300;
  const safeHeight = typeof sanitizedData.height === 'number' && sanitizedData.height > 0 ? 
    Math.min(sanitizedData.height, 800) : 200;
  
  // Sanitize CSS values to prevent injection
  const safeBorderStyle = ['solid', 'dashed', 'dotted'].includes(sanitizedData.style) ? 
    sanitizedData.style : 'dashed';
  
  return (
    <div 
      className={`group-box-node ${selected ? 'selected' : ''}`}
      style={{
        width: safeWidth,
        height: safeHeight,
        backgroundColor: 'rgba(66, 153, 225, 0.1)',
        border: `2px ${safeBorderStyle} #4299e1`
      }}
    >
      <div className="group-box-header">
        📦 {safeLabel}
      </div>
    </div>
  );
};

// Exportar nodeTypes mapeados - NOVA ARQUITETURA
const customNodeTypes = {
  // Tipos antigos (retrocompatibilidade)
  qdrantField: QdrantFieldNode,
  annotation: AnnotationNode,
  groupBox: GroupBoxNode,
  
  // NOVOS TIPOS - Arquitetura corrigida
  chunkNode: ChunkNode,      // Nós de chunks reais do Qdrant
  analysisNode: AnalysisNode  // Nós de análise/agregação
};

export default customNodeTypes;