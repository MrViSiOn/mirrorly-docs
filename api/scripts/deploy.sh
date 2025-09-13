#!/bin/bash

# Mirrorly API Deployment Script
# Usage: ./scripts/deploy.sh [environment] [version]
# Example: ./scripts/deploy.sh production v1.0.0

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
APP_NAME="mirrorly-api"
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"your-registry.com"}
DOCKER_IMAGE="${DOCKER_REGISTRY}/${APP_NAME}"

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

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            log_info "Deploying to: $ENVIRONMENT"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            log_info "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Check if we're in the API directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the API directory"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."

    # Build the image with version tag
    docker build -t "${DOCKER_IMAGE}:${VERSION}" -t "${DOCKER_IMAGE}:latest" .

    if [ $? -eq 0 ]; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

# Run tests in container
run_tests() {
    log_info "Running tests in container..."

    # Create a test container
    docker run --rm \
        -e NODE_ENV=test \
        "${DOCKER_IMAGE}:${VERSION}" \
        npm test

    if [ $? -eq 0 ]; then
        log_success "All tests passed"
    else
        log_error "Tests failed"
        exit 1
    fi
}

# Push to registry
push_image() {
    if [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "staging" ]; then
        log_info "Pushing image to registry..."

        docker push "${DOCKER_IMAGE}:${VERSION}"
        docker push "${DOCKER_IMAGE}:latest"

        if [ $? -eq 0 ]; then
            log_success "Image pushed to registry"
        else
            log_error "Failed to push image to registry"
            exit 1
        fi
    else
        log_info "Skipping registry push for development environment"
    fi
}

# Deploy to environment
deploy_to_environment() {
    log_info "Deploying to $ENVIRONMENT environment..."

    case $ENVIRONMENT in
        development)
            deploy_development
            ;;
        staging)
            deploy_staging
            ;;
        production)
            deploy_production
            ;;
    esac
}

# Development deployment (local)
deploy_development() {
    log_info "Starting development deployment..."

    # Stop existing container if running
    docker stop ${APP_NAME}-dev 2>/dev/null || true
    docker rm ${APP_NAME}-dev 2>/dev/null || true

    # Run new container
    docker run -d \
        --name ${APP_NAME}-dev \
        -p 3000:3000 \
        -e NODE_ENV=development \
        --env-file .env.development \
        -v $(pwd)/logs:/app/logs \
        -v $(pwd)/uploads:/app/uploads \
        "${DOCKER_IMAGE}:${VERSION}"

    log_success "Development deployment completed"
    log_info "API is running at http://localhost:3000"
}

# Staging deployment
deploy_staging() {
    log_info "Starting staging deployment..."

    # This would typically involve deploying to a staging server
    # For now, we'll run it locally with staging config

    docker stop ${APP_NAME}-staging 2>/dev/null || true
    docker rm ${APP_NAME}-staging 2>/dev/null || true

    docker run -d \
        --name ${APP_NAME}-staging \
        -p 3001:3000 \
        -e NODE_ENV=staging \
        --env-file .env.staging \
        --restart unless-stopped \
        "${DOCKER_IMAGE}:${VERSION}"

    log_success "Staging deployment completed"
    log_info "Staging API is running at http://localhost:3001"
}

# Production deployment
deploy_production() {
    log_info "Starting production deployment..."

    # Backup current deployment
    backup_current_deployment

    # Deploy new version with zero-downtime
    deploy_with_zero_downtime

    log_success "Production deployment completed"
}

# Backup current deployment
backup_current_deployment() {
    log_info "Creating backup of current deployment..."

    # Tag current running image as backup
    CURRENT_IMAGE=$(docker inspect ${APP_NAME}-prod --format='{{.Config.Image}}' 2>/dev/null || echo "none")
    if [ "$CURRENT_IMAGE" != "none" ]; then
        docker tag "$CURRENT_IMAGE" "${DOCKER_IMAGE}:backup-$(date +%Y%m%d-%H%M%S)"
        log_success "Backup created"
    fi
}

# Zero-downtime deployment
deploy_with_zero_downtime() {
    log_info "Performing zero-downtime deployment..."

    # Start new container on different port
    docker run -d \
        --name ${APP_NAME}-prod-new \
        -p 3002:3000 \
        -e NODE_ENV=production \
        --env-file .env.production \
        --restart unless-stopped \
        "${DOCKER_IMAGE}:${VERSION}"

    # Wait for new container to be healthy
    log_info "Waiting for new container to be healthy..."
    sleep 10

    # Health check
    if curl -f http://localhost:3002/health > /dev/null 2>&1; then
        log_success "New container is healthy"

        # Switch traffic (this would be done by load balancer in real setup)
        docker stop ${APP_NAME}-prod 2>/dev/null || true
        docker rm ${APP_NAME}-prod 2>/dev/null || true

        # Rename new container
        docker rename ${APP_NAME}-prod-new ${APP_NAME}-prod

        # Update port mapping (restart with correct port)
        docker stop ${APP_NAME}-prod
        docker commit ${APP_NAME}-prod ${APP_NAME}-prod-temp
        docker rm ${APP_NAME}-prod

        docker run -d \
            --name ${APP_NAME}-prod \
            -p 3000:3000 \
            -e NODE_ENV=production \
            --env-file .env.production \
            --restart unless-stopped \
            ${APP_NAME}-prod-temp

        # Cleanup temp image
        docker rmi ${APP_NAME}-prod-temp

        log_success "Traffic switched to new deployment"
    else
        log_error "New container failed health check"
        docker stop ${APP_NAME}-prod-new
        docker rm ${APP_NAME}-prod-new
        exit 1
    fi
}

# Rollback function
rollback() {
    log_warning "Rolling back to previous version..."

    # Find backup image
    BACKUP_IMAGE=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep "${APP_NAME}:backup-" | head -1)

    if [ -n "$BACKUP_IMAGE" ]; then
        log_info "Rolling back to: $BACKUP_IMAGE"

        docker stop ${APP_NAME}-prod
        docker rm ${APP_NAME}-prod

        docker run -d \
            --name ${APP_NAME}-prod \
            -p 3000:3000 \
            -e NODE_ENV=production \
            --env-file .env.production \
            --restart unless-stopped \
            "$BACKUP_IMAGE"

        log_success "Rollback completed"
    else
        log_error "No backup image found for rollback"
        exit 1
    fi
}

# Cleanup old images
cleanup() {
    log_info "Cleaning up old images..."

    # Remove images older than 7 days
    docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | \
    grep "${APP_NAME}" | \
    awk '$3 ~ /days/ && $3 > 7 {print $1}' | \
    xargs -r docker rmi

    # Remove dangling images
    docker image prune -f

    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    log_info "Starting Mirrorly API deployment..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Version: $VERSION"

    validate_environment
    check_prerequisites
    build_image

    # Run tests only for staging and production
    if [ "$ENVIRONMENT" != "development" ]; then
        run_tests
    fi

    push_image
    deploy_to_environment

    # Cleanup only in production
    if [ "$ENVIRONMENT" = "production" ]; then
        cleanup
    fi

    log_success "Deployment completed successfully!"
    log_info "Version $VERSION is now running in $ENVIRONMENT"
}

# Handle script arguments
case "${1:-}" in
    rollback)
        rollback
        ;;
    cleanup)
        cleanup
        ;;
    *)
        main
        ;;
esac