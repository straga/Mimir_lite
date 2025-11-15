#!/bin/bash
# Smart startup script that detects architecture and uses the right docker-compose file

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Mimir Smart Startup${NC}"
echo ""

# Detect architecture
ARCH=$(uname -m)
OS=$(uname -s)

echo -e "${BLUE}Detected System:${NC}"
echo "  OS: $OS"
echo "  Architecture: $ARCH"
echo ""

# Determine which docker-compose file to use
COMPOSE_FILE="docker-compose.yml"

if [ "$OS" = "Darwin" ]; then
  # macOS
  if [ "$ARCH" = "arm64" ]; then
    echo -e "${GREEN}✓ macOS ARM64 detected (Apple Silicon)${NC}"
    COMPOSE_FILE="docker-compose.arm64.yml"
  else
    echo -e "${GREEN}✓ macOS x86_64 detected${NC}"
    COMPOSE_FILE="docker-compose.yml"
  fi
elif [ "$OS" = "Linux" ]; then
  # Linux
  if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    echo -e "${GREEN}✓ Linux ARM64 detected${NC}"
    COMPOSE_FILE="docker-compose.arm64.yml"
  else
    echo -e "${GREEN}✓ Linux x86_64 detected${NC}"
    COMPOSE_FILE="docker-compose.yml"
  fi
elif [[ "$OS" =~ "MINGW" ]] || [[ "$OS" =~ "MSYS" ]] || [[ "$OS" =~ "CYGWIN" ]]; then
  # Windows (Git Bash/MSYS/Cygwin)
  echo -e "${GREEN}✓ Windows detected${NC}"
  COMPOSE_FILE="docker-compose.win64.yml"
else
  echo -e "${YELLOW}⚠️  Unknown OS, using default docker-compose.yml${NC}"
fi

echo -e "${BLUE}Using compose file: ${GREEN}$COMPOSE_FILE${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  No .env file found, copying from env.example${NC}"
  cp env.example .env
  echo -e "${GREEN}✓ Created .env file${NC}"
  echo ""
fi

# Parse command line arguments
COMMAND=${1:-up}
EXTRA_ARGS="${@:2}"

case "$COMMAND" in
  up|start)
    echo -e "${BLUE}🏗️  Starting services...${NC}"
    docker compose -f "$COMPOSE_FILE" up -d $EXTRA_ARGS
    echo ""
    echo -e "${GREEN}✅ Services started!${NC}"
    echo ""
    echo -e "${BLUE}Access Points:${NC}"
    echo "  • Mimir Server: http://localhost:9042"
    echo "  • Neo4j Browser: http://localhost:7474"
    echo "  • Copilot API: http://localhost:4141"
    echo "  • LLM Embeddings: http://localhost:11434"
    ;;
  
  down|stop)
    echo -e "${BLUE}🛑 Stopping services...${NC}"
    docker compose -f "$COMPOSE_FILE" down $EXTRA_ARGS
    echo -e "${GREEN}✅ Services stopped${NC}"
    ;;
  
  restart)
    echo -e "${BLUE}🔄 Restarting services...${NC}"
    docker compose -f "$COMPOSE_FILE" restart $EXTRA_ARGS
    echo -e "${GREEN}✅ Services restarted${NC}"
    ;;
  
  build)
    echo -e "${BLUE}🔨 Building images...${NC}"
    docker compose -f "$COMPOSE_FILE" build $EXTRA_ARGS
    echo -e "${GREEN}✅ Build complete${NC}"
    ;;
  
  rebuild)
    echo -e "${BLUE}🔨 Rebuilding from scratch...${NC}"
    docker compose -f "$COMPOSE_FILE" down
    docker compose -f "$COMPOSE_FILE" build --no-cache $EXTRA_ARGS
    docker compose -f "$COMPOSE_FILE" up -d
    echo -e "${GREEN}✅ Rebuild complete${NC}"
    ;;
  
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f $EXTRA_ARGS
    ;;
  
  status|ps)
    docker compose -f "$COMPOSE_FILE" ps $EXTRA_ARGS
    ;;
  
  clean)
    echo -e "${YELLOW}⚠️  This will remove all containers, volumes, and data!${NC}"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      echo -e "${BLUE}🧹 Cleaning up...${NC}"
      docker compose -f "$COMPOSE_FILE" down -v
      rm -rf data/neo4j logs/neo4j
      echo -e "${GREEN}✅ Cleanup complete${NC}"
    else
      echo -e "${YELLOW}Cancelled${NC}"
    fi
    ;;
  
  help|--help|-h)
    echo "Usage: npm run start [command] [args]"
    echo ""
    echo "Commands:"
    echo "  up, start      Start all services (default)"
    echo "  down, stop     Stop all services"
    echo "  restart        Restart all services"
    echo "  build          Build images"
    echo "  rebuild        Full rebuild (no cache) and restart"
    echo "  logs           Follow logs"
    echo "  status, ps     Show service status"
    echo "  clean          Remove all containers and data"
    echo "  help           Show this help"
    echo ""
    echo "Examples:"
    echo "  npm run start              # Start all services"
    echo "  npm run start down         # Stop all services"
    echo "  npm run start logs         # View logs"
    echo "  npm run start rebuild      # Full rebuild"
    ;;
  
  *)
    echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
    echo "Run 'npm run start help' for usage"
    exit 1
    ;;
esac
