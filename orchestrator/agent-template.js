#!/usr/bin/env node

/**
 * 🤖 AGENT TEMPLATE
 * Template base para agentes especializados que reportam ao orchestrator
 * 
 * Cada agente:
 * - Roda em seu próprio worktree isolado
 * - Recebe tarefas via tasks.json
 * - Envia mensagens via outbox/
 * - Recebe mensagens via inbox/
 * - Reporta progresso ao orchestrator
 */

const fs = require('fs');
const path = require('path');

class SpecializedAgent {
  constructor(config) {
    this.name = config.name || 'agent';
    this.specialization = config.specialization || 'general';
    this.workdir = process.cwd();
    
    // Diretórios de comunicação
    this.inbox = path.join(this.workdir, 'inbox');
    this.outbox = path.join(this.workdir, 'outbox');
    this.tasksFile = path.join(this.workdir, 'tasks.json');
    
    // Estado interno
    this.currentTasks = [];
    this.progress = 0;
    
    this.setupDirectories();
  }

  // Cria estrutura de diretórios
  setupDirectories() {
    if (!fs.existsSync(this.inbox)) {
      fs.mkdirSync(this.inbox, { recursive: true });
    }
    if (!fs.existsSync(this.outbox)) {
      fs.mkdirSync(this.outbox, { recursive: true });
    }
  }

  // Carrega tarefas atribuídas pelo orchestrator
  loadTasks() {
    if (fs.existsSync(this.tasksFile)) {
      const data = JSON.parse(fs.readFileSync(this.tasksFile, 'utf8'));
      this.currentTasks = data.tasks || [];
      console.log(`[${this.name}] Carregadas ${this.currentTasks.length} tarefas`);
      return this.currentTasks;
    }
    return [];
  }

  // Processa mensagens recebidas
  processInbox() {
    if (!fs.existsSync(this.inbox)) return;
    
    const messages = fs.readdirSync(this.inbox)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const filepath = path.join(this.inbox, f);
        const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        fs.unlinkSync(filepath); // Remove após ler
        return content;
      });

    messages.forEach(msg => {
      console.log(`[${this.name}] Mensagem de ${msg.from}: ${msg.type}`);
      this.handleMessage(msg);
    });
  }

  // Manipula mensagem recebida (sobrescrever em agentes específicos)
  handleMessage(message) {
    const { from, type, data } = message;
    
    switch (type) {
      case 'DEPENDENCY_READY':
        console.log(`[${this.name}] Dependência ${from} está pronta`);
        this.onDependencyReady(from, data);
        break;
        
      case 'REQUEST_DATA':
        console.log(`[${this.name}] ${from} solicitou dados`);
        this.onDataRequest(from, data);
        break;
        
      case 'SYNC':
        console.log(`[${this.name}] Sincronização solicitada`);
        this.onSyncRequest(data);
        break;
        
      default:
        console.log(`[${this.name}] Tipo de mensagem não reconhecido: ${type}`);
    }
  }

  // Envia mensagem para outro agente via orchestrator
  sendMessage(to, type, data) {
    const message = {
      from: this.name,
      to: to,
      type: type,
      data: data,
      timestamp: new Date().toISOString()
    };

    const filename = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`;
    const filepath = path.join(this.outbox, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(message, null, 2));
    console.log(`[${this.name}] Mensagem enviada para ${to}: ${type}`);
  }

  // Reporta progresso ao orchestrator
  reportProgress(progress, status = 'working') {
    this.progress = progress;
    this.sendMessage('orchestrator', 'PROGRESS_UPDATE', {
      agent: this.name,
      progress: progress,
      status: status,
      timestamp: new Date().toISOString()
    });
  }

  // Notifica conclusão de tarefa
  completeTask(taskId, result) {
    this.sendMessage('orchestrator', 'TASK_COMPLETE', {
      agent: this.name,
      taskId: taskId,
      result: result,
      timestamp: new Date().toISOString()
    });
    
    // Remove tarefa da lista
    this.currentTasks = this.currentTasks.filter(t => t.id !== taskId);
  }

  // Solicita desbloqueio (quando dependência resolvida)
  requestUnblock(targetAgent, reason) {
    this.sendMessage(targetAgent, 'UNBLOCK', {
      reason: reason,
      readyData: this.getReadyData()
    });
  }

  // Métodos para sobrescrever em agentes específicos
  onDependencyReady(from, data) {
    // Implementar em agente específico
  }

  onDataRequest(from, data) {
    // Implementar em agente específico
  }

  onSyncRequest(data) {
    // Implementar em agente específico
  }

  getReadyData() {
    // Implementar em agente específico
    return {};
  }

  // Loop principal do agente
  async run() {
    console.log(`[${this.name}] Agente ${this.specialization} iniciado`);
    
    // Loop de processamento
    setInterval(() => {
      // Processa inbox
      this.processInbox();
      
      // Carrega novas tarefas
      this.loadTasks();
      
      // Processa tarefas (implementar em agente específico)
      if (this.currentTasks.length > 0) {
        this.processTasks();
      }
      
    }, 3000); // Verifica a cada 3 segundos
  }

  // Processa tarefas (sobrescrever em agentes específicos)
  processTasks() {
    console.log(`[${this.name}] Processando ${this.currentTasks.length} tarefas...`);
    // Implementação específica do agente
  }
}

// Exporta classe base
module.exports = SpecializedAgent;

// Se executado diretamente, cria agente exemplo
if (require.main === module) {
  const agent = new SpecializedAgent({
    name: 'example-agent',
    specialization: 'testing'
  });
  
  agent.run();
}