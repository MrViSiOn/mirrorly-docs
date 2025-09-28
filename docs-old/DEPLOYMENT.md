# Deployment Guide - Mirrorly Project

This guide covers the deployment process for both the API and WordPress plugin components of the Mirrorly project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [API Deployment](#api-deployment)
4. [Plugin Distribution](#plugin-distribution)
5. [Version Management](#version-management)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **Docker**: 20.x or higher
- **Docker Compose**: 2.x or higher
- **Git**: Latest version
- **MySQL**: 8.0 or higher (for production)
- **Redis**: 7.x or higher (optional, for caching)

### Required Accounts and Services

- **Google Cloud Platform**: For Generative AI API
- **GitHub**: For repository and CI/CD
- **Docker Registry**: For container images (GitHub Container Registry recommended)
- **Production Server**: Linux server with Docker support

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/mirrorly-project.git
cd mirrorly-project
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install API dependencies
cd api && npm install && cd ..

# Install plugin dependencies (if applicable)
cd wordpress-plugin && npm install && cd ..
```

### 3. Environment Configuration

Copy and configure environment files:

```bash
# API environments
cp api/.env.example api/.env.development
cp api/.env.example api/.env.staging
cp api/.env.example api/.env.production

# Edit each file with appropriate values
```

#### Required Environment Variables

**Production (.env.production):**
```bash
# Database
DB_HOST=your-db-host
DB_NAME=mirrorly_prod
DB_USER=mirrorly_user
DB_PASSWORD=secure_password

# Google AI
GOOGLE_AI_API_KEY=your_google_ai_key

# Security
JWT_SECRET=your_jwt_secret_32_chars_minimum

# Other required variables...
```

## API Deployment

### Development Deployment

```bash
# Using Docker Compose
npm run docker:dev

# Or manual development
npm run dev:api
```

### Staging Deployment

```bash
# Deploy to staging
npm run deploy:api:staging

# Or using the deployment script directly
./api/scripts/deploy.sh staging v1.0.0
```

### Production Deployment

#### Option 1: Automated CI/CD (Recommended)

1. **Push to main branch** or **create a release tag**:
```bash
git tag v1.0.0
git push origin v1.0.0
```

2. **Monitor GitHub Actions** for deployment status

#### Option 2: Manual Deployment

```bash
# Deploy to production
npm run deploy:api:production

# Or using the deployment script
./api/scripts/deploy.sh production v1.0.0
```

#### Option 3: Docker Compose Production

```bash
# On production server
cd api
docker-compose -f docker-compose.prod.yml up -d
```

### Deployment Script Options

The deployment script supports various options:

```bash
# Basic deployment
./api/scripts/deploy.sh [environment] [version]

# Rollback to previous version
./api/scripts/deploy.sh rollback

# Cleanup old images
./api/scripts/deploy.sh cleanup

# Examples
./api/scripts/deploy.sh staging v1.2.0
./api/scripts/deploy.sh production latest
```

## Plugin Distribution

### Building Plugin Package

```bash
# Build plugin for distribution
npm run build:plugin

# Or using the build script directly
node scripts/build-plugin.js
```

This creates:
- `dist/mirrorly-{version}.zip` - Plugin package
- `dist/mirrorly-{version}.checksums.txt` - File checksums
- `dist/mirrorly-{version}.build-info.json` - Build metadata

### Manual Distribution

1. **Upload to WordPress.org** (if approved):
   - Use the generated ZIP file
   - Follow WordPress.org submission guidelines

2. **Direct Distribution**:
   - Provide ZIP file to customers
   - Include installation instructions

### Automated Release

Create a release tag to trigger automated plugin build and distribution:

```bash
# Create and push release tag
git tag v1.0.0
git push origin v1.0.0
```

This triggers the GitHub Actions workflow that:
- Builds the plugin package
- Runs tests
- Creates GitHub release
- Optionally deploys to WordPress.org

## Version Management

### Coordinated Versioning

The project uses coordinated versioning to keep API and plugin versions synchronized.

#### Check Version Status

```bash
npm run version:status
```

#### Synchronize Versions

```bash
npm run version:sync
```

#### Bump Version

```bash
# Patch version (1.0.0 -> 1.0.1)
npm run version:bump:patch

# Minor version (1.0.0 -> 1.1.0)
npm run version:bump:minor

# Major version (1.0.0 -> 2.0.0)
npm run version:bump:major
```

#### Set Specific Version

```bash
npm run version:set 1.2.3
```

### Version Management Options

```bash
# Skip git tag creation
node scripts/version-manager.js bump patch --no-tag

# Skip changelog update
node scripts/version-manager.js bump minor --no-changelog
```

## CI/CD Pipeline

### GitHub Actions Workflows

The project includes two main workflows:

#### 1. API Deployment (`deploy-api.yml`)

**Triggers:**
- Push to `main` (production)
- Push to `develop` (staging)
- Manual dispatch

**Process:**
1. Run tests
2. Build Docker image
3. Deploy to environment
4. Run smoke tests
5. Notify team

#### 2. Plugin Release (`release-plugin.yml`)

**Triggers:**
- Push tags (`v*`)
- Manual dispatch

**Process:**
1. Validate plugin
2. Build package
3. Test package
4. Create GitHub release
5. Deploy to WordPress.org (if configured)

### Required Secrets

Configure these secrets in GitHub repository settings:

```bash
# API Deployment
STAGING_SSH_KEY          # SSH private key for staging server
STAGING_HOST             # Staging server hostname
STAGING_USER             # SSH username for staging
STAGING_URL              # Staging API URL for testing

PRODUCTION_SSH_KEY       # SSH private key for production server
PRODUCTION_HOST          # Production server hostname
PRODUCTION_USER          # SSH username for production
PRODUCTION_URL           # Production API URL for testing

# Plugin Release
WP_ORG_USERNAME         # WordPress.org username
WP_ORG_PASSWORD         # WordPress.org password

# Notifications
SLACK_WEBHOOK           # Slack webhook for notifications

# Testing
GOOGLE_AI_API_KEY_TEST  # Google AI API key for testing
```

## Monitoring and Maintenance

### Health Checks

The API includes built-in health checks:

```bash
# Check API health
curl https://your-api-domain.com/health

# Check detailed status
curl https://your-api-domain.com/api/v1/status
```

### Logs

#### API Logs

```bash
# View logs in Docker
docker logs mirrorly-api-prod

# View log files
tail -f api/logs/app.log
tail -f api/logs/error.log
```

#### PM2 Logs

```bash
# View PM2 logs
pm2 logs mirrorly-api

# Monitor PM2 processes
pm2 monit
```

### Database Maintenance

```bash
# Backup database
mysqldump -u user -p mirrorly_prod > backup_$(date +%Y%m%d).sql

# Restore database
mysql -u user -p mirrorly_prod < backup_20240101.sql
```

### Cleanup Tasks

```bash
# Cleanup old Docker images
docker image prune -f

# Cleanup old uploads (API)
find api/uploads -type f -mtime +30 -delete

# Cleanup old logs
find api/logs -name "*.log.*" -mtime +7 -delete
```

## Troubleshooting

### Common Issues

#### 1. Docker Build Fails

```bash
# Clear Docker cache
docker builder prune -f

# Rebuild without cache
docker build --no-cache -t mirrorly-api api/
```

#### 2. Database Connection Issues

```bash
# Check database connectivity
docker exec -it mirrorly-mysql-prod mysql -u root -p

# Verify environment variables
docker exec mirrorly-api-prod env | grep DB_
```

#### 3. Plugin Build Fails

```bash
# Clear build cache
npm run clean

# Rebuild with verbose output
DEBUG=* node scripts/build-plugin.js
```

#### 4. Deployment Script Issues

```bash
# Check script permissions
chmod +x api/scripts/deploy.sh

# Run with debug output
bash -x api/scripts/deploy.sh staging
```

### Rollback Procedures

#### API Rollback

```bash
# Automatic rollback using deployment script
./api/scripts/deploy.sh rollback

# Manual rollback
docker stop mirrorly-api-prod
docker run -d --name mirrorly-api-prod \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  mirrorly-api:backup-20240101-120000
```

#### Plugin Rollback

1. **WordPress Admin**: Deactivate and delete current version
2. **Install Previous Version**: Upload previous ZIP file
3. **Reactivate**: Activate the previous version

### Performance Optimization

#### API Performance

```bash
# Monitor API performance
curl -w "@curl-format.txt" -s -o /dev/null https://your-api-domain.com/health

# Check PM2 metrics
pm2 show mirrorly-api
```

#### Database Optimization

```sql
-- Check slow queries
SHOW PROCESSLIST;

-- Optimize tables
OPTIMIZE TABLE licenses, generations, rate_limits;

-- Check indexes
SHOW INDEX FROM licenses;
```

### Security Considerations

1. **Regular Updates**: Keep dependencies updated
2. **SSL Certificates**: Ensure valid SSL certificates
3. **Firewall Rules**: Restrict access to necessary ports
4. **Backup Encryption**: Encrypt database backups
5. **API Key Rotation**: Regularly rotate API keys

### Support and Maintenance

#### Regular Maintenance Tasks

1. **Weekly**:
   - Check application logs
   - Monitor disk space
   - Verify backups

2. **Monthly**:
   - Update dependencies
   - Review performance metrics
   - Clean up old files

3. **Quarterly**:
   - Security audit
   - Performance optimization
   - Disaster recovery testing

#### Getting Help

- **Documentation**: Check this guide and inline code comments
- **Logs**: Always check application and system logs first
- **GitHub Issues**: Create issues for bugs or feature requests
- **Community**: WordPress.org support forums for plugin issues

---

For additional support or questions, please refer to the project documentation or create an issue in the GitHub repository.