FROM node:18-alpine

WORKDIR /app

# Install system dependencies for code execution
RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    gcc \
    g++ \
    make \
    postgresql-client

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code only (not .env files - use docker-compose environment variables)
COPY src ./src

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
