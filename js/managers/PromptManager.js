/**
 * PromptManager.js - Gerenciador de Templates e Prompts
 * 
 * Define e gerencia templates de prompts para diferentes tipos de análise
 * Integra com AnalysisTypesManager para manter consistência
 * 
 * @requires AnalysisTypesManager
 * @requires Logger
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const logger = KC.Logger;

    class PromptManager {
        constructor() {
            this.templates = {
                decisiveMoments: {
                    id: 'decisiveMoments',
                    name: 'Momentos Decisivos',
                    description: 'Identifica decisões importantes e pontos de inflexão',
                    objectives: [
                        'Identificar decisões críticas e seus impactos',
                        'Descobrir insights transformadores',
                        'Mapear pontos de inflexão em projetos',
                        'Extrair aprendizados-chave para futuras decisões'
                    ],
                    systemPrompt: this._getDecisiveMomentsPrompt(),
                    userPromptTemplate: this._getDecisiveMomentsUserTemplate(),
                    responseFormat: {
                        analysisType: "string",
                        moments: ["array of strings"],
                        categories: ["array of strings"],
                        summary: "string",
                        relevanceScore: "number (0-1)"
                    },
                    temperature: 0.7,
                    maxTokens: 1000
                },
                
                technicalInsights: {
                    id: 'technicalInsights',
                    name: 'Insights Técnicos',
                    description: 'Foco em soluções técnicas e arquiteturas',
                    objectives: [
                        'Analisar soluções técnicas e arquiteturas implementadas',
                        'Identificar breakthroughs e inovações técnicas',
                        'Mapear configurações e implementações bem-sucedidas',
                        'Extrair padrões técnicos replicáveis'
                    ],
                    systemPrompt: this._getTechnicalInsightsPrompt(),
                    userPromptTemplate: this._getTechnicalInsightsUserTemplate(),
                    responseFormat: {
                        analysisType: "string",
                        technicalPoints: ["array of technical insights"],
                        implementation: "string",
                        categories: ["array of strings"],
                        complexity: "low|medium|high",
                        relevanceScore: "number (0-1)"
                    },
                    temperature: 0.5,
                    maxTokens: 1200
                },
                
                projectAnalysis: {
                    id: 'projectAnalysis',
                    name: 'Análise de Projetos',
                    description: 'Avalia potencial para novos projetos e iniciativas',
                    objectives: [
                        'Identificar oportunidades para novos projetos',
                        'Avaliar viabilidade e recursos necessários',
                        'Mapear próximos passos e planos de ação',
                        'Estimar potencial de impacto estratégico'
                    ],
                    systemPrompt: this._getProjectAnalysisPrompt(),
                    userPromptTemplate: this._getProjectAnalysisUserTemplate(),
                    responseFormat: {
                        analysisType: "string",
                        projectPotential: "string",
                        requiredResources: ["array of strings"],
                        nextSteps: ["array of strings"],
                        categories: ["array of strings"],
                        feasibility: "number (0-1)",
                        relevanceScore: "number (0-1)"
                    },
                    temperature: 0.8,
                    maxTokens: 1500
                },

                knowledgeMapping: {
                    id: 'knowledgeMapping',
                    name: 'Mapeamento de Conhecimento',
                    description: 'Estrutura e categoriza conhecimento para base RAG',
                    objectives: [
                        'Mapear temas e conceitos principais',
                        'Identificar conexões entre conhecimentos',
                        'Estruturar para integração com RAG',
                        'Detectar gaps e oportunidades de aprendizado'
                    ],
                    systemPrompt: this._getKnowledgeMappingPrompt(),
                    userPromptTemplate: this._getKnowledgeMappingUserTemplate(),
                    responseFormat: {
                        analysisType: "string",
                        mainThemes: ["array of themes"],
                        keyConnections: ["array of connections"],
                        categories: ["array of strings"],
                        gaps: ["array of knowledge gaps"],
                        relevanceScore: "number (0-1)"
                    },
                    temperature: 0.6,
                    maxTokens: 1300
                },

                evolutionTracking: {
                    id: 'evolutionTracking',
                    name: 'Evolução Conceitual',
                    description: 'Rastreia evolução de ideias e conceitos ao longo do tempo',
                    objectives: [
                        'Identificar evolução de conceitos e ideias',
                        'Mapear mudanças de perspectiva',
                        'Detectar padrões de aprendizado',
                        'Registrar marcos de transformação'
                    ],
                    systemPrompt: this._getEvolutionTrackingPrompt(),
                    userPromptTemplate: this._getEvolutionTrackingUserTemplate(),
                    responseFormat: {
                        analysisType: "string",
                        evolutionPoints: ["array of evolution points"],
                        transformations: ["array of transformations"],
                        categories: ["array of strings"],
                        maturityLevel: "initial|developing|mature|mastered",
                        relevanceScore: "number (0-1)"
                    },
                    temperature: 0.7,
                    maxTokens: 1100
                },

                customizable: {
                    id: 'customizable',
                    name: 'Personalizado',
                    description: 'Template customizável pelo usuário',
                    objectives: [
                        'Permitir análise personalizada',
                        'Adaptar-se a necessidades específicas',
                        'Explorar aspectos únicos do conhecimento',
                        'Criar insights customizados'
                    ],
                    systemPrompt: '',
                    userPromptTemplate: '',
                    responseFormat: {},
                    temperature: 0.7,
                    maxTokens: 1000
                }
            };

            // Carrega templates customizados do localStorage
            this._loadCustomTemplates();
            
            logger.info('PromptManager', 'Inicializado com templates padrão');
        }

        /**
         * Template para Momentos Decisivos
         */
        _getDecisiveMomentsPrompt() {
            const types = KC.AnalysisTypesManager.getPromptDescription();
            
            return `Você é um analista especializado em identificar momentos decisivos e insights transformadores em bases de conhecimento pessoal.

Sua tarefa é analisar o conteúdo fornecido e identificar elementos cruciais para tomada de decisão e desenvolvimento de projetos.

TIPOS DE ANÁLISE DISPONÍVEIS:
${types}

INSTRUÇÕES:
1. Identifique o tipo de análise mais apropriado (escolha APENAS UM dos tipos listados acima)
2. Extraia 2-3 momentos decisivos ou insights principais
3. Sugira categorias relevantes para organização
4. Forneça um resumo conciso focado no valor estratégico
5. Atribua uma pontuação de relevância (0-1) baseada no potencial de impacto

CRITÉRIOS DE AVALIAÇÃO:
- Clareza da decisão ou insight
- Potencial de aplicação prática
- Relevância para projetos futuros
- Profundidade do conhecimento capturado

Responda SEMPRE em formato JSON válido e estruturado.`;
        }

        _getDecisiveMomentsUserTemplate() {
            return `Analise o seguinte conteúdo e identifique momentos decisivos:

ARQUIVO: {{fileName}}
CAMINHO: {{filePath}}
DATA: {{fileDate}}

CONTEÚDO:
{{content}}

Forneça sua análise em formato JSON seguindo exatamente esta estrutura:
{
    "analysisType": "Nome exato de um dos 5 tipos listados",
    "moments": [
        "Primeiro momento decisivo ou insight importante",
        "Segundo momento decisivo ou insight importante",
        "Terceiro momento decisivo (opcional)"
    ],
    "categories": ["categoria1", "categoria2", "categoria3"],
    "summary": "Resumo focado no valor estratégico e aplicabilidade do conteúdo",
    "relevanceScore": 0.85
}`;
        }

        /**
         * Template para Insights Técnicos
         */
        _getTechnicalInsightsPrompt() {
            const types = KC.AnalysisTypesManager.getPromptDescription();
            
            return `Você é um analista técnico especializado em identificar soluções, arquiteturas e implementações técnicas valiosas.

TIPOS DE ANÁLISE DISPONÍVEIS:
${types}

FOCO TÉCNICO:
1. Soluções e implementações técnicas
2. Arquiteturas e padrões de design
3. Configurações e otimizações
4. Código e algoritmos relevantes
5. Ferramentas e tecnologias

INSTRUÇÕES:
1. Identifique o tipo de análise (priorize "Breakthrough Técnico" quando apropriado)
2. Extraia insights técnicos específicos
3. Avalie complexidade de implementação
4. Sugira categorias técnicas relevantes
5. Forneça detalhes de implementação quando disponíveis

Responda em formato JSON estruturado.`;
        }

        _getTechnicalInsightsUserTemplate() {
            return `Analise tecnicamente o seguinte conteúdo:

ARQUIVO: {{fileName}}
TIPO: {{fileExtension}}

CONTEÚDO:
{{content}}

Forneça análise técnica em JSON:
{
    "analysisType": "Tipo de análise apropriado",
    "technicalPoints": [
        "Insight técnico principal",
        "Solução ou padrão identificado",
        "Tecnologia ou ferramenta relevante"
    ],
    "implementation": "Detalhes de implementação ou configuração",
    "categories": ["tech", "solução", "arquitetura"],
    "complexity": "low|medium|high",
    "relevanceScore": 0.9
}`;
        }

        /**
         * Template para Análise de Projetos
         */
        _getProjectAnalysisPrompt() {
            const types = KC.AnalysisTypesManager.getPromptDescription();
            
            return `Você é um analista de projetos especializado em identificar oportunidades e avaliar viabilidade de iniciativas.

TIPOS DE ANÁLISE DISPONÍVEIS:
${types}

FOCO EM PROJETOS:
1. Potencial para novos projetos
2. Recursos necessários
3. Próximos passos práticos
4. Viabilidade e riscos
5. Conexões com projetos existentes

CRITÉRIOS:
- Aplicabilidade prática
- Recursos disponíveis vs necessários
- Alinhamento estratégico
- Potencial de impacto
- Complexidade de execução

Avalie o conteúdo sob a perspectiva de geração de projetos acionáveis.`;
        }

        _getProjectAnalysisUserTemplate() {
            return `Avalie o potencial de projeto do seguinte conteúdo:

ARQUIVO: {{fileName}}
CONTEXTO: {{context}}

CONTEÚDO:
{{content}}

Análise de projeto em JSON:
{
    "analysisType": "Tipo apropriado",
    "projectPotential": "Descrição do potencial de projeto identificado",
    "requiredResources": [
        "Recurso técnico necessário",
        "Recurso humano ou temporal",
        "Ferramentas ou tecnologias"
    ],
    "nextSteps": [
        "Primeiro passo concreto",
        "Segundo passo de implementação",
        "Validação ou teste necessário"
    ],
    "categories": ["projeto", "iniciativa", "desenvolvimento"],
    "feasibility": 0.75,
    "relevanceScore": 0.8
}`;
        }

        /**
         * Carrega templates customizados
         */
        _loadCustomTemplates() {
            try {
                const saved = localStorage.getItem('kc_custom_templates');
                if (saved) {
                    const custom = JSON.parse(saved);
                    Object.assign(this.templates, custom);
                    logger.info('PromptManager', 'Templates customizados carregados');
                }
            } catch (error) {
                logger.error('PromptManager', 'Erro ao carregar templates customizados', error);
            }
        }

        /**
         * Salva templates customizados
         */
        _saveCustomTemplates() {
            try {
                const custom = {};
                Object.entries(this.templates).forEach(([key, template]) => {
                    if (template.isCustom) {
                        custom[key] = template;
                    }
                });
                localStorage.setItem('kc_custom_templates', JSON.stringify(custom));
            } catch (error) {
                logger.error('PromptManager', 'Erro ao salvar templates customizados', error);
            }
        }

        /**
         * Prepara prompt completo para análise
         */
        prepare(file, templateId = 'decisiveMoments', context = {}) {
            const template = this.templates[templateId];
            if (!template) {
                logger.warn('PromptManager', `Template não encontrado: ${templateId}, usando padrão`);
                return this.prepare(file, 'decisiveMoments', context);
            }

            // Prepara variáveis para substituição
            const variables = {
                fileName: file.name,
                filePath: file.path || 'N/A',
                fileDate: file.lastModified ? new Date(file.lastModified).toLocaleDateString() : 'N/A',
                fileExtension: file.name.split('.').pop(),
                content: file.preview || file.content?.substring(0, 2000) || '',
                context: context.additionalContext || ''
            };

            // Substitui variáveis no template
            let userPrompt = template.userPromptTemplate;
            Object.entries(variables).forEach(([key, value]) => {
                userPrompt = userPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
            });

            return {
                system: template.systemPrompt,
                user: userPrompt,
                temperature: template.temperature,
                maxTokens: template.maxTokens,
                responseFormat: template.responseFormat
            };
        }

        /**
         * Cria ou atualiza template customizado
         */
        createCustomTemplate(id, config) {
            if (!id || !config.name) {
                throw new Error('ID e nome são obrigatórios para template customizado');
            }

            this.templates[id] = {
                id,
                name: config.name,
                description: config.description || '',
                systemPrompt: config.systemPrompt || '',
                userPromptTemplate: config.userPromptTemplate || '',
                responseFormat: config.responseFormat || {},
                temperature: config.temperature || 0.7,
                maxTokens: config.maxTokens || 1000,
                isCustom: true
            };

            this._saveCustomTemplates();
            logger.info('PromptManager', `Template customizado criado: ${id}`);
            
            return this.templates[id];
        }

        /**
         * Template para Mapeamento de Conhecimento
         */
        _getKnowledgeMappingPrompt() {
            return `Você é um especialista em estruturação e organização de conhecimento para sistemas RAG (Retrieval-Augmented Generation).

Sua tarefa é analisar o conteúdo e criar um mapeamento estruturado que facilite a recuperação e conexão de informações.

Foque em:
- Identificar temas e conceitos centrais
- Mapear relações e conexões entre ideias
- Estruturar de forma hierárquica e categórica
- Identificar lacunas de conhecimento
- Preparar para indexação vetorial

Retorne a análise em formato JSON estruturado.`;
        }

        _getKnowledgeMappingUserTemplate() {
            return `Analise o seguinte conteúdo e crie um mapeamento estruturado de conhecimento:

Arquivo: {{fileName}}
Preview: {{preview}}

Identifique:
1. Temas principais e subtemas
2. Conceitos-chave e suas definições
3. Conexões e relações entre elementos
4. Categorias apropriadas para classificação
5. Gaps ou áreas que precisam desenvolvimento

Estruture para facilitar busca e recuperação em sistema RAG.`;
        }

        /**
         * Template para Evolução Conceitual
         */
        _getEvolutionTrackingPrompt() {
            return `Você é um analista especializado em rastrear a evolução de ideias e conceitos ao longo do tempo.

Sua tarefa é identificar como conceitos, perspectivas e entendimentos evoluíram, detectando padrões de aprendizado e transformação.

Foque em:
- Mudanças de perspectiva ou entendimento
- Evolução de conceitos e ideias
- Marcos de transformação ou breakthrough
- Padrões de aprendizado e crescimento
- Níveis de maturidade conceitual

Retorne a análise em formato JSON estruturado.`;
        }

        _getEvolutionTrackingUserTemplate() {
            return `Analise o seguinte conteúdo para rastrear evolução conceitual:

Arquivo: {{fileName}}
Data: {{fileDate}}
Preview: {{preview}}

Identifique:
1. Conceitos em evolução e suas transformações
2. Mudanças de perspectiva ou entendimento
3. Marcos importantes de aprendizado
4. Padrões de desenvolvimento conceitual
5. Nível de maturidade atual dos conceitos

Contextualize temporalmente quando possível.`;
        }

        /**
         * Remove template customizado
         */
        removeCustomTemplate(id) {
            if (this.templates[id]?.isCustom) {
                delete this.templates[id];
                this._saveCustomTemplates();
                logger.info('PromptManager', `Template customizado removido: ${id}`);
                return true;
            }
            return false;
        }

        /**
         * Lista todos os templates disponíveis
         */
        getTemplates() {
            return Object.values(this.templates).map(t => ({
                id: t.id,
                name: t.name,
                description: t.description,
                isCustom: t.isCustom || false
            }));
        }

        /**
         * Obtém template por ID
         */
        getTemplate(id) {
            return this.templates[id];
        }

        /**
         * Valida prompt antes de enviar para IA
         */
        validatePrompt(prompt) {
            const validationResult = {
                isValid: true,
                warnings: [],
                errors: []
            };

            // Verifica tamanho mínimo
            if (!prompt || prompt.length < 10) {
                validationResult.errors.push('Prompt muito curto (mínimo 10 caracteres)');
                validationResult.isValid = false;
            }

            // Verifica tamanho máximo (aproximado em tokens)
            const estimatedTokens = prompt.length / 4; // Aproximação grosseira
            if (estimatedTokens > 8000) {
                validationResult.errors.push('Prompt muito longo (máximo ~8000 tokens)');
                validationResult.isValid = false;
            }

            // Verifica se tem conteúdo significativo
            const cleanPrompt = prompt.replace(/\s+/g, ' ').trim();
            if (cleanPrompt.split(' ').length < 5) {
                validationResult.warnings.push('Prompt pode ser muito genérico');
            }

            // Verifica placeholders não substituídos
            const unreplacedPlaceholders = prompt.match(/\{\{[^}]+\}\}/g);
            if (unreplacedPlaceholders) {
                validationResult.warnings.push(`Placeholders não substituídos: ${unreplacedPlaceholders.join(', ')}`);
            }

            // Verifica caracteres especiais problemáticos
            if (prompt.includes('```') && !prompt.includes('```\n')) {
                validationResult.warnings.push('Blocos de código devem ter quebra de linha após ```');
            }

            return validationResult;
        }

        /**
         * Valida configuração de template
         */
        validateTemplateConfig(config) {
            const errors = [];

            // Validações obrigatórias
            if (!config.name || config.name.trim().length < 3) {
                errors.push('Nome do template deve ter pelo menos 3 caracteres');
            }

            if (!config.systemPrompt || config.systemPrompt.trim().length < 20) {
                errors.push('System prompt deve ter pelo menos 20 caracteres');
            }

            // Validações de temperatura
            if (config.temperature !== undefined) {
                if (config.temperature < 0 || config.temperature > 1) {
                    errors.push('Temperature deve estar entre 0 e 1');
                }
            }

            // Validações de tokens
            if (config.maxTokens !== undefined) {
                if (config.maxTokens < 100 || config.maxTokens > 4000) {
                    errors.push('Max tokens deve estar entre 100 e 4000');
                }
            }

            // Validação de objetivos
            if (config.objectives && !Array.isArray(config.objectives)) {
                errors.push('Objetivos deve ser um array');
            }

            return {
                isValid: errors.length === 0,
                errors
            };
        }

        /**
         * Valida formato de resposta
         */
        validateResponse(response, templateId) {
            const template = this.templates[templateId];
            if (!template) return false;

            const format = template.responseFormat;
            const requiredFields = Object.keys(format);

            // Verifica se todos os campos obrigatórios estão presentes
            for (const field of requiredFields) {
                if (!(field in response)) {
                    logger.warn('PromptManager', `Campo obrigatório ausente: ${field}`);
                    return false;
                }
            }

            // Valida tipo de análise
            if (response.analysisType) {
                const validTypes = KC.AnalysisTypesManager.getTypeNames();
                if (!validTypes.includes(response.analysisType)) {
                    logger.warn('PromptManager', `Tipo de análise inválido: ${response.analysisType}`);
                    return false;
                }
            }

            return true;
        }

        /**
         * Lista todos os templates disponíveis
         */
        listTemplates() {
            return Object.values(this.templates).map(t => ({
                id: t.id,
                name: t.name,
                description: t.description,
                objectives: t.objectives || [],
                isCustom: t.isCustom || false,
                isEditable: true // Todos os templates são editáveis para uso administrativo
            }));
        }

        /**
         * Obtém preview completo de um template
         */
        getTemplatePreview(templateId) {
            const template = this.templates[templateId];
            if (!template) return null;

            return {
                id: template.id,
                name: template.name,
                description: template.description,
                objectives: template.objectives || [],
                systemPrompt: template.systemPrompt,
                userPromptTemplate: template.userPromptTemplate || '', // Template original
                userPromptExample: this._generatePromptExample(template), // Exemplo gerado
                responseFormat: template.responseFormat,
                temperature: template.temperature,
                maxTokens: template.maxTokens,
                isEditable: true // Todos os templates são editáveis para uso administrativo
            };
        }

        /**
         * Gera exemplo de prompt com dados fictícios
         */
        _generatePromptExample(template) {
            if (!template.userPromptTemplate) return '';

            return template.userPromptTemplate
                .replace('{{fileName}}', 'exemplo_arquivo.md')
                .replace('{{fileDate}}', new Date().toLocaleDateString('pt-BR'))
                .replace('{{preview}}', 'Este é um exemplo de preview do conteúdo do arquivo...')
                .replace('{{content}}', 'Conteúdo completo do arquivo para análise...');
        }

        /**
         * Atualiza template customizável ou custom
         */
        updateTemplate(templateId, updates) {
            const template = this.templates[templateId];
            if (!template) {
                logger.warn('PromptManager', `Template ${templateId} não encontrado`);
                return false;
            }

            // Atualiza campos permitidos
            const allowedFields = ['name', 'description', 'objectives', 'systemPrompt', 
                                 'userPromptTemplate', 'responseFormat', 'temperature', 'maxTokens'];
            
            allowedFields.forEach(field => {
                if (updates[field] !== undefined) {
                    template[field] = updates[field];
                }
            });

            // Salva se for custom
            if (template.isCustom || templateId === 'customizable') {
                this._saveCustomTemplates();
            }

            logger.info('PromptManager', `Template ${templateId} atualizado`);
            return true;
        }
    }

    // Registra no namespace global
    KC.PromptManager = new PromptManager();
    logger.info('PromptManager', 'Componente registrado com sucesso');

})(window);