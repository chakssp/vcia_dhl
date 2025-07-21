// Direct Modal Test Script - to be run in browser console
// This script tests the modal system directly

console.log('=== MODAL SYSTEM DIAGNOSTIC START ===');

// 1. Check if core components exist
console.log('1. Component Availability:');
console.log('  - window.KnowledgeConsolidator:', typeof window.KnowledgeConsolidator);
console.log('  - KC.ModalManager:', typeof window.KnowledgeConsolidator?.ModalManager);
console.log('  - KC.WorkflowPanel:', typeof window.KnowledgeConsolidator?.WorkflowPanel);
console.log('  - callKC function:', typeof window.callKC);

// 2. Test ModalManager initialization
console.log('\n2. ModalManager Initialization:');
if (window.KnowledgeConsolidator?.ModalManager) {
    window.KnowledgeConsolidator.ModalManager.initialize();
    console.log('  ✅ ModalManager.initialize() called');
} else {
    console.log('  ❌ ModalManager not available');
}

// 3. Test direct modal display
console.log('\n3. Direct Modal Test:');
if (window.KnowledgeConsolidator?.ModalManager) {
    const testModalContent = `
        <div class="modal-header">
            <h2>🧪 Test Modal</h2>
        </div>
        <div class="modal-body">
            <p>This is a direct test of the modal system.</p>
            <p>If you can see this modal with proper styling, the system is working.</p>
        </div>
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="KC.ModalManager.closeModal('direct-test')">Close Test</button>
        </div>
    `;
    
    window.KnowledgeConsolidator.ModalManager.showModal('direct-test', testModalContent);
    console.log('  ✅ Test modal display attempted');
    
    // Auto-close after 3 seconds
    setTimeout(() => {
        window.KnowledgeConsolidator.ModalManager.closeModal('direct-test');
        console.log('  ✅ Test modal auto-closed');
    }, 3000);
} else {
    console.log('  ❌ Cannot test modal - ModalManager not available');
}

// 4. Test checkObsidian method
console.log('\n4. checkObsidian Method Test:');
if (window.KnowledgeConsolidator?.WorkflowPanel?.checkObsidian) {
    console.log('  ✅ checkObsidian method exists');
    // Don't call it directly as it might trigger actual functionality
} else {
    console.log('  ❌ checkObsidian method not found');
}

// 5. Test callKC function
console.log('\n5. callKC Function Test:');
if (typeof window.callKC === 'function') {
    console.log('  ✅ callKC function exists');
    // Test with a safe method
    try {
        window.callKC('WorkflowPanel.toggleSemanticHelp');
        console.log('  ✅ callKC execution test passed');
    } catch (error) {
        console.log('  ❌ callKC execution failed:', error.message);
    }
} else {
    console.log('  ❌ callKC function not found');
}

// 6. CSS Variables Test
console.log('\n6. CSS Variables Test:');
const testElement = document.createElement('div');
testElement.style.background = 'var(--bg-primary)';
testElement.style.color = 'var(--text-primary)';
testElement.style.border = '1px solid var(--border-color)';
document.body.appendChild(testElement);

const computedStyle = window.getComputedStyle(testElement);
const bgColor = computedStyle.backgroundColor;
const textColor = computedStyle.color;
const borderColor = computedStyle.borderColor;

console.log('  - --bg-primary resolved to:', bgColor);
console.log('  - --text-primary resolved to:', textColor);
console.log('  - --border-color resolved to:', borderColor);

document.body.removeChild(testElement);

if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
    console.log('  ✅ CSS variables are working');
} else {
    console.log('  ❌ CSS variables not resolving properly');
}

console.log('\n=== MODAL SYSTEM DIAGNOSTIC END ===');
console.log('\nTo test the Obsidian button:');
console.log('1. Navigate to Step 1 of the workflow');
console.log('2. Look for "🔍 Detectar Vaults do Obsidian" button');
console.log('3. Click the button to test modal display');
console.log('\nAlternatively, run: KC.WorkflowPanel.checkObsidian()');