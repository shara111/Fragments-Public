# Multi-stage Dockerfile for fragments-ui
# Stage 1: Build - Use Parcel to build the static site
FROM node:22.12.0-alpine AS build

LABEL maintainer="Sukhman Hara <shara1@myseneca.ca>"
LABEL description="Fragments UI - Build stage"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for Parcel)
RUN npm ci && npm cache clean --force

# Copy source files
COPY . .

# Build the static site with Parcel
RUN npm run build

# Stage 2: Production - Use nginx to serve static files
FROM nginx:1.27-alpine AS production

LABEL maintainer="Sukhman Hara <shara1@myseneca.ca>"
LABEL description="Fragments UI - Production stage with nginx"

# Copy built static files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration (optional - nginx default config works for SPA)
# For a Single Page Application, we need to serve index.html for all routes
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# nginx runs as root by default in the official image, but it's fine for read-only static files
# Start nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]

