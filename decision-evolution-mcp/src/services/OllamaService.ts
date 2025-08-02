import axios from 'axios';
import { config } from '../config.js';

export class OllamaService {
  private baseUrl: string;
  
  constructor() {
    // Try local first, fallback to VPS
    this.baseUrl = config.ollama.local;
    this.checkAvailability();
  }
  
  /**
   * Check if Ollama is available locally, fallback to VPS
   */
  private async checkAvailability() {
    try {
      await axios.get(`${this.baseUrl}/api/tags`);
      console.log('Using local Ollama at', this.baseUrl);
    } catch (error) {
      console.log('Local Ollama not available, switching to VPS');
      this.baseUrl = config.ollama.vps;
    }
  }
  
  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model: config.ollama.model,
        prompt: text
      });
      
      return response.data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return empty embedding on error
      return new Array(768).fill(0);
    }
  }
  
  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings = [];
    
    // Process in batches to avoid overwhelming the server
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }
  
  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (normA * normB);
  }
}