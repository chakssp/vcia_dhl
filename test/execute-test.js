// Script to execute the test in the browser console
console.log("Executing testar2Litros() function...");

// The function should already be available in the browser
if (typeof testar2Litros === 'function') {
    testar2Litros();
} else {
    console.error("testar2Litros function not found\!");
}
EOF < /dev/null
