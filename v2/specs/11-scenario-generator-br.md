# 11 - Scenario Generator BR (Test Data Generator) Spec

## Status: 🆕 GERADOR DE CENÁRIOS COM CONTEXTO BRASILEIRO

### Objetivo: Criar dados de teste realistas com tropicalização BR

## 🎭 CENÁRIOS DE NEGÓCIO BRASILEIROS

### 1. Vendas & Marketing (BR)
```javascript
const scenarioVendasBR = {
  id: 'vendas-marketing-br',
  name: 'Vendas e Marketing Brasil',
  description: 'Análise de mercado e estratégias comerciais brasileiras',
  
  companies: [
    'Magazine Luiza', 'Natura', 'Ambev', 'Itaú', 'Bradesco',
    'Americanas', 'Casas Bahia', 'Havaianas', 'O Boticário'
  ],
  
  patterns: {
    proposta: {
      template: 'Proposta Comercial - {cliente} - {produto} - R$ {valor}',
      examples: [
        'Proposta_Comercial_MagazineLuiza_Marketplace_R$450mil.pdf',
        'Proposta_Natura_Expansao_NE_R$1.2M.docx'
      ]
    },
    
    analise: {
      template: 'Análise {tipo} - {segmento} - {trimestre} {ano}',
      examples: [
        'Analise_Mercado_Varejo_Q3_2024.pdf',
        'Analise_Concorrencia_Ecommerce_Q2_2024.xlsx'
      ]
    },
    
    relatorio: {
      template: 'Relatório {tipo} - {periodo} - {regional}',
      examples: [
        'Relatorio_Vendas_Jan2024_Sul.pdf',
        'Relatorio_Performance_Q1_2024_Nordeste.pptx'
      ]
    }
  },
  
  keywords: [
    // Termos de negócio BR
    'faturamento', 'ticket médio', 'conversão', 'churn', 'LTV',
    'CAC', 'ROI', 'ROAS', 'market share', 'penetração',
    
    // Regiões brasileiras
    'região sul', 'nordeste', 'centro-oeste', 'sudeste', 'norte',
    'grande SP', 'grande Rio', 'interior paulista',
    
    // Moedas e valores
    'R$', 'reais', 'BRL', 'milhões', 'bilhões',
    
    // Datas BR
    'trimestre', 'semestre', '1º sem', '2º sem', 'YTD'
  ],
  
  metadata: {
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: '1.234,56', // Formato brasileiro
    fiscalYear: 'Janeiro-Dezembro'
  }
};
```

### 2. Jurídico & Administrativo (BR)
```javascript
const scenarioJuridicoBR = {
  id: 'juridico-admin-br',
  name: 'Jurídico e Administrativo Brasil',
  description: 'Documentos legais e compliance brasileiro',
  
  regulations: [
    'LGPD', 'CLT', 'Código Civil', 'Lei das S.A.', 'Marco Civil Internet',
    'Lei Anticorrupção', 'Código Defesa Consumidor', 'Lei Licitações'
  ],
  
  patterns: {
    contrato: {
      template: 'Contrato_{tipo}_{partes}_{data}',
      examples: [
        'Contrato_Prestacao_Servicos_Itau_Accenture_2024.pdf',
        'Contrato_Fornecimento_Ambev_Supplier_15012024.docx'
      ]
    },
    
    compliance: {
      template: '{tipo}_Compliance_{empresa}_{periodo}',
      examples: [
        'LGPD_Compliance_Natura_2024.pdf',
        'SOX_Compliance_Petrobras_Q1_2024.xlsx'
      ]
    },
    
    ata: {
      template: 'Ata_{tipo}_{data}_{sequencial}',
      examples: [
        'Ata_Reuniao_Diretoria_15012024_001.pdf',
        'Ata_Assembleia_Acionistas_30032024.pdf'
      ]
    }
  },
  
  keywords: [
    // Termos jurídicos BR
    'cláusula', 'artigo', 'parágrafo', 'inciso', 'alínea',
    'considerando', 'resolvem', 'têm entre si', 'justo e contratado',
    
    // Órgãos brasileiros
    'Receita Federal', 'BACEN', 'CVM', 'ANPD', 'TCU',
    'Ministério Público', 'Justiça do Trabalho', 'TRT',
    
    // Documentos BR
    'CNPJ', 'CPF', 'RG', 'certidão negativa', 'alvará',
    'procuração', 'substabelecimento', 'aditivo contratual'
  ],
  
  compliance: {
    LGPD: {
      terms: ['dados pessoais', 'consentimento', 'titular', 'controlador'],
      articles: ['Art. 5º', 'Art. 7º', 'Art. 9º', 'Art. 18']
    },
    CLT: {
      terms: ['jornada', 'férias', 'rescisão', 'FGTS', '13º salário'],
      articles: ['Art. 58', 'Art. 129', 'Art. 477']
    }
  }
};
```

### 3. Tecnologia & Inovação (BR)
```javascript
const scenarioTechBR = {
  id: 'tech-inovacao-br',
  name: 'Tecnologia e Inovação Brasil',
  description: 'Projetos tech e transformação digital no Brasil',
  
  companies: [
    'TOTVS', 'Locaweb', 'VTEX', 'Stone', 'PagSeguro',
    'Nubank', 'iFood', 'Mercado Livre', 'XP Inc.'
  ],
  
  patterns: {
    projeto: {
      template: 'PRJ_{codigo}_{cliente}_{tecnologia}',
      examples: [
        'PRJ_2024001_Bradesco_OpenBanking.md',
        'PRJ_2024015_MercadoLivre_ML_Recommendation.ipynb'
      ]
    },
    
    documentacao: {
      template: 'DOC_{sistema}_{versao}_{tipo}',
      examples: [
        'DOC_PIX_v2.1_Integracao.md',
        'DOC_NFe_v4.0_API_Reference.pdf'
      ]
    },
    
    lei_informatica: {
      template: 'P&D_Lei8248_{empresa}_{ano}',
      examples: [
        'P&D_Lei8248_Samsung_2024.xlsx',
        'P&D_LeiInformatica_Dell_2024_Relatorio.pdf'
      ]
    }
  },
  
  keywords: [
    // Tech BR específico
    'PIX', 'Open Banking', 'Open Finance', 'Drex', 'NFe', 'CTe',
    'eSocial', 'SPED', 'GovBR', 'CPF digital',
    
    // Frameworks BR
    'Lei de Informática', 'Lei do Bem', 'Marco Legal Startups',
    'Embrapii', 'BNDES', 'FINEP', 'CNPq',
    
    // Termos técnicos em PT
    'microsserviços', 'nuvem', 'inteligência artificial',
    'aprendizado de máquina', 'ciência de dados'
  ],
  
  integrations: {
    govBR: ['e-CAC', 'eSocial', 'SPED', 'SIAFI'],
    payment: ['PIX', 'TED', 'boleto', 'cartão'],
    fiscal: ['NFe', 'NFSe', 'CTe', 'MDFe']
  }
};
```

## 🔧 IMPLEMENTAÇÃO DO GERADOR

### Core Generator Engine
```javascript
class ScenarioGeneratorBR {
  constructor() {
    this.scenarios = [scenarioVendasBR, scenarioJuridicoBR, scenarioTechBR];
    this.enrichmentAPIs = {
      // APIs brasileiras para enriquecimento
      receitaFederal: 'https://www.receitaws.com.br/v1/cnpj/',
      bacen: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.',
      ibge: 'https://servicodados.ibge.gov.br/api/v1/',
      cep: 'https://viacep.com.br/ws/'
    };
  }
  
  async generateScenarioData(scenarioId, options = {}) {
    const scenario = this.scenarios.find(s => s.id === scenarioId);
    if (!scenario) throw new Error('Cenário não encontrado');
    
    const {
      fileCount = 50,
      dateRange = { start: '2023-01-01', end: '2024-12-31' },
      enrichWithRealData = true
    } = options;
    
    const files = [];
    
    for (let i = 0; i < fileCount; i++) {
      const file = await this.generateFile(scenario, {
        index: i,
        dateRange,
        enrichWithRealData
      });
      files.push(file);
    }
    
    return {
      scenario: scenario.name,
      files,
      metadata: this.generateMetadata(files),
      timestamp: new Date().toISOString()
    };
  }
  
  async generateFile(scenario, options) {
    // Seleciona padrão aleatório
    const patternKey = this.randomChoice(Object.keys(scenario.patterns));
    const pattern = scenario.patterns[patternKey];
    
    // Gera nome do arquivo
    const fileName = this.generateFileName(pattern, scenario);
    
    // Gera conteúdo
    const content = await this.generateContent(scenario, patternKey, options);
    
    // Enriquece com dados reais se habilitado
    if (options.enrichWithRealData) {
      content.enrichedData = await this.enrichContent(scenario, content);
    }
    
    return {
      id: this.generateHash(fileName),
      name: fileName,
      path: this.generatePath(scenario, patternKey),
      content: content.text,
      preview: this.generatePreview(content.text),
      metadata: {
        scenario: scenario.id,
        pattern: patternKey,
        generated: new Date().toISOString(),
        keywords: this.extractKeywords(content.text, scenario.keywords),
        enriched: content.enrichedData || null
      },
      relevanceScore: this.calculateRelevance(content, scenario)
    };
  }
  
  async enrichContent(scenario, content) {
    const enrichments = {};
    
    // Enriquece com dados de CNPJ se encontrar
    const cnpjMatch = content.text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    if (cnpjMatch) {
      try {
        const cnpjData = await this.fetchCNPJData(cnpjMatch[0]);
        enrichments.company = cnpjData;
      } catch (e) {
        console.warn('Falha ao buscar CNPJ:', e);
      }
    }
    
    // Enriquece com dados econômicos do BACEN
    if (scenario.id.includes('vendas')) {
      try {
        enrichments.economic = await this.fetchEconomicData();
      } catch (e) {
        console.warn('Falha ao buscar dados BACEN:', e);
      }
    }
    
    return enrichments;
  }
  
  generateBrazilianDate() {
    // Gera data no formato brasileiro
    const date = this.randomDate();
    return date.toLocaleDateString('pt-BR');
  }
  
  generateBrazilianCurrency() {
    // Gera valores em formato brasileiro
    const value = Math.random() * 1000000;
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }
  
  generateCNPJ() {
    // Gera CNPJ válido (simplificado)
    const nums = Array.from({length: 8}, () => Math.floor(Math.random() * 10));
    return `${nums.slice(0,2).join('')}.${nums.slice(2,5).join('')}.${nums.slice(5,8).join('')}/0001-${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`;
  }
}
```

### Integração com V2 Power User
```javascript
// Command Palette Commands
commands.push({
  id: 'generate-test-data',
  title: 'Generate Test Data (BR)',
  action: () => this.openTestDataGenerator()
});

commands.push({
  id: 'generate-scenario-vendas',
  title: 'Generate: Vendas & Marketing BR',
  action: () => this.generateScenario('vendas-marketing-br')
});

commands.push({
  id: 'generate-scenario-juridico',
  title: 'Generate: Jurídico & Admin BR',
  action: () => this.generateScenario('juridico-admin-br')
});

commands.push({
  id: 'generate-scenario-tech',
  title: 'Generate: Tech & Inovação BR',
  action: () => this.generateScenario('tech-inovacao-br')
});
```

### UI Component
```javascript
// Test Data Generator Modal
<div class="modal test-data-generator">
  <h2>🎭 Gerador de Cenários BR</h2>
  
  <div class="scenario-selector">
    <h3>Selecione o Cenário</h3>
    <div class="scenario-cards">
      <div class="card" onclick="selectScenario('vendas-marketing-br')">
        <h4>📊 Vendas & Marketing</h4>
        <p>Propostas, análises de mercado, relatórios de vendas</p>
        <span class="tag">Magazine Luiza, Natura, Ambev...</span>
      </div>
      
      <div class="card" onclick="selectScenario('juridico-admin-br')">
        <h4>⚖️ Jurídico & Admin</h4>
        <p>Contratos, compliance LGPD, documentos CLT</p>
        <span class="tag">LGPD, CLT, Código Civil...</span>
      </div>
      
      <div class="card" onclick="selectScenario('tech-inovacao-br')">
        <h4>💻 Tech & Inovação</h4>
        <p>Projetos PIX, Open Banking, Lei de Informática</p>
        <span class="tag">TOTVS, VTEX, Nubank...</span>
      </div>
    </div>
  </div>
  
  <div class="generation-options">
    <label>
      Quantidade de Arquivos
      <input type="number" value="50" min="10" max="500" />
    </label>
    
    <label>
      Período
      <input type="date" value="2023-01-01" /> até
      <input type="date" value="2024-12-31" />
    </label>
    
    <label>
      <input type="checkbox" checked /> 
      Enriquecer com dados reais (APIs BR)
    </label>
    
    <label>
      <input type="checkbox" checked /> 
      Gerar categorias automaticamente
    </label>
  </div>
  
  <div class="preview-section">
    <h3>Preview dos Arquivos</h3>
    <div class="file-preview-list">
      <!-- Preview dinâmico aqui -->
    </div>
  </div>
  
  <div class="actions">
    <button onclick="generateAndImport()">
      🚀 Gerar e Importar
    </button>
    <button onclick="exportScenarioConfig()">
      💾 Exportar Config
    </button>
  </div>
</div>
```

### Dados Específicos BR

#### Templates de Conteúdo
```javascript
const contentTemplatesBR = {
  proposta_comercial: `
PROPOSTA COMERCIAL Nº {numero}

{empresa}
CNPJ: {cnpj}
IE: {ie}

Prezado(a) {contato},

Em atenção à solicitação de V.Sa., apresentamos nossa proposta comercial 
para {servico}.

VALORES:
- Valor Total: {valor}
- Forma de Pagamento: {pagamento}
- Prazo de Entrega: {prazo}
- Validade da Proposta: 30 dias

CONDIÇÕES COMERCIAIS:
- Frete: CIF (por nossa conta)
- Impostos: Inclusos conforme legislação vigente
- Reajuste: IPCA anual

{cidade}, {data}

Atenciosamente,
{vendedor}
Departamento Comercial
  `,
  
  relatorio_compliance_lgpd: `
RELATÓRIO DE COMPLIANCE LGPD
{empresa}
Período: {periodo}

1. RESUMO EXECUTIVO
Este relatório apresenta o status de conformidade com a Lei Geral de 
Proteção de Dados (Lei nº 13.709/2018).

2. BASES LEGAIS UTILIZADAS
- Consentimento (Art. 7º, I)
- Cumprimento de obrigação legal (Art. 7º, II)
- Execução de contrato (Art. 7º, V)

3. INCIDENTES REPORTADOS
{incidentes}

4. MEDIDAS IMPLEMENTADAS
- Política de Privacidade atualizada
- DPO nomeado conforme Art. 41
- Treinamento de colaboradores

5. PRÓXIMOS PASSOS
{proximos_passos}

Data: {data}
Responsável: {dpo}
  `
};
```

#### Dados de Mercado BR
```javascript
const marketDataBR = {
  // Índices econômicos
  indices: {
    SELIC: 13.75,
    IPCA: 4.5,
    IGP_M: 3.8,
    CDI: 13.65,
    USD_BRL: 5.10
  },
  
  // Setores econômicos
  setores: [
    'Varejo', 'Indústria', 'Serviços', 'Agronegócio',
    'Tecnologia', 'Financeiro', 'Saúde', 'Educação'
  ],
  
  // Estados e capitais
  estados: {
    'SP': 'São Paulo',
    'RJ': 'Rio de Janeiro',
    'MG': 'Belo Horizonte',
    'RS': 'Porto Alegre',
    'PR': 'Curitiba',
    'BA': 'Salvador',
    'PE': 'Recife',
    'CE': 'Fortaleza'
  }
};
```

## 🎯 BENEFÍCIOS

1. **Dados Realistas BR**: Reflete a realidade empresarial brasileira
2. **Compliance**: Considera LGPD, CLT e regulamentações locais
3. **Formatos Corretos**: Datas, moedas e números no padrão BR
4. **APIs Brasileiras**: Integração com Receita, BACEN, IBGE
5. **Vocabulário Apropriado**: Termos e jargões do mercado brasileiro

## 📝 CONFIGURAÇÃO NO SETTINGS

```javascript
// Settings > Test Data
{
  generator: {
    defaultScenario: 'vendas-marketing-br',
    enrichmentEnabled: true,
    apiKeys: {
      receitaWS: '', // Opcional
      // Outras APIs BR
    },
    autoCategories: true,
    defaultFileCount: 50,
    locale: 'pt-BR'
  }
}
```

## 🚀 COMANDOS RÁPIDOS

```bash
# Via console
KC.TestGenerator.generate('vendas-marketing-br', { count: 100 })
KC.TestGenerator.listScenarios()
KC.TestGenerator.preview('juridico-admin-br')
KC.TestGenerator.exportConfig()
```

### Próximo: [12-achievement-files-spec.md](./12-achievement-files-spec.md)