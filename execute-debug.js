// Execute debug function with proper error handling
(function() {
    console.log('🔍 Executing debugContentExtraction...\n');
    
    if (typeof debugContentExtraction === 'function') {
        try {
            debugContentExtraction();
        } catch (error) {
            console.error('Error executing debugContentExtraction:', error);
            console.error('Stack:', error.stack);
        }
    } else {
        console.error('debugContentExtraction function not found!');
        
        // Check if it's in window
        if (typeof window.debugContentExtraction === 'function') {
            console.log('Found in window, executing...');
            try {
                window.debugContentExtraction();
            } catch (error) {
                console.error('Error executing from window:', error);
            }
        } else {
            console.error('Not found in window either');
            
            // List all debug functions available
            console.log('\nAvailable debug functions:');
            Object.keys(window).filter(k => k.includes('debug')).forEach(k => {
                console.log(`- ${k}: ${typeof window[k]}`);
            });
        }
    }
})();