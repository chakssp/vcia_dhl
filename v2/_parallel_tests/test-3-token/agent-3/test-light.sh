#!/bin/bash
# Test Light Script - Token Threshold Test 3
# Simple utility script for basic file operations

set -e

echo "=== Light Test Script ==="
echo "Timestamp: $(date)"
echo "Working directory: $(pwd)"

# Basic file check
if [ -f "token-test.log" ]; then
    echo "Log file exists: $(wc -l < token-test.log) lines"
else
    echo "No log file found"
fi

echo "Script completed successfully"