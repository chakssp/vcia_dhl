#!/bin/bash

# ML Confidence Workflow Deployment Script
# Production deployment with zero-downtime blue-green strategy
# Version: 4.0.0

set -euo pipefail

# Configuration
DEPLOY_ENV=${DEPLOY_ENV:-production}
APP_NAME="ml-confidence-workflow"
VERSION=${VERSION:-$(git describe --tags --always)}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_ID="${VERSION}_${TIMESTAMP}"

# Directories
DEPLOY_ROOT="/opt/${APP_NAME}"
CURRENT_LINK="${DEPLOY_ROOT}/current"
RELEASES_DIR="${DEPLOY_ROOT}/releases"
SHARED_DIR="${DEPLOY_ROOT}/shared"
NEW_RELEASE="${RELEASES_DIR}/${DEPLOY_ID}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
pre_deploy_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_NODE="16.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE" ]; then
        log_error "Node.js version $NODE_VERSION is less than required $REQUIRED_NODE"
        exit 1
    fi
    
    # Check required services
    log_info "Checking required services..."
    
    # Check Qdrant
    if ! curl -s -f http://qdr.vcia.com.br:6333/health > /dev/null 2>&1; then
        log_error "Qdrant service is not accessible"
        exit 1
    fi
    
    # Check Ollama
    if ! curl -s -f http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
        log_warn "Ollama service is not accessible (embeddings may fail)"
    fi
    
    # Check disk space
    AVAILABLE_SPACE=$(df -BG ${DEPLOY_ROOT} | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 5 ]; then
        log_error "Insufficient disk space (${AVAILABLE_SPACE}GB available, 5GB required)"
        exit 1
    fi
    
    # Run pre-deploy validation script
    log_info "Running pre-deployment validation..."
    node agents_output/wave4/deployment/deployment/pre-deploy-check.js
    
    log_success "Pre-deployment checks passed"
}

# Create deployment structure
setup_deployment_dirs() {
    log_info "Setting up deployment directories..."
    
    mkdir -p "${RELEASES_DIR}"
    mkdir -p "${SHARED_DIR}/logs"
    mkdir -p "${SHARED_DIR}/cache"
    mkdir -p "${SHARED_DIR}/uploads"
    mkdir -p "${SHARED_DIR}/config"
    
    # Set permissions
    chmod 755 "${RELEASES_DIR}"
    chmod 755 "${SHARED_DIR}"
}

# Deploy application
deploy_application() {
    log_info "Deploying application version ${VERSION}..."
    
    # Create new release directory
    mkdir -p "${NEW_RELEASE}"
    
    # Copy application files
    log_info "Copying application files..."
    rsync -av --exclude-from=.deployignore \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=cache \
        ./ "${NEW_RELEASE}/"
    
    # Install dependencies
    log_info "Installing dependencies..."
    cd "${NEW_RELEASE}"
    npm ci --production
    
    # Copy configuration
    log_info "Setting up configuration..."
    cp "${SHARED_DIR}/config/.env.${DEPLOY_ENV}" "${NEW_RELEASE}/.env"
    
    # Link shared directories
    log_info "Linking shared directories..."
    ln -nfs "${SHARED_DIR}/logs" "${NEW_RELEASE}/logs"
    ln -nfs "${SHARED_DIR}/cache" "${NEW_RELEASE}/cache"
    ln -nfs "${SHARED_DIR}/uploads" "${NEW_RELEASE}/uploads"
    
    # Apply optimizations
    log_info "Applying Wave 4 optimizations..."
    node scripts/apply-optimizations.js --env="${DEPLOY_ENV}"
    
    # Build assets if needed
    if [ -f "webpack.config.js" ]; then
        log_info "Building production assets..."
        npm run build:prod
    fi
    
    log_success "Application deployed to ${NEW_RELEASE}"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd "${NEW_RELEASE}"
    
    # Initialize Qdrant collections if needed
    node scripts/init-qdrant-collections.js
    
    # Run any other migrations
    if [ -d "migrations" ]; then
        node scripts/run-migrations.js
    fi
    
    log_success "Migrations completed"
}

# Health check new deployment
health_check_new() {
    log_info "Running health checks on new deployment..."
    
    cd "${NEW_RELEASE}"
    
    # Start application in test mode
    PORT=9999 NODE_ENV=production npm start &
    APP_PID=$!
    
    # Wait for startup
    sleep 10
    
    # Run health checks
    HEALTH_STATUS=$(curl -s -w "\n%{http_code}" http://localhost:9999/health | tail -1)
    
    # Stop test instance
    kill $APP_PID || true
    
    if [ "$HEALTH_STATUS" != "200" ]; then
        log_error "Health check failed with status ${HEALTH_STATUS}"
        return 1
    fi
    
    log_success "Health checks passed"
    return 0
}

# Switch to new deployment (blue-green)
switch_deployment() {
    log_info "Switching to new deployment..."
    
    # Get current deployment if exists
    if [ -L "${CURRENT_LINK}" ]; then
        PREVIOUS_RELEASE=$(readlink "${CURRENT_LINK}")
        log_info "Previous release: ${PREVIOUS_RELEASE}"
    fi
    
    # Update symlink atomically
    ln -nfs "${NEW_RELEASE}" "${CURRENT_LINK}.tmp"
    mv -Tf "${CURRENT_LINK}.tmp" "${CURRENT_LINK}"
    
    # Reload application
    log_info "Reloading application..."
    
    # If using PM2
    if command -v pm2 &> /dev/null; then
        pm2 reload ecosystem.config.js --update-env
    # If using systemd
    elif systemctl is-active --quiet "${APP_NAME}"; then
        systemctl reload "${APP_NAME}"
    else
        log_warn "No process manager detected, manual restart required"
    fi
    
    log_success "Deployment switched successfully"
}

# Post-deployment tasks
post_deploy() {
    log_info "Running post-deployment tasks..."
    
    cd "${CURRENT_LINK}"
    
    # Warm up cache
    log_info "Warming up cache..."
    node scripts/warm-cache.js
    
    # Send deployment notification
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Deployed ${APP_NAME} version ${VERSION} to ${DEPLOY_ENV}\"}" \
            "${SLACK_WEBHOOK}"
    fi
    
    # Clean up old releases (keep last 5)
    log_info "Cleaning up old releases..."
    cd "${RELEASES_DIR}"
    ls -t | tail -n +6 | xargs -r rm -rf
    
    # Log deployment
    echo "${DEPLOY_ID}" >> "${SHARED_DIR}/logs/deployments.log"
    
    log_success "Post-deployment tasks completed"
}

# Rollback function
rollback() {
    log_error "Deployment failed, rolling back..."
    
    if [ -n "${PREVIOUS_RELEASE:-}" ] && [ -d "${PREVIOUS_RELEASE}" ]; then
        ln -nfs "${PREVIOUS_RELEASE}" "${CURRENT_LINK}.tmp"
        mv -Tf "${CURRENT_LINK}.tmp" "${CURRENT_LINK}"
        
        # Reload application
        if command -v pm2 &> /dev/null; then
            pm2 reload ecosystem.config.js --update-env
        elif systemctl is-active --quiet "${APP_NAME}"; then
            systemctl reload "${APP_NAME}"
        fi
        
        log_warn "Rolled back to ${PREVIOUS_RELEASE}"
    else
        log_error "No previous release to rollback to"
    fi
    
    # Clean up failed release
    if [ -d "${NEW_RELEASE}" ]; then
        rm -rf "${NEW_RELEASE}"
    fi
    
    exit 1
}

# Main deployment flow
main() {
    log_info "Starting deployment of ${APP_NAME} version ${VERSION} to ${DEPLOY_ENV}"
    log_info "Deployment ID: ${DEPLOY_ID}"
    
    # Set trap for rollback on error
    trap rollback ERR
    
    # Run deployment steps
    pre_deploy_checks
    setup_deployment_dirs
    deploy_application
    run_migrations
    
    # Health check before switching
    if ! health_check_new; then
        log_error "Health check failed, aborting deployment"
        rollback
    fi
    
    # Switch to new deployment
    switch_deployment
    
    # Final health check
    sleep 5
    FINAL_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
    if [ "$FINAL_HEALTH" != "200" ]; then
        log_error "Final health check failed"
        rollback
    fi
    
    # Post deployment
    post_deploy
    
    log_success "Deployment completed successfully!"
    log_success "Version ${VERSION} is now live in ${DEPLOY_ENV}"
    
    # Remove trap
    trap - ERR
}

# Handle arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    rollback)
        rollback
        ;;
    health)
        curl -s http://localhost:8000/health | jq '.'
        ;;
    status)
        if [ -L "${CURRENT_LINK}" ]; then
            CURRENT=$(readlink "${CURRENT_LINK}")
            echo "Current deployment: ${CURRENT}"
            echo "Deployed at: $(stat -c %y "${CURRENT}" 2>/dev/null || stat -f %Sm "${CURRENT}")"
        else
            echo "No active deployment found"
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health|status}"
        exit 1
        ;;
esac