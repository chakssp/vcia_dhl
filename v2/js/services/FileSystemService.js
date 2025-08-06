/**
 * FileSystemService - Real File System Access API implementation for V2
 * Based on V1 HandleManager but adapted for V2 architecture
 */

export class FileSystemService {
  constructor() {
    this.handles = new Map(); // id → {handle, metadata}
    this.pathIndex = new Map(); // path → id
    this.nextId = 1;
    this.supportsFileSystem = 'showDirectoryPicker' in window;
  }

  /**
   * Check if File System Access API is supported
   */
  isSupported() {
    return this.supportsFileSystem;
  }

  /**
   * Request directory access from user
   */
  async selectDirectory() {
    if (!this.isSupported()) {
      throw new Error('File System Access API not supported in this browser');
    }

    try {
      const handle = await window.showDirectoryPicker({
        mode: 'read',
        startIn: 'documents'
      });

      // Register the handle
      const id = this.registerHandle(handle, {
        path: handle.name,
        name: handle.name,
        source: 'user-selection'
      });

      console.log('[FileSystemService] Directory selected:', handle.name);
      return { id, handle, name: handle.name };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[FileSystemService] User cancelled directory selection');
        return null;
      }
      throw error;
    }
  }

  /**
   * Register a directory handle
   */
  registerHandle(handle, metadata) {
    const id = `handle_${this.nextId++}`;
    const fullMetadata = {
      ...metadata,
      registeredAt: new Date().toISOString(),
      id
    };

    // Save handle and metadata
    this.handles.set(id, {
      handle,
      metadata: fullMetadata
    });

    // Index by path for quick lookup
    if (metadata.path) {
      this.pathIndex.set(metadata.path, id);
    }

    console.log('[FileSystemService] Handle registered:', id, metadata);
    return id;
  }

  /**
   * Read all files from a directory handle recursively
   */
  async readDirectory(handleOrId, options = {}) {
    const { 
      recursive = true, 
      extensions = null,
      excludePatterns = ['.git', 'node_modules', '.cache', 'temp'],
      maxDepth = 10,
      onProgress = null
    } = options;

    let handle;
    if (typeof handleOrId === 'string') {
      const handleData = this.handles.get(handleOrId);
      if (!handleData) {
        throw new Error(`Handle not found: ${handleOrId}`);
      }
      handle = handleData.handle;
    } else {
      handle = handleOrId;
    }

    const files = [];
    const processedCount = { value: 0 };

    await this._scanDirectory(
      handle, 
      files, 
      '', 
      0, 
      {
        recursive,
        extensions,
        excludePatterns,
        maxDepth,
        onProgress,
        processedCount
      }
    );

    console.log(`[FileSystemService] Found ${files.length} files`);
    return files;
  }

  /**
   * Internal recursive directory scanner
   */
  async _scanDirectory(dirHandle, files, path, depth, options) {
    const {
      recursive,
      extensions,
      excludePatterns,
      maxDepth,
      onProgress,
      processedCount
    } = options;

    // Check depth limit
    if (depth > maxDepth) {
      console.warn(`[FileSystemService] Max depth ${maxDepth} reached at ${path}`);
      return;
    }

    // Check exclude patterns
    const currentPath = path || dirHandle.name;
    if (excludePatterns.some(pattern => currentPath.includes(pattern))) {
      console.log(`[FileSystemService] Skipping excluded path: ${currentPath}`);
      return;
    }

    try {
      // Iterate through directory entries
      for await (const entry of dirHandle.values()) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;

        if (entry.kind === 'file') {
          // Check file extension if filter is set
          if (extensions) {
            const ext = entry.name.split('.').pop().toLowerCase();
            if (!extensions.includes(ext)) {
              continue;
            }
          }

          // Get file handle and metadata
          const fileHandle = await dirHandle.getFileHandle(entry.name);
          const file = await fileHandle.getFile();

          const fileData = {
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: entry.name,
            path: entryPath,
            size: file.size,
            type: file.type || this._getFileType(entry.name),
            lastModified: file.lastModified,
            lastModifiedDate: new Date(file.lastModified),
            handle: fileHandle,
            parentHandle: dirHandle
          };

          files.push(fileData);
          processedCount.value++;

          // Report progress
          if (onProgress && processedCount.value % 10 === 0) {
            onProgress({
              processed: processedCount.value,
              current: entryPath,
              type: 'file'
            });
          }
        } else if (entry.kind === 'directory' && recursive) {
          // Recursively scan subdirectory
          const subDirHandle = await dirHandle.getDirectoryHandle(entry.name);
          await this._scanDirectory(
            subDirHandle,
            files,
            entryPath,
            depth + 1,
            options
          );
        }
      }
    } catch (error) {
      console.error(`[FileSystemService] Error scanning ${currentPath}:`, error);
      // Continue scanning other entries
    }
  }

  /**
   * Read file content
   */
  async readFileContent(fileHandle) {
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      return content;
    } catch (error) {
      console.error('[FileSystemService] Error reading file:', error);
      throw error;
    }
  }

  /**
   * Get file type from extension
   */
  _getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const typeMap = {
      'md': 'text/markdown',
      'txt': 'text/plain',
      'js': 'application/javascript',
      'json': 'application/json',
      'html': 'text/html',
      'css': 'text/css',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return typeMap[ext] || 'application/octet-stream';
  }

  /**
   * Get handle by ID
   */
  getHandle(id) {
    return this.handles.get(id);
  }

  /**
   * List all registered handles
   */
  listHandles() {
    return Array.from(this.handles.values()).map(item => item.metadata);
  }

  /**
   * Clear all handles
   */
  clearHandles() {
    const count = this.handles.size;
    this.handles.clear();
    this.pathIndex.clear();
    this.nextId = 1;
    console.log(`[FileSystemService] Cleared ${count} handles`);
  }

  /**
   * Check if we have permission to read a handle
   */
  async verifyPermission(handle, readWrite = false) {
    const options = {
      mode: readWrite ? 'readwrite' : 'read'
    };

    // Check if permission was already granted
    if ((await handle.queryPermission(options)) === 'granted') {
      return true;
    }

    // Request permission
    if ((await handle.requestPermission(options)) === 'granted') {
      return true;
    }

    return false;
  }
}

// Create singleton instance
export const fileSystemService = new FileSystemService();