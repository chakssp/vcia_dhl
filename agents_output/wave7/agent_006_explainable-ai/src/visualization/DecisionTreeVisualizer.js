/**
 * DecisionTreeVisualizer.js
 * 
 * Creates interactive decision tree visualizations for explainable ML.
 * Shows decision paths, node splits, and confidence evolution.
 */

export class DecisionTreeVisualizer {
  constructor(options = {}) {
    this.config = {
      maxDepth: options.maxDepth || 5,
      minNodeSize: options.minNodeSize || 20,
      nodeColors: options.nodeColors || {
        root: '#4CAF50',
        decision: '#2196F3',
        leaf: '#FF9800',
        highlighted: '#F44336'
      },
      layout: options.layout || 'vertical', // vertical, horizontal, radial
      interactive: options.interactive !== false,
      animations: options.animations !== false,
      showConfidence: options.showConfidence !== false,
      showFeatures: options.showFeatures !== false
    };
    
    // Tree layout calculator
    this.layoutCalculator = new TreeLayoutCalculator(this.config.layout);
    
    // Node renderer
    this.nodeRenderer = new NodeRenderer(this.config);
    
    // Path highlighter
    this.pathHighlighter = new PathHighlighter();
  }
  
  /**
   * Visualize decision path as a tree
   */
  async visualize(decisionPath, result) {
    // Build tree structure from decision path
    const tree = this.buildTreeStructure(decisionPath);
    
    // Calculate layout positions
    const layout = this.layoutCalculator.calculate(tree);
    
    // Generate visualization data
    const visualization = {
      nodes: this.generateNodes(tree, layout, result),
      edges: this.generateEdges(tree, layout),
      metadata: {
        totalNodes: tree.nodeCount,
        depth: tree.depth,
        confidence: result.overall,
        layout: this.config.layout
      },
      interactions: this.generateInteractions(tree),
      animations: this.generateAnimations(tree, layout)
    };
    
    // Add alternative paths if available
    if (result.alternativePaths) {
      visualization.alternativePaths = this.visualizeAlternativePaths(
        result.alternativePaths,
        layout
      );
    }
    
    return visualization;
  }
  
  /**
   * Build tree structure from decision path
   */
  buildTreeStructure(decisionPath) {
    const tree = new DecisionTree();
    
    // Add root node
    const root = tree.addNode({
      id: 'root',
      type: 'root',
      label: 'Start',
      data: decisionPath.nodes[0]?.data || {}
    });
    
    // Build tree from path nodes
    let currentNode = root;
    
    for (let i = 1; i < decisionPath.nodes.length; i++) {
      const pathNode = decisionPath.nodes[i];
      
      // Create tree node
      const treeNode = tree.addNode({
        id: pathNode.id,
        type: this.getNodeType(pathNode),
        label: this.getNodeLabel(pathNode),
        data: pathNode.data,
        parent: currentNode
      });
      
      // Add edge
      tree.addEdge(currentNode, treeNode, {
        label: pathNode.type,
        weight: this.calculateEdgeWeight(pathNode)
      });
      
      currentNode = treeNode;
    }
    
    // Add hypothetical branches for unexplored paths
    this.addHypotheticalBranches(tree, currentNode);
    
    return tree;
  }
  
  /**
   * Generate node visualization data
   */
  generateNodes(tree, layout, result) {
    const nodes = [];
    
    tree.traverse((node, depth) => {
      const position = layout.getPosition(node.id);
      const nodeData = {
        id: node.id,
        type: node.type,
        label: node.label,
        x: position.x,
        y: position.y,
        depth,
        data: node.data,
        visual: this.nodeRenderer.render(node, result),
        tooltip: this.generateTooltip(node),
        interactive: this.config.interactive
      };
      
      // Add confidence information
      if (this.config.showConfidence && node.data.result) {
        nodeData.confidence = node.data.result.overall;
        nodeData.confidenceLabel = `${(node.data.result.overall * 100).toFixed(1)}%`;
      }
      
      // Add feature information
      if (this.config.showFeatures && node.data.features) {
        nodeData.features = this.extractTopFeatures(node.data.features);
      }
      
      nodes.push(nodeData);
    });
    
    return nodes;
  }
  
  /**
   * Generate edge visualization data
   */
  generateEdges(tree, layout) {
    const edges = [];
    
    tree.edges.forEach(edge => {
      const sourcePos = layout.getPosition(edge.source.id);
      const targetPos = layout.getPosition(edge.target.id);
      
      edges.push({
        id: `${edge.source.id}-${edge.target.id}`,
        source: edge.source.id,
        target: edge.target.id,
        path: this.calculateEdgePath(sourcePos, targetPos),
        label: edge.label,
        weight: edge.weight,
        style: this.getEdgeStyle(edge),
        animated: this.config.animations
      });
    });
    
    return edges;
  }
  
  /**
   * Generate interaction handlers
   */
  generateInteractions(tree) {
    if (!this.config.interactive) return null;
    
    return {
      nodeClick: {
        handler: 'expandNode',
        description: 'Click to see details'
      },
      nodeHover: {
        handler: 'showTooltip',
        description: 'Hover for information'
      },
      pathHighlight: {
        handler: 'highlightPath',
        description: 'Highlight decision path'
      },
      compareNodes: {
        handler: 'compareNodes',
        description: 'Compare two nodes'
      }
    };
  }
  
  /**
   * Generate animations
   */
  generateAnimations(tree, layout) {
    if (!this.config.animations) return null;
    
    const animations = {
      entrance: this.createEntranceAnimation(tree, layout),
      pathTrace: this.createPathTraceAnimation(tree),
      confidenceFlow: this.createConfidenceFlowAnimation(tree),
      comparison: this.createComparisonAnimation(tree)
    };
    
    return animations;
  }
  
  /**
   * Visualize alternative decision paths
   */
  visualizeAlternativePaths(alternativePaths, mainLayout) {
    const alternatives = [];
    
    for (const altPath of alternativePaths) {
      const altTree = this.buildTreeStructure(altPath);
      const altLayout = this.layoutCalculator.calculateAlternative(
        altTree,
        mainLayout
      );
      
      alternatives.push({
        id: altPath.id,
        nodes: this.generateNodes(altTree, altLayout, altPath.result),
        edges: this.generateEdges(altTree, altLayout),
        confidence: altPath.result.overall,
        difference: this.calculatePathDifference(altPath, mainLayout)
      });
    }
    
    return alternatives;
  }
  
  /**
   * Add hypothetical branches for unexplored decisions
   */
  addHypotheticalBranches(tree, leafNode) {
    // Add "what-if" branches
    const hypotheticals = this.generateHypotheticalDecisions(leafNode);
    
    for (const hypo of hypotheticals) {
      const hypoNode = tree.addNode({
        id: `hypo_${hypo.id}`,
        type: 'hypothetical',
        label: hypo.label,
        data: { hypothetical: true, ...hypo },
        parent: leafNode
      });
      
      tree.addEdge(leafNode, hypoNode, {
        label: hypo.condition,
        weight: 0.5,
        style: 'dashed'
      });
    }
  }
  
  /**
   * Generate hypothetical decision branches
   */
  generateHypotheticalDecisions(node) {
    const hypotheticals = [];
    
    // Based on node type, suggest alternatives
    if (node.data.features) {
      const features = Object.entries(node.data.features);
      
      // Suggest changing top features
      for (const [feature, value] of features.slice(0, 2)) {
        hypotheticals.push({
          id: `alt_${feature}`,
          label: `Change ${this.humanizeFeature(feature)}`,
          condition: `If ${feature} different`,
          estimatedConfidence: this.estimateAlternativeConfidence(node, feature)
        });
      }
    }
    
    return hypotheticals;
  }
  
  /**
   * Create entrance animation
   */
  createEntranceAnimation(tree, layout) {
    const keyframes = [];
    
    tree.traverse((node, depth) => {
      const position = layout.getPosition(node.id);
      
      keyframes.push({
        nodeId: node.id,
        time: depth * 200, // Stagger by depth
        from: { opacity: 0, scale: 0 },
        to: { opacity: 1, scale: 1 },
        easing: 'easeOutElastic'
      });
    });
    
    return {
      duration: tree.depth * 200 + 500,
      keyframes
    };
  }
  
  /**
   * Create path trace animation
   */
  createPathTraceAnimation(tree) {
    const keyframes = [];
    let time = 0;
    
    // Trace main decision path
    const mainPath = tree.getMainPath();
    
    for (let i = 0; i < mainPath.length - 1; i++) {
      keyframes.push({
        edgeId: `${mainPath[i].id}-${mainPath[i + 1].id}`,
        time,
        effect: 'highlight',
        duration: 300
      });
      
      time += 200;
    }
    
    return {
      duration: time,
      keyframes,
      loop: false
    };
  }
  
  /**
   * Create confidence flow animation
   */
  createConfidenceFlowAnimation(tree) {
    const keyframes = [];
    
    tree.traverse((node, depth) => {
      if (node.data.result) {
        keyframes.push({
          nodeId: node.id,
          property: 'confidence',
          from: 0,
          to: node.data.result.overall,
          time: depth * 100,
          duration: 500,
          easing: 'easeInOutQuad'
        });
      }
    });
    
    return {
      duration: tree.depth * 100 + 500,
      keyframes
    };
  }
  
  /**
   * Create comparison animation
   */
  createComparisonAnimation(tree) {
    // Animation for comparing different paths
    return {
      type: 'morph',
      duration: 1000,
      easing: 'easeInOutCubic'
    };
  }
  
  /**
   * Helper methods
   */
  
  getNodeType(pathNode) {
    if (pathNode.type === 'base_calculation') return 'calculation';
    if (pathNode.type === 'shap_analysis') return 'analysis';
    if (pathNode.type === 'decision') return 'decision';
    return 'process';
  }
  
  getNodeLabel(pathNode) {
    const labels = {
      base_calculation: 'Calculate Base Score',
      shap_analysis: 'SHAP Analysis',
      lime_analysis: 'LIME Analysis',
      attention_analysis: 'Attention Analysis',
      counterfactual_generation: 'Generate Alternatives',
      nl_generation: 'Generate Explanation'
    };
    
    return labels[pathNode.type] || pathNode.type;
  }
  
  calculateEdgeWeight(node) {
    // Weight based on importance or time taken
    if (node.data?.duration) {
      return Math.min(1, node.data.duration / 1000);
    }
    return 0.5;
  }
  
  calculateEdgePath(source, target) {
    if (this.config.layout === 'vertical') {
      // Bezier curve for vertical layout
      const midY = (source.y + target.y) / 2;
      return `M ${source.x} ${source.y} C ${source.x} ${midY}, ${target.x} ${midY}, ${target.x} ${target.y}`;
    } else if (this.config.layout === 'horizontal') {
      // Bezier curve for horizontal layout
      const midX = (source.x + target.x) / 2;
      return `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`;
    } else {
      // Straight line for radial
      return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
    }
  }
  
  getEdgeStyle(edge) {
    return {
      stroke: edge.weight > 0.7 ? '#4CAF50' : '#999',
      strokeWidth: 1 + edge.weight * 2,
      strokeDasharray: edge.style === 'dashed' ? '5,5' : 'none',
      opacity: edge.hypothetical ? 0.5 : 1
    };
  }
  
  generateTooltip(node) {
    const parts = [`<strong>${node.label}</strong>`];
    
    if (node.data.result) {
      parts.push(`Confidence: ${(node.data.result.overall * 100).toFixed(1)}%`);
    }
    
    if (node.data.duration) {
      parts.push(`Time: ${node.data.duration.toFixed(0)}ms`);
    }
    
    if (node.data.features) {
      const topFeature = Object.entries(node.data.features)[0];
      if (topFeature) {
        parts.push(`Key: ${this.humanizeFeature(topFeature[0])}`);
      }
    }
    
    return parts.join('<br>');
  }
  
  extractTopFeatures(features, n = 3) {
    return Object.entries(features)
      .sort(([,a], [,b]) => b - a)
      .slice(0, n)
      .map(([name, value]) => ({
        name: this.humanizeFeature(name),
        value: value,
        label: typeof value === 'number' ? value.toFixed(2) : value
      }));
  }
  
  calculatePathDifference(altPath, mainPath) {
    // Calculate how different this path is from main
    let difference = 0;
    const altNodes = new Set(altPath.nodes.map(n => n.type));
    const mainNodes = new Set(mainPath.nodes.map(n => n.type));
    
    // Jaccard distance
    const intersection = new Set([...altNodes].filter(x => mainNodes.has(x)));
    const union = new Set([...altNodes, ...mainNodes]);
    
    difference = 1 - (intersection.size / union.size);
    
    return {
      score: difference,
      uniqueSteps: [...altNodes].filter(x => !mainNodes.has(x)),
      percentage: (difference * 100).toFixed(0)
    };
  }
  
  estimateAlternativeConfidence(node, changedFeature) {
    // Simple estimation based on feature importance
    const currentConfidence = node.data.result?.overall || 0.5;
    const featureImportance = 0.1; // Would come from SHAP values
    
    // Random variation for demonstration
    const change = (Math.random() - 0.5) * featureImportance;
    
    return Math.max(0, Math.min(1, currentConfidence + change));
  }
  
  humanizeFeature(feature) {
    return feature
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}

/**
 * Decision tree data structure
 */
class DecisionTree {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.root = null;
    this.nodeCount = 0;
    this.depth = 0;
  }
  
  addNode(nodeData) {
    const node = {
      ...nodeData,
      id: nodeData.id || `node_${this.nodeCount}`,
      children: []
    };
    
    this.nodes.set(node.id, node);
    this.nodeCount++;
    
    if (!this.root) {
      this.root = node;
    }
    
    if (nodeData.parent) {
      nodeData.parent.children.push(node);
      const depth = this.getDepth(node);
      this.depth = Math.max(this.depth, depth);
    }
    
    return node;
  }
  
  addEdge(source, target, edgeData = {}) {
    this.edges.push({
      source,
      target,
      ...edgeData
    });
  }
  
  traverse(callback, node = this.root, depth = 0) {
    if (!node) return;
    
    callback(node, depth);
    
    for (const child of node.children) {
      this.traverse(callback, child, depth + 1);
    }
  }
  
  getDepth(node) {
    let depth = 0;
    let current = node;
    
    while (current.parent) {
      depth++;
      current = current.parent;
    }
    
    return depth;
  }
  
  getMainPath() {
    const path = [];
    let current = this.root;
    
    while (current) {
      path.push(current);
      current = current.children[0]; // Follow first child
    }
    
    return path;
  }
}

/**
 * Tree layout calculator
 */
class TreeLayoutCalculator {
  constructor(type = 'vertical') {
    this.type = type;
    this.nodeSpacing = { x: 150, y: 100 };
    this.positions = new Map();
  }
  
  calculate(tree) {
    switch (this.type) {
      case 'vertical':
        return this.calculateVerticalLayout(tree);
      case 'horizontal':
        return this.calculateHorizontalLayout(tree);
      case 'radial':
        return this.calculateRadialLayout(tree);
      default:
        return this.calculateVerticalLayout(tree);
    }
  }
  
  calculateVerticalLayout(tree) {
    let x = 0;
    
    // Calculate x positions (breadth)
    this.calculateXPositions(tree.root, x);
    
    // Calculate y positions (depth)
    tree.traverse((node, depth) => {
      const pos = this.positions.get(node.id) || {};
      pos.y = depth * this.nodeSpacing.y;
      this.positions.set(node.id, pos);
    });
    
    // Center the tree
    this.centerTree();
    
    return this;
  }
  
  calculateXPositions(node, x) {
    if (!node) return x;
    
    if (node.children.length === 0) {
      // Leaf node
      this.positions.set(node.id, { x });
      return x + this.nodeSpacing.x;
    }
    
    // Process children first
    let childX = x;
    for (const child of node.children) {
      childX = this.calculateXPositions(child, childX);
    }
    
    // Position parent at center of children
    const firstChild = this.positions.get(node.children[0].id);
    const lastChild = this.positions.get(node.children[node.children.length - 1].id);
    
    this.positions.set(node.id, {
      x: (firstChild.x + lastChild.x) / 2
    });
    
    return childX;
  }
  
  calculateHorizontalLayout(tree) {
    // Similar to vertical but swap x and y
    let y = 0;
    
    this.calculateYPositions(tree.root, y);
    
    tree.traverse((node, depth) => {
      const pos = this.positions.get(node.id) || {};
      pos.x = depth * this.nodeSpacing.x;
      this.positions.set(node.id, pos);
    });
    
    this.centerTree();
    
    return this;
  }
  
  calculateYPositions(node, y) {
    if (!node) return y;
    
    if (node.children.length === 0) {
      this.positions.set(node.id, { y });
      return y + this.nodeSpacing.y;
    }
    
    let childY = y;
    for (const child of node.children) {
      childY = this.calculateYPositions(child, childY);
    }
    
    const firstChild = this.positions.get(node.children[0].id);
    const lastChild = this.positions.get(node.children[node.children.length - 1].id);
    
    const pos = this.positions.get(node.id) || {};
    pos.y = (firstChild.y + lastChild.y) / 2;
    this.positions.set(node.id, pos);
    
    return childY;
  }
  
  calculateRadialLayout(tree) {
    const center = { x: 0, y: 0 };
    const radiusStep = 100;
    
    tree.traverse((node, depth) => {
      if (depth === 0) {
        this.positions.set(node.id, center);
      } else {
        const siblings = node.parent.children;
        const index = siblings.indexOf(node);
        const angleStep = (2 * Math.PI) / siblings.length;
        const angle = index * angleStep;
        const radius = depth * radiusStep;
        
        this.positions.set(node.id, {
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle)
        });
      }
    });
    
    return this;
  }
  
  centerTree() {
    if (this.positions.size === 0) return;
    
    // Find bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const pos of this.positions.values()) {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }
    
    // Center around origin
    const offsetX = (minX + maxX) / 2;
    const offsetY = (minY + maxY) / 2;
    
    for (const [id, pos] of this.positions) {
      this.positions.set(id, {
        x: pos.x - offsetX,
        y: pos.y - offsetY
      });
    }
  }
  
  getPosition(nodeId) {
    return this.positions.get(nodeId) || { x: 0, y: 0 };
  }
  
  calculateAlternative(altTree, mainLayout) {
    // Position alternative tree to the side
    const offset = { x: 300, y: 0 };
    
    const altLayout = new TreeLayoutCalculator(this.type);
    altLayout.calculate(altTree);
    
    // Apply offset
    for (const [id, pos] of altLayout.positions) {
      altLayout.positions.set(id, {
        x: pos.x + offset.x,
        y: pos.y + offset.y
      });
    }
    
    return altLayout;
  }
}

/**
 * Node renderer for visual styling
 */
class NodeRenderer {
  constructor(config) {
    this.config = config;
  }
  
  render(node, result) {
    const visual = {
      shape: this.getNodeShape(node),
      size: this.getNodeSize(node),
      color: this.getNodeColor(node, result),
      borderColor: this.getBorderColor(node),
      borderWidth: 2,
      icon: this.getNodeIcon(node),
      badges: this.getNodeBadges(node)
    };
    
    return visual;
  }
  
  getNodeShape(node) {
    const shapes = {
      root: 'circle',
      decision: 'diamond',
      calculation: 'rectangle',
      analysis: 'hexagon',
      hypothetical: 'ellipse',
      leaf: 'roundedRectangle'
    };
    
    return shapes[node.type] || 'rectangle';
  }
  
  getNodeSize(node) {
    const baseSizes = {
      root: 40,
      decision: 50,
      calculation: 60,
      analysis: 55,
      hypothetical: 45,
      leaf: 50
    };
    
    const baseSize = baseSizes[node.type] || 50;
    
    // Scale by importance
    const importance = node.data.importance || 1;
    
    return {
      width: baseSize * importance,
      height: baseSize * importance * 0.8
    };
  }
  
  getNodeColor(node, result) {
    if (node.data.hypothetical) {
      return this.config.nodeColors.highlighted + '40'; // Semi-transparent
    }
    
    if (node.data.result) {
      // Color based on confidence
      const confidence = node.data.result.overall;
      return this.getConfidenceColor(confidence);
    }
    
    return this.config.nodeColors[node.type] || this.config.nodeColors.decision;
  }
  
  getBorderColor(node) {
    if (node.data.selected) {
      return this.config.nodeColors.highlighted;
    }
    
    return 'transparent';
  }
  
  getNodeIcon(node) {
    const icons = {
      root: '🎯',
      decision: '🤔',
      calculation: '🧮',
      analysis: '🔍',
      hypothetical: '❓',
      leaf: '✅'
    };
    
    return icons[node.type] || '📊';
  }
  
  getNodeBadges(node) {
    const badges = [];
    
    if (node.data.result && node.data.result.converged) {
      badges.push({
        text: '✓',
        color: '#4CAF50',
        position: 'topRight'
      });
    }
    
    if (node.data.important) {
      badges.push({
        text: '!',
        color: '#FF9800',
        position: 'topLeft'
      });
    }
    
    return badges;
  }
  
  getConfidenceColor(confidence) {
    // Gradient from red to green
    if (confidence < 0.3) return '#F44336';
    if (confidence < 0.5) return '#FF9800';
    if (confidence < 0.7) return '#FFC107';
    if (confidence < 0.9) return '#8BC34A';
    return '#4CAF50';
  }
}

/**
 * Path highlighter for decision paths
 */
class PathHighlighter {
  highlightPath(tree, path) {
    const highlighted = {
      nodes: new Set(path.map(n => n.id)),
      edges: new Set()
    };
    
    // Highlight edges along path
    for (let i = 0; i < path.length - 1; i++) {
      highlighted.edges.add(`${path[i].id}-${path[i + 1].id}`);
    }
    
    return highlighted;
  }
  
  comparePaths(path1, path2) {
    const comparison = {
      common: [],
      unique1: [],
      unique2: [],
      divergencePoint: null
    };
    
    // Find common prefix
    let i = 0;
    while (i < path1.length && i < path2.length && path1[i].id === path2[i].id) {
      comparison.common.push(path1[i]);
      i++;
    }
    
    // Divergence point
    if (i < path1.length && i < path2.length) {
      comparison.divergencePoint = i;
    }
    
    // Unique portions
    comparison.unique1 = path1.slice(i);
    comparison.unique2 = path2.slice(i);
    
    return comparison;
  }
}

export default DecisionTreeVisualizer;