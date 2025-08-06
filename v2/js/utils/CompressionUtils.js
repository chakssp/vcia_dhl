/**
 * CompressionUtils - Utilitários de compressão para o PersistenceService
 * 
 * Fornece algoritmos de compressão otimizados para diferentes tipos de dados:
 * - JSON com compressão LZ-string
 * - Base64 para dados binários
 * - Gzip simulado para textos grandes
 * - Delta compression para dados similares
 * 
 * @version 2.0.0
 * @author Claude Code + Knowledge Consolidator Team
 */

class CompressionUtils {
  constructor() {
    this.algorithms = new Map();
    this.stats = {
      compressions: 0,
      decompressions: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      errors: 0
    };
    
    this.setupAlgorithms();
  }

  /**
   * Configurar algoritmos disponíveis
   */
  setupAlgorithms() {
    this.algorithms.set('base64_json', {
      compress: this.compressBase64JSON.bind(this),
      decompress: this.decompressBase64JSON.bind(this),
      suitableFor: ['object', 'array', 'string'],
      overhead: 1.37 // Base64 tem ~37% overhead
    });
    
    this.algorithms.set('lz_string', {
      compress: this.compressLZString.bind(this),
      decompress: this.decompressLZString.bind(this),
      suitableFor: ['string', 'object', 'array'],
      overhead: 0.7 // LZ-string geralmente comprime bem
    });
    
    this.algorithms.set('json_delta', {
      compress: this.compressJSONDelta.bind(this),
      decompress: this.decompressJSONDelta.bind(this),
      suitableFor: ['object', 'array'],
      overhead: 0.3 // Delta compression muito eficiente para dados similares
    });
    
    this.algorithms.set('simple_deflate', {
      compress: this.compressSimpleDeflate.bind(this),
      decompress: this.decompressSimpleDeflate.bind(this),
      suitableFor: ['string'],
      overhead: 0.6 // Compressão simples de texto
    });
  }

  /**
   * Comprimir dados automaticamente
   * @param {*} data - Dados para comprimir
   * @param {Object} options - Opções { algorithm, level, baseline }
   * @returns {Object} Dados comprimidos com metadata
   */
  async compress(data, options = {}) {
    try {
      this.stats.compressions++;
      
      const originalSize = this.calculateSize(data);
      this.stats.totalOriginalSize += originalSize;
      
      // Determinar melhor algoritmo se não especificado
      const algorithm = options.algorithm || this.chooseBestAlgorithm(data, options);
      
      if (!this.algorithms.has(algorithm)) {
        throw new Error(`Algoritmo de compressão desconhecido: ${algorithm}`);
      }
      
      const compressor = this.algorithms.get(algorithm);
      const startTime = performance.now();
      
      // Executar compressão
      const compressedData = await compressor.compress(data, options);
      
      const endTime = performance.now();
      const compressedSize = this.calculateSize(compressedData);
      this.stats.totalCompressedSize += compressedSize;
      
      const result = {
        type: 'compressed',
        algorithm,
        data: compressedData,
        metadata: {
          originalSize,
          compressedSize,
          ratio: compressedSize / originalSize,
          compressionTime: endTime - startTime,
          timestamp: Date.now(),
          version: '2.0.0'
        }
      };
      
      console.log(`[CompressionUtils] Comprimido com ${algorithm}:`, {
        originalSize,
        compressedSize,
        ratio: Math.round(result.metadata.ratio * 100) + '%',
        time: Math.round(result.metadata.compressionTime) + 'ms'
      });
      
      return result;
      
    } catch (error) {
      this.stats.errors++;
      console.error('[CompressionUtils] Erro na compressão:', error);
      
      // Retornar dados originais em caso de erro
      return {
        type: 'uncompressed',
        algorithm: 'none',
        data,
        metadata: {
          originalSize: this.calculateSize(data),
          error: error.message,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Descomprimir dados
   * @param {Object} compressedData - Dados comprimidos
   * @returns {*} Dados originais
   */
  async decompress(compressedData) {
    try {
      this.stats.decompressions++;
      
      // Se não está comprimido, retornar como está
      if (!compressedData || compressedData.type !== 'compressed') {
        return compressedData?.data || compressedData;
      }
      
      const { algorithm, data } = compressedData;
      
      if (!this.algorithms.has(algorithm)) {
        console.warn(`[CompressionUtils] Algoritmo desconhecido: ${algorithm}, retornando dados raw`);
        return data;
      }
      
      const compressor = this.algorithms.get(algorithm);
      const startTime = performance.now();
      
      const decompressedData = await compressor.decompress(data);
      
      const endTime = performance.now();
      
      console.log(`[CompressionUtils] Descomprimido com ${algorithm}:`, {
        time: Math.round(endTime - startTime) + 'ms'
      });
      
      return decompressedData;
      
    } catch (error) {
      this.stats.errors++;
      console.error('[CompressionUtils] Erro na descompressão:', error);
      
      // Tentar retornar dados raw em caso de erro
      return compressedData?.data || compressedData;
    }
  }

  /**
   * Escolher melhor algoritmo para os dados
   * @param {*} data - Dados para analisar
   * @param {Object} options - Opções
   * @returns {string} Nome do algoritmo
   */
  chooseBestAlgorithm(data, options = {}) {
    const dataType = this.analyzeDataType(data);
    const size = this.calculateSize(data);
    
    // Para dados pequenos, usar base64 (overhead baixo)
    if (size < 1024) {
      return 'base64_json';
    }
    
    // Para strings grandes, usar LZ-string
    if (dataType === 'string' && size > 5000) {
      return 'lz_string';
    }
    
    // Para objetos/arrays, usar LZ-string também
    if (['object', 'array'].includes(dataType)) {
      return 'lz_string';
    }
    
    // Padrão
    return 'base64_json';
  }

  /**
   * Analisar tipo de dados
   * @param {*} data - Dados para analisar
   * @returns {string} Tipo dos dados
   */
  analyzeDataType(data) {
    if (data === null || data === undefined) return 'null';
    if (Array.isArray(data)) return 'array';
    if (typeof data === 'object') return 'object';
    if (typeof data === 'string') return 'string';
    if (typeof data === 'number') return 'number';
    if (typeof data === 'boolean') return 'boolean';
    return 'unknown';
  }

  /**
   * Calcular tamanho dos dados
   * @param {*} data - Dados para medir
   * @returns {number} Tamanho em bytes
   */
  calculateSize(data) {
    try {
      if (data === null || data === undefined) return 0;
      
      const json = JSON.stringify(data);
      return new Blob([json]).size;
    } catch (error) {
      // Fallback para cálculo aproximado
      const str = String(data);
      return str.length * 2; // Assumir UTF-16
    }
  }

  /**
   * Compressão Base64 + JSON
   */
  async compressBase64JSON(data, options = {}) {
    const json = JSON.stringify(data);
    const base64 = btoa(encodeURIComponent(json));
    
    return {
      format: 'base64_json',
      data: base64,
      originalLength: json.length
    };
  }

  /**
   * Descompressão Base64 + JSON
   */
  async decompressBase64JSON(compressedData) {
    const { data: base64 } = compressedData;
    const json = decodeURIComponent(atob(base64));
    return JSON.parse(json);
  }

  /**
   * Compressão LZ-String (simulada)
   */
  async compressLZString(data, options = {}) {
    // Implementação simplificada de LZ-string
    const json = JSON.stringify(data);
    const compressed = this.simpleLZCompress(json);
    
    return {
      format: 'lz_string',
      data: compressed,
      originalLength: json.length
    };
  }

  /**
   * Descompressão LZ-String (simulada)
   */
  async decompressLZString(compressedData) {
    const { data: compressed } = compressedData;
    const json = this.simpleLZDecompress(compressed);
    return JSON.parse(json);
  }

  /**
   * Compressão Delta JSON
   */
  async compressJSONDelta(data, options = {}) {
    // Se há baseline, calcular delta
    if (options.baseline) {
      const delta = this.calculateJSONDelta(options.baseline, data);
      return {
        format: 'json_delta',
        data: delta,
        hasBaseline: true,
        baselineHash: this.hashObject(options.baseline)
      };
    }
    
    // Senão, comprimir normalmente
    return this.compressBase64JSON(data, options);
  }

  /**
   * Descompressão Delta JSON
   */
  async decompressJSONDelta(compressedData) {
    if (compressedData.hasBaseline) {
      // Precisa do baseline para reconstruir
      throw new Error('Delta compression requer baseline para descompressão');
    }
    
    return this.decompressBase64JSON(compressedData);
  }

  /**
   * Compressão Deflate simples
   */
  async compressSimpleDeflate(data, options = {}) {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const compressed = this.simpleTextCompress(text);
    
    return {
      format: 'simple_deflate',
      data: compressed,
      originalLength: text.length
    };
  }

  /**
   * Descompressão Deflate simples
   */
  async decompressSimpleDeflate(compressedData) {
    const { data: compressed } = compressedData;
    return this.simpleTextDecompress(compressed);
  }

  /**
   * Implementação simplificada de LZ compress
   */
  simpleLZCompress(input) {
    const dict = new Map();
    let dictIndex = 256;
    let current = '';
    const result = [];
    
    for (const char of input) {
      const combined = current + char;
      
      if (dict.has(combined)) {
        current = combined;
      } else {
        if (current) {
          result.push(dict.has(current) ? dict.get(current) : current.charCodeAt(0));
        }
        dict.set(combined, dictIndex++);
        current = char;
      }
    }
    
    if (current) {
      result.push(dict.has(current) ? dict.get(current) : current.charCodeAt(0));
    }
    
    return btoa(JSON.stringify(result));
  }

  /**
   * Implementação simplificada de LZ decompress
   */
  simpleLZDecompress(compressed) {
    try {
      const codes = JSON.parse(atob(compressed));
      const dict = new Map();
      let dictIndex = 256;
      
      // Inicializar dicionário com caracteres ASCII
      for (let i = 0; i < 256; i++) {
        dict.set(i, String.fromCharCode(i));
      }
      
      let result = '';
      let previous = '';
      
      for (const code of codes) {
        let current;
        
        if (dict.has(code)) {
          current = dict.get(code);
        } else if (code === dictIndex) {
          current = previous + previous[0];
        } else {
          throw new Error('Código inválido na descompressão LZ');
        }
        
        result += current;
        
        if (previous) {
          dict.set(dictIndex++, previous + current[0]);
        }
        
        previous = current;
      }
      
      return result;
    } catch (error) {
      console.warn('[CompressionUtils] Falha na descompressão LZ, tentando fallback');
      return compressed; // Retornar como está em caso de erro
    }
  }

  /**
   * Compressão simples de texto (RLE + Base64)
   */
  simpleTextCompress(text) {
    // Run-Length Encoding simples
    let compressed = '';
    let current = text[0];
    let count = 1;
    
    for (let i = 1; i < text.length; i++) {
      if (text[i] === current && count < 255) {
        count++;
      } else {
        compressed += String.fromCharCode(count) + current;
        current = text[i];
        count = 1;
      }
    }
    
    compressed += String.fromCharCode(count) + current;
    return btoa(compressed);
  }

  /**
   * Descompressão simples de texto
   */
  simpleTextDecompress(compressed) {
    try {
      const decoded = atob(compressed);
      let result = '';
      
      for (let i = 0; i < decoded.length; i += 2) {
        const count = decoded.charCodeAt(i);
        const char = decoded[i + 1];
        
        if (char) {
          result += char.repeat(count);
        }
      }
      
      return result;
    } catch (error) {
      console.warn('[CompressionUtils] Falha na descompressão de texto');
      return compressed;
    }
  }

  /**
   * Calcular delta entre dois objetos JSON
   */
  calculateJSONDelta(baseline, target) {
    const delta = {
      added: {},
      modified: {},
      removed: []
    };
    
    // Comparar propriedades
    const baselineKeys = new Set(Object.keys(baseline));
    const targetKeys = new Set(Object.keys(target));
    
    // Propriedades adicionadas
    for (const key of targetKeys) {
      if (!baselineKeys.has(key)) {
        delta.added[key] = target[key];
      }
    }
    
    // Propriedades removidas
    for (const key of baselineKeys) {
      if (!targetKeys.has(key)) {
        delta.removed.push(key);
      }
    }
    
    // Propriedades modificadas
    for (const key of targetKeys) {
      if (baselineKeys.has(key) && JSON.stringify(baseline[key]) !== JSON.stringify(target[key])) {
        delta.modified[key] = target[key];
      }
    }
    
    return delta;
  }

  /**
   * Gerar hash de objeto para identificação
   */
  hashObject(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Verificar se vale a pena comprimir
   * @param {*} data - Dados para avaliar
   * @param {number} threshold - Limite mínimo de tamanho
   * @returns {boolean} Se deve comprimir
   */
  shouldCompress(data, threshold = 1024) {
    const size = this.calculateSize(data);
    
    // Muito pequeno para valer a pena
    if (size < threshold) {
      return false;
    }
    
    // Dados que já parecem comprimidos (alta entropia)
    if (typeof data === 'string' && this.calculateEntropy(data) > 0.9) {
      return false;
    }
    
    return true;
  }

  /**
   * Calcular entropia de uma string
   * @param {string} str - String para analisar
   * @returns {number} Entropia (0-1)
   */
  calculateEntropy(str) {
    const freq = new Map();
    
    // Contar frequência dos caracteres
    for (const char of str) {
      freq.set(char, (freq.get(char) || 0) + 1);
    }
    
    // Calcular entropia
    let entropy = 0;
    const length = str.length;
    
    for (const count of freq.values()) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }
    
    // Normalizar (máximo teórico é log2 do número de caracteres únicos)
    const maxEntropy = Math.log2(freq.size);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  /**
   * Benchmark de algoritmos
   * @param {*} testData - Dados para testar
   * @returns {Object} Resultados do benchmark
   */
  async benchmark(testData) {
    const results = {};
    
    for (const [name, algorithm] of this.algorithms.entries()) {
      try {
        const startTime = performance.now();
        
        const compressed = await algorithm.compress(testData);
        const compressTime = performance.now() - startTime;
        
        const decompressStart = performance.now();
        const decompressed = await algorithm.decompress(compressed);
        const decompressTime = performance.now() - decompressStart;
        
        const originalSize = this.calculateSize(testData);
        const compressedSize = this.calculateSize(compressed);
        
        results[name] = {
          originalSize,
          compressedSize,
          ratio: compressedSize / originalSize,
          compressTime,
          decompressTime,
          totalTime: compressTime + decompressTime,
          valid: JSON.stringify(testData) === JSON.stringify(decompressed)
        };
        
      } catch (error) {
        results[name] = {
          error: error.message
        };
      }
    }
    
    return results;
  }

  /**
   * Obter estatísticas
   * @returns {Object} Estatísticas de uso
   */
  getStats() {
    const compressionRatio = this.stats.totalOriginalSize > 0 
      ? this.stats.totalCompressedSize / this.stats.totalOriginalSize 
      : 0;
    
    return {
      ...this.stats,
      compressionRatio,
      averageRatio: Math.round(compressionRatio * 100) + '%',
      spaceSaved: this.stats.totalOriginalSize - this.stats.totalCompressedSize,
      spaceSavedKB: Math.round((this.stats.totalOriginalSize - this.stats.totalCompressedSize) / 1024),
      algorithms: Array.from(this.algorithms.keys())
    };
  }

  /**
   * Reset das estatísticas
   */
  resetStats() {
    this.stats = {
      compressions: 0,
      decompressions: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      errors: 0
    };
  }
}

// Criar instância singleton
const compressionUtils = new CompressionUtils();

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.KC = window.KC || {};
  window.KC.CompressionUtils = compressionUtils;
}

// Exportar para ES6 modules
export default compressionUtils;