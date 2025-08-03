/**
 * Test Data Generator BR - Gerador de Dados de Teste Brasileiros
 * Gera cenários realistas com contexto brasileiro para testar o Knowledge Consolidator V2
 * 
 * Funcionalidades:
 * - 8 cenários brasileiros pré-definidos
 * - Conteúdo 100% em português brasileiro
 * - CPF/CNPJ válidos gerados algoritmicamente
 * - Datas e valores no formato BR
 * - Integração com Command Palette
 * - UI de seleção de cenários
 * 
 * @version 1.0.0
 * @author Claude Code
 * @date 2025-08-03
 */

import EventBus from '../core/EventBus.js';
import AppState from '../core/AppState.js';

export class TestDataGeneratorBR {
  constructor() {
    this.scenarios = {};
    this.templates = {};
    this.currentData = null;
    this.generationSettings = {
      fileCount: 50,
      dateRange: {
        start: '2023-01-01',
        end: new Date().toISOString().split('T')[0]
      },
      enrichWithRealData: true,
      autoCategories: true,
      locale: 'pt-BR'
    };
    
    this.init();
  }

  init() {
    this.setupScenarios();
    this.setupTemplates();
    this.setupBrazilianData();
    this.registerCommands();
  }

  setupScenarios() {
    this.scenarios = {
      'empresa-ti': {
        id: 'empresa-ti',
        name: '💻 Empresa de TI (Software House)',
        description: 'Software house brasileira desenvolvendo soluções enterprise',
        icon: '💻',
        companies: [
          'TOTVS', 'Softtek Brasil', 'Stefanini', 'Ci&T', 'Accenture Brasil',
          'IBM Brasil', 'Capgemini', 'Globant', 'Thoughtworks', 'BRQ'
        ],
        keywords: [
          'desenvolvimento', 'sprints', 'scrum', 'kanban', 'MVP',
          'microserviços', 'API REST', 'cloud AWS', 'DevOps', 'CI/CD',
          'React', 'Angular', 'Java', 'Python', '.NET', 'NodeJS',
          'banco de dados', 'PostgreSQL', 'MongoDB', 'Redis',
          'arquitetura', 'performance', 'escalabilidade', 'refatoração'
        ],
        fileTypes: ['projeto_spec.md', 'analise_tecnica.md', 'proposta_comercial.docx', 'ata_reuniao.md'],
        categories: ['Projetos', 'Propostas Comerciais', 'Análises Técnicas', 'Reuniões']
      },

      'escritorio-advocacia': {
        id: 'escritorio-advocacia',
        name: '⚖️ Escritório de Advocacia',
        description: 'Escritório jurídico especializado em direito empresarial',
        icon: '⚖️',
        companies: [
          'Pinheiro Neto', 'Mattos Filho', 'Machado Meyer', 'TozziniFreire',
          'Demarest', 'Lefosse', 'Veirano', 'DDSA', 'Cascione Pulino'
        ],
        keywords: [
          'contrato', 'cláusula', 'jurisprudência', 'petição', 'processo',
          'LGPD', 'CLT', 'Código Civil', 'Lei das S.A.', 'compliance',
          'due diligence', 'parecer jurídico', 'procuração', 'substabelecimento',
          'tribunal', 'decisão', 'acórdão', 'sentença', 'embargo'
        ],
        fileTypes: ['contrato.docx', 'parecer_juridico.pdf', 'peticao.docx', 'ata_audiencia.md'],
        categories: ['Contratos', 'Pareceres', 'Processos', 'Compliance']
      },

      'startup-fintech': {
        id: 'startup-fintech',
        name: '🏦 Startup Fintech',
        description: 'Fintech brasileira oferecendo soluções de pagamento digital',
        icon: '🏦',
        companies: [
          'Nubank', 'Stone', 'PagSeguro', 'iFood', 'Mercado Pago',
          'PicPay', 'Inter', 'C6 Bank', 'Next', 'Neon'
        ],
        keywords: [
          'PIX', 'Open Banking', 'cartão digital', 'maquininha', 'TEF',
          'KYC', 'compliance financeiro', 'BACEN', 'CVM', 'PCI DSS',
          'fraud detection', 'machine learning', 'analytics', 'dashboard',
          'taxa de conversão', 'chargeback', 'antifraude', 'tokenização'
        ],
        fileTypes: ['pitch_deck.pptx', 'analise_mercado.pdf', 'metricas_kpi.xlsx', 'roadmap_produto.md'],
        categories: ['Produtos', 'Métricas', 'Compliance', 'Mercado']
      },

      'agencia-marketing': {
        id: 'agencia-marketing',
        name: '📱 Agência de Marketing Digital',
        description: 'Agência full-service focada em performance marketing',
        icon: '📱',
        companies: [
          'Ogilvy Brasil', 'WMcCann', 'DPZ&T', 'AlmapBBDO', 'Africa',
          'Publicis', 'Grey Brasil', 'Leo Burnett', 'FCB Brasil'
        ],
        keywords: [
          'campanha', 'brand awareness', 'performance', 'ROI', 'ROAS',
          'Google Ads', 'Facebook Ads', 'Instagram', 'TikTok', 'YouTube',
          'influencer marketing', 'content marketing', 'SEO', 'SEM',
          'analytics', 'conversion rate', 'lead generation', 'funil de vendas'
        ],
        fileTypes: ['briefing_campanha.docx', 'relatorio_performance.pdf', 'plano_midia.xlsx', 'criativo_aprovacao.psd'],
        categories: ['Campanhas', 'Relatórios', 'Criativos', 'Planejamento']
      },

      'consultoria-empresarial': {
        id: 'consultoria-empresarial',
        name: '📈 Consultoria Empresarial',
        description: 'Consultoria estratégica para transformação organizacional',
        icon: '📈',
        companies: [
          'McKinsey Brasil', 'BCG', 'Bain', 'Deloitte', 'PwC',
          'KPMG', 'EY', 'Accenture Strategy', 'Oliver Wyman'
        ],
        keywords: [
          'estratégia', 'transformação digital', 'otimização processos', 'due diligence',
          'M&A', 'reestruturação', 'cost optimization', 'change management',
          'KPI', 'balanced scorecard', 'benchmarking', 'best practices',
          'governança corporativa', 'ESG', 'sustentabilidade', 'inovação'
        ],
        fileTypes: ['diagnostico_organizacional.pptx', 'plano_acao.docx', 'analise_swot.xlsx', 'roadmap_transformacao.pdf'],
        categories: ['Diagnósticos', 'Estratégia', 'Transformação', 'Governança']
      },

      'ecommerce-nacional': {
        id: 'ecommerce-nacional',
        name: '🛒 E-commerce Nacional',
        description: 'Varejista online com operação nacional',
        icon: '🛒',
        companies: [
          'Magazine Luiza', 'Americanas', 'Casas Bahia', 'Submarino',
          'Amazon Brasil', 'Shopee', 'Mercado Livre', 'OLX', 'Netshoes'
        ],
        keywords: [
          'marketplace', 'fulfillment', 'last mile', 'cross docking',
          'estoque', 'picking', 'packing', 'tracking', 'delivery',
          'NPS', 'SAC', 'customer experience', 'jornada do cliente',
          'conversão', 'carrinho abandono', 'upsell', 'cross-sell'
        ],
        fileTypes: ['analise_vendas.xlsx', 'relatorio_logistica.pdf', 'plano_black_friday.docx', 'customer_feedback.csv'],
        categories: ['Vendas', 'Logística', 'Customer Experience', 'Eventos']
      },

      'industria-manufatureira': {
        id: 'industria-manufatureira',
        name: '🏭 Indústria Manufatureira',
        description: 'Indústria de bens de consumo com produção nacional',
        icon: '🏭',
        companies: [
          'Ambev', 'JBS', 'BRF', 'Klabin', 'Suzano', 'CSN',
          'Gerdau', 'Vale', 'Petrobras', 'Braskem', 'Embraer'
        ],
        keywords: [
          'produção', 'qualidade', 'ISO 9001', 'lean manufacturing',
          'six sigma', 'kaizen', 'TPM', 'OEE', 'setup reduction',
          'supply chain', 'fornecedores', 'matéria-prima', 'inventário',
          'capacidade produtiva', 'gargalo', 'throughput', 'cycle time'
        ],
        fileTypes: ['relatorio_producao.xlsx', 'analise_qualidade.pdf', 'plano_manutencao.docx', 'auditoria_iso.pdf'],
        categories: ['Produção', 'Qualidade', 'Manutenção', 'Supply Chain']
      },

      'empresa-logistica': {
        id: 'empresa-logistica',
        name: '🚛 Empresa de Logística',
        description: 'Operadora logística com cobertura nacional',
        icon: '🚛',
        companies: [
          'Correios', 'Loggi', 'Total Express', 'Jadlog', 'Sequoia',
          'JSL', 'Localiza', 'Movida', 'Unidas', 'Patrus'
        ],
        keywords: [
          'frota', 'roteirização', 'GPS tracking', 'telemetria',
          'combustível', 'manutenção', 'pneus', 'motoristas',
          'ANTT', 'CT-e', 'MDFe', 'RNTRC', 'tacógrafo',
          'entregas', 'coletas', 'prazo', 'avarias', 'sinistros'
        ],
        fileTypes: ['relatorio_frota.xlsx', 'analise_rotas.pdf', 'controle_combustivel.csv', 'indicadores_entrega.xlsx'],
        categories: ['Frota', 'Rotas', 'Operações', 'Regulatório']
      }
    };
  }

  setupTemplates() {
    this.templates = {
      proposta_comercial: `
PROPOSTA COMERCIAL Nº {numero}

{empresa_cliente}
CNPJ: {cnpj_cliente}
Endereço: {endereco_cliente}

Prezado(a) {contato_cliente},

Em atenção à solicitação de V.Sa., apresentamos nossa proposta comercial para {servico_descricao}.

OBJETO:
{objeto_detalhado}

VALORES:
- Valor Total: {valor_total}
- Forma de Pagamento: {forma_pagamento}
- Prazo de Entrega: {prazo_entrega}
- Validade da Proposta: 30 (trinta) dias

CONDIÇÕES COMERCIAIS:
- Frete: {condicoes_frete}
- Impostos: Inclusos conforme legislação vigente
- Reajuste: {indice_reajuste} anual
- Garantia: {prazo_garantia}

OBSERVAÇÕES:
{observacoes_adicionais}

{cidade}, {data_proposta}

Atenciosamente,
{nome_vendedor}
{cargo_vendedor}
Departamento Comercial
      `,

      ata_reuniao: `
ATA DE REUNIÃO

Data: {data_reuniao}
Horário: {horario_inicio} às {horario_fim}
Local: {local_reuniao}
Assunto: {assunto_reuniao}

PARTICIPANTES:
{lista_participantes}

PAUTA:
{itens_pauta}

DECISÕES TOMADAS:
{decisoes_tomadas}

AÇÕES DEFINIDAS:
{acoes_responsaveis}

PRÓXIMA REUNIÃO:
Data: {proxima_reuniao}
Assunto: {assunto_proximo}

Sem mais assuntos, a reunião foi encerrada às {horario_fim}.

{responsavel_ata}
Responsável pela Ata
      `,

      relatorio_financeiro: `
RELATÓRIO FINANCEIRO - {periodo_referencia}

{empresa_nome}
CNPJ: {empresa_cnpj}

1. RESUMO EXECUTIVO
{resumo_executivo}

2. RECEITAS
- Receita Bruta: {receita_bruta}
- Deduções: {deducoes}
- Receita Líquida: {receita_liquida}

3. CUSTOS E DESPESAS
- Custos Operacionais: {custos_operacionais}
- Despesas Administrativas: {despesas_admin}
- Despesas Comerciais: {despesas_comerciais}

4. RESULTADO
- EBITDA: {ebitda}
- Lucro Líquido: {lucro_liquido}
- Margem Líquida: {margem_liquida}%

5. ANÁLISE DE INDICADORES
{analise_indicadores}

6. PROJEÇÕES
{projecoes_futuras}

Data do Relatório: {data_relatorio}
Responsável: {responsavel_financeiro}
      `,

      analise_tecnica: `
ANÁLISE TÉCNICA - {projeto_nome}

PROJETO: {codigo_projeto}
CLIENTE: {cliente_nome}
DATA: {data_analise}

1. ESCOPO TÉCNICO
{escopo_detalhado}

2. ARQUITETURA PROPOSTA
- Backend: {tecnologia_backend}
- Frontend: {tecnologia_frontend}
- Banco de Dados: {banco_dados}
- Infraestrutura: {infraestrutura}

3. REQUISITOS FUNCIONAIS
{requisitos_funcionais}

4. REQUISITOS NÃO FUNCIONAIS
- Performance: {requisitos_performance}
- Segurança: {requisitos_seguranca}
- Escalabilidade: {requisitos_escalabilidade}

5. RISCOS TÉCNICOS
{riscos_identificados}

6. CRONOGRAMA
{cronograma_entregas}

7. RECURSOS NECESSÁRIOS
{recursos_equipe}

Responsável Técnico: {tech_lead}
Aprovado por: {aprovador}
      `
    };
  }

  setupBrazilianData() {
    this.brazilianData = {
      nomesProprios: [
        'João', 'Maria', 'José', 'Ana', 'Carlos', 'Márcia', 'Paulo', 'Fernanda',
        'Pedro', 'Juliana', 'Lucas', 'Carla', 'Rafael', 'Beatriz', 'Daniel',
        'Patrícia', 'Felipe', 'Amanda', 'Ricardo', 'Larissa', 'Diego', 'Camila'
      ],
      sobrenomes: [
        'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira',
        'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins',
        'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa'
      ],
      estados: {
        'SP': { nome: 'São Paulo', capital: 'São Paulo' },
        'RJ': { nome: 'Rio de Janeiro', capital: 'Rio de Janeiro' },
        'MG': { nome: 'Minas Gerais', capital: 'Belo Horizonte' },
        'RS': { nome: 'Rio Grande do Sul', capital: 'Porto Alegre' },
        'PR': { nome: 'Paraná', capital: 'Curitiba' },
        'BA': { nome: 'Bahia', capital: 'Salvador' },
        'PE': { nome: 'Pernambuco', capital: 'Recife' },
        'CE': { nome: 'Ceará', capital: 'Fortaleza' }
      },
      setoresEconomicos: [
        'Tecnologia', 'Varejo', 'Indústria', 'Serviços', 'Agronegócio',
        'Financeiro', 'Saúde', 'Educação', 'Energia', 'Telecomunicações'
      ],
      formasPagamento: [
        'À vista', '30 dias', '60 dias', '90 dias',
        'Parcelado em 2x', 'Parcelado em 3x', 'Parcelado em 6x',
        'PIX', 'Transferência bancária', 'Cartão de crédito'
      ]
    };
  }

  registerCommands() {
    // Comandos para o Command Palette
    const commands = [
      {
        id: 'generate-test-data-br',
        label: '🎭 Generate Test Data BR',
        icon: '🎭',
        action: () => this.openTestDataModal(),
        category: 'testing'
      },
      {
        id: 'generate-empresa-ti',
        label: '💻 Generate: Empresa de TI',
        icon: '💻',
        action: () => this.quickGenerate('empresa-ti'),
        category: 'testing'
      },
      {
        id: 'generate-advocacia',
        label: '⚖️ Generate: Escritório Advocacia',
        icon: '⚖️',
        action: () => this.quickGenerate('escritorio-advocacia'),
        category: 'testing'
      },
      {
        id: 'generate-fintech',
        label: '🏦 Generate: Startup Fintech',
        icon: '🏦',
        action: () => this.quickGenerate('startup-fintech'),
        category: 'testing'
      },
      {
        id: 'generate-marketing',
        label: '📱 Generate: Agência Marketing',
        icon: '📱',
        action: () => this.quickGenerate('agencia-marketing'),
        category: 'testing'
      }
    ];

    // Register commands with Command Palette
    EventBus.emit('commands:register', { commands });
  }

  // Métodos de geração de dados brasileiros
  generateCPF() {
    const nums = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    
    // Primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += nums[i] * (10 - i);
    }
    const digit1 = 11 - (sum % 11);
    nums.push(digit1 >= 10 ? 0 : digit1);
    
    // Segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += nums[i] * (11 - i);
    }
    const digit2 = 11 - (sum % 11);
    nums.push(digit2 >= 10 ? 0 : digit2);
    
    return `${nums.slice(0, 3).join('')}.${nums.slice(3, 6).join('')}.${nums.slice(6, 9).join('')}-${nums.slice(9).join('')}`;
  }

  generateCNPJ() {
    const nums = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10));
    nums.push(0, 0, 0, 1); // Filial 0001
    
    // Primeiro dígito verificador
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += nums[i] * weights1[i];
    }
    const digit1 = 11 - (sum % 11);
    nums.push(digit1 >= 10 ? 0 : digit1);
    
    // Segundo dígito verificador
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += nums[i] * weights2[i];
    }
    const digit2 = 11 - (sum % 11);
    nums.push(digit2 >= 10 ? 0 : digit2);
    
    return `${nums.slice(0, 2).join('')}.${nums.slice(2, 5).join('')}.${nums.slice(5, 8).join('')}/${nums.slice(8, 12).join('')}-${nums.slice(12).join('')}`;
  }

  generateBrazilianDate(startDate = '2023-01-01', endDate = null) {
    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    const randomDate = new Date(randomTime);
    
    return randomDate.toLocaleDateString('pt-BR');
  }

  generateBrazilianCurrency(min = 1000, max = 1000000) {
    const value = Math.random() * (max - min) + min;
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  generateBrazilianName() {
    const nome = this.randomChoice(this.brazilianData.nomesProprios);
    const sobrenome = this.randomChoice(this.brazilianData.sobrenomes);
    return `${nome} ${sobrenome}`;
  }

  generateBrazilianCompany(scenario) {
    if (scenario && this.scenarios[scenario] && this.scenarios[scenario].companies) {
      return this.randomChoice(this.scenarios[scenario].companies);
    }
    
    const prefixos = ['Grupo', 'Cia', 'Empresa', 'Corporação', 'Organização'];
    const sufixos = ['Brasil', 'Nacional', 'Ltda', 'S.A.', 'Holding'];
    const nome = this.randomChoice(this.brazilianData.sobrenomes);
    
    return `${this.randomChoice(prefixos)} ${nome} ${this.randomChoice(sufixos)}`;
  }

  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Geração de conteúdo específico
  async generateFile(scenario, options = {}) {
    const scenarioData = this.scenarios[scenario];
    if (!scenarioData) {
      throw new Error(`Cenário não encontrado: ${scenario}`);
    }

    const fileType = this.randomChoice(scenarioData.fileTypes);
    const fileName = this.generateFileName(fileType, scenarioData);
    const content = await this.generateContent(fileType, scenarioData, options);
    
    return {
      id: this.generateHash(fileName),
      name: fileName,
      path: this.generatePath(scenarioData),
      content: content,
      preview: this.generatePreview(content),
      size: content.length,
      lastModified: new Date(this.generateBrazilianDate()).getTime(),
      type: this.getFileExtension(fileName),
      metadata: {
        scenario: scenario,
        fileType: fileType,
        generated: new Date().toISOString(),
        keywords: this.extractKeywords(content, scenarioData.keywords),
        categories: this.randomChoice(scenarioData.categories)
      }
    };
  }

  generateFileName(fileType, scenarioData) {
    const empresa = this.generateBrazilianCompany();
    const data = this.generateBrazilianDate().replace(/\//g, '');
    const numero = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    
    const patterns = {
      'projeto_spec.md': `PRJ_${numero}_${empresa.replace(/\s+/g, '_')}_Especificacao.md`,
      'analise_tecnica.md': `Analise_Tecnica_${empresa.replace(/\s+/g, '_')}_${data}.md`,
      'proposta_comercial.docx': `Proposta_Comercial_${numero}_${empresa.replace(/\s+/g, '_')}.docx`,
      'ata_reuniao.md': `Ata_Reuniao_${data}_${numero}.md`,
      'contrato.docx': `Contrato_Prestacao_Servicos_${empresa.replace(/\s+/g, '_')}_${data}.docx`,
      'parecer_juridico.pdf': `Parecer_Juridico_${numero}_${data}.pdf`,
      'relatorio_producao.xlsx': `Relatorio_Producao_${data}.xlsx`,
      'analise_vendas.xlsx': `Analise_Vendas_${data}.xlsx`
    };
    
    return patterns[fileType] || `Documento_${numero}_${data}.${this.getFileExtension(fileType)}`;
  }

  async generateContent(fileType, scenarioData, options = {}) {
    const templateKey = this.getTemplateKey(fileType);
    let template = this.templates[templateKey] || this.getDefaultTemplate();
    
    // Substitui placeholders com dados brasileiros
    const substitutions = this.generateSubstitutions(scenarioData);
    
    for (const [key, value] of Object.entries(substitutions)) {
      const regex = new RegExp(`{${key}}`, 'g');
      template = template.replace(regex, value);
    }
    
    // Adiciona conteúdo específico do cenário
    template += this.generateScenarioSpecificContent(scenarioData);
    
    return template;
  }

  generateSubstitutions(scenarioData) {
    const estado = this.randomChoice(Object.keys(this.brazilianData.estados));
    const estadoData = this.brazilianData.estados[estado];
    
    return {
      numero: Math.floor(Math.random() * 9999).toString().padStart(4, '0'),
      empresa_cliente: this.generateBrazilianCompany(scenarioData.id),
      cnpj_cliente: this.generateCNPJ(),
      endereco_cliente: `Rua ${this.randomChoice(this.brazilianData.sobrenomes)}, ${Math.floor(Math.random() * 9999)}, ${estadoData.capital}/${estado}`,
      contato_cliente: this.generateBrazilianName(),
      servico_descricao: this.generateServiceDescription(scenarioData),
      valor_total: this.generateBrazilianCurrency(50000, 5000000),
      forma_pagamento: this.randomChoice(this.brazilianData.formasPagamento),
      prazo_entrega: `${Math.floor(Math.random() * 90) + 30} dias`,
      data_proposta: this.generateBrazilianDate(),
      nome_vendedor: this.generateBrazilianName(),
      cargo_vendedor: this.randomChoice(['Gerente Comercial', 'Diretor de Vendas', 'Consultor Comercial']),
      cidade: estadoData.capital,
      empresa_nome: this.generateBrazilianCompany(scenarioData.id),
      empresa_cnpj: this.generateCNPJ(),
      periodo_referencia: this.generatePeriod(),
      receita_bruta: this.generateBrazilianCurrency(1000000, 50000000),
      receita_liquida: this.generateBrazilianCurrency(800000, 40000000),
      lucro_liquido: this.generateBrazilianCurrency(100000, 5000000),
      data_relatorio: this.generateBrazilianDate(),
      responsavel_financeiro: this.generateBrazilianName()
    };
  }

  generateServiceDescription(scenarioData) {
    const services = {
      'empresa-ti': [
        'desenvolvimento de sistema web responsivo',
        'migração de sistema legado para cloud',
        'implementação de API REST e microserviços',
        'consultoria em transformação digital'
      ],
      'escritorio-advocacia': [
        'elaboração de contrato de prestação de serviços',
        'consultoria em compliance LGPD',
        'due diligence para aquisição empresarial',
        'assessoria jurídica continuada'
      ],
      'startup-fintech': [
        'desenvolvimento de aplicativo de pagamentos',
        'integração com APIs bancárias',
        'implementação de sistema antifraude',
        'consultoria em Open Banking'
      ]
    };
    
    const serviceList = services[scenarioData.id] || ['prestação de serviços especializados'];
    return this.randomChoice(serviceList);
  }

  generatePeriod() {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const year = 2024;
    const month = this.randomChoice(months);
    return `${month}/${year}`;
  }

  generateScenarioSpecificContent(scenarioData) {
    const specificContent = {
      'empresa-ti': `

TECNOLOGIAS UTILIZADAS:
- Frontend: React 18 + TypeScript
- Backend: Node.js + Express
- Banco de Dados: PostgreSQL 15
- Cache: Redis
- Deploy: AWS ECS + CloudFront
- Monitoramento: New Relic + CloudWatch

METODOLOGIA ÁGIL:
- Sprints de 2 semanas
- Daily standups
- Retrospectivas quinzenais
- Code review obrigatório
- Testes automatizados (Jest + Cypress)

DOCUMENTAÇÃO TÉCNICA:
- Swagger/OpenAPI para APIs
- Confluence para documentação
- JIRA para gestão de tarefas
- GitLab para versionamento`,

      'escritorio-advocacia': `

LEGISLAÇÃO APLICÁVEL:
- Lei Geral de Proteção de Dados (LGPD) - Lei 13.709/2018
- Código Civil Brasileiro - Lei 10.406/2002
- Consolidação das Leis do Trabalho (CLT)
- Lei das Sociedades Anônimas - Lei 6.404/1976

JURISPRUDÊNCIA RELEVANTE:
- STJ - REsp 1.334.097/RJ
- STF - RE 583.523/RS
- TST - Súmula 331

COMPLIANCE E CONFORMIDADE:
- Certificado ISO 27001 (Segurança da Informação)
- Auditoria LGPD trimestral
- Treinamento em ética profissional
- Política de conflito de interesses`,

      'startup-fintech': `

REGULAMENTAÇÃO FINANCEIRA:
- Resolução BACEN nº 4.656/2018 (Arranjos de Pagamento)
- Circular BACEN nº 3.978/2020 (PIX)
- Lei 12.865/2013 (Sistema de Pagamentos Brasileiro)
- Resolução CMN nº 4.893/2021 (Open Banking)

INDICADORES DE PERFORMANCE:
- Taxa de Conversão: 3.2%
- Ticket Médio: R$ 247,00
- CAC (Customer Acquisition Cost): R$ 89,00
- LTV (Lifetime Value): R$ 1.840,00
- Churn Rate: 2.1% ao mês

SEGURANÇA E COMPLIANCE:
- Certificação PCI DSS Level 1
- Criptografia AES-256
- Autenticação multifator (2FA)
- Monitoramento 24/7 antifraude`,

      'agencia-marketing': `

CANAIS DE MÍDIA DIGITAL:
- Google Ads (Search + Display + YouTube)
- Meta Ads (Facebook + Instagram)
- LinkedIn Ads (B2B)
- TikTok Ads (Gen Z)
- Programmatic Buying (RTB)

MÉTRICAS DE PERFORMANCE:
- ROAS (Return on Ad Spend): 4.8x
- CTR (Click Through Rate): 2.3%
- CPC (Cost Per Click): R$ 1,85
- CPM (Cost Per Mille): R$ 12,40
- Conversion Rate: 3.7%

FERRAMENTAS DE ANALYTICS:
- Google Analytics 4 (GA4)
- Google Tag Manager
- Facebook Pixel
- Hotjar (Heatmaps)
- SEMrush (SEO/SEM)`
    };
    
    return specificContent[scenarioData.id] || '';
  }

  getTemplateKey(fileType) {
    const mapping = {
      'proposta_comercial.docx': 'proposta_comercial',
      'ata_reuniao.md': 'ata_reuniao',
      'relatorio_producao.xlsx': 'relatorio_financeiro',
      'analise_tecnica.md': 'analise_tecnica'
    };
    
    return mapping[fileType] || 'generic';
  }

  getDefaultTemplate() {
    return `
DOCUMENTO GERADO AUTOMATICAMENTE

Data de Geração: {data_relatorio}
Responsável: {nome_vendedor}

CONTEÚDO:
{servico_descricao}

OBSERVAÇÕES:
Este documento foi gerado automaticamente pelo Test Data Generator BR
para fins de teste do Knowledge Consolidator V2.

DADOS DA EMPRESA:
{empresa_nome}
CNPJ: {empresa_cnpj}
    `;
  }

  generatePreview(content) {
    // Gera preview inteligente similar ao PreviewUtils do V1
    const lines = content.split('\n').filter(line => line.trim());
    const preview = lines.slice(0, 5).join('\n');
    return preview.substring(0, 300) + (content.length > 300 ? '...' : '');
  }

  generatePath(scenarioData) {
    const paths = {
      'empresa-ti': '/projetos/desenvolvimento',
      'escritorio-advocacia': '/juridico/contratos',
      'startup-fintech': '/produtos/fintech',
      'agencia-marketing': '/campanhas/digital',
      'consultoria-empresarial': '/consultoria/estrategia',
      'ecommerce-nacional': '/vendas/ecommerce',
      'industria-manufatureira': '/producao/industrial',
      'empresa-logistica': '/operacoes/logistica'
    };
    
    return paths[scenarioData.id] || '/documentos/geral';
  }

  generateHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  getFileExtension(fileName) {
    return fileName.split('.').pop() || 'txt';
  }

  extractKeywords(content, scenarioKeywords) {
    const words = content.toLowerCase().split(/\s+/);
    return scenarioKeywords.filter(keyword => 
      words.some(word => word.includes(keyword.toLowerCase()))
    );
  }

  // Métodos principais de geração
  async generateScenarioData(scenarioId, options = {}) {
    const scenario = this.scenarios[scenarioId];
    if (!scenario) {
      throw new Error(`Cenário não encontrado: ${scenarioId}`);
    }

    const settings = { ...this.generationSettings, ...options };
    const files = [];

    console.log(`🎭 Gerando ${settings.fileCount} arquivos para cenário: ${scenario.name}`);
    
    for (let i = 0; i < settings.fileCount; i++) {
      try {
        const file = await this.generateFile(scenarioId, {
          index: i,
          ...settings
        });
        files.push(file);
        
        // Progress feedback
        if ((i + 1) % 10 === 0) {
          console.log(`📁 Gerados ${i + 1}/${settings.fileCount} arquivos`);
        }
      } catch (error) {
        console.error(`Erro ao gerar arquivo ${i}:`, error);
      }
    }

    this.currentData = {
      scenario: scenario.name,
      scenarioId: scenarioId,
      files,
      metadata: {
        generated: new Date().toISOString(),
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        categories: [...new Set(files.map(f => f.metadata.categories))],
        fileTypes: [...new Set(files.map(f => f.type))]
      },
      statistics: this.generateStatistics(files)
    };

    return this.currentData;
  }

  generateStatistics(files) {
    const byType = files.reduce((acc, file) => {
      acc[file.type] = (acc[file.type] || 0) + 1;
      return acc;
    }, {});

    const byCategory = files.reduce((acc, file) => {
      const category = file.metadata.categories;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return {
      byType,
      byCategory,
      averageSize: Math.round(files.reduce((sum, f) => sum + f.size, 0) / files.length),
      totalKeywords: files.reduce((sum, f) => sum + f.metadata.keywords.length, 0)
    };
  }

  // Interface pública
  async quickGenerate(scenarioId, fileCount = 25) {
    try {
      const data = await this.generateScenarioData(scenarioId, { fileCount });
      
      // Show summary
      console.log(`✅ Cenário gerado com sucesso!`);
      console.log(`📊 ${data.files.length} arquivos criados`);
      console.log(`📂 Categorias: ${data.metadata.categories.join(', ')}`);
      
      // Add to app state
      this.importToApp(data.files);
      
      return data;
    } catch (error) {
      console.error('❌ Erro na geração rápida:', error);
      throw error;
    }
  }

  importToApp(files) {
    // Integra os arquivos gerados ao estado da aplicação
    const currentFiles = AppState.get('discoveredFiles') || [];
    const mergedFiles = [...currentFiles, ...files];
    
    AppState.set('discoveredFiles', mergedFiles);
    AppState.set('lastTestDataGeneration', {
      timestamp: new Date().toISOString(),
      count: files.length
    });
    
    // Emite evento para atualizar UI
    EventBus.emit('files:imported', { 
      files: files,
      source: 'test-data-generator',
      count: files.length
    });
    
    console.log(`📂 ${files.length} arquivos importados para o Knowledge Consolidator`);
  }

  openTestDataModal() {
    EventBus.emit('modal:show', {
      type: 'test-data-generator',
      title: '🎭 Gerador de Dados de Teste Brasileiros',
      component: 'TestDataGeneratorModal',
      data: {
        scenarios: this.scenarios,
        settings: this.generationSettings
      }
    });
  }

  // Utility methods
  listScenarios() {
    return Object.values(this.scenarios).map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      icon: s.icon
    }));
  }

  getScenario(scenarioId) {
    return this.scenarios[scenarioId] || null;
  }

  updateSettings(newSettings) {
    this.generationSettings = { ...this.generationSettings, ...newSettings };
    console.log('⚙️ Configurações atualizadas:', this.generationSettings);
  }

  exportConfiguration() {
    const config = {
      scenarios: this.scenarios,
      settings: this.generationSettings,
      metadata: {
        version: '1.0.0',
        exported: new Date().toISOString()
      }
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-data-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('💾 Configuração exportada com sucesso');
  }

  // Preview method for Command Palette
  preview(scenarioId, count = 5) {
    return this.generateScenarioData(scenarioId, { fileCount: count });
  }
}

// Export singleton instance
export default new TestDataGeneratorBR();