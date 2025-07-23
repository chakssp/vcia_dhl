// Script to inject into browser via Playwright
(async () => {
    try {
        // Execute testeSimplesTriplas function
        if (typeof testeSimplesTriplas === 'function') {
            console.log('=== Executing testeSimplesTriplas() ===');
            await testeSimplesTriplas();
        } else {
            console.log('testeSimplesTriplas function not found\!');
            
            // Check what's available in global scope
            console.log('Available in window:', Object.keys(window).filter(k => k.includes('test') || k.includes('triple') || k.includes('Triple')));
            
            // Check KC namespace
            if (window.KC) {
                console.log('KC available. Checking for triple-related components...');
                console.log('KC components:', Object.keys(window.KC));
                
                // Look for TripleStoreManager
                if (window.KC.TripleStoreManager) {
                    console.log('TripleStoreManager found\!');
                    console.log('TripleStoreManager methods:', Object.keys(window.KC.TripleStoreManager));
                }
                
                // Look for extractors
                if (window.KC.ConceptualTripleExtractor) {
                    console.log('ConceptualTripleExtractor found\!');
                }
                if (window.KC.MetadataTripleExtractor) {
                    console.log('MetadataTripleExtractor found\!');
                }
                if (window.KC.RelationshipTripleExtractor) {
                    console.log('RelationshipTripleExtractor found\!');
                }
            }
        }
    } catch (error) {
        console.error('Error in test:', error);
    }
})();
