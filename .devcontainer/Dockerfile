# Development container with all tools installed
FROM node:22-alpine

# Install essential development tools
RUN apk add --no-cache \
    git \
    bash \
    curl \
    wget \
    ca-certificates \
    python3 \
    make \
    g++ \
    # Neo4j client tools
    openjdk11-jre \
    # Text editors
    vim \
    nano \
    # Network debugging
    netcat-openbsd \
    bind-tools \
    # Process tools
    htop \
    procps

# Install global npm packages for development
RUN npm install -g \
    typescript \
    ts-node \
    nodemon \
    npm-check-updates \
    eslint \
    prettier

# Set bash as default shell
SHELL ["/bin/bash", "-c"]

# Create non-root user
RUN addgroup -g 1000 developer && \
    adduser -D -u 1000 -G developer developer

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER developer

# Keep container running
CMD ["sleep", "infinity"]
