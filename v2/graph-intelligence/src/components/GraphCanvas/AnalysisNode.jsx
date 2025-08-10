import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import './AnalysisNode.css';

/**
 * AnalysisNode - Representa uma análise/agregação de dados
 * 
 * ARQUITETURA: Este é um nó de ANÁLISE, não dados brutos
 */
const AnalysisNode = memo(({ data, selected }) => {
  const getAnalysisIcon = (type) => {
    switch(type) {
      case 'keyword-cloud': return '☁️';
      case 'category-summary': return '📊';
      case 'convergence': return '🎯';
      case 'statistics': return '📈';
      default: return '🔍';
    }
  };

  const renderAnalysisContent = () => {
    switch(data.analysisType) {
      case 'keyword-cloud':
        return (
          <div className="analysis-keywords">
            {Object.entries(data.aggregatedData || {})
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([keyword, count]) => (
                <div key={keyword} className="keyword-item">
                  <span className="keyword-text">{keyword}</span>
                  <span className="keyword-count">{count}</span>
                </div>
              ))}
          </div>
        );
      
      case 'category-summary':
        return (
          <div className="analysis-categories">
            {Object.entries(data.aggregatedData || {})
              .map(([category, count]) => (
                <div key={category} className="category-item">
                  <span className="category-name">{category}</span>
                  <div className="category-bar">
                    <div 
                      className="category-fill" 
                      style={{width: `${Math.min(count * 10, 100)}%`}}
                    />
                  </div>
                </div>
              ))}
          </div>
        );
      
      case 'convergence':
        return (
          <div className="analysis-convergence">
            <div className="convergence-score">
              <span className="score-label">Score:</span>
              <span className="score-value">
                {data.convergenceScore || 0}%
              </span>
            </div>
            <div className="convergence-details">
              {data.convergenceChains?.map((chain, idx) => (
                <div key={idx} className="chain-item">
                  Chain {idx + 1}: {chain.length} nodes
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return (
          <div className="analysis-default">
            <p>{data.description || 'Análise em processamento...'}</p>
            {data.sourceChunks && (
              <div className="source-info">
                Baseado em {data.sourceChunks.length} chunks
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className={`analysis-node ${selected ? 'selected' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="analysis-handle"
      />
      
      <div className="analysis-header">
        <span className="analysis-icon">
          {getAnalysisIcon(data.analysisType)}
        </span>
        <span className="analysis-title">
          {data.label || 'Análise'}
        </span>
      </div>
      
      <div className="analysis-content">
        {renderAnalysisContent()}
      </div>
      
      <div className="analysis-footer">
        <span className="analysis-type">ANÁLISE</span>
        {data.sourceChunks && (
          <span className="source-count">
            {data.sourceChunks.length} fontes
          </span>
        )}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="analysis-handle"
      />
    </div>
  );
});

AnalysisNode.displayName = 'AnalysisNode';

export default AnalysisNode;