#!/bin/bash
# Guardian Mode Commands

case "$1" in
    status)
        echo "🛡️ Guardian Mode Status:"
        echo "Rules: $([ -f .claude-rules.md ] && echo "✅" || echo "❌") .claude-rules.md"
        echo "Config: $([ -f .claude-monitoring.json ] && echo "✅" || echo "❌") .claude-monitoring.json"
        echo "VSCode: $([ -f .vscode/settings.json ] && echo "✅" || echo "❌") settings.json"
        echo "Prompt: $([ -f .claude-guardian-prompt.md ] && echo "✅" || echo "❌") prompt template"
        ;;
    backup)
        ./scripts/guardian-backup.sh
        ;;
    clean-logs)
        > .claude-decisions.log
        echo "{\"sessions\": []}" > .claude-metrics.json
        echo "🧹 Logs limpos!"
        ;;
    *)
        echo "Uso: $0 {status|backup|clean-logs}"
        ;;
esac
