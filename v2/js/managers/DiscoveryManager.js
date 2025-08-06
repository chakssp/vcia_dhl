/**
 * DiscoveryManager V2 - Gerenciador de Descoberta de Arquivos
 * 
 * Versão básica para estabilizar V2
 * TODO: Integrar com File System Access API
 */

import AppState from '../core/AppState.js';
import EventBus from '../core/EventBus.js';
import ConfigManager from './ConfigManager.js';

class DiscoveryManager {
  constructor() {
    this.isDiscovering = false;
    this.discoveredFiles = [];
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      skippedFiles: 0,
      errors: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Initialize DiscoveryManager
   */
  async initialize() {
    // Ensure ConfigManager is initialized
    if (!ConfigManager.initialized) {
      await ConfigManager.initialize();
    }
    
    console.log('[DiscoveryManager] Initialized');
    return true;
  }

  /**
   * Start discovery process
   */
  async startDiscovery(options = {}) {
    if (this.isDiscovering) {
      console.warn('[DiscoveryManager] Discovery already in progress');
      return false;
    }

    try {
      this.isDiscovering = true;
      this.stats.startTime = Date.now();
      
      // Reset stats
      this.stats = {
        totalFiles: 0,
        processedFiles: 0,
        skippedFiles: 0,
        errors: 0,
        startTime: Date.now(),
        endTime: null
      };

      // Clear previous files
      this.discoveredFiles = [];
      
      // Emit start event
      EventBus.emit('discovery:started', { options });

      // Get config
      const config = ConfigManager.get('discovery', {});
      const patterns = options.patterns || config.patterns || {};

      // Check if we have File System Access API
      if ('showDirectoryPicker' in window) {
        try {
          await this.discoverWithFileSystemAPI(patterns);
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('[DiscoveryManager] User cancelled directory selection');
            EventBus.emit('discovery:cancelled', { reason: 'User cancelled' });
          } else {
            console.error('[DiscoveryManager] File System API failed:', error);
            EventBus.emit('discovery:error', { error: error.message });
          }
          throw error; // Re-throw to be handled by caller
        }
      } else {
        // File System Access API not supported
        const errorMsg = 'File System Access API not supported in this browser';
        console.error('[DiscoveryManager]', errorMsg);
        EventBus.emit('discovery:error', { error: errorMsg });
        throw new Error(errorMsg);
      }

      // Update stats
      this.stats.endTime = Date.now();
      this.stats.totalFiles = this.discoveredFiles.length;

      // Save to AppState
      AppState.set('discoveredFiles', this.discoveredFiles);
      AppState.set('discoveryStats', this.stats);

      // Emit complete event
      EventBus.emit('discovery:completed', {
        files: this.discoveredFiles,
        stats: this.stats
      });

      return true;

    } catch (error) {
      console.error('[DiscoveryManager] Discovery failed:', error);
      this.stats.errors++;
      
      EventBus.emit('discovery:error', { error: error.message });
      return false;
      
    } finally {
      this.isDiscovering = false;
    }
  }

  /**
   * Discover files using File System Access API
   */
  async discoverWithFileSystemAPI(patterns) {
    try {
      // Request directory access
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read'
      });

      // Recursively scan directory
      await this.scanDirectory(dirHandle, '', patterns);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[DiscoveryManager] User cancelled directory selection');
      } else {
        throw error;
      }
    }
  }

  /**
   * Recursively scan directory
   */
  async scanDirectory(dirHandle, path, patterns) {
    try {
      for await (const entry of dirHandle.values()) {
        const fullPath = path ? `${path}/${entry.name}` : entry.name;

        if (entry.kind === 'file') {
          // Check if file matches patterns
          if (this.matchesPatterns(entry.name, patterns)) {
            await this.processFile(entry, fullPath);
          } else {
            this.stats.skippedFiles++;
          }
        } else if (entry.kind === 'directory') {
          // Check if directory should be excluded
          if (!this.isExcluded(entry.name, patterns.exclude)) {
            await this.scanDirectory(entry, fullPath, patterns);
          }
        }

        // Emit progress
        if (this.stats.processedFiles % 10 === 0) {
          EventBus.emit('discovery:progress', {
            processed: this.stats.processedFiles,
            total: this.stats.totalFiles
          });
        }
      }
    } catch (error) {
      console.error(`[DiscoveryManager] Error scanning ${path}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Process individual file
   */
  async processFile(fileHandle, path) {
    try {
      const file = await fileHandle.getFile();
      
      // Create file object
      const fileObj = {
        id: this.generateFileId(path),
        name: file.name,
        path: path,
        size: file.size,
        type: file.type || this.getFileType(file.name),
        lastModified: new Date(file.lastModified),
        handle: fileHandle,
        preview: '',
        relevanceScore: 0,
        categories: [],
        status: 'pending'
      };

      // Generate preview
      if (this.isTextFile(file.name)) {
        fileObj.preview = await this.generatePreview(file);
      }

      // Calculate initial relevance
      fileObj.relevanceScore = this.calculateRelevance(fileObj);

      // Add to discovered files
      this.discoveredFiles.push(fileObj);
      this.stats.processedFiles++;

    } catch (error) {
      console.error(`[DiscoveryManager] Error processing ${path}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Generate file preview
   */
  async generatePreview(file, maxLength = 500) {
    try {
      const text = await file.text();
      return text.substring(0, maxLength);
    } catch (error) {
      console.error('[DiscoveryManager] Error generating preview:', error);
      return '';
    }
  }

  /**
   * Calculate initial relevance score
   */
  calculateRelevance(file) {
    let score = 50; // Base score

    // Boost for specific file types
    const typeBoosts = {
      'md': 20,
      'txt': 10,
      'doc': 15,
      'docx': 15,
      'pdf': 5
    };

    const ext = this.getFileExtension(file.name);
    score += typeBoosts[ext] || 0;

    // Boost for recent files
    const daysSinceModified = (Date.now() - file.lastModified) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 7) score += 20;
    else if (daysSinceModified < 30) score += 10;
    else if (daysSinceModified < 90) score += 5;

    // Normalize to 0-100
    return Math.min(100, Math.max(0, score));
  }


  /**
   * Check if file matches patterns
   */
  matchesPatterns(fileName, patterns) {
    const include = patterns.include || ['*'];
    const exclude = patterns.exclude || [];

    // Check exclusions first
    if (this.isExcluded(fileName, exclude)) {
      return false;
    }

    // Check inclusions
    return this.isIncluded(fileName, include);
  }

  /**
   * Check if file is excluded
   */
  isExcluded(name, excludePatterns) {
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(name);
      }
      return name.includes(pattern);
    });
  }

  /**
   * Check if file is included
   */
  isIncluded(name, includePatterns) {
    return includePatterns.some(pattern => {
      if (pattern === '*') return true;
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(name);
      }
      return name.endsWith(pattern.replace('*', ''));
    });
  }

  /**
   * Check if file is text-based
   */
  isTextFile(name) {
    const textExtensions = ['txt', 'md', 'json', 'js', 'html', 'css', 'xml', 'csv'];
    const ext = this.getFileExtension(name);
    return textExtensions.includes(ext);
  }

  /**
   * Get file extension
   */
  getFileExtension(fileName) {
    return fileName.split('.').pop().toLowerCase();
  }

  /**
   * Get file type from name
   */
  getFileType(fileName) {
    const ext = this.getFileExtension(fileName);
    const typeMap = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return typeMap[ext] || 'application/octet-stream';
  }

  /**
   * Generate unique file ID
   */
  generateFileId(path) {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get discovery stats
   */
  getStats() {
    return {
      ...this.stats,
      duration: this.stats.endTime ? this.stats.endTime - this.stats.startTime : null
    };
  }

  /**
   * Get discovered files
   */
  getFiles() {
    return this.discoveredFiles;
  }

  /**
   * Clear discovered files
   */
  clear() {
    this.discoveredFiles = [];
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      skippedFiles: 0,
      errors: 0,
      startTime: null,
      endTime: null
    };
    
    AppState.delete('discoveredFiles');
    AppState.delete('discoveryStats');
    
    EventBus.emit('discovery:cleared');
  }

  /**
   * Cancel ongoing discovery
   */
  cancel() {
    if (this.isDiscovering) {
      this.isDiscovering = false;
      EventBus.emit('discovery:cancelled');
      return true;
    }
    return false;
  }
}

// Export singleton instance
export default new DiscoveryManager();