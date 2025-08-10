/**
 * QdrantService - Serviço de conexão com Qdrant
 * 
 * ⚠️ POLÍTICA ZERO FALLBACK ⚠️
 * - NUNCA retornar dados mock se falhar
 * - SEMPRE mostrar erro real ao usuário
 * - NUNCA mascarar problemas de conexão
 */

import notificationService from '../utils/NotificationService.js';
import ANALYSIS_CONFIG from '../constants/analysisConfig.js';

class QdrantService {
  constructor(baseUrl = 'http://qdr.vcia.com.br:6333') {
    this.baseUrl = baseUrl;
    this.collectionName = 'knowledge_consolidator';
    this.connected = false;
  }

  /**
   * Conecta com o Qdrant - SEM FALLBACK!
   * Se falhar, PARA e AVISA o usuário
   */
  async connect() {
    try {
      console.log(`🔄 Tentando conectar ao Qdrant em ${this.baseUrl}...`);
      
      const response = await fetch(`${this.baseUrl}/collections`, {
        signal: AbortSignal.timeout(ANALYSIS_CONFIG.TIMEOUTS.CONNECTION_TIMEOUT)
      });
      
      if (!response.ok) {
        // NÃO usar fallback! Mostrar erro real
        const errorMsg = `❌ ERRO: Qdrant retornou status ${response.status}`;
        console.error(errorMsg);
        // Removido alert para melhor UX - deixar componente mostrar erro
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const collections = data.result?.collections || [];
      
      // Verificar se a collection existe
      const hasCollection = collections.some(c => c.name === this.collectionName);
      
      if (!hasCollection) {
        const errorMsg = `❌ ERRO: Collection '${this.collectionName}' não encontrada no Qdrant`;
        console.error(errorMsg);
        console.error('Collections disponíveis:', collections.map(c => c.name));
        
        // Use NotificationService instead of alert
        if (notificationService.isAvailable()) {
          notificationService.error(errorMsg, {
            title: 'Collection Não Encontrada',
            details: `Collections disponíveis: ${collections.map(c => c.name).join(', ')}`,
            timeout: 10000
          });
        }
        
        throw new Error(errorMsg);
      }

      this.connected = true;
      console.log('✅ Conectado ao Qdrant com sucesso!');
      return true;
      
    } catch (error) {
      // PROPAGAR erro, NÃO mascarar!
      this.connected = false;
      
      if (error.message.includes('Failed to fetch')) {
        const errorMsg = '❌ ERRO: Não foi possível conectar ao Qdrant';
        console.error(errorMsg);
        
        // Use NotificationService instead of alert
        if (notificationService.isAvailable()) {
          notificationService.connectionError('Qdrant', this.baseUrl, error);
        }
      }
      
      throw error; // Sempre propagar o erro!
    }
  }

  /**
   * Busca os campos disponíveis - SEM DADOS MOCK!
   */
  async getFields() {
    // PRIMEIRO: Garantir conexão
    if (!this.connected) {
      await this.connect(); // Se falhar, vai lançar erro
    }

    try {
      console.log('🔄 Buscando campos do Qdrant...');
      
      // Buscar pontos reais da collection
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/scroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: 1, // Só precisamos de um ponto para mapear campos
          with_payload: true,
          with_vector: false
        })
      });

      if (!response.ok) {
        const errorMsg = `❌ ERRO: Falha ao buscar campos (status ${response.status})`;
        console.error(errorMsg);
        
        if (notificationService.isAvailable()) {
          notificationService.error(errorMsg, {
            title: 'Erro ao Buscar Campos',
            timeout: 6000
          });
        }
        
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const points = data.result?.points || [];
      
      if (points.length === 0) {
        const errorMsg = '❌ ERRO: Nenhum ponto encontrado na collection';
        console.error(errorMsg);
        
        if (notificationService.isAvailable()) {
          notificationService.warning(errorMsg, {
            title: 'Collection Vazia',
            details: 'A collection existe mas não contém dados',
            timeout: 8000
          });
        }
        
        throw new Error(errorMsg);
      }

      // Extrair campos do primeiro ponto
      const samplePayload = points[0].payload;
      const fields = this.extractFields(samplePayload);
      
      console.log('✅ Campos encontrados:', fields);
      return fields;
      
    } catch (error) {
      console.error('❌ Erro ao buscar campos:', error);
      
      if (notificationService.isAvailable()) {
        notificationService.error('Erro ao buscar campos do Qdrant', {
          title: 'Erro na Busca de Campos',
          details: error.message,
          timeout: 8000
        });
      }
      
      throw error; // SEMPRE propagar!
    }
  }

  /**
   * Extrai estrutura de campos de um payload
   */
  extractFields(payload, prefix = '') {
    const fields = [];
    
    for (const [key, value] of Object.entries(payload)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      
      if (value === null || value === undefined) {
        fields.push({
          path: fieldPath,
          type: 'unknown',
          example: null
        });
      } else if (Array.isArray(value)) {
        fields.push({
          path: fieldPath,
          type: 'array',
          length: value.length,
          example: value[0]
        });
        
        // Se array tem objetos, mapear campos internos
        if (value.length > 0 && typeof value[0] === 'object') {
          const subFields = this.extractFields(value[0], fieldPath + '[0]');
          fields.push(...subFields);
        }
      } else if (typeof value === 'object') {
        // Recursivamente mapear objetos aninhados
        const subFields = this.extractFields(value, fieldPath);
        fields.push(...subFields);
      } else {
        fields.push({
          path: fieldPath,
          type: typeof value,
          example: value
        });
      }
    }
    
    return fields;
  }

  /**
   * Busca dados reais - SEM FALLBACK!
   */
  async getData(limit = 100) {
    if (!this.connected) {
      await this.connect(); // Se falhar, vai lançar erro
    }

    try {
      console.log(`🔄 Buscando ${limit} pontos do Qdrant...`);
      
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/scroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: limit,
          with_payload: true,
          with_vector: false
        })
      });

      if (!response.ok) {
        const errorMsg = `❌ ERRO: Falha ao buscar dados (status ${response.status})`;
        console.error(errorMsg);
        
        if (notificationService.isAvailable()) {
          notificationService.error(errorMsg, {
            title: 'Erro ao Buscar Dados',
            timeout: 6000
          });
        }
        
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const points = data.result?.points || [];
      
      console.log(`✅ ${points.length} pontos carregados do Qdrant`);
      return points;
      
    } catch (error) {
      console.error('❌ Erro ao buscar dados:', error);
      
      if (notificationService.isAvailable()) {
        notificationService.error('Erro ao buscar dados do Qdrant', {
          title: 'Erro na Busca de Dados',
          details: error.message,
          timeout: 8000
        });
      }
      
      throw error;
    }
  }

  /**
   * Testa a conexão
   */
  async testConnection() {
    try {
      await this.connect();
      return {
        success: true,
        message: 'Conexão com Qdrant estabelecida com sucesso!'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        details: 'Verifique se o servidor Qdrant está rodando e acessível'
      };
    }
  }
}

// Exportar como singleton
const qdrantService = new QdrantService();
export default qdrantService;