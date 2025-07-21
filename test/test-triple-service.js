// Quick test script for TripleStoreService
const fs = require('fs');
const path = require('path');

// Load the modules
const tripleServicePath = path.join(__dirname, 'js/services/TripleStoreService.js');
const tripleSchemaPath = path.join(__dirname, 'js/schemas/TripleSchema.js');
const tripleManagerPath = path.join(__dirname, 'js/managers/TripleStoreManager.js');

console.log('=== TESTE DO TRIPLESTORE SERVICE ===\n');

// Check if files exist
console.log('1. Verificando arquivos:');
console.log(`   - TripleStoreService: ${fs.existsSync(tripleServicePath) ? '✓ Existe' : '✗ Não existe'}`);
console.log(`   - TripleSchema: ${fs.existsSync(tripleSchemaPath) ? '✓ Existe' : '✗ Não existe'}`);
console.log(`   - TripleStoreManager: ${fs.existsSync(tripleManagerPath) ? '✓ Existe' : '✗ Não existe'}`);

// Read and analyze the service
if (fs.existsSync(tripleServicePath)) {
    const serviceContent = fs.readFileSync(tripleServicePath, 'utf8');
    
    console.log('\n2. Análise do TripleStoreService:');
    
    // Check for key methods
    const methods = [
        'createTriple',
        'getTriples',
        'getTriplesForSubject',
        'getTriplesForPredicate',
        'getTriplesForObject',
        'searchTriples',
        'removeTriple',
        'clear',
        'exportToJSON',
        'importFromJSON',
        'getStats'
    ];
    
    console.log('   Métodos implementados:');
    methods.forEach(method => {
        const hasMethod = serviceContent.includes(`${method}(`);
        console.log(`   - ${method}: ${hasMethod ? '✓' : '✗'}`);
    });
    
    // Check for internal structures
    console.log('\n   Estruturas internas:');
    console.log(`   - this.triples (Map): ${serviceContent.includes('this.triples = new Map()') ? '✓' : '✗'}`);
    console.log(`   - this.subjectIndex (Map): ${serviceContent.includes('this.subjectIndex = new Map()') ? '✓' : '✗'}`);
    console.log(`   - this.predicateIndex (Map): ${serviceContent.includes('this.predicateIndex = new Map()') ? '✓' : '✗'}`);
    console.log(`   - this.objectIndex (Map): ${serviceContent.includes('this.objectIndex = new Map()') ? '✓' : '✗'}`);
    
    // Check for event emission
    console.log('\n   Eventos:');
    console.log(`   - TRIPLE_CREATED: ${serviceContent.includes("EventBus.emit(Events.TRIPLE_CREATED") ? '✓' : '✗'}`);
    console.log(`   - TRIPLE_REMOVED: ${serviceContent.includes("EventBus.emit(Events.TRIPLE_REMOVED") ? '✓' : '✗'}`);
    console.log(`   - TRIPLE_STORE_CLEARED: ${serviceContent.includes("EventBus.emit(Events.TRIPLE_STORE_CLEARED") ? '✓' : '✗'}`);
}

// Check test file
const testPath = path.join(__dirname, 'test/test-triple-store-service.js');
if (fs.existsSync(testPath)) {
    console.log('\n3. Arquivo de teste encontrado:');
    console.log(`   - ${testPath}`);
    
    const testContent = fs.readFileSync(testPath, 'utf8');
    const testFunctions = [
        'testTripleStoreService',
        'limparTesteService'
    ];
    
    console.log('   Funções de teste:');
    testFunctions.forEach(func => {
        const hasFunc = testContent.includes(`function ${func}`) || testContent.includes(`${func} =`);
        console.log(`   - ${func}: ${hasFunc ? '✓' : '✗'}`);
    });
}

console.log('\n=== FIM DO TESTE ===');