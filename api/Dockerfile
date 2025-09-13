# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install PM2 globally
RUN npm install -g pm2

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mirrorly -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy PM2 ecosystem file and other necessary files
COPY ecosystem.config.js ./
COPY healthcheck.js ./

# Create necessary directories
RUN mkdir -p logs temp uploads
RUN chown -R mirrorly:nodejs /app

# Switch to non-root user
USER mirrorly

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]