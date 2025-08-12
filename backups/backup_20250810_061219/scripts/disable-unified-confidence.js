#!/usr/bin/env node

/**
 * Script para desabilitar temporariamente os componentes UnifiedConfidence
 * Criado em: 02/08/2025
 * Motivo: Sistema instável após implementação do UnifiedConfidenceSystem
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Desabilitando componentes UnifiedConfidence...\n');

// Arquivos para comentar no index.html
const filesToComment = [
    'js/monitoring/ConfidencePerformanceMonitor.js',
    'js/controllers/UnifiedConfidenceController.js',
    'css/components/confidence-display.css'
];

// Ler index.html
const indexPath = path.join(__dirname, '..', 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Comentar as linhas problemáticas
filesToComment.forEach(file => {
    const regex = new RegExp(`(<(?:script|link)[^>]*(?:src|href)="[^"]*${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>(?:</script>)?)`, 'g');
    indexContent = indexContent.replace(regex, '<!-- DISABLED: $1 -->');
    console.log(`✓ Comentado: ${file}`);
});

// Salvar backup
const backupPath = indexPath + '.backup-' + new Date().toISOString().replace(/:/g, '-');
fs.writeFileSync(backupPath, fs.readFileSync(indexPath, 'utf8'));
console.log(`\n📁 Backup criado: ${path.basename(backupPath)}`);

// Salvar modificações
fs.writeFileSync(indexPath, indexContent);
console.log('✅ index.html atualizado\n');

// Verificar se há referências em outros arquivos
console.log('🔍 Verificando referências em outros arquivos...\n');

const jsDir = path.join(__dirname, '..', 'js');
const checkFiles = (dir) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.includes('unified') && !file.includes('confidence')) {
            checkFiles(filePath);
        } else if (file.endsWith('.js') && !file.includes('UnifiedConfidence') && !file.includes('ConfidencePerformance')) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('UnifiedConfidence') || content.includes('ConfidencePerformance')) {
                console.log(`⚠️  Referência encontrada em: ${filePath.replace(path.dirname(jsDir), '')}`);
            }
        }
    });
};

checkFiles(jsDir);

console.log('\n✅ Processo concluído!');
console.log('\n📌 Para reverter completamente via Git:');
console.log('   git stash (salvar mudanças atuais)');
console.log('   git checkout b7992b8 (voltar ao commit estável)');
console.log('\n📌 Para testar:');
console.log('   1. Abra http://127.0.0.1:5500');
console.log('   2. Execute kcdiag() no console');
console.log('   3. Verifique se os erros pararam\n');