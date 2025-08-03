/**
 * FileDiscoveryService - Descoberta de arquivos para V2
 * Implementação direta sem depender do V1
 */

export class FileDiscoveryService {
  constructor() {
    this.files = [];
    this.fileHandles = new Map();
  }

  /**
   * Inicia descoberta de arquivos usando File System Access API
   */
  async startDiscovery() {
    try {
      // Solicita acesso ao diretório
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read',
        startIn: 'documents'
      });

      console.log('[FileDiscoveryService] Diretório selecionado:', dirHandle.name);
      
      // Reseta arquivos anteriores
      this.files = [];
      this.fileHandles.clear();
      
      // Descobre arquivos recursivamente
      await this.scanDirectory(dirHandle, '');
      
      console.log(`[FileDiscoveryService] ${this.files.length} arquivos descobertos`);
      return this.files;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[FileDiscoveryService] Descoberta cancelada pelo usuário');
        return [];
      }
      throw error;
    }
  }

  /**
   * Escaneia diretório recursivamente
   */
  async scanDirectory(dirHandle, path) {
    try {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          // Verifica extensão
          const ext = entry.name.split('.').pop().toLowerCase();
          const validExtensions = ['md', 'txt', 'pdf', 'docx', 'gdoc'];
          
          if (validExtensions.includes(ext)) {
            const file = await this.processFile(entry, path);
            if (file) {
              this.files.push(file);
              this.fileHandles.set(file.id, entry);
            }
          }
        } else if (entry.kind === 'directory') {
          // Ignora pastas do sistema
          const ignoreFolders = ['.git', 'node_modules', 'temp', 'cache', 'backup'];
          if (!ignoreFolders.includes(entry.name)) {
            await this.scanDirectory(entry, path + '/' + entry.name);
          }
        }
      }
    } catch (error) {
      console.warn(`[FileDiscoveryService] Erro ao escanear ${path}:`, error);
    }
  }

  /**
   * Processa arquivo individual
   */
  async processFile(fileHandle, path) {
    try {
      const file = await fileHandle.getFile();
      
      // Gera ID único
      const id = this.generateFileId(path + '/' + file.name);
      
      // Extrai preview
      let preview = '';
      let content = '';
      
      if (file.type.includes('text') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        content = await file.text();
        preview = this.extractPreview(content);
      }
      
      // Calcula relevância básica
      const relevanceScore = this.calculateRelevance(content || file.name);
      
      return {
        id,
        name: file.name,
        path: path + '/' + file.name,
        size: file.size,
        type: file.type || this.getMimeType(file.name),
        lastModified: file.lastModified,
        lastModifiedDate: new Date(file.lastModified),
        preview,
        content: content.substring(0, 1000), // Primeiros 1000 chars
        relevanceScore,
        status: 'pending',
        categories: [],
        analyzed: false
      };
      
    } catch (error) {
      console.warn('[FileDiscoveryService] Erro ao processar arquivo:', error);
      return null;
    }
  }

  /**
   * Extrai preview inteligente
   */
  extractPreview(content) {
    const lines = content.split('\n').filter(l => l.trim());
    const preview = [];
    
    // Primeira linha significativa
    if (lines.length > 0) {
      preview.push(lines[0].substring(0, 100));
    }
    
    // Linha com dois pontos
    const colonLine = lines.find(l => l.includes(':'));
    if (colonLine && !preview.includes(colonLine)) {
      preview.push(colonLine.substring(0, 100));
    }
    
    // Linha com palavras-chave
    const keywords = ['decisão', 'insight', 'aprendizado', 'conclusão', 'resultado'];
    const keywordLine = lines.find(l => 
      keywords.some(k => l.toLowerCase().includes(k))
    );
    if (keywordLine && !preview.includes(keywordLine)) {
      preview.push(keywordLine.substring(0, 100));
    }
    
    return preview.join(' ... ');
  }

  /**
   * Calcula relevância básica
   */
  calculateRelevance(text) {
    const keywords = ['decisão', 'insight', 'transformação', 'aprendizado', 'breakthrough'];
    let score = 50; // Base
    
    const lowerText = text.toLowerCase();
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        score += 10;
      }
    });
    
    return Math.min(100, score);
  }

  /**
   * Gera ID único para arquivo
   */
  generateFileId(path) {
    return 'file_' + btoa(path).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
  }

  /**
   * Detecta MIME type pela extensão
   */
  getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'md': 'text/markdown',
      'txt': 'text/plain',
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'gdoc': 'application/vnd.google-apps.document'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Obtém handle de arquivo por ID
   */
  getFileHandle(fileId) {
    return this.fileHandles.get(fileId);
  }
}

// Exporta instância singleton
export const fileDiscoveryService = new FileDiscoveryService();