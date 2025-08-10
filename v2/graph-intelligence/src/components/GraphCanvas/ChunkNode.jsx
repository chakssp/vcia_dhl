import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import './ChunkNode.css';

/**
 * ChunkNode - Representa um chunk real do Qdrant
 * 
 * ARQUITETURA: Este é um dado REAL (entidade), não uma propriedade
 */
const ChunkNode = memo(({ data, selected }) => {
  const truncateContent = (text, maxLength = 100) => {
    if (!text) return 'Sem conteúdo';
    return text.length > maxLength ? 
      text.substring(0, maxLength) + '...' : 
      text;
  };

  return (
    <div className={`chunk-node ${selected ? 'selected' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="chunk-handle"
      />
      
      <div className="chunk-header">
        <span className="chunk-icon">📄</span>
        <span className="chunk-title">
          {data.fileName || 'Sem nome'} 
          {data.chunkIndex !== undefined && ` #${data.chunkIndex}`}
        </span>
      </div>
      
      <div className="chunk-content">
        {truncateContent(data.content || data.label)}
      </div>
      
      {data.keywords && data.keywords.length > 0 && (
        <div className="chunk-keywords">
          {data.keywords.slice(0, 3).map((kw, idx) => (
            <span key={idx} className="keyword-chip">
              {kw}
            </span>
          ))}
          {data.keywords.length > 3 && (
            <span className="keyword-more">+{data.keywords.length - 3}</span>
          )}
        </div>
      )}
      
      {data.categories && data.categories.length > 0 && (
        <div className="chunk-categories">
          {data.categories.map((cat, idx) => (
            <span key={idx} className="category-badge">
              {cat}
            </span>
          ))}
        </div>
      )}
      
      <div className="chunk-footer">
        <span className="chunk-type">CHUNK</span>
        {data.score && (
          <span className="chunk-score">
            Score: {(data.score * 100).toFixed(0)}%
          </span>
        )}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="chunk-handle"
      />
    </div>
  );
});

ChunkNode.displayName = 'ChunkNode';

export default ChunkNode;