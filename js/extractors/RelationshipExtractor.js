/**
 * RelationshipExtractor.js - Extrator de Relacionamentos Semânticos
 * 
 * Extrai triplas semânticas de dados existentes do sistema
 * Identifica padrões e correlações para alimentar o TripleStore
 * 
 * @version 1.0.0
 * @author Knowledge Consolidator
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const TripleSchema = KC.TripleSchema;

    class RelationshipExtractor {
        constructor() {
            this.logger = KC.Logger;
            
            // Padrões de extração configuráveis
            this.padroes = {
                // Padrões de keywords para detecção
                keywords: {
                    tecnico: ['código', 'implementação', 'arquitetura', 'sistema', 'api', 'bug', 'fix'],
                    conceitual: ['teoria', 'conceito', 'ideia', 'visão', 'perspectiva', 'entendimento'],
                    decisivo: ['decisão', 'escolha', 'definição', 'estratégia', 'direção'],
                    insight: ['insight', 'descoberta', 'revelação', 'breakthrough', 'eureka'],
                    acao: ['fazer', 'implementar', 'criar', 'desenvolver', 'executar', 'ação']
                },
                
                // Padrões de relacionamento temporal
                temporal: {
                    evolucao: ['evoluiu de', 'baseado em', 'versão anterior', 'atualização de'],
                    sequencia: ['depois de', 'seguido por', 'próximo passo', 'então']
                },
                
                // Padrões de correlação
                correlacao: {
                    causa: ['porque', 'devido a', 'causado por', 'resultado de'],
                    consequencia: ['portanto', 'logo', 'resulta em', 'leva a']
                }
            };
            
            // Cache de extrações para performance
            this.cache = new Map();
            
            // Estatísticas de extração
            this.stats = {
                totalExtraidas: 0,
                porTipo: {},
                tempoTotal: 0
            };
        }

        /**
         * Extrai triplas de um arquivo
         * @param {Object} arquivo - Objeto arquivo do sistema
         * @returns {Array} Array de triplas extraídas
         */
        async extrairDeArquivo(arquivo) {
            const inicio = Date.now();
            const triplas = [];
            
            try {
                // Verificar cache
                if (this.cache.has(arquivo.id)) {
                    return this.cache.get(arquivo.id);
                }
                
                // 1. Extrair relacionamentos básicos
                triplas.push(...this.extrairRelacionamentosBasicos(arquivo));
                
                // 2. Extrair relacionamentos de conteúdo
                if (arquivo.content || arquivo.preview) {
                    triplas.push(...await this.extrairRelacionamentosDeConteudo(arquivo));
                }
                
                // 3. Extrair relacionamentos de análise
                if (arquivo.analysisType) {
                    triplas.push(...this.extrairRelacionamentosDeAnalise(arquivo));
                }
                
                // 4. Extrair relacionamentos temporais
                triplas.push(...this.extrairRelacionamentosTemporais(arquivo));
                
                // 5. Inferir relacionamentos adicionais
                triplas.push(...await this.inferirRelacionamentos(arquivo, triplas));
                
                // Cachear resultado
                this.cache.set(arquivo.id, triplas);
                
                // Atualizar estatísticas
                this.atualizarEstatisticas(triplas, Date.now() - inicio);
                
                return triplas;
                
            } catch (error) {
                this.logger.error('RelationshipExtractor', `Erro ao extrair relações do arquivo ${arquivo.id}:`, error);
                return triplas;
            }
        }

        /**
         * Extrai relacionamentos básicos do arquivo
         * @private
         */
        extrairRelacionamentosBasicos(arquivo) {
            const triplas = [];
            
            // Arquivo tem nome
            if (arquivo.name) {
                triplas.push(this.criarTripla(
                    arquivo.id,
                    'temNome',
                    arquivo.name,
                    { fonte: 'metadados', confianca: 1.0 }
                ));
            }
            
            // Arquivo tem tamanho
            if (arquivo.size !== undefined) {
                triplas.push(this.criarTripla(
                    arquivo.id,
                    'temTamanho',
                    arquivo.size,
                    { fonte: 'metadados', confianca: 1.0 }
                ));
            }
            
            // Arquivo tem tipo/extensão
            if (arquivo.extension || arquivo.type) {
                triplas.push(this.criarTripla(
                    arquivo.id,
                    'temTipo',
                    arquivo.extension || arquivo.type,
                    { fonte: 'metadados', confianca: 1.0 }
                ));
            }
            
            // Arquivo tem categorias
            if (arquivo.categories && arquivo.categories.length > 0) {
                arquivo.categories.forEach(catId => {
                    triplas.push(this.criarTripla(
                        arquivo.id,
                        'pertenceCategoria',
                        catId,
                        { fonte: 'curadoria', confianca: 1.0 }
                    ));
                });
            }
            
            // Arquivo tem relevância
            if (arquivo.relevanceScore !== undefined) {
                triplas.push(this.criarTripla(
                    arquivo.id,
                    'possuiRelevancia',
                    arquivo.relevanceScore,
                    { fonte: 'calculo', confianca: 0.9 }
                ));
                
                // Se relevância alta, sugere ação
                if (arquivo.relevanceScore > 0.8) {
                    triplas.push(this.criarTripla(
                        arquivo.id,
                        'requerAcao',
                        'revisao_prioritaria',
                        { fonte: 'inferencia', confianca: 0.8 }
                    ));
                }
            }
            
            // Arquivo foi analisado
            if (arquivo.analyzed) {
                triplas.push(this.criarTripla(
                    arquivo.id,
                    'temStatus',
                    'analisado',
                    { fonte: 'sistema', confianca: 1.0 }
                ));
            }
            
            return triplas;
        }

        /**
         * Extrai relacionamentos do conteúdo
         * @private
         */
        async extrairRelacionamentosDeConteudo(arquivo) {
            const triplas = [];
            const conteudo = arquivo.content || arquivo.preview || '';
            
            // Detectar keywords por categoria
            for (const [tipo, keywords] of Object.entries(this.padroes.keywords)) {
                const encontradas = this.detectarKeywords(conteudo, keywords);
                
                encontradas.forEach(keyword => {
                    triplas.push(this.criarTripla(
                        arquivo.id,
                        'contemPalavraChave',
                        keyword,
                        { 
                            fonte: 'analise_conteudo',
                            confianca: 0.8,
                            contexto: tipo
                        }
                    ));
                });
                
                // Se encontrou muitas keywords de um tipo, sugere categoria
                if (encontradas.length >= 3) {
                    triplas.push(this.criarTripla(
                        arquivo.id,
                        'sugeridaCategoria',
                        tipo,
                        {
                            fonte: 'analise_keywords',
                            confianca: 0.7,
                            baseadoEm: encontradas.join(', ')
                        }
                    ));
                }
            }
            
            // Detectar padrões de código
            if (this.contemCodigo(conteudo)) {
                triplas.push(this.criarTripla(
                    arquivo.id,
                    'contemCodigo',
                    'true',
                    { fonte: 'analise_conteudo', confianca: 0.9 }
                ));
                
                // Detectar linguagem
                const linguagem = this.detectarLinguagem(conteudo);
                if (linguagem) {
                    triplas.push(this.criarTripla(
                        arquivo.id,
                        'usaLinguagem',
                        linguagem,
                        { fonte: 'analise_conteudo', confianca: 0.8 }
                    ));
                }
            }
            
            // Detectar menções a outros arquivos
            const mencoes = this.detectarMencoes(conteudo);
            mencoes.forEach(mencao => {
                triplas.push(this.criarTripla(
                    arquivo.id,
                    'mencionaArquivo',
                    mencao,
                    { fonte: 'analise_conteudo', confianca: 0.7 }
                ));
            });
            
            // Detectar insights no conteúdo
            const insights = await this.extrairInsights(conteudo);
            insights.forEach(insight => {
                triplas.push(this.criarTripla(
                    arquivo.id,
                    'possuiInsight',
                    insight.texto,
                    {
                        fonte: 'analise_ia',
                        confianca: insight.confianca,
                        tipo: insight.tipo
                    }
                ));
            });
            
            return triplas;
        }

        /**
         * Extrai relacionamentos de análise
         * @private
         */
        extrairRelacionamentosDeAnalise(arquivo) {
            const triplas = [];
            
            // Tipo de análise detectado
            if (arquivo.analysisType) {
                triplas.push(this.criarTripla(
                    arquivo.id,
                    'foiAnalisadoComo',
                    arquivo.analysisType,
                    {
                        fonte: 'analise_ia',
                        confianca: arquivo.analysisConfidence || 0.8
                    }
                ));
                
                // Correlacionar tipo de análise com categoria sugerida
                const categoriaSugerida = this.mapearAnaliseParaCategoria(arquivo.analysisType);
                if (categoriaSugerida) {
                    triplas.push(this.criarTripla(
                        arquivo.id,
                        'sugeridaCategoria',
                        categoriaSugerida,
                        {
                            fonte: 'mapeamento_analise',
                            confianca: 0.85,
                            baseadoEm: arquivo.analysisType
                        }
                    ));
                }
            }
            
            // Se tem resultado de análise IA
            if (arquivo.aiAnalysis) {
                // Extrair entidades mencionadas
                if (arquivo.aiAnalysis.entities) {
                    arquivo.aiAnalysis.entities.forEach(entity => {
                        triplas.push(this.criarTripla(
                            arquivo.id,
                            'mencionaEntidade',
                            entity.name,
                            {
                                fonte: 'analise_ia',
                                confianca: entity.confidence || 0.7,
                                tipo: entity.type
                            }
                        ));
                    });
                }
                
                // Extrair ações recomendadas
                if (arquivo.aiAnalysis.recommendations) {
                    arquivo.aiAnalysis.recommendations.forEach(rec => {
                        triplas.push(this.criarTripla(
                            arquivo.id,
                            'requerAcao',
                            rec.action,
                            {
                                fonte: 'recomendacao_ia',
                                confianca: rec.confidence || 0.8,
                                prioridade: rec.priority
                            }
                        ));
                    });
                }
            }
            
            return triplas;
        }

        /**
         * Extrai relacionamentos temporais
         * @private
         */
        extrairRelacionamentosTemporais(arquivo) {
            const triplas = [];
            
            // Data de criação
            if (arquivo.createdAt || arquivo.created) {
                triplas.push(this.criarTripla(
                    arquivo.id,
                    'criadoEm',
                    arquivo.createdAt || arquivo.created,
                    { fonte: 'metadados', confianca: 1.0 }
                ));
            }
            
            // Data de modificação
            if (arquivo.modifiedAt || arquivo.lastModified) {
                triplas.push(this.criarTripla(
                    arquivo.id,
                    'atualizadoEm',
                    arquivo.modifiedAt || arquivo.lastModified,
                    { fonte: 'metadados', confianca: 1.0 }
                ));
            }
            
            // Detectar versão no nome
            const versao = this.detectarVersao(arquivo.name);
            if (versao) {
                triplas.push(this.criarTripla(
                    arquivo.id,
                    'temVersao',
                    versao.toString(),
                    { fonte: 'analise_nome', confianca: 0.9 }
                ));
                
                // Se tem versão, pode ter arquivo anterior
                if (versao !== 'v1' && versao !== '1') {
                    const versaoAnterior = this.calcularVersaoAnterior(versao);
                    triplas.push(this.criarTripla(
                        arquivo.id,
                        'evoluiuDe',
                        `${arquivo.name.replace(versao.toString(), versaoAnterior.toString())}`,
                        { fonte: 'inferencia', confianca: 0.6 }
                    ));
                }
            }
            
            return triplas;
        }

        /**
         * Infere relacionamentos adicionais
         * @private
         */
        async inferirRelacionamentos(arquivo, triplasExistentes) {
            const novasTriplas = [];
            
            // Se arquivo tem alta relevância e código, pode ser solução
            const temCodigo = triplasExistentes.some(t => 
                t.presente.valor === 'contemCodigo' && t.objetivo.valor === 'true'
            );
            const altaRelevancia = triplasExistentes.some(t => 
                t.presente.valor === 'possuiRelevancia' && parseFloat(t.objetivo.valor) > 0.8
            );
            
            if (temCodigo && altaRelevancia) {
                novasTriplas.push(this.criarTripla(
                    arquivo.id,
                    'ehPotencialSolucao',
                    'true',
                    {
                        fonte: 'inferencia',
                        confianca: 0.85,
                        razao: 'codigo + alta_relevancia'
                    }
                ));
            }
            
            // Se tem muitas keywords técnicas, correlaciona com categoria
            const keywordsTecnicas = triplasExistentes.filter(t => 
                t.presente.valor === 'contemPalavraChave' &&
                t.metadados.contexto === 'tecnico'
            );
            
            if (keywordsTecnicas.length >= 3) {
                novasTriplas.push(this.criarTripla(
                    'padrao_tecnico',
                    'correlacionaCom',
                    'categoria_tech',
                    {
                        fonte: 'aprendizado',
                        confianca: 0.9,
                        evidencias: keywordsTecnicas.length
                    }
                ));
            }
            
            // Aplicar regras de inferência do schema
            if (TripleSchema) {
                const inferidas = TripleSchema.aplicarInferencia([...triplasExistentes, ...novasTriplas]);
                novasTriplas.push(...inferidas);
            }
            
            return novasTriplas;
        }

        /**
         * Cria uma tripla formatada
         * @private
         */
        criarTripla(legado, presente, objetivo, metadados = {}) {
            return {
                legado: { tipo: 'SYS.R', valor: legado },
                presente: { tipo: 'SUB.R', valor: presente },
                objetivo: { tipo: 'ACT.R', valor: objetivo },
                metadados: {
                    ...metadados,
                    timestamp: new Date().toISOString()
                }
            };
        }

        /**
         * Detecta keywords no conteúdo
         * @private
         */
        detectarKeywords(conteudo, keywords) {
            const conteudoLower = conteudo.toLowerCase();
            const encontradas = [];
            
            keywords.forEach(keyword => {
                if (conteudoLower.includes(keyword.toLowerCase())) {
                    encontradas.push(keyword);
                }
            });
            
            return [...new Set(encontradas)]; // Remover duplicatas
        }

        /**
         * Verifica se contém código
         * @private
         */
        contemCodigo(conteudo) {
            const padroesCodigo = [
                /function\s+\w+\s*\(/,
                /class\s+\w+/,
                /const\s+\w+\s*=/,
                /let\s+\w+\s*=/,
                /var\s+\w+\s*=/,
                /if\s*\(/,
                /for\s*\(/,
                /while\s*\(/,
                /import\s+.+from/,
                /export\s+/,
                /def\s+\w+\s*\(/,
                /public\s+class/
            ];
            
            return padroesCodigo.some(padrao => padrao.test(conteudo));
        }

        /**
         * Detecta linguagem de programação
         * @private
         */
        detectarLinguagem(conteudo) {
            const assinaturas = {
                javascript: [/function\s*\(/, /const\s+\w+\s*=/, /console\.log/],
                python: [/def\s+\w+\s*\(/, /import\s+\w+/, /print\s*\(/],
                java: [/public\s+class/, /private\s+\w+/, /System\.out/],
                typescript: [/interface\s+\w+/, /type\s+\w+\s*=/, /:\s*string/],
                sql: [/SELECT\s+.+FROM/i, /INSERT\s+INTO/i, /CREATE\s+TABLE/i]
            };
            
            for (const [linguagem, padroes] of Object.entries(assinaturas)) {
                const matches = padroes.filter(padrao => padrao.test(conteudo)).length;
                if (matches >= 2) {
                    return linguagem;
                }
            }
            
            return null;
        }

        /**
         * Detecta menções a outros arquivos
         * @private
         */
        detectarMencoes(conteudo) {
            const mencoes = [];
            
            // Padrões de menção de arquivos
            const padroes = [
                /['"`]([^'"`]+\.(js|ts|py|java|md|txt|json))['"` ]/g,
                /@([a-zA-Z0-9\-_]+\.(js|ts|py|java|md|txt|json))/g,
                /arquivo\s+([a-zA-Z0-9\-_]+\.(js|ts|py|java|md|txt|json))/gi
            ];
            
            padroes.forEach(padrao => {
                let match;
                while ((match = padrao.exec(conteudo)) !== null) {
                    mencoes.push(match[1]);
                }
            });
            
            return [...new Set(mencoes)];
        }

        /**
         * Extrai insights do conteúdo
         * @private
         */
        async extrairInsights(conteudo) {
            const insights = [];
            
            // Padrões de insight
            const padroesInsight = [
                {
                    padrao: /descobr(i|imos|iram)\s+que\s+([^.]+)/gi,
                    tipo: 'descoberta',
                    confianca: 0.8
                },
                {
                    padrao: /conclusão:\s*([^.]+)/gi,
                    tipo: 'conclusao',
                    confianca: 0.9
                },
                {
                    padrao: /insight:\s*([^.]+)/gi,
                    tipo: 'insight_explicito',
                    confianca: 0.95
                },
                {
                    padrao: /aprend(i|emos|eram)\s+que\s+([^.]+)/gi,
                    tipo: 'aprendizado',
                    confianca: 0.85
                },
                {
                    padrao: /solução:\s*([^.]+)/gi,
                    tipo: 'solucao',
                    confianca: 0.9
                }
            ];
            
            padroesInsight.forEach(({ padrao, tipo, confianca }) => {
                let match;
                while ((match = padrao.exec(conteudo)) !== null) {
                    insights.push({
                        texto: match[1] || match[2],
                        tipo: tipo,
                        confianca: confianca
                    });
                }
            });
            
            return insights;
        }

        /**
         * Mapeia tipo de análise para categoria
         * @private
         */
        mapearAnaliseParaCategoria(tipoAnalise) {
            const mapeamento = {
                'Breakthrough Técnico': 'tech',
                'Evolução Conceitual': 'conceitual',
                'Momento Decisivo': 'estrategico',
                'Insight Estratégico': 'insight',
                'Aprendizado Geral': 'aprendizado'
            };
            
            return mapeamento[tipoAnalise] || null;
        }

        /**
         * Detecta versão no nome do arquivo
         * @private
         */
        detectarVersao(nome) {
            const padroes = [
                /v(\d+(?:\.\d+)*)/i,
                /_v(\d+)/,
                /\s+(\d+(?:\.\d+)*)\s*$/,
                /-(\d+)$/
            ];
            
            for (const padrao of padroes) {
                const match = nome.match(padrao);
                if (match) {
                    return match[1];
                }
            }
            
            return null;
        }

        /**
         * Calcula versão anterior
         * @private
         */
        calcularVersaoAnterior(versao) {
            if (versao.includes('.')) {
                const partes = versao.split('.');
                const ultima = parseInt(partes[partes.length - 1]);
                if (ultima > 0) {
                    partes[partes.length - 1] = (ultima - 1).toString();
                    return partes.join('.');
                }
            } else {
                const num = parseInt(versao);
                if (num > 1) {
                    return (num - 1).toString();
                }
            }
            return '1';
        }

        /**
         * Atualiza estatísticas
         * @private
         */
        atualizarEstatisticas(triplas, tempo) {
            this.stats.totalExtraidas += triplas.length;
            this.stats.tempoTotal += tempo;
            
            triplas.forEach(tripla => {
                const tipo = tripla.presente.valor;
                this.stats.porTipo[tipo] = (this.stats.porTipo[tipo] || 0) + 1;
            });
        }

        /**
         * Extrai relacionamentos de múltiplos arquivos
         */
        async extrairEmLote(arquivos) {
            const todasTriplas = [];
            
            for (const arquivo of arquivos) {
                const triplas = await this.extrairDeArquivo(arquivo);
                todasTriplas.push(...triplas);
            }
            
            // Encontrar relacionamentos entre arquivos
            const relacionamentosEntre = this.encontrarRelacionamentosEntre(arquivos);
            todasTriplas.push(...relacionamentosEntre);
            
            return todasTriplas;
        }

        /**
         * Encontra relacionamentos entre arquivos
         * @private
         */
        encontrarRelacionamentosEntre(arquivos) {
            const triplas = [];
            
            // Agrupar por categoria
            const porCategoria = {};
            arquivos.forEach(arquivo => {
                if (arquivo.categories) {
                    arquivo.categories.forEach(cat => {
                        if (!porCategoria[cat]) porCategoria[cat] = [];
                        porCategoria[cat].push(arquivo);
                    });
                }
            });
            
            // Criar relacionamentos de similaridade
            Object.entries(porCategoria).forEach(([categoria, arquivosNaCategoria]) => {
                if (arquivosNaCategoria.length > 1) {
                    // Todos compartilham categoria
                    for (let i = 0; i < arquivosNaCategoria.length - 1; i++) {
                        for (let j = i + 1; j < arquivosNaCategoria.length; j++) {
                            triplas.push(this.criarTripla(
                                arquivosNaCategoria[i].id,
                                'compartilhaCategoriaCom',
                                arquivosNaCategoria[j].id,
                                {
                                    fonte: 'analise_relacional',
                                    confianca: 0.9,
                                    categoria: categoria
                                }
                            ));
                        }
                    }
                }
            });
            
            // Detectar sequências temporais
            const ordenadosPorData = [...arquivos].sort((a, b) => 
                new Date(a.modifiedAt || 0) - new Date(b.modifiedAt || 0)
            );
            
            for (let i = 0; i < ordenadosPorData.length - 1; i++) {
                const atual = ordenadosPorData[i];
                const proximo = ordenadosPorData[i + 1];
                
                // Se são do mesmo tipo e próximos temporalmente
                if (atual.extension === proximo.extension) {
                    const diff = new Date(proximo.modifiedAt) - new Date(atual.modifiedAt);
                    const diasDiff = diff / (1000 * 60 * 60 * 24);
                    
                    if (diasDiff < 7) { // Menos de uma semana
                        triplas.push(this.criarTripla(
                            proximo.id,
                            'segueTemporalmente',
                            atual.id,
                            {
                                fonte: 'analise_temporal',
                                confianca: 0.7,
                                diasDiferenca: diasDiff
                            }
                        ));
                    }
                }
            }
            
            return triplas;
        }

        /**
         * Limpa cache
         */
        limparCache() {
            this.cache.clear();
        }

        /**
         * Obtém estatísticas
         */
        obterEstatisticas() {
            return {
                ...this.stats,
                cacheSize: this.cache.size,
                tempoMedio: this.stats.totalExtraidas > 0 
                    ? this.stats.tempoTotal / this.stats.totalExtraidas 
                    : 0
            };
        }
    }

    // Registrar no namespace global
    KC.RelationshipExtractor = RelationshipExtractor;

})(window);