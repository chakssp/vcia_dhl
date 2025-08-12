#!/usr/bin/env node

/**
 * 🎭 MULTI-WORKTREE ORCHESTRATOR
 * Sistema central de coordenação para 4 agentes especializados
 * 
 * Arquitetura:
 * - Orchestrator (este arquivo) = Maestro Central
 * - 4 Agentes = Especialistas em worktrees isolados
 * - Comunicação = Via shared-state.json + message queue
 * - Interoperabilidade = Orchestrator roteia mensagens entre agentes
 */

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const readline = require('readline');

// Configuração
const CONFIG = {
  baseDir: path.resolve(__dirname, '..'),
  stateFile: path.join(__dirname, 'shared-state.json'),
  tasksDir: path.join(__dirname, 'tasks'),
  logsDir: path.join(__dirname, 'logs'),
  worktrees: {
    convergence: '../vcia_dhl_convergence',
    ml_confidence: '../vcia_dhl_ml',
    ui_improvements: '../vcia_dhl_ui',
    performance: '../vcia_dhl_performance'
  }
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class MultiWorktreeOrchestrator {
  constructor() {
    this.state = this.loadState();
    this.messageQueue = [];
    this.activeAgents = new Map();
    this.rl = null;
  }

  // Carrega estado compartilhado
  loadState() {
    try {
      return JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
    } catch (error) {
      console.error('Erro ao carregar estado:', error);
      return this.createInitialState();
    }
  }

  // Salva estado compartilhado
  saveState() {
    fs.writeFileSync(CONFIG.stateFile, JSON.stringify(this.state, null, 2));
  }

  // Cria estado inicial
  createInitialState() {
    return {
      sprint_id: `sprint-${Date.now()}`,
      version: '1.0.0',
      last_update: new Date().toISOString(),
      status: {
        convergence: { progress: 0, blocked: false, health: 'ready' },
        ml_confidence: { progress: 0, blocked: false, health: 'ready' },
        ui_improvements: { progress: 0, blocked: false, health: 'ready' },
        performance: { progress: 0, blocked: false, health: 'ready' }
      },
      dependencies: {
        ml_confidence: ['convergence'],
        performance: ['convergence', 'ml_confidence']
      },
      messages: [],
      checkpoints: []
    };
  }

  // 🎯 CORE: Decompõe objetivo em tarefas para cada agente
  decomposeObjective(objective) {
    console.log(`${colors.cyan}[ORCHESTRATOR]${colors.reset} Analisando objetivo...`);
    
    const tasks = {
      convergence: [],
      ml_confidence: [],
      ui_improvements: [],
      performance: []
    };

    // Análise inteligente do objetivo
    const keywords = {
      convergence: ['convergência', 'convergence', 'semantic', 'navigation', 'search'],
      ml_confidence: ['confidence', 'ml', 'machine learning', 'score', 'metric'],
      ui_improvements: ['ui', 'interface', 'visual', 'dashboard', 'component'],
      performance: ['performance', 'optimization', 'cache', 'speed', 'memory']
    };

    // Identifica agentes relevantes
    for (const [agent, words] of Object.entries(keywords)) {
      if (words.some(word => objective.toLowerCase().includes(word))) {
        tasks[agent].push({
          id: `${agent}-2025-08-10-${Date.now()}`,
          description: `Handle ${agent} aspects of: ${objective}`,
          priority: 'normal',
          status: 'pending'
        });
      }
    }

    // Se nenhum agente específico, distribui para todos
    if (Object.values(tasks).every(t => t.length === 0)) {
      for (const agent of Object.keys(tasks)) {
        tasks[agent].push({
          id: `${agent}-2025-08-10-${Date.now()}`,
          description: `Contribute to: ${objective}`,
          priority: 'normal',
          status: 'pending'
        });
      }
    }

    return tasks;
  }

  // 📡 INTEROPERABILIDADE: Roteia mensagens entre agentes
  routeMessage(message) {
    const { from, to, type, data } = message;
    
    console.log(`${colors.magenta}[ROUTER]${colors.reset} ${from} → ${to}: ${type}`);
    
    // Adiciona à fila de mensagens
    this.state.messages.push({
      ...message,
      timestamp: new Date().toISOString(),
      routed: true
    });

    // Cria arquivo de tarefa no worktree destino
    const targetWorktree = CONFIG.worktrees[to];
    if (targetWorktree) {
      const taskFile = path.join(CONFIG.baseDir, targetWorktree, 'inbox', `msg-${Date.now()}.json`);
      
      // Cria diretório inbox se não existir
      const inboxDir = path.dirname(taskFile);
      if (!fs.existsSync(inboxDir)) {
        fs.mkdirSync(inboxDir, { recursive: true });
      }

      // Escreve mensagem
      fs.writeFileSync(taskFile, JSON.stringify(message, null, 2));
      
      console.log(`${colors.green}✓${colors.reset} Mensagem entregue para ${to}`);
    }

    // Verifica se precisa desbloquear
    if (type === 'UNBLOCK' && this.state.status[to].blocked) {
      this.state.status[to].blocked = false;
      console.log(`${colors.green}✓${colors.reset} ${to} desbloqueado!`);
    }

    this.saveState();
  }

  // 🔄 Processa mensagens pendentes de todos os agentes
  processAgentMessages() {
    console.log(`${colors.cyan}[ORCHESTRATOR]${colors.reset} Processando mensagens dos agentes...`);
    
    for (const [agent, worktreePath] of Object.entries(CONFIG.worktrees)) {
      const outboxDir = path.join(CONFIG.baseDir, worktreePath, 'outbox');
      
      if (fs.existsSync(outboxDir)) {
        const messages = fs.readdirSync(outboxDir)
          .filter(f => f.endsWith('.json'))
          .map(f => {
            const content = JSON.parse(fs.readFileSync(path.join(outboxDir, f), 'utf8'));
            fs.unlinkSync(path.join(outboxDir, f)); // Remove após processar
            return content;
          });

        // Roteia cada mensagem
        messages.forEach(msg => this.routeMessage(msg));
      }
    }
  }

  // 📊 Distribui tarefas para agentes
  distributeTasks(tasks) {
    console.log(`${colors.cyan}[ORCHESTRATOR]${colors.reset} Distribuindo tarefas...`);
    
    for (const [agent, agentTasks] of Object.entries(tasks)) {
      if (agentTasks.length > 0) {
        const worktreePath = CONFIG.worktrees[agent];
        const taskFile = path.join(CONFIG.baseDir, worktreePath, 'tasks.json');
        
        // Estrutura de tarefas para o agente
        const agentTaskFile = {
          assigned_by: 'orchestrator',
          assigned_at: new Date().toISOString(),
          priority: 'normal',
          tasks: agentTasks,
          report_to: 'orchestrator/outbox',
          sync_at: this.state.next_sync
        };

        fs.writeFileSync(taskFile, JSON.stringify(agentTaskFile, null, 2));
        
        console.log(`${colors.green}✓${colors.reset} ${agentTasks.length} tarefas para ${agent}`);
        
        // Atualiza status
        this.state.status[agent].current_task = agentTasks[0]?.description || 'idle';
      }
    }
    
    this.saveState();
  }

  // 🔍 Monitora progresso de todos os agentes
  monitorProgress() {
    console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}         ORCHESTRATOR DASHBOARD${colors.reset}`);
    console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);
    
    console.log(`Sprint: ${this.state.sprint_id}`);
    console.log(`Last Update: ${this.state.last_update}\n`);
    
    // Status de cada agente
    console.log('AGENT STATUS:');
    console.log('┌─────────────┬──────────┬─────────┬──────────┐');
    console.log('│ CONVERGENCE │    ML    │   UI    │   PERF   │');
    console.log('├─────────────┼──────────┼─────────┼──────────┤');
    
    const agents = ['convergence', 'ml_confidence', 'ui_improvements', 'performance'];
    const progresses = agents.map(a => `${this.state.status[a].progress}%`.padEnd(8));
    console.log(`│ ${progresses.join(' │ ')} │`);
    
    const healths = agents.map(a => {
      const health = this.state.status[a].health;
      const color = health === 'ready' ? colors.green : 
                   health === 'blocked' ? colors.red : colors.yellow;
      return `${color}●${colors.reset}`.padEnd(17);
    });
    console.log(`│ ${healths.join(' │ ')} │`);
    console.log('└─────────────┴──────────┴─────────┴──────────┘\n');
    
    // Dependências e bloqueios
    console.log('DEPENDENCIES:');
    for (const [agent, deps] of Object.entries(this.state.dependencies)) {
      if (this.state.status[agent].blocked) {
        console.log(`${colors.red}⚠${colors.reset} ${agent} → waiting for ${deps.join(', ')}`);
      }
    }
    
    // Mensagens recentes
    if (this.state.messages.length > 0) {
      console.log('\nRECENT MESSAGES:');
      this.state.messages.slice(-3).forEach(msg => {
        console.log(`  ${msg.from} → ${msg.to}: ${msg.type}`);
      });
    }
    
    console.log(`\nNext Sync: ${this.state.next_sync}`);
    console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);
  }

  // 🔄 Sincroniza todos os worktrees
  async syncWorktrees() {
    console.log(`${colors.cyan}[ORCHESTRATOR]${colors.reset} Sincronizando worktrees...`);
    
    for (const [agent, worktreePath] of Object.entries(CONFIG.worktrees)) {
      const fullPath = path.join(CONFIG.baseDir, worktreePath);
      
      try {
        // Commit mudanças
        execSync(`git add .`, { cwd: fullPath });
        execSync(`git commit -m "checkpoint: ${new Date().toISOString()}"`, { cwd: fullPath });
        
        console.log(`${colors.green}✓${colors.reset} ${agent} sincronizado`);
        
        // Atualiza progresso baseado em commits
        const logCount = execSync(`git log --oneline | wc -l`, { cwd: fullPath }).toString().trim();
        this.state.status[agent].progress = Math.min(parseInt(logCount) * 10, 100);
        
      } catch (error) {
        console.log(`${colors.yellow}⚠${colors.reset} ${agent}: nada para commitar`);
      }
    }
    
    this.state.last_update = new Date().toISOString();
    this.state.next_sync = new Date(Date.now() + 3600000).toISOString(); // +1 hora
    this.saveState();
  }

  // 🎮 Interface de comando interativa
  startInteractive() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `${colors.cyan}[ORCH]>${colors.reset} `
    });

    console.log(`${colors.bright}🎭 MULTI-WORKTREE ORCHESTRATOR${colors.reset}`);
    console.log('Digite "help" para ver comandos disponíveis\n');

    this.rl.prompt();

    this.rl.on('line', async (line) => {
      const [command, ...args] = line.trim().split(' ');
      
      switch (command) {
        case 'help':
          this.showHelp();
          break;
          
        case 'start':
          const objective = args.join(' ');
          if (objective) {
            const tasks = this.decomposeObjective(objective);
            this.distributeTasks(tasks);
          } else {
            console.log('Uso: start <objetivo>');
          }
          break;
          
        case 'status':
          this.monitorProgress();
          break;
          
        case 'sync':
          await this.syncWorktrees();
          break;
          
        case 'route':
          // route <from> <to> <type> <message>
          if (args.length >= 4) {
            this.routeMessage({
              from: args[0],
              to: args[1],
              type: args[2],
              data: args.slice(3).join(' ')
            });
          } else {
            console.log('Uso: route <from> <to> <type> <message>');
          }
          break;
          
        case 'messages':
          this.processAgentMessages();
          break;
          
        case 'clear':
          console.clear();
          break;
          
        case 'exit':
          console.log('Encerrando orchestrator...');
          process.exit(0);
          break;
          
        default:
          if (command) {
            console.log(`Comando desconhecido: ${command}`);
          }
      }
      
      this.rl.prompt();
    });
  }

  // Mostra ajuda
  showHelp() {
    console.log(`
${colors.bright}COMANDOS DISPONÍVEIS:${colors.reset}

  ${colors.cyan}start <objetivo>${colors.reset}     Inicia nova orquestração
  ${colors.cyan}status${colors.reset}               Mostra dashboard de progresso  
  ${colors.cyan}sync${colors.reset}                 Sincroniza todos os worktrees
  ${colors.cyan}route <params>${colors.reset}       Roteia mensagem entre agentes
  ${colors.cyan}messages${colors.reset}             Processa mensagens pendentes
  ${colors.cyan}clear${colors.reset}                Limpa tela
  ${colors.cyan}help${colors.reset}                 Mostra esta ajuda
  ${colors.cyan}exit${colors.reset}                 Sai do orchestrator

${colors.bright}EXEMPLOS:${colors.reset}

  start Implementar sistema de convergência semântica
  route convergence ml_confidence UNBLOCK "Engine ready"
  status
`);
  }

  // Inicia orchestrator
  async start() {
    // Cria estrutura de diretórios
    if (!fs.existsSync(CONFIG.tasksDir)) {
      fs.mkdirSync(CONFIG.tasksDir, { recursive: true });
    }
    if (!fs.existsSync(CONFIG.logsDir)) {
      fs.mkdirSync(CONFIG.logsDir, { recursive: true });
    }

    // Monitora mudanças no estado (polling)
    setInterval(() => {
      this.processAgentMessages();
    }, 5000); // Verifica mensagens a cada 5 segundos

    // Inicia interface interativa
    this.startInteractive();
  }
}

// Executa orchestrator
if (require.main === module) {
  const orchestrator = new MultiWorktreeOrchestrator();
  orchestrator.start();
}

module.exports = MultiWorktreeOrchestrator;