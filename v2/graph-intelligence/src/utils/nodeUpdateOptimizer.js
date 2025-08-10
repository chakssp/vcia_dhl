/**
 * Node Update Optimizer
 * 
 * Implements differential updates to prevent unnecessary re-renders
 * and improve performance when working with large graphs.
 */

import ANALYSIS_CONFIG from '../constants/analysisConfig.js';

/**
 * Optimized node state manager with differential updates
 */
class NodeUpdateOptimizer {
  constructor() {
    this.nodeCache = new Map();
    this.edgeCache = new Map();
    this.pendingUpdates = new Set();
    this.updateBatchTimeout = null;
    this.lastUpdateTime = 0;
  }

  /**
   * Calculate hash for a node to detect changes
   * @param {Object} node - Node to hash
   * @returns {string} Node hash
   */
  calculateNodeHash(node) {
    if (!node || !node.id) return '';
    
    const hashableProps = {
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        label: node.data?.label,
        type: node.data?.type,
        // Only include essential data properties to avoid over-hashing
        fileName: node.data?.fileName,
        categories: node.data?.categories
      },
      selected: node.selected,
      dragging: node.dragging
    };
    
    return JSON.stringify(hashableProps);
  }

  /**
   * Calculate hash for an edge to detect changes
   * @param {Object} edge - Edge to hash
   * @returns {string} Edge hash
   */
  calculateEdgeHash(edge) {
    if (!edge || !edge.id) return '';
    
    const hashableProps = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      animated: edge.animated,
      style: edge.style
    };
    
    return JSON.stringify(hashableProps);
  }

  /**
   * Check if nodes have actually changed
   * @param {Array} newNodes - New node array
   * @returns {Object} Change analysis result
   */
  analyzeNodeChanges(newNodes) {
    const changes = {
      added: [],
      updated: [],
      removed: [],
      unchanged: [],
      hasChanges: false
    };

    const newNodeIds = new Set(newNodes.map(n => n.id));
    const currentNodeIds = new Set(this.nodeCache.keys());

    // Find added nodes
    newNodes.forEach(node => {
      const nodeHash = this.calculateNodeHash(node);
      const cachedHash = this.nodeCache.get(node.id);
      
      if (!cachedHash) {
        changes.added.push(node);
        changes.hasChanges = true;
      } else if (cachedHash !== nodeHash) {
        changes.updated.push(node);
        changes.hasChanges = true;
      } else {
        changes.unchanged.push(node);
      }
      
      // Update cache
      this.nodeCache.set(node.id, nodeHash);
    });

    // Find removed nodes
    currentNodeIds.forEach(nodeId => {
      if (!newNodeIds.has(nodeId)) {
        changes.removed.push(nodeId);
        changes.hasChanges = true;
        this.nodeCache.delete(nodeId);
      }
    });

    return changes;
  }

  /**
   * Check if edges have actually changed
   * @param {Array} newEdges - New edge array
   * @returns {Object} Change analysis result
   */
  analyzeEdgeChanges(newEdges) {
    const changes = {
      added: [],
      updated: [],
      removed: [],
      unchanged: [],
      hasChanges: false
    };

    const newEdgeIds = new Set(newEdges.map(e => e.id));
    const currentEdgeIds = new Set(this.edgeCache.keys());

    // Find added or updated edges
    newEdges.forEach(edge => {
      const edgeHash = this.calculateEdgeHash(edge);
      const cachedHash = this.edgeCache.get(edge.id);
      
      if (!cachedHash) {
        changes.added.push(edge);
        changes.hasChanges = true;
      } else if (cachedHash !== edgeHash) {
        changes.updated.push(edge);
        changes.hasChanges = true;
      } else {
        changes.unchanged.push(edge);
      }
      
      // Update cache
      this.edgeCache.set(edge.id, edgeHash);
    });

    // Find removed edges
    currentEdgeIds.forEach(edgeId => {
      if (!newEdgeIds.has(edgeId)) {
        changes.removed.push(edgeId);
        changes.hasChanges = true;
        this.edgeCache.delete(edgeId);
      }
    });

    return changes;
  }

  /**
   * Batch node updates to reduce re-renders
   * @param {Function} updateCallback - Function to call with batched updates
   * @param {Array} nodes - Nodes to update
   * @param {Array} edges - Edges to update
   */
  batchUpdates(updateCallback, nodes, edges) {
    // Clear existing timeout
    if (this.updateBatchTimeout) {
      clearTimeout(this.updateBatchTimeout);
    }

    // Add to pending updates
    this.pendingUpdates.add({ nodes, edges, callback: updateCallback });

    // Debounce updates
    this.updateBatchTimeout = setTimeout(() => {
      this.processPendingUpdates();
    }, ANALYSIS_CONFIG.TIMEOUTS.DEBOUNCE_DELAY);
  }

  /**
   * Process all pending updates
   */
  processPendingUpdates() {
    if (this.pendingUpdates.size === 0) return;

    const now = Date.now();
    
    // Prevent too frequent updates
    if (now - this.lastUpdateTime < ANALYSIS_CONFIG.TIMEOUTS.DEBOUNCE_DELAY) {
      return;
    }

    // Get the most recent update
    const updates = Array.from(this.pendingUpdates);
    const latestUpdate = updates[updates.length - 1];
    
    // Analyze changes
    const nodeChanges = this.analyzeNodeChanges(latestUpdate.nodes || []);
    const edgeChanges = this.analyzeEdgeChanges(latestUpdate.edges || []);

    // Only trigger callback if there are actual changes
    if (nodeChanges.hasChanges || edgeChanges.hasChanges) {
      console.log('🔄 Processing differential update:', {
        nodes: {
          added: nodeChanges.added.length,
          updated: nodeChanges.updated.length,
          removed: nodeChanges.removed.length,
          unchanged: nodeChanges.unchanged.length
        },
        edges: {
          added: edgeChanges.added.length,
          updated: edgeChanges.updated.length,
          removed: edgeChanges.removed.length,
          unchanged: edgeChanges.unchanged.length
        }
      });

      latestUpdate.callback({
        nodes: latestUpdate.nodes,
        edges: latestUpdate.edges,
        nodeChanges,
        edgeChanges
      });
    }

    // Clear pending updates and update timestamp
    this.pendingUpdates.clear();
    this.lastUpdateTime = now;
    this.updateBatchTimeout = null;
  }

  /**
   * Optimize node layout updates
   * @param {Array} nodes - Nodes to optimize
   * @param {Array} edges - Edges to optimize
   * @returns {Object} Optimized layout
   */
  optimizeLayout(nodes, edges) {
    const optimized = {
      nodes: [],
      edges: []
    };

    // Group nodes by type for better performance
    const nodeGroups = new Map();
    nodes.forEach(node => {
      const type = node.type || 'default';
      if (!nodeGroups.has(type)) {
        nodeGroups.set(type, []);
      }
      nodeGroups.get(type).push(node);
    });

    // Process nodes by group (more efficient for React reconciliation)
    nodeGroups.forEach((groupNodes, type) => {
      // Sort by ID for consistent ordering
      groupNodes.sort((a, b) => a.id.localeCompare(b.id));
      optimized.nodes.push(...groupNodes);
    });

    // Sort edges by source->target for consistency
    optimized.edges = edges.sort((a, b) => {
      const aKey = `${a.source}-${a.target}`;
      const bKey = `${b.source}-${b.target}`;
      return aKey.localeCompare(bKey);
    });

    return optimized;
  }

  /**
   * Create memoized node component props
   * @param {Object} node - Node object
   * @returns {Object} Memoized props
   */
  createMemoizedNodeProps(node) {
    const nodeHash = this.calculateNodeHash(node);
    
    return {
      ...node,
      // Add memo key for React optimization
      __memoKey: nodeHash,
      // Add stable references
      data: {
        ...node.data,
        // Ensure handlers are stable references
        onChange: node.data?.onChange || (() => {}),
        onClick: node.data?.onClick || (() => {})
      }
    };
  }

  /**
   * Create memoized edge component props
   * @param {Object} edge - Edge object
   * @returns {Object} Memoized props
   */
  createMemoizedEdgeProps(edge) {
    const edgeHash = this.calculateEdgeHash(edge);
    
    return {
      ...edge,
      // Add memo key for React optimization
      __memoKey: edgeHash,
      // Normalize style properties
      style: {
        strokeWidth: 2,
        ...edge.style
      }
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.nodeCache.clear();
    this.edgeCache.clear();
    this.pendingUpdates.clear();
    
    if (this.updateBatchTimeout) {
      clearTimeout(this.updateBatchTimeout);
      this.updateBatchTimeout = null;
    }
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getStats() {
    return {
      nodesCached: this.nodeCache.size,
      edgesCached: this.edgeCache.size,
      pendingUpdates: this.pendingUpdates.size,
      lastUpdateTime: this.lastUpdateTime,
      hasPendingBatch: this.updateBatchTimeout !== null
    };
  }
}

// Create singleton instance
const nodeUpdateOptimizer = new NodeUpdateOptimizer();

export { NodeUpdateOptimizer };
export default nodeUpdateOptimizer;