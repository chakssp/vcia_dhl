#!/bin/bash

# KC V2 Deployment Script
# This script automates the deployment process for Knowledge Consolidator V2

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
APP_NAME="kc-v2"
DEPLOY_ENV="${1:-production}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f ".env.${DEPLOY_ENV}" ]; then
        log_error "Environment file .env.${DEPLOY_ENV} not found"
        exit 1
    fi
    
    log_info "All requirements satisfied"
}

create_backup() {
    log_info "Creating backup..."
    
    # Create backup directory
    mkdir -p "${BACKUP_DIR}"
    
    # Backup database
    if [ "$(docker ps -q -f name=${APP_NAME}-postgres)" ]; then
        log_info "Backing up PostgreSQL..."
        docker exec ${APP_NAME}-postgres pg_dump -U kcuser kcdb | gzip > "${BACKUP_DIR}/postgres_backup.sql.gz"
    fi
    
    # Backup Redis
    if [ "$(docker ps -q -f name=${APP_NAME}-redis)" ]; then
        log_info "Backing up Redis..."
        docker exec ${APP_NAME}-redis redis-cli BGSAVE
        sleep 5
        docker cp ${APP_NAME}-redis:/data/dump.rdb "${BACKUP_DIR}/redis_backup.rdb"
    fi
    
    # Backup Qdrant
    if [ "$(docker ps -q -f name=${APP_NAME}-qdrant)" ]; then
        log_info "Backing up Qdrant..."
        docker exec ${APP_NAME}-qdrant tar -czf /tmp/qdrant_backup.tar.gz /qdrant/storage
        docker cp ${APP_NAME}-qdrant:/tmp/qdrant_backup.tar.gz "${BACKUP_DIR}/qdrant_backup.tar.gz"
    fi
    
    log_info "Backup completed at ${BACKUP_DIR}"
}

pull_latest_code() {
    log_info "Pulling latest code..."
    
    # Store current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    
    # Stash any local changes
    git stash
    
    # Pull latest changes
    git pull origin ${CURRENT_BRANCH}
    
    # Record deployment commit
    DEPLOY_COMMIT=$(git rev-parse HEAD)
    echo "DEPLOY_COMMIT=${DEPLOY_COMMIT}" > "${BACKUP_DIR}/deploy_info.txt"
    echo "DEPLOY_TIME=${TIMESTAMP}" >> "${BACKUP_DIR}/deploy_info.txt"
    echo "DEPLOY_ENV=${DEPLOY_ENV}" >> "${BACKUP_DIR}/deploy_info.txt"
    
    log_info "Code updated to commit ${DEPLOY_COMMIT}"
}

build_images() {
    log_info "Building Docker images..."
    
    # Load environment
    export $(cat .env.${DEPLOY_ENV} | grep -v '^#' | xargs)
    
    # Build with docker-compose
    docker-compose -f docker-compose.yml -f docker-compose.${DEPLOY_ENV}.yml build --no-cache
    
    log_info "Images built successfully"
}

deploy_services() {
    log_info "Deploying services..."
    
    # Stop current services
    log_info "Stopping current services..."
    docker-compose -f docker-compose.yml -f docker-compose.${DEPLOY_ENV}.yml down
    
    # Start new services
    log_info "Starting new services..."
    docker-compose -f docker-compose.yml -f docker-compose.${DEPLOY_ENV}.yml up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check service health
    check_service_health
}

check_service_health() {
    log_info "Checking service health..."
    
    SERVICES=("app" "api" "postgres" "redis" "qdrant")
    HEALTHY=true
    
    for SERVICE in "${SERVICES[@]}"; do
        CONTAINER="${APP_NAME}-${SERVICE}"
        if [ "$(docker ps -q -f name=${CONTAINER})" ]; then
            if [ "$(docker inspect -f '{{.State.Health.Status}}' ${CONTAINER} 2>/dev/null)" == "healthy" ]; then
                log_info "${SERVICE} is healthy"
            else
                log_warn "${SERVICE} is not healthy"
                HEALTHY=false
            fi
        else
            log_error "${SERVICE} is not running"
            HEALTHY=false
        fi
    done
    
    if [ "$HEALTHY" = false ]; then
        log_error "Some services are not healthy. Check logs with: docker-compose logs"
        exit 1
    fi
    
    log_info "All services are healthy"
}

run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    sleep 5
    
    # Run migrations
    docker exec ${APP_NAME}-api npm run migrate
    
    log_info "Migrations completed"
}

cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Keep only last 7 days of backups
    find ./backups -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    
    log_info "Cleanup completed"
}

post_deployment_tests() {
    log_info "Running post-deployment tests..."
    
    # Test API health endpoint
    API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
    if [ "$API_HEALTH" -eq 200 ]; then
        log_info "API health check passed"
    else
        log_error "API health check failed with status ${API_HEALTH}"
        exit 1
    fi
    
    # Test frontend
    APP_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health)
    if [ "$APP_HEALTH" -eq 200 ]; then
        log_info "App health check passed"
    else
        log_error "App health check failed with status ${APP_HEALTH}"
        exit 1
    fi
    
    # Test WebSocket connection
    # This would require a WebSocket client tool
    
    log_info "Post-deployment tests passed"
}

rollback() {
    log_error "Deployment failed. Rolling back..."
    
    # Restore from backup
    if [ -d "${BACKUP_DIR}" ]; then
        # Stop services
        docker-compose -f docker-compose.yml -f docker-compose.${DEPLOY_ENV}.yml down
        
        # Restore database
        if [ -f "${BACKUP_DIR}/postgres_backup.sql.gz" ]; then
            log_info "Restoring PostgreSQL..."
            docker-compose -f docker-compose.yml -f docker-compose.${DEPLOY_ENV}.yml up -d postgres
            sleep 10
            gunzip < "${BACKUP_DIR}/postgres_backup.sql.gz" | docker exec -i ${APP_NAME}-postgres psql -U kcuser kcdb
        fi
        
        # Restore Redis
        if [ -f "${BACKUP_DIR}/redis_backup.rdb" ]; then
            log_info "Restoring Redis..."
            docker cp "${BACKUP_DIR}/redis_backup.rdb" ${APP_NAME}-redis:/data/dump.rdb
            docker-compose -f docker-compose.yml -f docker-compose.${DEPLOY_ENV}.yml restart redis
        fi
        
        # Start all services with previous version
        git checkout HEAD~1
        docker-compose -f docker-compose.yml -f docker-compose.${DEPLOY_ENV}.yml up -d
        
        log_info "Rollback completed"
    else
        log_error "No backup found for rollback"
    fi
}

send_notification() {
    MESSAGE=$1
    
    # Send Slack notification (if configured)
    if [ ! -z "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"KC V2 Deployment: ${MESSAGE}\"}" \
            "${SLACK_WEBHOOK_URL}"
    fi
    
    # Send email notification (if configured)
    if [ ! -z "${NOTIFICATION_EMAIL:-}" ]; then
        echo "${MESSAGE}" | mail -s "KC V2 Deployment Notification" "${NOTIFICATION_EMAIL}"
    fi
}

# Main deployment process
main() {
    log_info "Starting deployment for ${APP_NAME} in ${DEPLOY_ENV} environment"
    
    # Pre-deployment
    check_requirements
    create_backup
    pull_latest_code
    
    # Deployment
    build_images
    deploy_services
    
    # Post-deployment
    run_migrations
    post_deployment_tests
    cleanup_old_backups
    
    # Success
    log_info "Deployment completed successfully!"
    send_notification "Deployment completed successfully for ${DEPLOY_ENV} environment"
}

# Error handling
trap 'rollback' ERR

# Run main function
main

# Exit successfully
exit 0