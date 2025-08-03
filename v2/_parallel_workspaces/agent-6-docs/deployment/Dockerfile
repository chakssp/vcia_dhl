# Multi-stage build for KC V2 frontend
FROM node:18-alpine AS builder

# Install dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install necessary packages
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tzdata

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create non-root user
RUN addgroup -g 1001 -S kcuser && \
    adduser -u 1001 -S kcuser -G kcuser && \
    chown -R kcuser:kcuser /usr/share/nginx/html && \
    chown -R kcuser:kcuser /var/cache/nginx && \
    chown -R kcuser:kcuser /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown kcuser:kcuser /var/run/nginx.pid

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Switch to non-root user
USER kcuser

# Expose ports
EXPOSE 80

# Set environment
ENV NODE_ENV=production

# Start nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]