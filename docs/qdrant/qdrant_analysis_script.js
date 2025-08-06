// Script para análise completa dos dados do Qdrant
const QDRANT_URL = 'http://qdr.vcia.com.br:6333';
const COLLECTION = 'knowledge_consolidator';
const BATCH_SIZE = 50;

class QdrantAnalyzer {
    constructor() {
        this.totalPoints = 0;
        this.categories = new Map();
        this.analysisTypes = new Map();
        this.intelligenceTypes = new Map();
        this.themes = new Map();
        this.keywords = new Map();
        this.files = new Set();
        this.allPoints = [];
    }

    async fetchAllPoints() {
        console.log('🔍 Iniciando coleta de dados do Qdrant...');
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            try {
                const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/scroll`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        limit: BATCH_SIZE,
                        offset: offset,
                        with_payload: true,
                        with_vector: false
                    })
                });

                const data = await response.json();
                
                if (data.result && data.result.points && data.result.points.length > 0) {
                    this.allPoints.push(...data.result.points);
                    offset += BATCH_SIZE;
                    console.log(`📊 Coletados ${this.allPoints.length} pontos...`);
                } else {
                    hasMore = false;
                }
            } catch (error) {
                console.error('❌ Erro ao buscar dados:', error);
                hasMore = false;
            }
        }

        console.log(`✅ Coleta concluída: ${this.allPoints.length} pontos total`);
        return this.allPoints;
    }

    analyzeData() {
        console.log('🔬 Iniciando análise dos dados...');
        
        this.totalPoints = this.allPoints.length;

        this.allPoints.forEach(point => {
            const payload = point.payload;
            
            // Análise de categorias
            if (payload.metadata?.categories) {
                payload.metadata.categories.forEach(cat => {
                    this.categories.set(cat, (this.categories.get(cat) || 0) + 1);
                });
            }

            // Análise de tipos de análise
            if (payload.analysisType) {
                this.analysisTypes.set(payload.analysisType, (this.analysisTypes.get(payload.analysisType) || 0) + 1);
            }

            // Análise de tipos de inteligência
            if (payload.intelligenceType) {
                this.intelligenceTypes.set(payload.intelligenceType, (this.intelligenceTypes.get(payload.intelligenceType) || 0) + 1);
            }

            // Análise de temas
            if (payload.convergenceChains && payload.convergenceChains.length > 0) {
                payload.convergenceChains.forEach(chain => {
                    if (chain.theme) {
                        this.themes.set(chain.theme, (this.themes.get(chain.theme) || 0) + 1);
                    }
                });
            }

            // Análise de keywords
            if (payload.metadata?.keywords) {
                payload.metadata.keywords.forEach(keyword => {
                    this.keywords.set(keyword, (this.keywords.get(keyword) || 0) + 1);
                });
            }

            // Contagem de arquivos únicos
            if (payload.metadata?.fileName) {
                this.files.add(payload.metadata.fileName);
            }
        });

        console.log('✅ Análise concluída!');
    }

    generateReport() {
        console.log('\n🎯 RELATÓRIO DE ANÁLISE DO QDRANT - KNOWLEDGE CONSOLIDATOR');
        console.log('=' .repeat(80));

        // 1. Resumo Quantitativo Geral
        console.log('\n📊 1. RESUMO QUANTITATIVO GERAL');
        console.log('-'.repeat(50));
        console.log(`📦 Total de pontos: ${this.totalPoints.toLocaleString()}`);
        console.log(`📁 Total de documentos únicos: ${this.files.size}`);
        console.log(`🏷️  Total de categorias: ${this.categories.size}`);
        console.log(`🧠 Total de tipos de inteligência: ${this.intelligenceTypes.size}`);
        console.log(`🎨 Total de temas: ${this.themes.size}`);
        console.log(`🔑 Total de keywords únicas: ${this.keywords.size}`);

        // 2. Distribuição por Categorias
        console.log('\n📂 2. DISTRIBUIÇÃO POR CATEGORIAS');
        console.log('-'.repeat(50));
        const sortedCategories = [...this.categories.entries()].sort((a, b) => b[1] - a[1]);
        sortedCategories.forEach(([category, count]) => {
            const percentage = ((count / this.totalPoints) * 100).toFixed(1);
            console.log(`${category.padEnd(30)} | ${count.toString().padStart(4)} (${percentage}%)`);
        });

        // 3. Distribuição por Tipos de Análise
        console.log('\n🔍 3. DISTRIBUIÇÃO POR TIPOS DE ANÁLISE');
        console.log('-'.repeat(50));
        const sortedAnalysisTypes = [...this.analysisTypes.entries()].sort((a, b) => b[1] - a[1]);
        sortedAnalysisTypes.forEach(([type, count]) => {
            const percentage = ((count / this.totalPoints) * 100).toFixed(1);
            console.log(`${type.padEnd(30)} | ${count.toString().padStart(4)} (${percentage}%)`);
        });

        // 4. Distribuição por Tipos de Inteligência
        console.log('\n🧠 4. DISTRIBUIÇÃO POR TIPOS DE INTELIGÊNCIA');
        console.log('-'.repeat(50));
        const sortedIntelligenceTypes = [...this.intelligenceTypes.entries()].sort((a, b) => b[1] - a[1]);
        sortedIntelligenceTypes.forEach(([type, count]) => {
            const percentage = ((count / this.totalPoints) * 100).toFixed(1);
            console.log(`${type.padEnd(30)} | ${count.toString().padStart(4)} (${percentage}%)`);
        });

        // 5. Distribuição por Temas de Convergência
        console.log('\n🎨 5. DISTRIBUIÇÃO POR TEMAS DE CONVERGÊNCIA');
        console.log('-'.repeat(50));
        const sortedThemes = [...this.themes.entries()].sort((a, b) => b[1] - a[1]);
        sortedThemes.forEach(([theme, count]) => {
            const percentage = ((count / this.totalPoints) * 100).toFixed(1);
            console.log(`${theme.padEnd(40)} | ${count.toString().padStart(4)} (${percentage}%)`);
        });

        // 6. Top 15 Keywords
        console.log('\n🔑 6. TOP 15 KEYWORDS MAIS FREQUENTES');
        console.log('-'.repeat(50));
        const sortedKeywords = [...this.keywords.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
        sortedKeywords.forEach(([keyword, count], index) => {
            const percentage = ((count / this.totalPoints) * 100).toFixed(1);
            console.log(`${(index + 1).toString().padStart(2)}. ${keyword.padEnd(25)} | ${count.toString().padStart(4)} (${percentage}%)`);
        });

        // 7. Lista de Arquivos
        console.log('\n📁 7. ARQUIVOS ÚNICOS IDENTIFICADOS');
        console.log('-'.repeat(50));
        const sortedFiles = [...this.files].sort();
        sortedFiles.forEach(file => {
            console.log(`• ${file}`);
        });

        return {
            totalPoints: this.totalPoints,
            uniqueFiles: this.files.size,
            categories: Object.fromEntries(sortedCategories),
            analysisTypes: Object.fromEntries(sortedAnalysisTypes),
            intelligenceTypes: Object.fromEntries(sortedIntelligenceTypes),
            themes: Object.fromEntries(sortedThemes),
            topKeywords: Object.fromEntries(sortedKeywords),
            allFiles: sortedFiles
        };
    }

    async run() {
        try {
            await this.fetchAllPoints();
            this.analyzeData();
            const report = this.generateReport();
            
            console.log('\n💾 Salvando relatório em JSON...');
            const reportData = {
                timestamp: new Date().toISOString(),
                server: QDRANT_URL,
                collection: COLLECTION,
                analysis: report
            };
            
            // Para usar em navegador, você pode copiar este objeto
            window.qdrantAnalysisReport = reportData;
            console.log('✅ Relatório salvo em window.qdrantAnalysisReport');
            
            return reportData;
        } catch (error) {
            console.error('❌ Erro durante análise:', error);
            throw error;
        }
    }
}

// Para executar no console do navegador:
// const analyzer = new QdrantAnalyzer();
// analyzer.run();