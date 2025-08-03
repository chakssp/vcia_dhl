# Test Data Generator BR - Documentação

## Visão Geral

O **Test Data Generator BR** é um gerador avançado de dados de teste com contexto 100% brasileiro, desenvolvido especificamente para o Knowledge Consolidator V2. Ele cria cenários realistas que refletem a realidade empresarial brasileira, incluindo documentos, contratos, relatórios e análises em português brasileiro.

## Características Principais

### ✅ **Implementado e Funcional**

- **8 Cenários Brasileiros Completos**
- **Dados 100% em Português Brasileiro** 
- **CPF/CNPJ Válidos** (gerados algoritmicamente)
- **Datas e Valores no Formato BR**
- **Integração Completa com Command Palette**
- **Interface Visual Intuitiva**
- **Conteúdo Realista e Contextualizado**

## Cenários Disponíveis

### 1. 💻 **Empresa de TI (Software House)**
- Empresas: TOTVS, Softtek Brasil, Stefanini, Ci&T, Accenture Brasil
- Documentos: Especificações de projeto, análises técnicas, propostas comerciais
- Tecnologias: React, Node.js, PostgreSQL, AWS, DevOps
- Categorias: Projetos, Propostas Comerciais, Análises Técnicas

### 2. ⚖️ **Escritório de Advocacia**
- Escritórios: Pinheiro Neto, Mattos Filho, Machado Meyer, TozziniFreire
- Documentos: Contratos, pareceres jurídicos, petições, compliance LGPD
- Legislação: LGPD, CLT, Código Civil, Lei das S.A.
- Categorias: Contratos, Pareceres, Processos, Compliance

### 3. 🏦 **Startup Fintech**
- Empresas: Nubank, Stone, PagSeguro, PicPay, Inter
- Documentos: Pitch decks, análises de mercado, métricas KPI
- Tecnologias: PIX, Open Banking, antifraude, machine learning
- Categorias: Produtos, Métricas, Compliance, Mercado

### 4. 📱 **Agência de Marketing Digital**
- Agências: Ogilvy Brasil, WMcCann, DPZ&T, AlmapBBDO
- Documentos: Briefings de campanha, relatórios de performance, planos de mídia
- Plataformas: Google Ads, Facebook Ads, Instagram, TikTok
- Categorias: Campanhas, Relatórios, Criativos, Planejamento

### 5. 📈 **Consultoria Empresarial**
- Consultorias: McKinsey Brasil, BCG, Bain, Deloitte, PwC
- Documentos: Diagnósticos organizacionais, planos de ação, análises SWOT
- Metodologias: Transformação digital, change management, ESG
- Categorias: Diagnósticos, Estratégia, Transformação, Governança

### 6. 🛒 **E-commerce Nacional**
- Empresas: Magazine Luiza, Americanas, Casas Bahia, Mercado Livre
- Documentos: Análises de vendas, relatórios de logística, customer feedback
- Métricas: NPS, conversão, churn, LTV
- Categorias: Vendas, Logística, Customer Experience, Eventos

### 7. 🏭 **Indústria Manufatureira**
- Empresas: Ambev, JBS, BRF, Klabin, Suzano, Vale
- Documentos: Relatórios de produção, análises de qualidade, auditorias ISO
- Metodologias: Lean manufacturing, Six Sigma, TPM
- Categorias: Produção, Qualidade, Manutenção, Supply Chain

### 8. 🚛 **Empresa de Logística**
- Empresas: Correios, Loggi, Total Express, Jadlog, JSL
- Documentos: Relatórios de frota, análises de rotas, controle de combustível
- Regulamentação: ANTT, CT-e, MDFe, RNTRC
- Categorias: Frota, Rotas, Operações, Regulatório

## Como Usar

### 📋 **Via Command Palette (Recomendado)**

1. **Abrir Command Palette**: `Ctrl+K`
2. **Digitar**: `Generate Test Data BR`
3. **Selecionar o comando desejado**:
   - `🎭 Generate Test Data BR` - Interface completa
   - `💻 Generate: Empresa de TI` - Geração rápida
   - `⚖️ Generate: Escritório Advocacia` - Geração rápida
   - `🏦 Generate: Startup Fintech` - Geração rápida
   - E outros...

### 🖥️ **Via Interface Visual**

1. **Comando**: `🎭 Generate Test Data BR`
2. **Selecionar Cenário**: Clique no card do cenário desejado
3. **Configurar Parâmetros**:
   - Quantidade de arquivos (5-500)
   - Período de datas
   - Enriquecimento com APIs brasileiras
   - Geração automática de categorias
4. **Preview**: Clique em "Gerar Preview" para ver exemplos
5. **Gerar**: Clique em "Gerar e Importar"

### 💻 **Via Console (Debugging)**

```javascript
// Geração rápida
await TestDataGeneratorBR.quickGenerate('empresa-ti', 50);

// Geração com opções
const data = await TestDataGeneratorBR.generateScenarioData('startup-fintech', {
  fileCount: 100,
  dateRange: { start: '2024-01-01', end: '2024-12-31' },
  enrichWithRealData: true,
  autoCategories: true
});

// Listar cenários disponíveis
TestDataGeneratorBR.listScenarios();

// Preview de cenário
const preview = await TestDataGeneratorBR.preview('escritorio-advocacia', 5);
```

## Configurações Avançadas

### ⚙️ **Parâmetros de Geração**

```javascript
const settings = {
  fileCount: 50,              // Quantidade de arquivos (5-500)
  dateRange: {                // Período dos documentos
    start: '2023-01-01',
    end: '2024-12-31'
  },
  enrichWithRealData: true,   // Usar APIs brasileiras
  autoCategories: true,       // Gerar categorias automaticamente
  locale: 'pt-BR'            // Localização brasileira
};
```

### 🌐 **APIs Brasileiras Suportadas**

- **Receita Federal**: Validação de CNPJ
- **BACEN**: Índices econômicos (SELIC, IPCA, CDI)
- **IBGE**: Dados demográficos e geográficos
- **ViaCEP**: Endereços por CEP

### 📊 **Tipos de Arquivo Gerados**

- **Markdown (.md)**: Especificações, análises, relatórios
- **Word (.docx)**: Contratos, propostas, pareceres
- **PDF (.pdf)**: Relatórios executivos, apresentações
- **Excel (.xlsx)**: Planilhas, dados financeiros, métricas
- **PowerPoint (.pptx)**: Apresentações, pitch decks
- **CSV (.csv)**: Dados estruturados, logs

## Dados Brasileiros Realistas

### 🆔 **Identificadores Válidos**
- **CPF**: Algoritmo de validação completo
- **CNPJ**: Dígitos verificadores corretos
- **Inscrição Estadual**: Formatos por estado

### 💰 **Valores Monetários**
- **Formato**: R$ 1.234,56 (padrão brasileiro)
- **Faixas realistas**: R$ 1.000 a R$ 50.000.000
- **Termos**: "reais", "milhões", "bilhões"

### 📅 **Datas e Períodos**
- **Formato**: DD/MM/AAAA
- **Períodos**: "1º semestre", "2º semestre", "trimestre"
- **Anos fiscais**: Janeiro-Dezembro

### 🏢 **Empresas e Nomes**
- **Nomes próprios**: João, Maria, José, Ana, Carlos...
- **Sobrenomes**: Silva, Santos, Oliveira, Souza...
- **Empresas reais**: Por setor econômico brasileiro

### 🗺️ **Geografia Brasileira**
- **Estados**: SP, RJ, MG, RS, PR, BA, PE, CE
- **Capitais**: São Paulo, Rio de Janeiro, Belo Horizonte...
- **Regiões**: Sul, Sudeste, Nordeste, Centro-Oeste, Norte

## Integração com o Sistema

### 📂 **Importação Automática**
Os arquivos gerados são automaticamente:
- Adicionados ao `AppState.discoveredFiles`
- Categorizados conforme o cenário
- Indexados para busca e análise
- Disponibilizados em todas as views

### 🎯 **Compatibilidade**
- **Knowledge Consolidator V1**: Dados compatíveis
- **Knowledge Consolidator V2**: Integração nativa
- **CategoryManager**: Categorias automáticas
- **DiscoveryManager**: Importação direta

### 📊 **Métricas e Estatísticas**
- Contagem por tipo de arquivo
- Distribuição por categoria
- Tamanho médio dos arquivos
- Palavras-chave extraídas

## Casos de Uso

### 🧪 **Testes de Performance**
```javascript
// Gerar dataset grande para testes
await TestDataGeneratorBR.quickGenerate('empresa-ti', 500);
```

### 🎯 **Validação de Funcionalidades**
```javascript
// Testar diferentes tipos de documento
const scenarios = ['empresa-ti', 'escritorio-advocacia', 'startup-fintech'];
for (const scenario of scenarios) {
  await TestDataGeneratorBR.quickGenerate(scenario, 25);
}
```

### 📈 **Demos e Apresentações**
```javascript
// Criar dataset diversificado para demo
await TestDataGeneratorBR.quickGenerate('consultoria-empresarial', 100);
```

### 🎓 **Treinamento e Onboarding**
```javascript
// Dataset educacional com diferentes contextos
await TestDataGeneratorBR.quickGenerate('agencia-marketing', 75);
```

## Arquitetura Técnica

### 🏗️ **Estrutura de Classes**

```
TestDataGeneratorBR (Main Service)
├── Scenarios Configuration
├── Brazilian Data Sources
├── Template Engine
├── File Generation
├── Command Integration
└── Modal Interface

TestDataGeneratorModal (UI Component)
├── Scenario Selection UI
├── Settings Configuration
├── Preview System
├── Progress Tracking
└── Export Functions
```

### 📁 **Arquivos do Sistema**

```
/v2/js/services/TestDataGeneratorBR.js      # Serviço principal
/v2/js/components/TestDataGeneratorModal.js # Interface visual
/v2/css/test-data-generator.css             # Estilos do modal
/v2/specs/11-scenario-generator-br.md       # Especificação técnica
```

### 🔗 **Dependências**

- `EventBus.js` - Sistema de eventos
- `AppState.js` - Gerenciamento de estado
- `CommandPalette.js` - Integração de comandos
- APIs brasileiras (opcionais)

## Troubleshooting

### ❌ **Problemas Comuns**

**Comando não aparece no Command Palette**
```javascript
// Verificar se o gerador foi inicializado
console.log(window.TestDataGeneratorBR);

// Reregistrar comandos manualmente
TestDataGeneratorBR.registerCommands();
```

**Modal não abre**
```javascript
// Verificar eventos
EventBus.emit('modal:show', { type: 'test-data-generator' });

// Verificar se app está inicializado
console.log(window.KC.initialized);
```

**Geração falha**
```javascript
// Verificar configurações
console.log(TestDataGeneratorBR.generationSettings);

// Testar com quantidade menor
await TestDataGeneratorBR.quickGenerate('empresa-ti', 5);
```

### 🔧 **Debug e Diagnóstico**

```javascript
// Status geral
TestDataGeneratorBR.listScenarios();

// Configurações atuais
console.log(TestDataGeneratorBR.generationSettings);

// Último dados gerados
console.log(TestDataGeneratorBR.currentData);

// Testar geração de CPF/CNPJ
console.log(TestDataGeneratorBR.generateCPF());
console.log(TestDataGeneratorBR.generateCNPJ());
```

## Roadmap e Melhorias

### 🚀 **Próximas Versões**

- **Mais Cenários**: Setor público, ONGs, startups B2B
- **Templates Customizáveis**: Editor de templates pelo usuário
- **Integração com IA**: Geração de conteúdo com LLMs
- **Export Avançado**: Múltiplos formatos simultâneos
- **Localização Regional**: Sotaques e regionalismos

### 🎯 **Melhorias Planejadas**

- **Performance**: Geração em background com Web Workers
- **Qualidade**: Validação de conteúdo com IA
- **Usabilidade**: Assistente interativo de configuração
- **Integração**: Conectores para sistemas externos

---

## Conclusão

O **Test Data Generator BR** é uma ferramenta completa e robusta para geração de dados de teste com contexto brasileiro. Ele foi projetado especificamente para o Knowledge Consolidator V2, oferecendo cenários realistas que refletem a diversidade e complexidade do mercado empresarial brasileiro.

**Implementação**: ✅ **100% Completa e Funcional**
**Integração**: ✅ **Command Palette + Interface Visual**
**Cenários**: ✅ **8 Setores Brasileiros Completos**
**Qualidade**: ✅ **Dados Realistas e Contextualizado**

Para mais informações técnicas, consulte a especificação completa em `/v2/specs/11-scenario-generator-br.md`.