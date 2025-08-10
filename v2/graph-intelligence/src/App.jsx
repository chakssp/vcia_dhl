import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import FieldSelector from './components/FieldSelector';
import GraphCanvas from './components/GraphCanvas';
import PropertyPanel from './components/PropertyPanel';
// StatsPanel removido - agora integrado no PropertyPanel
import qdrantService from './services/QdrantService';
import './utils/systemValidation.js'; // Importa validateP0Fixes para o window

/**
 * App Principal - Graph Intelligence Editor
 * 
 * POLÍTICA ZERO FALLBACK:
 * - NUNCA mascarar erros
 * - SEMPRE mostrar problemas reais
 * - PROPAGAR erros ao usuário
 */
function App() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Sprint 1 Integration State
  const [fullNodeData, setFullNodeData] = useState(null);
  const [patternHandlers, setPatternHandlers] = useState(null);
  const [graphAnalysis, setGraphAnalysis] = useState(null);
  const [graphStats, setGraphStats] = useState({
    nodeCount: 0,
    edgeCount: 0,
    selectedFields: 0,
    convergences: 0,
    topKeywords: [],
    categories: {}
  });

  // NÃO conectar automaticamente - aguardar clique do usuário
  useEffect(() => {
    console.log('Graph Intelligence Editor carregado. Clique em "Conectar ao Qdrant" para iniciar.');
  }, []);

  const testQdrantConnection = async () => {
    setConnectionStatus('connecting');
    setErrorMessage(null);
    
    try {
      const result = await qdrantService.testConnection();
      
      if (result.success) {
        setConnectionStatus('connected');
        console.log('✅ Conectado ao Qdrant:', result.message);
        // GraphCanvas irá detectar a conexão e carregar dados automaticamente
      } else {
        // NÃO esconder o erro!
        setConnectionStatus('error');
        setErrorMessage(result.message);
        console.error('❌ Erro de conexão:', result.message);
      }
    } catch (error) {
      // SEMPRE mostrar erro real
      setConnectionStatus('error');
      setErrorMessage(error.message);
      console.error('❌ Erro crítico:', error);
    }
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };

  const handleEdgeClick = (edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };

  const handleCanvasClick = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  // Sprint 1 Integration Handlers
  const handleNodeMoreInfo = useCallback((nodeData) => {
    console.log('Loading full node data:', nodeData);
    setFullNodeData(nodeData);
    setSelectedNode(null); // Clear regular selection when showing full data
  }, []);

  const handleClearFullData = useCallback(() => {
    setFullNodeData(null);
  }, []);

  const getPatternHandlers = useCallback((handlers) => {
    // Adicionar handlers do Pattern Search V2
    const enhancedHandlers = {
      ...handlers,
      handleApplyToCanvas: (filterData) => {
        console.log('🎯 Pattern Search V2 - Aplicando ao Canvas:', filterData);
        // Este handler será usado pelo GraphCanvas para adicionar nós filtrados
        if (handlers.handleApplyToCanvas) {
          handlers.handleApplyToCanvas(filterData);
        }
      }
    };
    setPatternHandlers(enhancedHandlers);
    
    // Atualizar estatísticas do grafo quando receber handlers
    if (handlers?.nodes) {
      const keywords = {};
      const categories = {};
      
      handlers.nodes.forEach(node => {
        // Contar keywords
        if (node.data?.keywords) {
          node.data.keywords.forEach(kw => {
            keywords[kw] = (keywords[kw] || 0) + 1;
          });
        }
        // Contar categorias
        if (node.data?.categories) {
          node.data.categories.forEach(cat => {
            categories[cat] = (categories[cat] || 0) + 1;
          });
        }
      });
      
      setGraphStats({
        nodeCount: handlers.nodes.length,
        edgeCount: handlers.edges?.length || 0,
        selectedFields: handlers.selectedFields || 0,
        convergences: handlers.convergences || 0,
        topKeywords: Object.entries(keywords)
          .map(([keyword, count]) => ({keyword, count}))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        categories
      });
    }
  }, []);

  const handleInsertStatsAsNode = useCallback((statsData) => {
    console.log('Inserting stats as node:', statsData);
    // This would be implemented to add a stats node to the canvas
    // For now, just log the action
    alert(`Stats inseridos no canvas: ${statsData.summary}`);
  }, []);

  const handleStatsRefresh = useCallback(() => {
    console.log('Refreshing stats...');
    // Removido setRefreshKey que causava re-mount desnecessário do GraphCanvas
    // O StatsPanel pode atualizar seus próprios dados sem afetar outros componentes
  }, []);

  return (
    <div className="app">
      {/* Header com status de conexão */}
      <header className="app-header">
        <div className="app-title">
          <h1>📊 Graph Intelligence Editor</h1>
          <span className="app-subtitle">Ferramenta de Inteligência Visual com Qdrant</span>
        </div>
        
        <div className="header-controls">
          <div className={`connection-status ${connectionStatus}`}>
            {connectionStatus === 'disconnected' && '⚪ Desconectado'}
            {connectionStatus === 'connecting' && '🔄 Conectando...'}
            {connectionStatus === 'connected' && '✅ Qdrant Conectado'}
            {connectionStatus === 'error' && '❌ Erro de Conexão'}
          </div>
          
          {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
            <button 
              className="connect-btn"
              onClick={testQdrantConnection}
            >
              {connectionStatus === 'error' ? '🔄 Tentar Novamente' : '🔌 Conectar ao Qdrant'}
            </button>
          )}
          
          <button className="mode-btn">
            🛠️ Modo Trabalho
          </button>
          
          {/* StatsPanel agora integrado no PropertyPanel */}
          
          <button className="save-btn">
            💾 Salvar
          </button>
        </div>
      </header>

      {/* Mensagem de erro persistente */}
      {errorMessage && (
        <div className="error-banner">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}>✕</button>
        </div>
      )}

      {/* Layout principal com 3 painéis */}
      <main className="app-main">
        <FieldSelector 
          onFieldDrag={(field) => console.log('Campo arrastado:', field)}
          patternHandlers={patternHandlers}
        />
        
        <GraphCanvas 
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onCanvasClick={handleCanvasClick}
          onNodeMoreInfo={handleNodeMoreInfo}
          getPatternHandlers={getPatternHandlers}
        />
        
        <PropertyPanel 
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          fullNodeData={fullNodeData}
          onClearFullData={handleClearFullData}
          graphStats={graphStats}
        />
      </main>

      {/* StatsPanel removido - agora integrado no PropertyPanel */}
    </div>
  );
}

export default App
