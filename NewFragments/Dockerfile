# Simple Dockerfile for the New Fragments project
FROM node:22.12.0-alpine

LABEL maintainer="Sukhman Hara <shara1@myseneca.ca>"
LABEL description="Fragments node.js microservice"

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Use /app as our working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application source code
COPY ./src ./src

# Copy HTPASSWD file for authentication
COPY ./tests/.htpasswd ./tests/.htpasswd

# Expose port
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the container by running our server
CMD ["node", "src/index.js"]