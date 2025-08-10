import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, { 
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MiniMap,
  Controls,
  Background,
  Handle,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import './GraphCanvas.css';
import relationAnalyzer from '../../services/RelationAnalyzer';
import qdrantService from '../../services/QdrantService';
import customNodeTypes from './customNodes.jsx';
import Tooltip from '../Tooltip';

// Using external nodeTypes module to prevent React Flow warnings
// This ensures stable object references across component renders

/**
 * GraphCanvas - Canvas principal para o grafo
 * 
 * Requisitos:
 * - Drag & drop livre
 * - Conexões manuais
 * - Menu contextual
 * - Sugestões automáticas
 * - Tooltip on hover com +info button
 * - Delete key functionality
 */
const GraphCanvas = ({ 
  onNodeClick, 
  onEdgeClick, 
  onCanvasClick, 
  onNodeMoreInfo,
  getPatternHandlers 
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [qdrantData, setQdrantData] = useState([]);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null });
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const tooltipTimeoutRef = useRef(null);
  const reactFlowWrapper = useRef(null);
  const { project, screenToFlowPosition, fitView } = useReactFlow();

  // Carregar e analisar dados do Qdrant
  useEffect(() => {
    const abortController = new AbortController();
    
    const loadData = async () => {
      try {
        await loadAndAnalyzeData(abortController.signal);
      } catch (error) {
        // Only log error if not aborted
        if (!abortController.signal.aborted) {
          console.error('Erro ao carregar dados:', error);
        }
      }
    };
    
    loadData();
    
    // Cleanup function to prevent memory leaks
    return () => {
      abortController.abort();
      // Clear tooltip timeout on unmount
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Delete key functionality - FIXED: Context isolation
  useEffect(() => {
    const handleKeyPress = (event) => {
      // CRITICAL FIX: Check if user is typing in an input field
      const activeElement = document.activeElement;
      const isEditingText = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true' ||
        activeElement.classList.contains('pattern-input') ||
        activeElement.classList.contains('annotation-content')
      );
      
      // If user is typing in any input field, DO NOT process delete
      if (isEditingText) {
        return; // Let the input field handle the key event normally
      }
      
      // Only process Delete/Backspace for canvas elements
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Prevent default browser behavior (like going back)
        event.preventDefault();
        
        // Get selected nodes and edges
        const selectedNodes = nodes.filter(node => node.selected);
        const selectedEdges = edges.filter(edge => edge.selected);
        
        // Only proceed if something is actually selected
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          const message = `Deletar ${selectedNodes.length} nó(s) e ${selectedEdges.length} conexão(ões)?`;
          
          if (window.confirm(message)) {
            // Delete selected nodes
            if (selectedNodes.length > 0) {
              const nodeIds = selectedNodes.map(n => n.id);
              setNodes(nds => nds.filter(n => !nodeIds.includes(n.id)));
              // Also delete edges connected to deleted nodes
              setEdges(eds => eds.filter(e => 
                !nodeIds.includes(e.source) && !nodeIds.includes(e.target)
              ));
            }
            
            // Delete selected edges
            if (selectedEdges.length > 0) {
              const edgeIds = selectedEdges.map(e => e.id);
              setEdges(eds => eds.filter(e => !edgeIds.includes(e.id)));
            }
            
            console.log(`✅ Deletados: ${selectedNodes.length} nós, ${selectedEdges.length} conexões`);
          }
        }
      }
      
      // Handle Escape key
      if (event.key === 'Escape') {
        // Clear selection
        setNodes(nds => nds.map(n => ({ ...n, selected: false })));
        setEdges(eds => eds.map(e => ({ ...e, selected: false })));
        // Close any open context menus or tooltips
        setContextMenu(null);
        setTooltip({ visible: false, x: 0, y: 0, data: null });
      }
    };

    // Attach to window but with proper context checking
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [nodes, edges, setNodes, setEdges]);

  // NOVA ARQUITETURA: Listener para criar nós de análise
  useEffect(() => {
    const handleCreateAnalysisNode = (event) => {
      const { fieldPath, analysisType, aggregatedData, sourceChunks } = event.detail;
      
      console.log('📊 Criando AnalysisNode:', fieldPath, analysisType);
      
      // Calcular posição para o novo nó
      const existingNodes = nodes || [];
      const xPos = 100 + (existingNodes.length % 5) * 200;
      const yPos = 100 + Math.floor(existingNodes.length / 5) * 200;
      
      // Criar novo nó de análise
      const newAnalysisNode = {
        id: `analysis-${fieldPath}-${Date.now()}`,
        type: 'analysisNode',  // Usar o novo tipo
        position: { x: xPos, y: yPos },
        data: {
          label: `Análise: ${fieldPath}`,
          fieldPath,
          analysisType,
          aggregatedData,
          sourceChunks,
          nodeType: 'analysis'
        }
      };
      
      // Adicionar ao canvas
      setNodes(nds => [...(nds || []), newAnalysisNode]);
      
      // Criar conexões automáticas com chunks relacionados
      if (sourceChunks && sourceChunks.length > 0) {
        const newEdges = sourceChunks
          .filter(chunkId => nodes.some(n => n.id === chunkId || n.id === `chunk-${chunkId}`))
          .map(chunkId => ({
            id: `e-${chunkId}-${newAnalysisNode.id}`,
            source: nodes.find(n => n.id === chunkId || n.id === `chunk-${chunkId}`)?.id || chunkId,
            target: newAnalysisNode.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#48bb78', strokeDasharray: '5 5' }
          }));
        
        if (newEdges.length > 0) {
          setEdges(eds => [...(eds || []), ...newEdges]);
        }
      }
      
      console.log('✅ AnalysisNode criado:', newAnalysisNode.id);
    };
    
    // Listener para Pattern Search aplicar chunks
    const handlePatternSearchApply = (event) => {
      const { nodes: chunkNodes } = event.detail;
      
      console.log('🎯 Adicionando ChunkNodes do Pattern Search:', chunkNodes.length);
      
      // Adicionar todos os ChunkNodes
      setNodes(nds => [...(nds || []), ...chunkNodes]);
      
      console.log('✅ ChunkNodes adicionados ao canvas');
    };
    
    window.addEventListener('createAnalysisNode', handleCreateAnalysisNode);
    window.addEventListener('patternSearchApply', handlePatternSearchApply);
    
    return () => {
      window.removeEventListener('createAnalysisNode', handleCreateAnalysisNode);
      window.removeEventListener('patternSearchApply', handlePatternSearchApply);
    };
  }, [nodes, setNodes, setEdges]);

  // Handler for info button click on nodes
  const handleNodeInfoClick = useCallback((event, nodeData) => {
    // Clear any existing timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    
    // Toggle tooltip visibility
    if (tooltip.visible && tooltip.data?.id === nodeData.id) {
      // Hide if clicking on same node
      setTooltip({ visible: false, x: 0, y: 0, data: null });
    } else {
      // Show tooltip for clicked node
      setTooltip({
        visible: true,
        x: event.clientX + 10,
        y: event.clientY - 10,
        data: nodeData
      });
    }
  }, [tooltip.visible, tooltip.data]);

  // Remove automatic hover handlers - tooltip only shows on button click now
  const handleNodeMouseEnter = useCallback((event, node) => {
    // No longer show tooltip on hover
    // User must click the [?] button
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    // No longer hide tooltip on mouse leave
    // Tooltip stays open until explicitly closed
  }, []);

  const handleNodeMouseMove = useCallback((event) => {
    // No longer update tooltip position on mouse move
    // Tooltip position is fixed when shown
  }, []);

  const handleTooltipMoreInfo = useCallback((nodeData) => {
    if (onNodeMoreInfo) {
      onNodeMoreInfo(nodeData);
    }
  }, [onNodeMoreInfo]);

  const handleTooltipClose = useCallback(() => {
    // Clear any pending timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setTooltip(prev => ({ ...prev, visible: false }));
    setIsTooltipHovered(false);
  }, []);

  // Handle tooltip hover state
  const handleTooltipMouseEnter = useCallback(() => {
    // Clear any pending hide timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setIsTooltipHovered(true);
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    setIsTooltipHovered(false);
    // Hide tooltip after a short delay
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltip(prev => ({ ...prev, visible: false }));
    }, 200);
  }, []);

  // Pattern search integration
  const handlePatternMatch = useCallback((matchedNodes) => {
    console.log('Pattern match:', matchedNodes);
  }, []);

  const handleHighlightNodes = useCallback((nodeIds) => {
    setHighlightedNodes(nodeIds);
    // Update nodes with highlight styling
    setNodes(nds => nds.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: nodeIds.length === 0 ? 1 : (nodeIds.includes(node.id) ? 1 : 0.3),
        border: nodeIds.includes(node.id) ? '3px solid #4299e1' : undefined,
        transform: nodeIds.includes(node.id) ? 'scale(1.1)' : undefined
      }
    })));
  }, [setNodes]);

  const handleClearHighlight = useCallback(() => {
    setHighlightedNodes([]);
    // Reset node styling
    setNodes(nds => nds.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: 1,
        border: undefined,
        transform: undefined
      }
    })));
  }, [setNodes]);

  // Pattern Search V2: Aplicar filtros ao Canvas
  const handleApplyToCanvas = useCallback((filterData) => {
    console.log('🎯 GraphCanvas: Aplicando filtros do Pattern Search', filterData);
    
    const { nodes: filteredNodes, pattern, groups, convergences } = filterData;
    
    // Se não há nós no canvas, adicionar todos os filtrados
    if (nodes.length === 0) {
      const newNodes = filteredNodes.map((node, index) => ({
        id: node.id,
        type: 'qdrantField',
        position: {
          x: 100 + (index % 5) * 200,
          y: 100 + Math.floor(index / 5) * 150
        },
        data: {
          ...node.data,
          onInfoClick: handleNodeInfoClick
        }
      }));
      
      setNodes(newNodes);
      
      // Se há convergências detectadas, criar edges
      if (convergences?.suggestedConnections?.length > 0) {
        const newEdges = convergences.suggestedConnections.map((conn, idx) => ({
          id: `conv-edge-${idx}`,
          source: filteredNodes.find(n => n.data?.fileName === conn.source)?.id || conn.source,
          target: filteredNodes.find(n => n.data?.fileName === conn.target)?.id || conn.target,
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: '#22c55e',
            strokeWidth: 3
          },
          data: conn
        }));
        
        setEdges(newEdges);
      }
    } else {
      // Destacar nós existentes que fazem match
      const matchingNodeIds = nodes
        .filter(node => 
          filteredNodes.some(fn => fn.id === node.id || fn.data?.fileName === node.data?.fileName)
        )
        .map(n => n.id);
      
      handleHighlightNodes(matchingNodeIds);
      
      // Adicionar nós que ainda não estão no canvas
      const existingIds = new Set(nodes.map(n => n.id));
      const nodesToAdd = filteredNodes.filter(n => !existingIds.has(n.id));
      
      if (nodesToAdd.length > 0) {
        const newNodes = nodesToAdd.map((node, index) => ({
          id: node.id,
          type: 'qdrantField',
          position: {
            x: 500 + (index % 3) * 150,
            y: 100 + Math.floor(index / 3) * 150
          },
          data: {
            ...node.data,
            onInfoClick: handleNodeInfoClick
          }
        }));
        
        setNodes(nds => [...nds, ...newNodes]);
      }
    }
    
    // Notificar usuário
    console.log(`✅ ${filterData.nodes.length} nós aplicados ao canvas com pattern: ${pattern}`);
  }, [nodes, setNodes, setEdges, handleHighlightNodes, handleNodeInfoClick]);

  // Expose pattern handlers to parent component
  useEffect(() => {
    if (getPatternHandlers) {
      getPatternHandlers({
        handlePatternMatch,
        handleHighlightNodes,
        handleClearHighlight,
        handleApplyToCanvas,
        nodes
      });
    }
  }, [getPatternHandlers, handlePatternMatch, handleHighlightNodes, handleClearHighlight, handleApplyToCanvas, nodes]);

  // Enhanced convergence visualization colors
  const getConvergenceColor = useCallback((reason, strength = 0.5) => {
    const colors = {
      keywords: '#4299e1',      // Blue for keyword connections
      categories: '#48bb78',    // Green for category connections  
      convergence: '#ed8936',   // Orange for convergence chains
      semantic: '#9f7aea',      // Purple for semantic similarity
      temporal: '#38b2ac',      // Teal for temporal connections
      default: '#718096'        // Gray for default connections
    };

    const baseColor = colors[reason] || colors.default;
    
    // Adjust opacity based on strength
    const alpha = Math.max(0.6, strength);
    
    // Convert hex to rgba
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  // Enhanced edge styling with convergence visualization
  const enhanceEdgeStyle = useCallback((edge, convergenceData) => {
    const baseStyle = {
      strokeWidth: 2,
      stroke: '#718096',
      strokeDasharray: undefined
    };

    if (convergenceData) {
      const { strength = 0.5, reason = 'default', confidence = 0.5 } = convergenceData;
      
      return {
        ...baseStyle,
        strokeWidth: Math.max(2, strength * 8),
        stroke: getConvergenceColor(reason, strength),
        opacity: Math.max(0.6, strength),
        strokeDasharray: confidence < 0.3 ? '5,5' : undefined, // Dashed for low confidence
        filter: strength > 0.8 ? 'drop-shadow(0px 0px 4px rgba(66, 153, 225, 0.6))' : undefined
      };
    }

    return baseStyle;
  }, [getConvergenceColor]);

  const loadAndAnalyzeData = async (signal = null) => {
    try {
      // Check if operation was aborted
      if (signal?.aborted) {
        return;
      }
      
      // Verificar se está conectado
      if (!qdrantService.connected) {
        console.log('Aguardando conexão com Qdrant...');
        return;
      }

      // Check abort before network call
      if (signal?.aborted) {
        return;
      }

      // Buscar dados do Qdrant
      const data = await qdrantService.getData(100);
      
      // Check abort before state updates
      if (signal?.aborted) {
        return;
      }
      
      // Validar que data é um array antes de processar
      if (!Array.isArray(data)) {
        console.error('Dados do Qdrant não são um array:', data);
        return;
      }
      
      setQdrantData(data);

      // Analisar relações apenas se tivermos dados válidos
      if (data.length > 0) {
        const analysisResult = relationAnalyzer.analyzeRelations(data);
        
        // Check abort before final state update
        if (signal?.aborted) {
          return;
        }
        
        setAnalysis(analysisResult);

        // Aplicar auto-layout se não houver nós
        if (nodes.length === 0) {
          applyAutoLayout(data, analysisResult);
        }

        console.log('Análise completa:', analysisResult);
      }
    } catch (error) {
      // Only handle error if not aborted
      if (!signal?.aborted) {
        console.error('Erro ao analisar dados:', error);
      }
    }
  };

  // Aplicar layout automático baseado na análise
  const applyAutoLayout = (data, analysisResult) => {
    // CORREÇÃO: Reorganizar nós existentes ao invés de substituí-los
    if (nodes.length === 0) {
      // Se não há nós no canvas, criar novos a partir dos dados
      const layout = relationAnalyzer.generateAutoLayout(data, analysisResult);
      
      // Criar nós do layout
      const newNodes = layout.nodes.map(node => ({
        id: node.id,
        type: 'qdrantField',
        position: node.position,
        data: {
          label: node.data.fileName || node.id,
          ...node.data,
          onInfoClick: handleNodeInfoClick
        }
      }));

      // Criar edges do layout com enhanced convergence visualization
      const newEdges = layout.edges.map(edge => ({
        ...edge,
        style: {
          ...edge.style,
          strokeWidth: edge.data?.strength ? Math.max(2, edge.data.strength * 8) : 2,
          stroke: getConvergenceColor(edge.data?.reason, edge.data?.strength),
          opacity: edge.data?.strength ? Math.max(0.6, edge.data.strength) : 0.8
        },
        animated: edge.data?.strength > 0.6,
        markerEnd: {
          type: 'arrowclosed',
          color: getConvergenceColor(edge.data?.reason, edge.data?.strength)
        }
      }));

      setNodes(newNodes);
      setEdges(newEdges);
    } else {
      // REORGANIZAR nós existentes mantendo seus dados
      console.log('🎯 Reorganizando', nodes.length, 'nós existentes...');
      
      // Gerar novo layout baseado nos nós atuais
      const currentNodeData = nodes.map(node => ({
        id: node.id,
        fileName: node.data?.fileName || node.data?.label || node.id,
        payload: node.data?.payload || node.data?.field || {},
        ...node.data
      }));
      
      // Usar o analyzer para gerar posições otimizadas
      const layout = relationAnalyzer.generateAutoLayout(currentNodeData, analysisResult);
      
      // Atualizar apenas as posições dos nós existentes
      const reorganizedNodes = nodes.map(node => {
        const layoutNode = layout.nodes.find(n => n.id === node.id);
        if (layoutNode) {
          return {
            ...node,
            position: layoutNode.position
          };
        }
        return node;
      });
      
      // Preservar edges existentes ou criar novas baseadas na análise
      let updatedEdges = edges;
      if (analysisResult && analysisResult.suggestions) {
        // Adicionar edges sugeridas que ainda não existem
        const existingEdgePairs = edges.map(e => `${e.source}-${e.target}`);
        const suggestedEdges = layout.edges.filter(edge => {
          const pair = `${edge.source}-${edge.target}`;
          return !existingEdgePairs.includes(pair);
        });
        
        if (suggestedEdges.length > 0) {
          const newEdges = suggestedEdges.map(edge => ({
            ...edge,
            style: {
              ...edge.style,
              strokeWidth: edge.data?.strength ? Math.max(2, edge.data.strength * 8) : 2,
              stroke: getConvergenceColor(edge.data?.reason, edge.data?.strength),
              opacity: edge.data?.strength ? Math.max(0.6, edge.data.strength) : 0.8
            },
            animated: edge.data?.strength > 0.6,
            markerEnd: {
              type: 'arrowclosed',
              color: getConvergenceColor(edge.data?.reason, edge.data?.strength)
            }
          }));
          updatedEdges = [...edges, ...newEdges];
        }
      }
      
      setNodes(reorganizedNodes);
      setEdges(updatedEdges);
      
      console.log('✅ Reorganização completa:', reorganizedNodes.length, 'nós');
    }

    // Ajustar visualização
    setTimeout(() => fitView({ padding: 0.1 }), 100);
  };

  // Handle drop de campos do Qdrant
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const fieldData = event.dataTransfer.getData('field');

      if (fieldData) {
        const field = JSON.parse(fieldData);
        const position = screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const newNode = {
          id: `${field.path}-${Date.now()}`,
          type: 'qdrantField',
          position,
          data: { 
            label: field.path,
            field: field,
            onInfoClick: handleNodeInfoClick,
            type: field.type
          },
        };

        setNodes((nds) => nds.concat(newNode));
        console.log('Campo adicionado ao grafo:', field.path);
      }
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Conectar nós - com validação melhorada e handles válidos
  const onConnect = useCallback(
    (params) => {
      console.log('🔗 Tentando conectar:', params);
      
      // Validar conexão
      if (!params.source || !params.target) {
        console.warn('⚠️ Conexão inválida - source ou target ausente');
        return;
      }
      
      // Evitar auto-conexão
      if (params.source === params.target) {
        console.warn('⚠️ Auto-conexão não permitida');
        return;
      }
      
      // Validar e garantir handles válidos
      const validSourceHandles = ['source-bottom', 'source-left', 'source-right'];
      const validTargetHandles = ['target-top', 'target-left', 'target-right'];
      
      const sourceHandle = validSourceHandles.includes(params.sourceHandle) 
        ? params.sourceHandle 
        : 'source-bottom'; // fallback para handle válido
        
      const targetHandle = validTargetHandles.includes(params.targetHandle) 
        ? params.targetHandle 
        : 'target-top'; // fallback para handle válido
      
      // Criar edge com ID único, handles válidos e enhanced styling
      const enhancedStyle = enhanceEdgeStyle(params, null);
      const newEdge = {
        ...params,
        sourceHandle,
        targetHandle,
        id: `edge-${params.source}-${sourceHandle}-${params.target}-${targetHandle}-${Date.now()}`,
        type: 'smoothstep',
        animated: true,
        style: enhancedStyle,
        markerEnd: {
          type: 'arrowclosed',
          color: enhancedStyle.stroke || '#4299e1'
        }
      };
      
      console.log('✅ Conexão criada:', newEdge);
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Menu contextual
  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      
      setContextMenu({
        id: node.id,
        type: 'node',
        x: event.clientX,
        y: event.clientY,
        data: node
      });
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    (event, edge) => {
      event.preventDefault();
      
      setContextMenu({
        id: edge.id,
        type: 'edge',
        x: event.clientX,
        y: event.clientY,
        data: edge
      });
    },
    []
  );

  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      setContextMenu({
        type: 'canvas',
        x: event.clientX,
        y: event.clientY,
        position
      });
    },
    [screenToFlowPosition]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handlers do menu contextual
  const handleMenuAction = useCallback(
    (action) => {
      console.log('Ação do menu:', action, contextMenu);
      
      switch (action) {
        case 'delete':
          if (contextMenu.type === 'node') {
            setNodes((nds) => nds.filter((n) => n.id !== contextMenu.id));
            setEdges((eds) => eds.filter((e) => 
              e.source !== contextMenu.id && e.target !== contextMenu.id
            ));
          } else if (contextMenu.type === 'edge') {
            setEdges((eds) => eds.filter((e) => e.id !== contextMenu.id));
          }
          break;
          
        case 'duplicate':
          if (contextMenu.type === 'node') {
            const nodeToDuplicate = nodes.find(n => n.id === contextMenu.id);
            if (nodeToDuplicate) {
              const newNode = {
                ...nodeToDuplicate,
                id: `${nodeToDuplicate.id}-copy-${Date.now()}`,
                position: {
                  x: nodeToDuplicate.position.x + 50,
                  y: nodeToDuplicate.position.y + 50
                }
              };
              setNodes((nds) => nds.concat(newNode));
            }
          }
          break;
          
        case 'analyze':
          if (contextMenu.type === 'node') {
            const node = nodes.find(n => n.id === contextMenu.id);
            if (node && onNodeClick) {
              onNodeClick(node);
            }
          }
          break;
          
        case 'clear':
          if (window.confirm('Limpar todo o canvas?')) {
            setNodes([]);
            setEdges([]);
          }
          break;
      }
      
      closeContextMenu();
    },
    [contextMenu, nodes, setNodes, setEdges, onNodeClick, closeContextMenu]
  );

  return (
    <div className="graph-canvas-container">
      <div className="graph-canvas-wrapper" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onPaneClick={closeContextMenu}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onNodeMouseMove={handleNodeMouseMove}
          nodeTypes={customNodeTypes}
          connectionMode="loose"
          connectOnClick={false}
          elementsSelectable={true}
          nodesDraggable={true}
          nodesConnectable={true}
          snapToGrid={false}
          fitView
        >
          <Background variant="dots" gap={12} size={1} />
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              switch (node.type) {
                case 'qdrantField':
                  return '#4299e1';
                default:
                  return '#718096';
              }
            }}
          />
          
          {/* Painel de Sugestões Inteligentes */}
          {analysis && showSuggestions && (
            <Panel position="top-right" className="suggestions-panel">
              <div className="panel-header">
                <h3>🤖 Análise Inteligente</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowSuggestions(false)}
                >
                  ✕
                </button>
              </div>
              
              {/* Top Keywords */}
              {analysis.keywords && analysis.keywords.length > 0 && (
                <div className="panel-section">
                  <h4>🔤 Top Keywords</h4>
                  <div className="keyword-cloud">
                    {analysis.keywords.slice(0, 5).map((kw, idx) => (
                      <span key={idx} className="keyword-badge">
                        {kw.keyword} ({kw.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Categorias */}
              {Object.keys(analysis.categories || {}).length > 0 && (
                <div className="panel-section">
                  <h4>📊 Categorias Detectadas</h4>
                  {Object.entries(analysis.categories).slice(0, 5).map(([cat, data]) => (
                    <div key={cat} className="category-item">
                      <span>{data.icon} {cat}</span>
                      <span className="badge">{data.count}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Convergências */}
              {analysis.convergences && analysis.convergences.length > 0 && (
                <div className="panel-section">
                  <h4>🔗 Cadeias de Convergência</h4>
                  {analysis.convergences.slice(0, 3).map((conv, idx) => (
                    <div key={idx} className="convergence-item">
                      <strong>{conv.theme}</strong>
                      <small>{conv.count} participantes | Força: {(conv.strength * 100).toFixed(0)}%</small>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Sugestões de Conexão */}
              {analysis.suggestions && analysis.suggestions.length > 0 && (
                <div className="panel-section">
                  <h4>💡 Sugestões de Conexão</h4>
                  {analysis.suggestions.slice(0, 5).map((sug, idx) => (
                    <div 
                      key={idx} 
                      className="suggestion-item"
                      onClick={() => {
                        // Aplicar sugestão com enhanced convergence visualization
                        const enhancedStyle = enhanceEdgeStyle(null, sug);
                        const newEdge = {
                          id: `suggestion-${Date.now()}`,
                          source: sug.source,
                          sourceHandle: 'source-bottom', // Handle válido
                          target: sug.target,
                          targetHandle: 'target-top',    // Handle válido
                          type: 'smoothstep',
                          animated: sug.strength > 0.6,
                          style: enhancedStyle,
                          markerEnd: {
                            type: 'arrowclosed',
                            color: enhancedStyle.stroke
                          },
                          data: sug
                        };
                        setEdges((eds) => [...eds, newEdge]);
                      }}
                    >
                      <div className="suggestion-files">
                        <small>{sug.sourceFile} → {sug.targetFile}</small>
                      </div>
                      <div className="suggestion-reason">
                        {sug.reason === 'keywords' && `${sug.keywords.length} keywords em comum`}
                        {sug.reason === 'categories' && `Mesma categoria: ${sug.categories.join(', ')}`}
                        {sug.reason === 'convergence' && `Convergência: ${sug.theme}`}
                      </div>
                      <div className="suggestion-confidence">
                        Confiança: {sug.confidence.toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Botões de Ação */}
              <div className="panel-actions">
                <button 
                  className="action-btn"
                  onClick={() => {
                    if (nodes.length > 0) {
                      // Reorganizar nós existentes
                      applyAutoLayout(qdrantData, analysis);
                    } else if (qdrantData.length > 0 && analysis) {
                      // Criar novos nós se canvas vazio
                      if (window.confirm('Canvas vazio. Deseja criar nós a partir dos dados do Qdrant?')) {
                        applyAutoLayout(qdrantData, analysis);
                      }
                    } else {
                      console.warn('❌ Sem dados para organizar. Arraste campos do painel esquerdo primeiro.');
                    }
                  }}
                  title={nodes.length > 0 ? 'Reorganizar nós existentes' : 'Criar layout dos dados Qdrant'}
                >
                  🎯 Auto-Organizar
                </button>
                <button 
                  className="action-btn"
                  onClick={() => loadAndAnalyzeData()}
                  title="Re-analisar dados do Qdrant"
                >
                  🔄 Re-analisar
                </button>
              </div>
            </Panel>
          )}
        </ReactFlow>

        {/* Tooltip Component */}
        <Tooltip
          visible={tooltip.visible}
          x={tooltip.x}
          y={tooltip.y}
          data={tooltip.data}
          onMoreInfo={handleTooltipMoreInfo}
          onClose={handleTooltipClose}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />

        {/* Menu Contextual */}
        {contextMenu && (
          <div 
            className="context-menu"
            style={{ 
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x
            }}
          >
            {contextMenu.type === 'node' && (
              <>
                <button onClick={() => handleMenuAction('analyze')}>
                  📊 Analisar Relações
                </button>
                <button onClick={() => handleMenuAction('duplicate')}>
                  📋 Duplicar
                </button>
                <button onClick={() => handleMenuAction('delete')}>
                  🗑️ Deletar
                </button>
              </>
            )}
            
            {contextMenu.type === 'edge' && (
              <>
                <button onClick={() => handleMenuAction('analyze')}>
                  🔍 Ver Detalhes
                </button>
                <button onClick={() => handleMenuAction('delete')}>
                  🗑️ Remover Conexão
                </button>
              </>
            )}
            
            {contextMenu.type === 'canvas' && (
              <>
                <button onClick={() => {
                  // Criar nó de anotação
                  const newNode = {
                    id: `annotation-${Date.now()}`,
                    type: 'annotation',
                    position: contextMenu.position,
                    data: { 
                      text: '',
                      onChange: (text) => console.log('Texto atualizado:', text)
                    },
                  };
                  setNodes((nds) => nds.concat(newNode));
                  closeContextMenu();
                }}>
                  📝 Adicionar Anotação
                </button>
                <button onClick={() => {
                  // Criar quadrado organizador
                  const newNode = {
                    id: `group-${Date.now()}`,
                    type: 'groupBox',
                    position: contextMenu.position,
                    data: { 
                      label: 'Novo Grupo',
                      width: 400,
                      height: 300,
                      color: 'rgba(66, 153, 225, 0.05)',
                      borderColor: '#4299e1',
                      style: 'dashed'
                    },
                  };
                  setNodes((nds) => nds.concat(newNode));
                  closeContextMenu();
                }}>
                  📦 Adicionar Organizador
                </button>
                <button onClick={() => handleMenuAction('clear')}>
                  🧹 Limpar Tudo
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Wrapper com Provider
const GraphCanvasWithProvider = ({ 
  onNodeClick, 
  onEdgeClick, 
  onCanvasClick, 
  onNodeMoreInfo,
  getPatternHandlers,
  ...props 
}) => {
  return (
    <ReactFlowProvider>
      <GraphCanvas 
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onCanvasClick={onCanvasClick}
        onNodeMoreInfo={onNodeMoreInfo}
        getPatternHandlers={getPatternHandlers}
        {...props}
      />
    </ReactFlowProvider>
  );
};

export default GraphCanvasWithProvider;