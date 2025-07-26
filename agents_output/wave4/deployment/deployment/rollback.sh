#!/bin/bash

# ML Confidence Workflow Rollback Script
# Emergency rollback to previous stable version
# Version: 4.0.0

set -euo pipefail

# Configuration
APP_NAME="ml-confidence-workflow"
DEPLOY_ROOT="/opt/${APP_NAME}"
CURRENT_LINK="${DEPLOY_ROOT}/current"
RELEASES_DIR="${DEPLOY_ROOT}/releases"
ROLLBACK_LOG="${DEPLOY_ROOT}/shared/logs/rollback.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "${ROLLBACK_LOG}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "${ROLLBACK_LOG}"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "${ROLLBACK_LOG}"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "${ROLLBACK_LOG}"
}

# Get current deployment info
get_current_deployment() {
    if [ -L "${CURRENT_LINK}" ]; then
        readlink "${CURRENT_LINK}"
    else
        echo ""
    fi
}

# Get previous deployment
get_previous_deployment() {
    local current_deployment=$(basename "$(get_current_deployment)")
    
    cd "${RELEASES_DIR}"
    # Get sorted list of releases, find current, get previous
    local releases=($(ls -t))
    
    for i in "${!releases[@]}"; do
        if [[ "${releases[$i]}" == "${current_deployment}" ]]; then
            if [ $((i+1)) -lt ${#releases[@]} ]; then
                echo "${RELEASES_DIR}/${releases[$((i+1))]}"
                return 0
            fi
        fi
    done
    
    echo ""
}

# Verify deployment health
verify_deployment() {
    local deployment_path=$1
    
    log_info "Verifying deployment at ${deployment_path}..."
    
    # Check if deployment exists
    if [ ! -d "${deployment_path}" ]; then
        log_error "Deployment directory does not exist"
        return 1
    fi
    
    # Check for critical files
    local critical_files=(
        "package.json"
        "js/app.js"
        "agents_output/wave4/deployment/config/production.config.js"
    )
    
    for file in "${critical_files[@]}"; do
        if [ ! -f "${deployment_path}/${file}" ]; then
            log_error "Critical file missing: ${file}"
            return 1
        fi
    done
    
    # Quick health check (if possible to start temporarily)
    cd "${deployment_path}"
    
    # Try to load configuration
    if ! node -e "require('./agents_output/wave4/deployment/config/production.config.js')" 2>/dev/null; then
        log_error "Failed to load production configuration"
        return 1
    fi
    
    log_success "Deployment verified"
    return 0
}

# Perform rollback
perform_rollback() {
    local target_deployment=$1
    local reason=${2:-"Manual rollback requested"}
    
    log_info "Starting rollback to: ${target_deployment}"
    log_info "Reason: ${reason}"
    
    # Record current state
    local current_deployment=$(get_current_deployment)
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    echo "${timestamp} | Rollback from ${current_deployment} to ${target_deployment} | Reason: ${reason}" >> "${ROLLBACK_LOG}"
    
    # Create metrics snapshot before rollback
    if command -v curl &> /dev/null; then
        curl -s http://localhost:8000/metrics > "${DEPLOY_ROOT}/shared/logs/metrics_before_rollback_${timestamp// /_}.txt" || true
    fi
    
    # Update symlink
    log_info "Switching deployment..."
    ln -nfs "${target_deployment}" "${CURRENT_LINK}.tmp"
    mv -Tf "${CURRENT_LINK}.tmp" "${CURRENT_LINK}"
    
    # Reload application
    log_info "Reloading application..."
    
    if command -v pm2 &> /dev/null; then
        pm2 reload ecosystem.config.js --update-env
    elif systemctl is-active --quiet "${APP_NAME}"; then
        systemctl reload "${APP_NAME}"
    else
        log_warn "No process manager detected, manual restart may be required"
        # Try to restart using npm
        cd "${CURRENT_LINK}"
        npm restart || log_warn "Failed to restart application"
    fi
    
    # Wait for application to stabilize
    log_info "Waiting for application to stabilize..."
    sleep 10
    
    # Verify rollback success
    local health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "000")
    
    if [ "$health_status" = "200" ]; then
        log_success "Rollback completed successfully"
        
        # Send notification
        if [ -n "${SLACK_WEBHOOK:-}" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"⚠️ Rolled back ${APP_NAME} from ${current_deployment} to ${target_deployment}\\nReason: ${reason}\"}" \
                "${SLACK_WEBHOOK}" || true
        fi
        
        return 0
    else
        log_error "Health check failed after rollback (status: ${health_status})"
        return 1
    fi
}

# Interactive rollback selection
interactive_rollback() {
    log_info "Available releases:"
    
    cd "${RELEASES_DIR}"
    local releases=($(ls -t))
    local current=$(basename "$(get_current_deployment)")
    
    # Display releases with numbers
    for i in "${!releases[@]}"; do
        if [[ "${releases[$i]}" == "${current}" ]]; then
            echo -e "${GREEN}$((i+1)). ${releases[$i]} (current)${NC}"
        else
            echo "$((i+1)). ${releases[$i]}"
        fi
    done
    
    echo
    read -p "Select release number to rollback to (or 'q' to quit): " selection
    
    if [[ "$selection" == "q" ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
    
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt ${#releases[@]} ]; then
        log_error "Invalid selection"
        exit 1
    fi
    
    local selected_release="${releases[$((selection-1))]}"
    local selected_path="${RELEASES_DIR}/${selected_release}"
    
    if [[ "${selected_release}" == "${current}" ]]; then
        log_warn "Selected release is already current"
        exit 0
    fi
    
    # Confirm rollback
    echo
    echo -e "${YELLOW}You are about to rollback to: ${selected_release}${NC}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
    
    # Get reason
    read -p "Reason for rollback: " reason
    
    # Perform rollback
    if verify_deployment "${selected_path}"; then
        perform_rollback "${selected_path}" "${reason:-Manual rollback}"
    else
        log_error "Selected deployment failed verification"
        exit 1
    fi
}

# Emergency rollback (to last known good)
emergency_rollback() {
    log_warn "EMERGENCY ROLLBACK INITIATED"
    
    local previous=$(get_previous_deployment)
    
    if [ -z "$previous" ]; then
        log_error "No previous deployment found for emergency rollback"
        exit 1
    fi
    
    log_info "Emergency rollback to: ${previous}"
    
    if verify_deployment "${previous}"; then
        perform_rollback "${previous}" "Emergency rollback"
    else
        log_error "Previous deployment failed verification"
        
        # Try to find any working deployment
        log_warn "Searching for any working deployment..."
        
        cd "${RELEASES_DIR}"
        for release in $(ls -t); do
            local release_path="${RELEASES_DIR}/${release}"
            if verify_deployment "${release_path}"; then
                log_info "Found working deployment: ${release}"
                perform_rollback "${release_path}" "Emergency rollback to last working"
                exit $?
            fi
        done
        
        log_error "No working deployment found!"
        exit 1
    fi
}

# Show rollback history
show_history() {
    if [ -f "${ROLLBACK_LOG}" ]; then
        echo "Rollback History:"
        echo "=================="
        tail -20 "${ROLLBACK_LOG}"
    else
        echo "No rollback history found"
    fi
}

# Main function
main() {
    # Ensure log directory exists
    mkdir -p "$(dirname "${ROLLBACK_LOG}")"
    
    case "${1:-interactive}" in
        interactive|i)
            interactive_rollback
            ;;
        emergency|e)
            emergency_rollback
            ;;
        previous|p)
            local previous=$(get_previous_deployment)
            if [ -z "$previous" ]; then
                log_error "No previous deployment found"
                exit 1
            fi
            if verify_deployment "${previous}"; then
                perform_rollback "${previous}" "${2:-Rollback to previous version}"
            else
                log_error "Previous deployment failed verification"
                exit 1
            fi
            ;;
        specific|s)
            if [ -z "${2:-}" ]; then
                log_error "Please specify deployment ID"
                echo "Usage: $0 specific <deployment_id> [reason]"
                exit 1
            fi
            local target="${RELEASES_DIR}/${2}"
            if verify_deployment "${target}"; then
                perform_rollback "${target}" "${3:-Rollback to specific version}"
            else
                log_error "Specified deployment failed verification"
                exit 1
            fi
            ;;
        history|h)
            show_history
            ;;
        help|--help|-h)
            cat << EOF
ML Confidence Workflow Rollback Script

Usage: $0 [command] [options]

Commands:
  interactive|i     Interactive rollback selection (default)
  emergency|e       Emergency rollback to previous version
  previous|p        Rollback to previous version
  specific|s        Rollback to specific deployment
  history|h         Show rollback history
  help              Show this help message

Examples:
  $0                          # Interactive mode
  $0 emergency                # Emergency rollback
  $0 previous "Bug in v4.0.1" # Rollback with reason
  $0 specific 4.0.0_20240127  # Rollback to specific version

Environment Variables:
  SLACK_WEBHOOK    Slack webhook URL for notifications

EOF
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"