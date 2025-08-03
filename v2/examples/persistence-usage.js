/**
 * Exemplo de uso do PersistenceService V2
 * 
 * Este arquivo demonstra como usar o sistema de persistência unificado
 * para diferentes tipos de dados e operações.
 * 
 * @version 2.0.0
 * @author Claude Code + Knowledge Consolidator Team
 */

import persistenceService from '../js/services/PersistenceService.js';
import migrationManager from '../js/services/MigrationManager.js';

/**
 * Exemplos de uso básico
 */
class PersistenceExamples {
  constructor() {
    this.initialized = false;
  }

  /**
   * Inicializar e executar todos os exemplos
   */
  async init() {
    console.log('=== PERSISTENCE SERVICE V2 - EXEMPLOS DE USO ===');
    
    // 1. Inicializar serviço
    await this.initializeService();
    
    // 2. Operações básicas
    await this.basicOperations();
    
    // 3. Operações com compressão
    await this.compressionExamples();
    
    // 4. Operações de query
    await this.queryExamples();
    
    // 5. Cache e TTL
    await this.cacheExamples();
    
    // 6. Fallback e offline
    await this.fallbackExamples();
    
    // 7. Migração de dados
    await this.migrationExamples();
    
    // 8. Estatísticas e diagnóstico
    await this.statsExamples();
    
    console.log('=== EXEMPLOS CONCLUÍDOS ===');
  }

  /**
   * 1. Inicialização do serviço
   */
  async initializeService() {
    console.log('\n--- 1. Inicializando PersistenceService ---');
    
    try {
      const success = await persistenceService.initialize();
      console.log('✅ Inicialização:', success ? 'Sucesso' : 'Falhou');
      
      const stats = persistenceService.getStats();
      console.log('📊 Estado inicial:', {
        backend: stats.activeBackend,
        backends: stats.availableBackends,
        online: stats.online
      });
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
    }
  }

  /**
   * 2. Operações básicas (CRUD)
   */
  async basicOperations() {
    console.log('\n--- 2. Operações Básicas (CRUD) ---');
    
    try {
      // Salvar dados simples
      console.log('💾 Salvando dados...');
      
      await persistenceService.save('users', 'user1', {
        id: 'user1',
        name: 'João Silva',
        email: 'joao@exemplo.com',
        preferences: {
          theme: 'dark',
          language: 'pt-BR'
        },
        createdAt: new Date().toISOString()
      });
      
      await persistenceService.save('users', 'user2', {
        id: 'user2',
        name: 'Maria Santos',
        email: 'maria@exemplo.com',
        preferences: {
          theme: 'light',
          language: 'en-US'
        },
        createdAt: new Date().toISOString()
      });
      
      console.log('✅ Usuários salvos');
      
      // Carregar dados
      console.log('📖 Carregando dados...');
      
      const user1 = await persistenceService.load('users', 'user1');
      console.log('👤 User1:', user1?.name);
      
      const userNotFound = await persistenceService.load('users', 'user999', 'Usuário não encontrado');
      console.log('❓ User999:', userNotFound);
      
      // Atualizar dados
      console.log('✏️ Atualizando dados...');
      
      user1.lastLogin = new Date().toISOString();
      user1.preferences.theme = 'auto';
      
      await persistenceService.save('users', 'user1', user1);
      console.log('✅ User1 atualizado');
      
      // Deletar dados
      console.log('🗑️ Deletando dados...');
      
      await persistenceService.delete('users', 'user2');
      console.log('✅ User2 removido');
      
      // Verificar se foi deletado
      const deletedUser = await persistenceService.load('users', 'user2');
      console.log('🔍 User2 após deleção:', deletedUser || 'Não encontrado');
      
    } catch (error) {
      console.error('❌ Erro nas operações básicas:', error);
    }
  }

  /**
   * 3. Exemplos com compressão
   */
  async compressionExamples() {
    console.log('\n--- 3. Compressão de Dados ---');
    
    try {
      // Dados grandes para compressão
      const largeData = {
        id: 'doc1',
        title: 'Documento de Exemplo',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100),
        metadata: {
          author: 'Sistema',
          tags: ['exemplo', 'teste', 'compressão'],
          version: '1.0.0'
        },
        history: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          action: `Ação ${i + 1}`,
          details: `Detalhes da ação ${i + 1} com muito texto descritivo`.repeat(5)
        }))
      };
      
      console.log('📄 Dados originais:', {
        tamanho: JSON.stringify(largeData).length,
        historyItems: largeData.history.length
      });
      
      // Salvar com compressão forçada
      console.log('🗜️ Salvando com compressão...');
      
      await persistenceService.save('documents', 'doc1', largeData, {
        compression: true
      });
      
      console.log('✅ Documento salvo com compressão');
      
      // Carregar e verificar integridade
      console.log('📖 Carregando documento comprimido...');
      
      const loadedDoc = await persistenceService.load('documents', 'doc1');
      
      const isEqual = JSON.stringify(largeData) === JSON.stringify(loadedDoc);
      console.log('🔍 Integridade dos dados:', isEqual ? '✅ OK' : '❌ Erro');
      
      if (loadedDoc) {
        console.log('📊 Documento carregado:', {
          title: loadedDoc.title,
          contentLength: loadedDoc.content.length,
          historyItems: loadedDoc.history.length
        });
      }
      
    } catch (error) {
      console.error('❌ Erro nos exemplos de compressão:', error);
    }
  }

  /**
   * 4. Exemplos de queries
   */
  async queryExamples() {
    console.log('\n--- 4. Operações de Query ---');
    
    try {
      // Salvar vários produtos para demonstrar query
      const products = [
        { id: 'p1', name: 'Notebook', category: 'electronics', price: 2500, inStock: true },
        { id: 'p2', name: 'Mouse', category: 'electronics', price: 50, inStock: true },
        { id: 'p3', name: 'Cadeira', category: 'furniture', price: 300, inStock: false },
        { id: 'p4', name: 'Mesa', category: 'furniture', price: 500, inStock: true },
        { id: 'p5', name: 'Teclado', category: 'electronics', price: 150, inStock: true }
      ];
      
      console.log('💾 Salvando produtos...');
      
      for (const product of products) {
        await persistenceService.save('products', product.id, product);
      }
      
      console.log('✅ Produtos salvos');
      
      // Query simples - todos os produtos
      console.log('🔍 Buscando todos os produtos...');
      
      const allProducts = await persistenceService.query('products');
      console.log('📦 Total de produtos:', allProducts.length);
      
      // Query com filtro (simulada - depende da implementação do backend)
      console.log('🔍 Buscando produtos eletrônicos...');
      
      const electronics = await persistenceService.query('products', {
        category: 'electronics'
      });
      
      console.log('💻 Eletrônicos encontrados:', electronics.length);
      
      // Query com limite
      console.log('🔍 Buscando primeiros 3 produtos...');
      
      const limitedProducts = await persistenceService.query('products', {}, {
        limit: 3
      });
      
      console.log('📝 Produtos limitados:', limitedProducts.length);
      
    } catch (error) {
      console.error('❌ Erro nas queries:', error);
    }
  }

  /**
   * 5. Exemplos de cache e TTL
   */
  async cacheExamples() {
    console.log('\n--- 5. Cache e TTL ---');
    
    try {
      // Dados com TTL curto
      const sessionData = {
        sessionId: 'sess_123',
        userId: 'user1',
        loginTime: new Date().toISOString(),
        permissions: ['read', 'write']
      };
      
      console.log('⏰ Salvando dados de sessão com TTL...');
      
      await persistenceService.save('sessions', 'sess_123', sessionData, {
        ttl: 5000 // 5 segundos para demonstração
      });
      
      console.log('✅ Sessão salva com TTL de 5 segundos');
      
      // Carregar imediatamente (deve estar no cache)
      console.log('📖 Carregando da cache...');
      
      const cachedSession = await persistenceService.load('sessions', 'sess_123');
      console.log('🎯 Sessão do cache:', cachedSession ? '✅ Encontrada' : '❌ Não encontrada');
      
      // Forçar refresh do cache
      console.log('🔄 Forçando refresh...');
      
      const refreshedSession = await persistenceService.load('sessions', 'sess_123', null, {
        forceRefresh: true
      });
      
      console.log('🔄 Sessão após refresh:', refreshedSession ? '✅ Encontrada' : '❌ Não encontrada');
      
      // Aguardar expiração do TTL (demonstração)
      console.log('⏳ Aguardando expiração do TTL...');
      
      setTimeout(async () => {
        const expiredSession = await persistenceService.load('sessions', 'sess_123');
        console.log('⌛ Sessão após TTL:', expiredSession ? '⚠️ Ainda existe' : '✅ Expirada');
      }, 6000);
      
    } catch (error) {
      console.error('❌ Erro nos exemplos de cache:', error);
    }
  }

  /**
   * 6. Exemplos de fallback e modo offline
   */
  async fallbackExamples() {
    console.log('\n--- 6. Fallback e Modo Offline ---');
    
    try {
      // Simular dados importantes
      const criticalData = {
        id: 'critical_1',
        type: 'backup',
        timestamp: new Date().toISOString(),
        data: 'Dados críticos do sistema'
      };
      
      console.log('🛡️ Salvando dados críticos...');
      
      await persistenceService.save('critical', 'backup_1', criticalData);
      console.log('✅ Dados críticos salvos');
      
      // Verificar status dos backends
      const stats = persistenceService.getStats();
      console.log('📊 Status dos backends:', {
        ativo: stats.activeBackend,
        disponíveis: stats.availableBackends,
        online: stats.online
      });
      
      // Simular operação offline (adicionada à sync queue)
      const offlineData = {
        id: 'offline_1',
        timestamp: new Date().toISOString(),
        message: 'Dados salvos offline'
      };
      
      console.log('📱 Simulando operação offline...');
      
      // Essa operação será adicionada à sync queue se offline
      await persistenceService.save('offline', 'data_1', offlineData);
      
      console.log('✅ Dados offline processados');
      console.log('📋 Sync queue size:', stats.sync.queueSize);
      
    } catch (error) {
      console.error('❌ Erro nos exemplos de fallback:', error);
    }
  }

  /**
   * 7. Exemplos de migração
   */
  async migrationExamples() {
    console.log('\n--- 7. Sistema de Migração ---');
    
    try {
      // Simular dados V1 no localStorage
      console.log('📦 Simulando dados V1...');
      
      localStorage.setItem('kc_test_data', JSON.stringify({
        version: '1.0.0',
        data: 'Dados de teste V1'
      }));
      
      localStorage.setItem('kc_old_config', JSON.stringify({
        theme: 'dark',
        language: 'pt-BR'
      }));
      
      console.log('✅ Dados V1 simulados');
      
      // Analisar necessidades de migração
      console.log('🔍 Analisando necessidades de migração...');
      
      const migrationAnalysis = await migrationManager.migrate({ onlyCheck: true });
      
      console.log('📊 Análise de migração:', {
        necessária: migrationAnalysis.plan.total > 0,
        migrações: migrationAnalysis.plan.total,
        tempoEstimado: migrationAnalysis.plan.estimatedTime + 'ms'
      });
      
      // Executar migração se necessário
      if (migrationAnalysis.plan.total > 0) {
        console.log('🔄 Executando migração...');
        
        const migrationResult = await migrationManager.migrate({
          skipBackup: true // Para exemplo, pular backup
        });
        
        console.log('📊 Resultado da migração:', {
          sucesso: migrationResult.success,
          backupId: migrationResult.backupId,
          mensagem: migrationResult.message
        });
      }
      
    } catch (error) {
      console.error('❌ Erro nos exemplos de migração:', error);
    }
  }

  /**
   * 8. Estatísticas e diagnóstico
   */
  async statsExamples() {
    console.log('\n--- 8. Estatísticas e Diagnóstico ---');
    
    try {
      // Estatísticas do serviço
      const stats = persistenceService.getStats();
      
      console.log('📊 Estatísticas do PersistenceService:');
      console.log('- Backend ativo:', stats.activeBackend);
      console.log('- Backends disponíveis:', stats.availableBackends);
      console.log('- Online:', stats.online);
      console.log('- Cache:', `${stats.cache.size} itens`);
      console.log('- Sync queue:', `${stats.sync.queueSize} itens`);
      
      // Diagnóstico completo
      const diagnosis = persistenceService.diagnose();
      
      console.log('🔧 Diagnóstico completo:');
      console.log('- Inicializado:', diagnosis.service.initialized);
      console.log('- Backends:', Object.keys(diagnosis.backends));
      console.log('- Cache size:', diagnosis.cache.size);
      console.log('- Sync queue:', diagnosis.syncQueue.length);
      
      // Estatísticas de migração
      const migrationStats = migrationManager.getStats();
      
      console.log('📈 Estatísticas de migração:');
      console.log('- Versão atual:', migrationStats.currentVersion);
      console.log('- Migrações disponíveis:', migrationStats.availableMigrations.length);
      console.log('- Histórico:', migrationStats.migrationHistory);
      
      // Diagnóstico de migração
      const migrationDiagnosis = await migrationManager.diagnose();
      
      console.log('🔍 Diagnóstico de migração:');
      console.log('- Dados V1 restantes:', migrationDiagnosis.v1DataRemaining.needed);
      console.log('- Backups disponíveis:', migrationDiagnosis.availableBackups);
      
    } catch (error) {
      console.error('❌ Erro nas estatísticas:', error);
    }
  }

  /**
   * Limpar dados de exemplo
   */
  async cleanup() {
    console.log('\n--- Limpeza de Dados de Exemplo ---');
    
    try {
      const collections = ['users', 'documents', 'products', 'sessions', 'critical', 'offline'];
      
      for (const collection of collections) {
        await persistenceService.clear(collection);
        console.log(`🧹 Coleção ${collection} limpa`);
      }
      
      // Limpar dados de teste do localStorage
      localStorage.removeItem('kc_test_data');
      localStorage.removeItem('kc_old_config');
      
      console.log('✅ Limpeza concluída');
      
    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
    }
  }
}

// Executar exemplos se chamado diretamente
if (typeof window !== 'undefined') {
  window.PersistenceExamples = PersistenceExamples;
  
  // Função global para executar exemplos
  window.runPersistenceExamples = async function() {
    const examples = new PersistenceExamples();
    await examples.init();
    
    // Opcionalmente limpar após 30 segundos
    setTimeout(() => {
      examples.cleanup();
    }, 30000);
  };
  
  console.log('💡 Execute runPersistenceExamples() no console para ver os exemplos');
}

export default PersistenceExamples;