import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config.js';

export class QdrantService {
  private client: QdrantClient;
  
  constructor() {
    this.client = new QdrantClient({
      url: config.qdrant.url,
      port: 6333
    });
  }
  
  /**
   * Search for similar decisions in existing data
   */
  async findSimilarDecisions(embedding: number[], limit = 10) {
    try {
      const searchResult = await this.client.search(config.qdrant.collection, {
        vector: embedding,
        limit,
        with_payload: true,
        with_vector: false
      });
      
      return searchResult;
    } catch (error) {
      console.error('Error searching Qdrant:', error);
      return [];
    }
  }
  
  /**
   * Get specific points by IDs
   */
  async getDecisionsByIds(ids: string[]) {
    try {
      const points = await this.client.retrieve(config.qdrant.collection, {
        ids,
        with_payload: true,
        with_vector: true
      });
      
      return points;
    } catch (error) {
      console.error('Error retrieving from Qdrant:', error);
      return [];
    }
  }
  
  /**
   * Filter decisions by category or type
   */
  async filterDecisions(filters: {
    category?: string;
    analysisType?: string;
    minRelevance?: number;
  }) {
    const mustConditions = [];
    
    if (filters.category) {
      mustConditions.push({
        key: 'categories',
        match: { any: [filters.category] }
      });
    }
    
    if (filters.analysisType) {
      mustConditions.push({
        key: 'analysisType',
        match: { value: filters.analysisType }
      });
    }
    
    if (filters.minRelevance) {
      mustConditions.push({
        key: 'relevanceScore',
        range: { gte: filters.minRelevance }
      });
    }
    
    try {
      const scrollResult = await this.client.scroll(config.qdrant.collection, {
        filter: mustConditions.length > 0 ? { must: mustConditions } : undefined,
        limit: 100,
        with_payload: true,
        with_vector: false
      });
      
      return scrollResult.points || [];
    } catch (error) {
      console.error('Error filtering Qdrant:', error);
      return [];
    }
  }
  
  /**
   * Add new decision point
   */
  async addDecision(decision: {
    id: string;
    vector: number[];
    payload: any;
  }) {
    try {
      await this.client.upsert(config.qdrant.collection, {
        points: [{
          id: decision.id,
          vector: decision.vector,
          payload: {
            ...decision.payload,
            type: 'decision',
            created_at: new Date().toISOString()
          }
        }]
      });
      
      return { success: true, id: decision.id };
    } catch (error) {
      console.error('Error adding to Qdrant:', error);
      return { success: false, error };
    }
  }
}