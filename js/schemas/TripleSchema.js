/**
 * TripleSchema.js - Schema e Ontologia de Triplas Semânticas
 * 
 * Define predicados válidos, validação de triplas e ontologia do sistema
 * Baseado no modelo Legado-Presente-Objetivo
 * 
 * @version 1.0.0
 * @author Knowledge Consolidator
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;
    const Logger = KC.Logger;

    class TripleSchema {
        constructor() {
            this.logger = KC.Logger;
            
            // Definição de predicados válidos (presente/relação)
            this.predicados = {
                // Relacionamentos básicos de arquivo
                'temNome': {
                    dominio: 'arquivo',
                    alcance: 'string',
                    descricao: 'Nome do arquivo'
                },
                'temTamanho': {
                    dominio: 'arquivo',
                    alcance: 'numero',
                    descricao: 'Tamanho do arquivo em bytes'
                },
                'temTipo': {
                    dominio: 'arquivo',
                    alcance: 'string',
                    descricao: 'Tipo/extensão do arquivo'
                },
                
                // Relacionamentos de categorização
                'pertenceCategoria': {
                    dominio: 'arquivo',
                    alcance: 'categoria',
                    descricao: 'Arquivo pertence a uma categoria',
                    inverso: 'contemArquivos'
                },
                'categorizadoComo': {
                    dominio: 'arquivo',
                    alcance: 'categoria',
                    descricao: 'Arquivo foi categorizado manualmente',
                    confianca: 1.0
                },
                'sugeridaCategoria': {
                    dominio: 'any', // Pode ser arquivo ou padrão
                    alcance: 'categoria',
                    descricao: 'Categoria sugerida pela IA',
                    confianca: 0.7
                },
                
                // Relacionamentos de análise
                'foiAnalisadoComo': {
                    dominio: 'arquivo',
                    alcance: 'tipoAnalise',
                    descricao: 'Arquivo foi analisado e classificado',
                    fonte: 'ia'
                },
                'temTipoAnalise': {
                    dominio: 'arquivo',
                    alcance: 'tipoAnalise',
                    descricao: 'Tipo de análise detectado'
                },
                'possuiRelevancia': {
                    dominio: 'arquivo',
                    alcance: 'numero',
                    descricao: 'Score de relevância do arquivo'
                },
                
                // Relacionamentos de conteúdo
                'contemPalavraChave': {
                    dominio: 'arquivo',
                    alcance: 'string',
                    descricao: 'Arquivo contém palavra-chave'
                },
                'possuiInsight': {
                    dominio: 'arquivo',
                    alcance: 'string',
                    descricao: 'Insight extraído do arquivo'
                },
                'mencionaConceito': {
                    dominio: 'arquivo',
                    alcance: 'string',
                    descricao: 'Conceito mencionado no arquivo'
                },
                
                // Relacionamentos de aprendizado
                'correlacionaCom': {
                    dominio: 'any',
                    alcance: 'any',
                    descricao: 'Correlação aprendida pelo sistema',
                    bidirecional: true
                },
                'indicaPadrao': {
                    dominio: 'padrao',
                    alcance: 'acao',
                    descricao: 'Padrão que indica ação'
                },
                'sugereSolucao': {
                    dominio: 'problema',
                    alcance: 'string',
                    descricao: 'Problema sugere solução'
                },
                
                // Relacionamentos de ação
                'requerAcao': {
                    dominio: 'arquivo',
                    alcance: 'acao',
                    descricao: 'Arquivo requer ação específica'
                },
                'disparaWorkflow': {
                    dominio: 'evento',
                    alcance: 'string',
                    descricao: 'Evento dispara workflow N8N'
                },
                'notificaVia': {
                    dominio: 'evento',
                    alcance: 'string',
                    descricao: 'Notificação via Evolution API'
                },
                
                // Relacionamentos temporais
                'evoluiuDe': {
                    dominio: 'arquivo',
                    alcance: 'any', // Pode ser arquivo ID ou nome
                    descricao: 'Evolução de arquivo anterior'
                },
                'atualizadoEm': {
                    dominio: 'arquivo',
                    alcance: 'timestamp',
                    descricao: 'Data de última atualização'
                },
                'criadoEm': {
                    dominio: 'arquivo',
                    alcance: 'timestamp',
                    descricao: 'Data de criação'
                },
                
                // Relacionamentos de curadoria
                'aprovadoPor': {
                    dominio: 'arquivo',
                    alcance: 'usuario',
                    descricao: 'Aprovado por curador',
                    confianca: 1.0
                },
                'rejeitadoPor': {
                    dominio: 'arquivo',
                    alcance: 'usuario',
                    descricao: 'Rejeitado por curador'
                },
                'comentadoPor': {
                    dominio: 'arquivo',
                    alcance: 'string',
                    descricao: 'Comentário de curadoria'
                },
                
                // Relacionamentos adicionais extraídos
                'temStatus': {
                    dominio: 'arquivo',
                    alcance: 'string',
                    descricao: 'Status do arquivo'
                },
                'contemCodigo': {
                    dominio: 'arquivo',
                    alcance: 'boolean',
                    descricao: 'Arquivo contém código'
                },
                'usaLinguagem': {
                    dominio: 'arquivo',
                    alcance: 'linguagem',
                    descricao: 'Linguagem de programação usada'
                },
                'mencionaArquivo': {
                    dominio: 'arquivo',
                    alcance: 'any', // Pode ser arquivo ID ou nome
                    descricao: 'Menciona outro arquivo'
                },
                'mencionaEntidade': {
                    dominio: 'arquivo',
                    alcance: 'string',
                    descricao: 'Menciona uma entidade'
                },
                'ehPotencialSolucao': {
                    dominio: 'arquivo',
                    alcance: 'boolean',
                    descricao: 'É uma potencial solução'
                },
                'temVersao': {
                    dominio: 'arquivo',
                    alcance: 'string',
                    descricao: 'Versão do arquivo'
                },
                'compartilhaCategoriaCom': {
                    dominio: 'arquivo',
                    alcance: 'any', // Pode ser arquivo ID
                    descricao: 'Compartilha categoria com outro arquivo'
                },
                'segueTemporalmente': {
                    dominio: 'arquivo',
                    alcance: 'any', // Pode ser arquivo ID
                    descricao: 'Segue temporalmente outro arquivo'
                }
            };
            
            // Tipos de entidades válidas
            this.tiposEntidade = {
                'arquivo': {
                    prefixo: 'file_',
                    propriedades: ['id', 'nome', 'caminho', 'tamanho', 'tipo']
                },
                'categoria': {
                    prefixo: 'cat_',
                    propriedades: ['id', 'nome', 'cor', 'icone']
                },
                'tipoAnalise': {
                    prefixo: 'analysis_',
                    valores: [
                        'Breakthrough Técnico',
                        'Evolução Conceitual',
                        'Momento Decisivo',
                        'Insight Estratégico',
                        'Aprendizado Geral'
                    ]
                },
                'keyword': {
                    prefixo: 'kw_',
                    propriedades: ['valor', 'frequencia']
                },
                'usuario': {
                    prefixo: 'user_',
                    propriedades: ['id', 'nome', 'papel']
                },
                'workflow': {
                    prefixo: 'wf_',
                    propriedades: ['id', 'nome', 'trigger']
                },
                'acao': {
                    prefixo: 'action_',
                    propriedades: ['tipo', 'prioridade', 'automacao']
                },
                'linguagem': {
                    prefixo: 'lang_',
                    valores: ['javascript', 'python', 'java', 'typescript', 'sql', 'go', 'rust', 'c++', 'c#']
                },
                'boolean': {
                    valores: ['true', 'false']
                },
                'entidade': {
                    prefixo: 'entity_',
                    propriedades: ['nome', 'tipo', 'contexto']
                },
                'insight': {
                    prefixo: 'insight_',
                    propriedades: ['texto', 'tipo', 'confianca']
                },
                'comentario': {
                    prefixo: 'comment_',
                    propriedades: ['texto', 'autor', 'data']
                },
                'numero': {
                    validacao: 'numeric'
                },
                'string': {
                    validacao: 'text'
                },
                'timestamp': {
                    validacao: 'date'
                },
                'conceito': {
                    prefixo: 'concept_',
                    propriedades: ['nome', 'definicao']
                }
            };
            
            // Regras de inferência
            this.regrasInferencia = [
                {
                    nome: 'categoria_por_analise',
                    se: [
                        { presente: 'foiAnalisadoComo', objetivo: 'Breakthrough Técnico' }
                    ],
                    entao: {
                        presente: 'sugeridaCategoria',
                        objetivo: 'tech',
                        confianca: 0.8
                    }
                },
                {
                    nome: 'acao_por_padrao',
                    se: [
                        { presente: 'possuiRelevancia', objetivo: '>0.8' },
                        { presente: 'contemPalavraChave', objetivo: 'urgente' }
                    ],
                    entao: {
                        presente: 'requerAcao',
                        objetivo: 'revisao_prioritaria',
                        confianca: 0.9
                    }
                }
            ];
        }

        /**
         * Valida uma tripla segundo o schema
         * @param {Object} tripla - Tripla a validar
         * @returns {Object} {valida: boolean, erro?: string}
         */
        validarTripla(tripla) {
            try {
                // Validar estrutura básica
                if (!tripla.legado || !tripla.presente || !tripla.objetivo) {
                    return { valida: false, erro: 'Tripla deve ter legado, presente e objetivo' };
                }
                
                // Validar tipos
                if (!tripla.legado.tipo || !tripla.presente.tipo || !tripla.objetivo.tipo) {
                    return { valida: false, erro: 'Componentes da tripla devem ter tipo' };
                }
                
                // Validar predicado (presente)
                const predicado = tripla.presente.valor;
                if (!this.predicados[predicado]) {
                    this.logger.info('TripleSchema', `Predicado não definido no schema: ${predicado}`);
                    // Permitir predicados não definidos mas avisar
                }
                
                // Validar domínio e alcance se predicado conhecido
                if (this.predicados[predicado]) {
                    const def = this.predicados[predicado];
                    
                    // Validar domínio
                    if (def.dominio !== 'any') {
                        const tipoLegado = this.extrairTipoEntidade(tripla.legado.valor);
                        if (tipoLegado !== def.dominio) {
                            return {
                                valida: false,
                                erro: `Domínio inválido para ${predicado}: esperado ${def.dominio}, recebido ${tipoLegado}`
                            };
                        }
                    }
                    
                    // Validar alcance
                    if (def.alcance !== 'any') {
                        const tipoObjetivo = this.extrairTipoEntidade(tripla.objetivo.valor);
                        
                        // Permitir que predicados de texto aceitem valores que são categorizados como outros tipos
                        const predicadosFlexiveis = ['contemPalavraChave', 'possuiInsight', 'mencionaConceito'];
                        if (predicadosFlexiveis.includes(predicado) && def.alcance === 'string') {
                            // Aceitar qualquer valor textual para estes predicados
                            if (typeof tripla.objetivo.valor !== 'string') {
                                return {
                                    valida: false,
                                    erro: `Alcance inválido para ${predicado}: esperado valor textual`
                                };
                            }
                        } else if (tipoObjetivo !== def.alcance) {
                            return {
                                valida: false,
                                erro: `Alcance inválido para ${predicado}: esperado ${def.alcance}, recebido ${tipoObjetivo}`
                            };
                        }
                    }
                }
                
                // Validar metadados obrigatórios
                if (!tripla.metadados || !tripla.metadados.timestamp || !tripla.metadados.fonte) {
                    return { valida: false, erro: 'Metadados incompletos' };
                }
                
                // Validar confiança
                if (tripla.metadados.confianca !== undefined) {
                    const conf = tripla.metadados.confianca;
                    if (typeof conf !== 'number' || conf < 0 || conf > 1) {
                        return { valida: false, erro: 'Confiança deve ser número entre 0 e 1' };
                    }
                }
                
                return { valida: true };
                
            } catch (error) {
                return { valida: false, erro: error.message };
            }
        }

        /**
         * Extrai tipo de entidade do valor
         * @private
         */
        extrairTipoEntidade(valor) {
            // Primeiro, verificar o tipo real do valor
            if (typeof valor === 'number') {
                return 'numero';
            }
            
            if (typeof valor === 'boolean') {
                return 'boolean';
            }
            
            // Para valores não-string, converter para string para as verificações
            const valorStr = String(valor);
            
            // Verificar por prefixo
            for (const [tipo, def] of Object.entries(this.tiposEntidade)) {
                if (def.prefixo && valorStr.startsWith(def.prefixo)) {
                    return tipo;
                }
            }
            
            // Verificar por valores conhecidos
            if (this.tiposEntidade.tipoAnalise.valores.includes(valor)) {
                return 'tipoAnalise';
            }
            
            // Verificar se é uma categoria conhecida
            const categoriasConhecidas = ['tech', 'tecnico', 'estrategico', 'conceitual', 'decisivo', 'insight', 'aprendizado'];
            if (categoriasConhecidas.includes(valor)) {
                return 'categoria';
            }
            
            // Verificar se é uma ação conhecida
            const acoesConhecidas = ['revisao_prioritaria', 'implementar_ci_cd', 'criar_documentacao_api', 'atualizar_documentacao'];
            if (acoesConhecidas.includes(valor)) {
                return 'acao';
            }
            
            // Verificar se é uma linguagem de programação
            const linguagensConhecidas = ['javascript', 'python', 'java', 'typescript', 'sql', 'go', 'rust', 'c++', 'c#'];
            if (linguagensConhecidas.includes(valorStr.toLowerCase())) {
                return 'linguagem';
            }
            
            // Verificar se é boolean string
            if (valorStr === 'true' || valorStr === 'false') {
                return 'boolean';
            }
            
            // Verificar se é número string (não versão)
            // Mas não se for uma versão (começar com v ou ter ponto)
            if (!isNaN(valorStr) && !valorStr.match(/^v?\d+(\.\d+)*$/)) {
                return 'numero';
            }
            
            // Verificar se é timestamp
            if (valorStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                return 'timestamp';
            }
            
            // Verificar se é um status conhecido
            const statusConhecidos = ['analisado', 'pendente', 'arquivado', 'aprovado', 'rejeitado'];
            if (statusConhecidos.includes(valor)) {
                return 'string'; // Status são tratados como string
            }
            
            // Verificar se parece ser um arquivo - mas só se começa com prefixo ou caminho
            if (valorStr.match(/^(file_|\/|\.\/|\.\.\/|[a-zA-Z]:)/) && valorStr.match(/\.(js|ts|py|java|md|txt|json|html|css|xml|yaml|yml)$/)) {
                return 'arquivo';
            }
            
            // Default - nomes de arquivos simples são strings
            return 'string';
        }

        /**
         * Converte dados existentes em triplas
         * @param {Object} dados - Dados do sistema atual
         * @returns {Array} Array de triplas
         */
        converterParaTriplas(dados) {
            const triplas = [];
            
            // Converter categorias
            if (dados.categories) {
                dados.categories.forEach(cat => {
                    // Categoria tem cor
                    triplas.push({
                        legado: { tipo: 'SYS.R', valor: cat.id },
                        presente: { tipo: 'SUB.R', valor: 'temCor' },
                        objetivo: { tipo: 'ACT.R', valor: cat.color },
                        metadados: {
                            fonte: 'sistema',
                            timestamp: new Date().toISOString(),
                            confianca: 1.0
                        }
                    });
                    
                    // Categoria tem nome
                    triplas.push({
                        legado: { tipo: 'SYS.R', valor: cat.id },
                        presente: { tipo: 'SUB.R', valor: 'temNome' },
                        objetivo: { tipo: 'ACT.R', valor: cat.name },
                        metadados: {
                            fonte: 'sistema',
                            timestamp: new Date().toISOString(),
                            confianca: 1.0
                        }
                    });
                });
            }
            
            // Converter arquivos
            if (dados.files) {
                dados.files.forEach(file => {
                    // Arquivo tem tipo de análise
                    if (file.analysisType) {
                        triplas.push({
                            legado: { tipo: 'SYS.R', valor: file.id },
                            presente: { tipo: 'SUB.R', valor: 'foiAnalisadoComo' },
                            objetivo: { tipo: 'ACT.R', valor: file.analysisType },
                            metadados: {
                                fonte: 'analise_ia',
                                timestamp: new Date().toISOString(),
                                confianca: 0.8
                            }
                        });
                    }
                    
                    // Arquivo tem categorias
                    if (file.categories && file.categories.length > 0) {
                        file.categories.forEach(catId => {
                            triplas.push({
                                legado: { tipo: 'SYS.R', valor: file.id },
                                presente: { tipo: 'SUB.R', valor: 'pertenceCategoria' },
                                objetivo: { tipo: 'ACT.R', valor: catId },
                                metadados: {
                                    fonte: 'curadoria',
                                    timestamp: new Date().toISOString(),
                                    confianca: 1.0
                                }
                            });
                        });
                    }
                    
                    // Arquivo tem relevância
                    if (file.relevanceScore !== undefined) {
                        triplas.push({
                            legado: { tipo: 'SYS.R', valor: file.id },
                            presente: { tipo: 'SUB.R', valor: 'possuiRelevancia' },
                            objetivo: { tipo: 'ACT.R', valor: file.relevanceScore.toString() },
                            metadados: {
                                fonte: 'calculo',
                                timestamp: new Date().toISOString(),
                                confianca: 0.9
                            }
                        });
                    }
                });
            }
            
            return triplas;
        }

        /**
         * Aplica regras de inferência
         * @param {Array} triplas - Triplas existentes
         * @returns {Array} Novas triplas inferidas
         */
        aplicarInferencia(triplas) {
            const novasTriplas = [];
            
            this.regrasInferencia.forEach(regra => {
                // Para cada conjunto de triplas, verificar se satisfaz a condição
                triplas.forEach(tripla => {
                    let condicoesSatisfeitas = true;
                    
                    // Verificar todas as condições da regra
                    for (const condicao of regra.se) {
                        const satisfaz = triplas.some(t => 
                            t.presente.valor === condicao.presente &&
                            this.verificarObjetivo(t.objetivo.valor, condicao.objetivo)
                        );
                        
                        if (!satisfaz) {
                            condicoesSatisfeitas = false;
                            break;
                        }
                    }
                    
                    // Se todas as condições foram satisfeitas, criar nova tripla
                    if (condicoesSatisfeitas) {
                        const novaTripla = {
                            legado: tripla.legado,
                            presente: { tipo: 'SUB.R', valor: regra.entao.presente },
                            objetivo: { tipo: 'ACT.R', valor: regra.entao.objetivo },
                            metadados: {
                                fonte: 'inferencia',
                                regra: regra.nome,
                                confianca: regra.entao.confianca || 0.7,
                                timestamp: new Date().toISOString()
                            }
                        };
                        
                        // Verificar se já não existe
                        const jaExiste = triplas.some(t => 
                            t.legado.valor === novaTripla.legado.valor &&
                            t.presente.valor === novaTripla.presente.valor &&
                            t.objetivo.valor === novaTripla.objetivo.valor
                        );
                        
                        if (!jaExiste) {
                            novasTriplas.push(novaTripla);
                        }
                    }
                });
            });
            
            return novasTriplas;
        }

        /**
         * Verifica se objetivo satisfaz condição
         * @private
         */
        verificarObjetivo(valor, condicao) {
            // Se condição é comparação
            if (condicao.startsWith('>')) {
                const limite = parseFloat(condicao.substring(1));
                return parseFloat(valor) > limite;
            }
            if (condicao.startsWith('<')) {
                const limite = parseFloat(condicao.substring(1));
                return parseFloat(valor) < limite;
            }
            
            // Comparação direta
            return valor === condicao;
        }

        /**
         * Obtém predicados por domínio
         */
        obterPredicadosPorDominio(dominio) {
            return Object.entries(this.predicados)
                .filter(([_, def]) => def.dominio === dominio || def.dominio === 'any')
                .map(([nome, def]) => ({ nome, ...def }));
        }

        /**
         * Obtém predicados por alcance
         */
        obterPredicadosPorAlcance(alcance) {
            return Object.entries(this.predicados)
                .filter(([_, def]) => def.alcance === alcance || def.alcance === 'any')
                .map(([nome, def]) => ({ nome, ...def }));
        }

        /**
         * Valida consistência de um conjunto de triplas
         */
        validarConsistencia(triplas) {
            const inconsistencias = [];
            
            // Verificar contradições
            triplas.forEach((t1, i) => {
                triplas.forEach((t2, j) => {
                    if (i >= j) return;
                    
                    // Mesma entidade não pode ter valores conflitantes
                    if (t1.legado.valor === t2.legado.valor &&
                        t1.presente.valor === t2.presente.valor &&
                        t1.objetivo.valor !== t2.objetivo.valor) {
                        
                        // A menos que seja temporal
                        if (!this.ehTemporalmenteValido(t1, t2)) {
                            inconsistencias.push({
                                tipo: 'conflito',
                                triplas: [t1, t2],
                                mensagem: `Valores conflitantes para ${t1.legado.valor} ${t1.presente.valor}`
                            });
                        }
                    }
                });
            });
            
            return inconsistencias;
        }

        /**
         * Verifica se duas triplas são temporalmente válidas
         * @private
         */
        ehTemporalmenteValido(t1, t2) {
            // Se uma é mais recente, é uma atualização válida
            const time1 = new Date(t1.metadados.timestamp);
            const time2 = new Date(t2.metadados.timestamp);
            return time1.getTime() !== time2.getTime();
        }

        /**
         * Exporta schema como JSON
         */
        exportarSchema() {
            return {
                predicados: this.predicados,
                tiposEntidade: this.tiposEntidade,
                regrasInferencia: this.regrasInferencia,
                versao: '1.0.0'
            };
        }
    }

    // Registrar no namespace global
    KC.TripleSchema = new TripleSchema();

})(window);