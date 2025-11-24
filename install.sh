#!/bin/bash
# Mimir One-Command Installation Script
# Usage: curl -fsSL https://raw.githubusercontent.com/orneryd/Mimir/main/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     OS=Linux;;
        Darwin*)    OS=Mac;;
        MINGW*|MSYS*|CYGWIN*)    OS=Windows;;
        *)          OS="UNKNOWN"
    esac
    echo "$OS"
}

OS=$(detect_os)
log_info "Detected OS: $OS"

# Check and install dependencies
check_dependency() {
    local cmd=$1
    local name=$2
    local install_cmd=$3
    
    if command -v "$cmd" &> /dev/null; then
        log_success "$name is installed"
        return 0
    else
        log_warn "$name is not installed"
        if [ -n "$install_cmd" ]; then
            log_info "Installing $name..."
            eval "$install_cmd"
            if [ $? -eq 0 ]; then
                log_success "$name installed successfully"
                return 0
            fi
        fi
        return 1
    fi
}

# Check Git
if ! check_dependency "git" "Git" ""; then
    log_error "Git is required but not installed."
    echo "Please install Git first:"
    echo "  macOS: brew install git"
    echo "  Ubuntu/Debian: sudo apt-get install git"
    echo "  Fedora/RHEL: sudo dnf install git"
    echo "  Windows: Download from https://git-scm.com/"
    exit 1
fi

# Check Docker
if ! check_dependency "docker" "Docker" ""; then
    log_error "Docker is required but not installed."
    echo "Please install Docker first:"
    echo "  macOS: brew install --cask docker"
    echo "  Ubuntu: sudo apt-get install docker.io docker-compose"
    echo "  Windows: Download Docker Desktop from https://docker.com/products/docker-desktop"
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is required but not installed."
    echo "Please install Docker Compose (usually comes with Docker Desktop)"
    exit 1
fi

# Check Node.js (optional but recommended)
if ! check_dependency "node" "Node.js" ""; then
    log_warn "Node.js is not installed. Some features may be limited."
    echo "Install Node.js for full functionality:"
    echo "  macOS: brew install node"
    echo "  Ubuntu: sudo apt-get install nodejs npm"
    echo "  Windows: Download from https://nodejs.org/"
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running."
    echo "Please start Docker Desktop or the Docker service."
    exit 1
fi

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              Mimir Remote Installation                       ║"
echo "║          Graph-RAG TODO with Multi-Agent Orchestra          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Get installation directory
INSTALL_DIR="${1:-mimir}"
if [ -d "$INSTALL_DIR" ]; then
    log_error "Directory '$INSTALL_DIR' already exists."
    echo "Choose a different directory or remove the existing one:"
    echo "  rm -rf $INSTALL_DIR"
    exit 1
fi

log_info "Cloning Mimir repository to '$INSTALL_DIR'..."
git clone https://github.com/orneryd/Mimir.git "$INSTALL_DIR"

log_info "Changing to project directory..."
cd "$INSTALL_DIR"

log_info "Running setup script..."
chmod +x scripts/setup.sh
./scripts/setup.sh

echo
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║               Installation Complete! 🎉                      ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║ Mimir is now installed in: $(pwd)"
echo "║                                                              ║"
echo "║ Next steps:                                                  ║"
echo "║   cd $INSTALL_DIR"
echo "║   mimir --help                                               ║"
echo "║   open http://localhost:7474  # Neo4j browser               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"