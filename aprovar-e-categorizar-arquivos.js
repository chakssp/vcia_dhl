// Script para aprovar arquivos e adicionar categorias
async function aprovarECategorizarArquivos() {
    console.log('=== APROVAÇÃO E CATEGORIZAÇÃO DE ARQUIVOS ===\n');
    
    try {
        // 1. Obter arquivos
        const arquivos = KC.AppState.get('files') || [];
        console.log(`1. Total de arquivos: ${arquivos.length}\n`);
        
        // 2. Definir categorias sugeridas por tipo de arquivo
        const categoriaSugestoes = {
            'business-case': ['Business Cases', 'Estratégico', 'Oferta'],
            'plano': ['Planejamento', 'Estratégico'],
            'prd': ['Produto', 'Documentação', 'Estratégico'],
            'prompt': ['IA/ML', 'Prompts', 'Técnico'],
            'building': ['IA/ML', 'Desenvolvimento', 'Técnico'],
            'anexo': ['Documentação', 'Legal', 'Compliance'],
            'persona': ['Produto', 'UX', 'Estratégico'],
            'texto': ['Geral'],
            'qdr': ['Infraestrutura', 'Técnico']
        };
        
        // 3. Processar cada arquivo
        console.log('2. PROCESSANDO ARQUIVOS:\n');
        
        arquivos.forEach((arquivo, index) => {
            console.log(`${index + 1}. ${arquivo.name}`);
            
            // Aprovar arquivo
            arquivo.approved = true;
            console.log('   ✅ Aprovado');
            
            // Sugerir categorias baseado no nome
            const nomeArquivo = arquivo.name.toLowerCase();
            let categoriasAdicionar = [];
            
            Object.keys(categoriaSugestoes).forEach(palavra => {
                if (nomeArquivo.includes(palavra)) {
                    categoriasAdicionar = categoriasAdicionar.concat(categoriaSugestoes[palavra]);
                }
            });
            
            // Remover duplicatas
            categoriasAdicionar = [...new Set(categoriasAdicionar)];
            
            // Se não encontrou categorias, adicionar baseado no tipo de análise
            if (categoriasAdicionar.length === 0 && arquivo.analysisType) {
                switch (arquivo.analysisType) {
                    case 'Breakthrough Técnico':
                        categoriasAdicionar = ['Técnico', 'Inovação'];
                        break;
                    case 'Insight Estratégico':
                        categoriasAdicionar = ['Estratégico', 'Insight'];
                        break;
                    case 'Momento Decisivo':
                        categoriasAdicionar = ['Decisão', 'Marco'];
                        break;
                    case 'Evolução Conceitual':
                        categoriasAdicionar = ['Conceitual', 'Evolução'];
                        break;
                    default:
                        categoriasAdicionar = ['Geral'];
                }
            }
            
            // Adicionar categorias
            arquivo.categories = categoriasAdicionar;
            console.log(`   📁 Categorias: ${categoriasAdicionar.join(', ')}`);
            console.log('');
        });
        
        // 4. Salvar no AppState
        console.log('3. SALVANDO ALTERAÇÕES...');
        KC.AppState.set('files', arquivos);
        
        // Emitir eventos
        KC.EventBus.emit(KC.Events.STATE_CHANGED, {
            key: 'files',
            newValue: arquivos,
            oldValue: arquivos
        });
        
        KC.EventBus.emit(KC.Events.FILES_UPDATED, {
            action: 'batch_update',
            count: arquivos.length
        });
        
        // 5. Resumo
        console.log('\n4. RESUMO:');
        const aprovados = arquivos.filter(f => f.approved);
        const comCategorias = arquivos.filter(f => f.categories?.length > 0);
        
        console.log(`   - Arquivos aprovados: ${aprovados.length}`);
        console.log(`   - Arquivos com categorias: ${comCategorias.length}`);
        
        // Contar categorias únicas
        const todasCategorias = new Set();
        comCategorias.forEach(f => {
            f.categories.forEach(cat => todasCategorias.add(cat));
        });
        
        console.log(`   - Total de categorias únicas: ${todasCategorias.size}`);
        console.log(`   - Categorias: ${Array.from(todasCategorias).join(', ')}`);
        
        console.log('\n✅ PRONTO! Agora você pode:');
        console.log('1. Ir para Etapa 4');
        console.log('2. Clicar em "Processar Arquivos Aprovados"');
        console.log('3. Ou executar: await KC.RAGExportManager.processApprovedFiles()');
        
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Confirmar antes de executar
if (confirm('Aprovar todos os arquivos e adicionar categorias sugeridas?')) {
    aprovarECategorizarArquivos();
} else {
    console.log('Operação cancelada.');
}