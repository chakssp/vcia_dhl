// Check AppState structure
console.log('=== AppState Structure ===');
console.log('AppState.data:', KC.AppState.data);
console.log('Files:', KC.AppState.get('files'));
console.log('Categories:', KC.AppState.get('categories'));

// Check RAGExportManager
console.log('\n=== RAGExportManager ===');
console.log('RAGExportManager available:', !!KC.RAGExportManager);
if (KC.RAGExportManager) {
    console.log('Methods:', Object.getOwnPropertyNames(KC.RAGExportManager.constructor.prototype));
}

// Check ChunkingUtils
console.log('\n=== ChunkingUtils ===');
console.log('ChunkingUtils available:', !!KC.ChunkingUtils);

// Check EmbeddingService
console.log('\n=== EmbeddingService ===');
console.log('EmbeddingService available:', !!KC.EmbeddingService);

// Check QdrantService
console.log('\n=== QdrantService ===');
console.log('QdrantService available:', !!KC.QdrantService);