
Segue abaixo o resultado consolidado com base nos comando abaixo conforme solicitado para mitigar os problema encontrados na etapa 2, caso ocorra o mesmo problema, antecipe-se e já realize em paralelo a atualização sobre a documentação para o BluePrint conforme eu já havia solicitado no passado.


// Mostra a verdade sobre os dados
  const files = KC.AppState.get('files') || [];
  console.log('=== DADOS REAIS ===');
  console.log('Total de arquivos:', files.length);

// Conta real por relevância
  let dist = {alta: 0, media: 0, baixa: 0, pendente: 0, analisado: 0};
  files.forEach(f => {
      const rel = Math.round((f.relevanceScore || 0) * 100);
      if (rel >= 70) dist.alta++;
      else if (rel >= 50) dist.media++;
      else dist.baixa++;

      if (f.analyzed) dist.analisado++;
      else dist.pendente++;
  });
  console.table(dist)
 
 // Testa cada filtro
  console.log('\n=== TESTE DE FILTROS ===');
  const container = document.getElementById('files-container');
  ['all', 'high', 'medium', 'pending', 'analyzed'].forEach((filter, i) => {
      setTimeout(() => {
          document.querySelector(`[data-filter="${filter}"]`).click();
          setTimeout(() => {
              const visibleCount = container.querySelectorAll('.file-item').length;
              console.log(`"${filter}": ${visibleCount} arquivos mostrados (esperado: ${
                  filter === 'all' ? files.length :
                  filter === 'high' ? dist.alta :
                  filter === 'medium' ? dist.media :
                  filter === 'pending' ? dist.pendente :
                  dist.analisado
              })`);
          }, 100);
      }, i * 200);
  });
  
 [SUCCESS] Preview extraído com 99% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 84% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 5% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 78% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 86% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 88% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 73% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 90% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 84% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 95% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 95% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 85% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 83% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 78% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 84% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 91% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 81% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 57% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 97% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 74% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 88% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 92% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 92% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 98% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 98% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 75% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 96% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 80% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 97% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 88% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 92% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 90% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 2% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 85% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 81% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 74% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 88% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 99% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 99% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 86% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 82% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 75% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 91% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 95% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 97% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 77% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 98% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 88% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 92% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 89% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 88% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 92% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 92% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 93% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 90% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 88% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 94% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 89% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 58% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 89% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 93% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 98% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 100% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 85% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 97% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 91% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 96% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 94% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 54% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 95% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 92% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 98% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 92% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 94% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 94% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 95% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 92% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 98% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 93% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 95% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 93% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 97% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 86% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 80% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 93% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 66% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 71% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 93% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 71% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 92% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 90% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 97% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 87% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 73% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 90% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 91% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 74% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com -16% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 95% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 84% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 72% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 94% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 98% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 99% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 98% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 95% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 83% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 54% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 95% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 86% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 95% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 93% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 98% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [DEBUG] Handle recuperado por path: sitenovo Object
 [SUCCESS] Handle encontrado para: sitenovo Object
 [FLOW] DiscoveryManager._scanDirectory Object
 [SUCCESS] ✅ DADOS REAIS - Usando File System Access API Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 89% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 65% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 51% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 30% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 81% economia Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 75% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 74% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 32% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 93% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 96% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 91% economia Object
 [FLOW] PreviewUtils.extractSmartPreview Object
 [DEBUG] Relevance score calculated Object
 [SUCCESS] Preview extraído Object
 [SUCCESS] Preview extraído com 98% economia Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 ProgressManager: Atualizando progresso Object
 [INFO] Filtro de relevância aplicado Object
 ProgressManager: Finalizando progresso Object
 FileRenderer: Evento FILES_DISCOVERED recebido Object
 FileRenderer: 157 arquivos excluídos proativamente (.trash, vazios, etc.)
 FileRenderer: applyFilters() desativado - usando dados do FilterManager
 FileRenderer: 100 arquivos renderizados (página 1 de 3)
 FileRenderer: Seção de arquivos exibida
 FileRenderer: STATE_CHANGED recebido - atualizando arquivos
 FileRenderer: applyFilters() desativado - usando dados do FilterManager
 FileRenderer: 100 arquivos renderizados (página 1 de 3)
 FileRenderer: 167 arquivos carregados, página 1
 [DEBUG] Estado salvo: 112KB Object
 ProgressManager: Escondendo progresso
 [DEBUG] Estado salvo: 112KB Object
 [DEBUG] Estado salvo: 112KB Object
 WorkflowPanel: Forçando carregamento da lista de arquivos...
 FileRenderer: Forçando carregamento manual...
 FileRenderer: Encontrados 167 arquivos no AppState
 FileRenderer: 157 arquivos excluídos proativamente (.trash, vazios, etc.)
 FileRenderer: 10 arquivos após exclusões
 FileRenderer: applyFilters() desativado - usando dados do FilterManager
 FileRenderer: 100 arquivos renderizados (página 1 de 3)
 FileRenderer: Seção de arquivos exibida
 [DEBUG] Estado salvo: 112KB Object
 [DEBUG] Estado salvo: 112KB Object
 WorkflowPanel: Forçando carregamento da lista de arquivos...
 FileRenderer: Forçando carregamento manual...
 FileRenderer: Encontrados 167 arquivos no AppState
 FileRenderer: 157 arquivos excluídos proativamente (.trash, vazios, etc.)
 FileRenderer: 10 arquivos após exclusões
 FileRenderer: applyFilters() desativado - usando dados do FilterManager
 FileRenderer: 100 arquivos renderizados (página 1 de 3)
 FileRenderer: Seção de arquivos exibida
 🔍 FilterManager: Refinando dados...
 ProgressManager: Iniciando progresso Object
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 92 arquivos após filtros
 Aplicando filtros: 167 arquivos → 92 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 ✅ Refinamento concluído
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: 92 arquivos renderizados (página 1 de 1)
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Finalizando progresso Object
 ProgressManager: Finalizando progresso Object
 ProgressManager: Escondendo progresso
 Filtro ativado: all
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 92 arquivos após filtros
 Aplicando filtros: 167 arquivos → 92 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: 92 arquivos renderizados (página 1 de 1)
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Finalizando progresso Object
 🔍 FilterManager: Refinando dados...
 ProgressManager: Iniciando progresso Object
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 92 arquivos após filtros
 Aplicando filtros: 167 arquivos → 92 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 ✅ Refinamento concluído
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: 92 arquivos renderizados (página 1 de 1)
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Escondendo progresso
 Filtro ativado: medium
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 13 arquivos após filtros
 Aplicando filtros: 167 arquivos → 13 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: 13 arquivos renderizados (página 1 de 1)
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Finalizando progresso Object
 ProgressManager: Escondendo progresso
 Filtro ativado: pending
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 13 arquivos após filtros
 Aplicando filtros: 167 arquivos → 13 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: 13 arquivos renderizados (página 1 de 1)
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Finalizando progresso Object
 ProgressManager: Escondendo progresso
 🔍 FilterManager: Refinando dados...
 ProgressManager: Iniciando progresso Object
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 13 arquivos após filtros
 Aplicando filtros: 167 arquivos → 13 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 ✅ Refinamento concluído
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: 13 arquivos renderizados (página 1 de 1)
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Finalizando progresso Object
 ProgressManager: Finalizando progresso Object
 🔍 FilterManager: Refinando dados...
 ProgressManager: Iniciando progresso Object
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 13 arquivos após filtros
 Aplicando filtros: 167 arquivos → 13 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 ✅ Refinamento concluído
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: 13 arquivos renderizados (página 1 de 1)
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Finalizando progresso Object
 ProgressManager: Finalizando progresso Object
 ProgressManager: Escondendo progresso
 Filtro ativado: analyzed
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 0 arquivos após filtros
 Aplicando filtros: 167 arquivos → 0 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Finalizando progresso Object
 ProgressManager: Escondendo progresso
 🔍 FilterManager: Refinando dados...
 ProgressManager: Iniciando progresso Object
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 0 arquivos após filtros
 Aplicando filtros: 167 arquivos → 0 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 ✅ Refinamento concluído
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Finalizando progresso Object
 ProgressManager: Finalizando progresso Object
 ProgressManager: Escondendo progresso
 Filtro ativado: medium
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 0 arquivos após filtros
 Aplicando filtros: 167 arquivos → 0 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Finalizando progresso Object
 ProgressManager: Escondendo progresso
 🔍 FilterManager: Refinando dados...
 ProgressManager: Iniciando progresso Object
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 0 arquivos após filtros
 Aplicando filtros: 167 arquivos → 0 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 ✅ Refinamento concluído
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Finalizando progresso Object
 ProgressManager: Finalizando progresso Object
 ProgressManager: Escondendo progresso
 🔍 FilterManager: Refinando dados...
 ProgressManager: Iniciando progresso Object
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 0 arquivos após filtros
 Aplicando filtros: 167 arquivos → 0 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 ✅ Refinamento concluído
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Finalizando progresso Object
 ProgressManager: Finalizando progresso Object
 ProgressManager: Escondendo progresso
 Filtro ativado: pending
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 13 arquivos após filtros
 Aplicando filtros: 167 arquivos → 13 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
 FileRenderer: 13 arquivos renderizados (página 1 de 1)
 FileRenderer: Seção de arquivos exibida
 ProgressManager: Finalizando progresso Object
 ProgressManager: Escondendo progresso
 🔍 FilterManager: Refinando dados...
 ProgressManager: Iniciando progresso Object
 ProgressManager: Iniciando progresso Object
 FilterManager: 167 → 13 arquivos após filtros
 Aplicando filtros: 167 arquivos → 13 filtrados
 ProgressManager: Finalizando progresso Object
 ProgressManager: Iniciando progresso Object
 ✅ Refinamento concluído
 FileRenderer: Evento FILES_FILTERED recebido Object
 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:310 FileRenderer: 13 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
FilterManager.js:191 Filtro ativado: all
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FilterManager.js:920 FilterManager: 167 → 13 arquivos após filtros
FilterManager.js:326 Aplicando filtros: 167 arquivos → 13 filtrados
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FileRenderer.js:133 FileRenderer: Evento FILES_FILTERED recebido Object
FileRenderer.js:272 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:310 FileRenderer: 13 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
ProgressManager.js:250 ProgressManager: Escondendo progresso
FilterManager.js:928 🔍 FilterManager: Refinando dados...
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FilterManager.js:920 FilterManager: 167 → 13 arquivos após filtros
FilterManager.js:326 Aplicando filtros: 167 arquivos → 13 filtrados
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FilterManager.js:956 ✅ Refinamento concluído
FileRenderer.js:133 FileRenderer: Evento FILES_FILTERED recebido Object
FileRenderer.js:272 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:310 FileRenderer: 13 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
ProgressManager.js:250 ProgressManager: Escondendo progresso
Logger.js:86 [DEBUG] Estado salvo: 112KB Object
WorkflowPanel.js:1669 WorkflowPanel: Forçando carregamento da lista de arquivos...
FileRenderer.js:724 FileRenderer: Forçando carregamento manual...
FileRenderer.js:727 FileRenderer: Encontrados 167 arquivos no AppState
FileRenderer.js:240 FileRenderer: 157 arquivos excluídos proativamente (.trash, vazios, etc.)
FileRenderer.js:731 FileRenderer: 10 arquivos após exclusões
FileRenderer.js:634 FileRenderer: applyFilters() desativado - usando dados do FilterManager
FileRenderer.js:310 FileRenderer: 13 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
FilterManager.js:191 Filtro ativado: medium
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FilterManager.js:920 FilterManager: 167 → 13 arquivos após filtros
FilterManager.js:326 Aplicando filtros: 167 arquivos → 13 filtrados
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FileRenderer.js:133 FileRenderer: Evento FILES_FILTERED recebido Object
FileRenderer.js:272 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:310 FileRenderer: 13 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
FilterManager.js:928 🔍 FilterManager: Refinando dados...
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FilterManager.js:920 FilterManager: 167 → 13 arquivos após filtros
FilterManager.js:326 Aplicando filtros: 167 arquivos → 13 filtrados
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FilterManager.js:956 ✅ Refinamento concluído
FileRenderer.js:133 FileRenderer: Evento FILES_FILTERED recebido Object
FileRenderer.js:272 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:310 FileRenderer: 13 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:250 ProgressManager: Escondendo progresso
Logger.js:86 [DEBUG] Estado salvo: 112KB Object
FilterManager.js:928 🔍 FilterManager: Refinando dados...
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FilterManager.js:920 FilterManager: 167 → 13 arquivos após filtros
FilterManager.js:326 Aplicando filtros: 167 arquivos → 13 filtrados
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FilterManager.js:956 ✅ Refinamento concluído
FileRenderer.js:133 FileRenderer: Evento FILES_FILTERED recebido Object
FileRenderer.js:272 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:310 FileRenderer: 13 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
FilterManager.js:191 Filtro ativado: all
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FilterManager.js:920 FilterManager: 167 → 13 arquivos após filtros
FilterManager.js:326 Aplicando filtros: 167 arquivos → 13 filtrados
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FileRenderer.js:133 FileRenderer: Evento FILES_FILTERED recebido Object
FileRenderer.js:272 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:310 FileRenderer: 13 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:250 ProgressManager: Escondendo progresso
FilterManager.js:928 🔍 FilterManager: Refinando dados...
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FilterManager.js:920 FilterManager: 167 → 13 arquivos após filtros
FilterManager.js:326 Aplicando filtros: 167 arquivos → 13 filtrados
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:132 ProgressManager: Iniciando progresso Object
FilterManager.js:956 ✅ Refinamento concluído
FileRenderer.js:133 FileRenderer: Evento FILES_FILTERED recebido Object
FileRenderer.js:272 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:310 FileRenderer: 13 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:185 ProgressManager: Finalizando progresso Object
ProgressManager.js:250 ProgressManager: Escondendo progresso
 // Mostra a verdade sobre os dados
  const files = KC.AppState.get('files') || [];
  console.log('=== DADOS REAIS ===');
  console.log('Total de arquivos:', files.length);
VM90:3 === DADOS REAIS ===
VM90:4 Total de arquivos: 167
undefined
// Conta real por relevância
  let dist = {alta: 0, media: 0, baixa: 0, pendente: 0, analisado: 0};
  files.forEach(f => {
      const rel = Math.round((f.relevanceScore || 0) * 100);
      if (rel >= 70) dist.alta++;
      else if (rel >= 50) dist.media++;
      else dist.baixa++;

      if (f.analyzed) dist.analisado++;
      else dist.pendente++;
  });
  console.table(dist);
VM103:12 (index)Value(index)Valuealta92media13baixa62pendente167analisado0Object
undefined
 // Testa cada filtro
  console.log('\n=== TESTE DE FILTROS ===');
  const container = document.getElementById('files-container');
  ['all', 'high', 'medium', 'pending', 'analyzed'].forEach((filter, i) => {
      setTimeout(() => {
          document.querySelector(`[data-filter="${filter}"]`).click();
          setTimeout(() => {
              const visibleCount = container.querySelectorAll('.file-item').length;
              console.log(`"${filter}": ${visibleCount} arquivos mostrados (esperado: ${
                  filter === 'all' ? files.length :
                  filter === 'high' ? dist.alta :
                  filter === 'medium' ? dist.media :
                  filter === 'pending' ? dist.pendente :
                  dist.analisado
              })`);
          }, 100);
      }, i * 200);
  });
VM107:2 
=== TESTE DE FILTROS ===
undefined
FilterManager.js:191 Filtro ativado: all
ProgressManager.js:132 ProgressManager: Iniciando progresso {type: 'filter', title: 'Aplicando filtros...', details: 'Processando 167 arquivos', indeterminate: true}details: "Processando 167 arquivos"indeterminate: truetitle: "Aplicando filtros..."type: "filter"[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
FilterManager.js:920 FilterManager: 167 → 13 arquivos após filtros
FilterManager.js:326 Aplicando filtros: 167 arquivos → 13 filtrados
ProgressManager.js:185 ProgressManager: Finalizando progresso {type: 'filter', title: 'Filtros aplicados!', details: '13 arquivos encontrados'}details: "13 arquivos encontrados"title: "Filtros aplicados!"type: "filter"[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
ProgressManager.js:132 ProgressManager: Iniciando progresso {type: 'filter', title: 'Aplicando filtros...', details: '13 arquivos filtrados', duration: 300, indeterminate: true}details: "13 arquivos filtrados"duration: 300indeterminate: truetitle: "Aplicando filtros..."type: "filter"[[Prototype]]: Object
FileRenderer.js:133 FileRenderer: Evento FILES_FILTERED recebido {originalFiles: Array(167), filteredFiles: Array(13), filters: {…}}filteredFiles: (13) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]filters: {relevance: 'media', status: 'todos', timeRange: 'all', size: 'all', fileType: 'all'}originalFiles: (167) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …][[Prototype]]: Object
FileRenderer.js:272 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:310 FileRenderer: 13 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
VM107:9 "all": 0 arquivos mostrados (esperado: 167)
FilterManager.js:191 Filtro ativado: high
ProgressManager.js:132 ProgressManager: Iniciando progresso {type: 'filter', title: 'Aplicando filtros...', details: 'Processando 167 arquivos', indeterminate: true}details: "Processando 167 arquivos"indeterminate: truetitle: "Aplicando filtros..."type: "filter"[[Prototype]]: Object
FilterManager.js:920 FilterManager: 167 → 92 arquivos após filtros
FilterManager.js:326 Aplicando filtros: 167 arquivos → 92 filtrados
ProgressManager.js:185 ProgressManager: Finalizando progresso {type: 'filter', title: 'Filtros aplicados!', details: '92 arquivos encontrados'}details: "92 arquivos encontrados"title: "Filtros aplicados!"type: "filter"[[Prototype]]: Object
ProgressManager.js:132 ProgressManager: Iniciando progresso {type: 'filter', title: 'Aplicando filtros...', details: '92 arquivos filtrados', duration: 300, indeterminate: true}details: "92 arquivos filtrados"duration: 300indeterminate: truetitle: "Aplicando filtros..."type: "filter"[[Prototype]]: Object
FileRenderer.js:133 FileRenderer: Evento FILES_FILTERED recebido {originalFiles: Array(167), filteredFiles: Array(92), filters: {…}}filteredFiles: (92) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]filters: {relevance: 'alta', status: 'todos', timeRange: 'all', size: 'all', fileType: 'all'}originalFiles: (167) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …][[Prototype]]: Object
FileRenderer.js:272 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:310 FileRenderer: 92 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
ProgressManager.js:185 ProgressManager: Finalizando progresso {title: 'Aplicando filtros...', details: '13 arquivos filtrados'}details: "13 arquivos filtrados"title: "Aplicando filtros..."[[Prototype]]: Object
VM107:9 "high": 0 arquivos mostrados (esperado: 92)
FilterManager.js:191 Filtro ativado: medium
ProgressManager.js:132 ProgressManager: Iniciando progresso {type: 'filter', title: 'Aplicando filtros...', details: 'Processando 167 arquivos', indeterminate: true}details: "Processando 167 arquivos"indeterminate: truetitle: "Aplicando filtros..."type: "filter"[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
FilterManager.js:920 FilterManager: 167 → 13 arquivos após filtros
FilterManager.js:326 Aplicando filtros: 167 arquivos → 13 filtrados
ProgressManager.js:185 ProgressManager: Finalizando progresso {type: 'filter', title: 'Filtros aplicados!', details: '13 arquivos encontrados'}details: "13 arquivos encontrados"title: "Filtros aplicados!"type: "filter"[[Prototype]]: Object
ProgressManager.js:132 ProgressManager: Iniciando progresso {type: 'filter', title: 'Aplicando filtros...', details: '13 arquivos filtrados', duration: 300, indeterminate: true}details: "13 arquivos filtrados"duration: 300indeterminate: truetitle: "Aplicando filtros..."type: "filter"[[Prototype]]: Object
FileRenderer.js:133 FileRenderer: Evento FILES_FILTERED recebido {originalFiles: Array(167), filteredFiles: Array(13), filters: {…}}filteredFiles: (13) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]filters: {relevance: 'media', status: 'todos', timeRange: 'all', size: 'all', fileType: 'all'}originalFiles: (167) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …][[Prototype]]: Object
FileRenderer.js:272 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:310 FileRenderer: 13 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
ProgressManager.js:185 ProgressManager: Finalizando progresso {title: 'Aplicando filtros...', details: '92 arquivos filtrados'}details: "92 arquivos filtrados"title: "Aplicando filtros..."[[Prototype]]: Object
VM107:9 "medium": 0 arquivos mostrados (esperado: 13)
FilterManager.js:191 Filtro ativado: pending
ProgressManager.js:132 ProgressManager: Iniciando progresso {type: 'filter', title: 'Aplicando filtros...', details: 'Processando 167 arquivos', indeterminate: true}details: "Processando 167 arquivos"indeterminate: truetitle: "Aplicando filtros..."type: "filter"[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
FilterManager.js:920 FilterManager: 167 → 13 arquivos após filtros
FilterManager.js:326 Aplicando filtros: 167 arquivos → 13 filtrados
ProgressManager.js:185 ProgressManager: Finalizando progresso {type: 'filter', title: 'Filtros aplicados!', details: '13 arquivos encontrados'}details: "13 arquivos encontrados"title: "Filtros aplicados!"type: "filter"[[Prototype]]: Object
ProgressManager.js:132 ProgressManager: Iniciando progresso {type: 'filter', title: 'Aplicando filtros...', details: '13 arquivos filtrados', duration: 300, indeterminate: true}details: "13 arquivos filtrados"duration: 300indeterminate: truetitle: "Aplicando filtros..."type: "filter"[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
FileRenderer.js:133 FileRenderer: Evento FILES_FILTERED recebido {originalFiles: Array(167), filteredFiles: Array(13), filters: {…}}filteredFiles: (13) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]filters: {relevance: 'media', status: 'pendente', timeRange: 'all', size: 'all', fileType: 'all'}originalFiles: (167) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …][[Prototype]]: Object
FileRenderer.js:272 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:310 FileRenderer: 13 arquivos renderizados (página 1 de 1)
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
VM107:9 "pending": 0 arquivos mostrados (esperado: 167)
ProgressManager.js:185 ProgressManager: Finalizando progresso {title: 'Aplicando filtros...', details: '13 arquivos filtrados'}details: "13 arquivos filtrados"title: "Aplicando filtros..."[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
FilterManager.js:191 Filtro ativado: analyzed
ProgressManager.js:132 ProgressManager: Iniciando progresso {type: 'filter', title: 'Aplicando filtros...', details: 'Processando 167 arquivos', indeterminate: true}details: "Processando 167 arquivos"indeterminate: truetitle: "Aplicando filtros..."type: "filter"[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
FilterManager.js:920 FilterManager: 167 → 0 arquivos após filtros
FilterManager.js:326 Aplicando filtros: 167 arquivos → 0 filtrados
ProgressManager.js:185 ProgressManager: Finalizando progresso {type: 'filter', title: 'Filtros aplicados!', details: '0 arquivos encontrados'}details: "0 arquivos encontrados"title: "Filtros aplicados!"type: "filter"[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
ProgressManager.js:132 ProgressManager: Iniciando progresso {type: 'filter', title: 'Aplicando filtros...', details: '0 arquivos filtrados', duration: 300, indeterminate: true}details: "0 arquivos filtrados"duration: 300indeterminate: truetitle: "Aplicando filtros..."type: "filter"[[Prototype]]: Object
FileRenderer.js:133 FileRenderer: Evento FILES_FILTERED recebido {originalFiles: Array(167), filteredFiles: Array(0), filters: {…}}filteredFiles: []filters: {relevance: 'media', status: 'analisados', timeRange: 'all', size: 'all', fileType: 'all'}originalFiles: (167) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, …][[Prototype]]: Object
FileRenderer.js:272 FileRenderer: Usando dados filtrados do FilterManager
FileRenderer.js:716 FileRenderer: Seção de arquivos exibida
ProgressManager.js:185 ProgressManager: Finalizando progresso {title: 'Aplicando filtros...', details: '13 arquivos filtrados'}details: "13 arquivos filtrados"title: "Aplicando filtros..."[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()length: 0name: "toLocaleString"arguments: (...)caller: (...)[[Prototype]]: ƒ ()[[Scopes]]: Scopes[0]toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
VM107:9 "analyzed": 0 arquivos mostrados (esperado: 0)
ProgressManager.js:185 ProgressManager: Finalizando progresso {title: 'Aplicando filtros...', details: '0 arquivos filtrados'}details: "0 arquivos filtrados"title: "Aplicando filtros..."[[Prototype]]: Objectconstructor: ƒ Object()hasOwnProperty: ƒ hasOwnProperty()isPrototypeOf: ƒ isPrototypeOf()propertyIsEnumerable: ƒ propertyIsEnumerable()toLocaleString: ƒ toLocaleString()toString: ƒ toString()valueOf: ƒ valueOf()__defineGetter__: ƒ __defineGetter__()__defineSetter__: ƒ __defineSetter__()__lookupGetter__: ƒ __lookupGetter__()__lookupSetter__: ƒ __lookupSetter__()__proto__: (...)get __proto__: ƒ __proto__()set __proto__: ƒ __proto__()
ProgressManager.js:250 ProgressManager: Escondendo progresso

