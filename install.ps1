# Mimir One-Command Installation Script for Windows
# Usage: iwr -useb https://raw.githubusercontent.com/orneryd/Mimir/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

# Colors
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Blue }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }

Write-Host ""
Write-Host "================================================================" -ForegroundColor Blue
Write-Host "              Mimir Remote Installation (Windows)              " -ForegroundColor Blue
Write-Host "          Graph-RAG TODO with Multi-Agent Orchestra           " -ForegroundColor Blue
Write-Host "================================================================" -ForegroundColor Blue
Write-Host ""

# Check Git
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git is required but not installed."
    Write-Host "Please install Git first:"
    Write-Host "  Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "  Or with winget: winget install Git.Git" -ForegroundColor Yellow
    exit 1
}
Write-Success "Git is installed"

# Check Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is required but not installed."
    Write-Host "Please install Docker Desktop first:"
    Write-Host "  Download from: https://docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "  Or with winget: winget install Docker.DockerDesktop" -ForegroundColor Yellow
    exit 1
}
Write-Success "Docker is installed"

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Success "Docker daemon is running"
} catch {
    Write-Error "Docker daemon is not running."
    Write-Host "Please start Docker Desktop." -ForegroundColor Yellow
    exit 1
}

# Check Node.js (optional)
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Warn "Node.js is not installed. Some features may be limited."
    Write-Host "Install Node.js for full functionality:"
    Write-Host "  Download from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "  Or with winget: winget install OpenJS.NodeJS" -ForegroundColor Yellow
}

# Get installation directory
$INSTALL_DIR = if ($args.Count -gt 0) { $args[0] } else { "mimir" }

if (Test-Path $INSTALL_DIR) {
    Write-Error "Directory '$INSTALL_DIR' already exists."
    Write-Host "Choose a different directory or remove the existing one:"
    Write-Host "  Remove-Item -Recurse -Force $INSTALL_DIR" -ForegroundColor Yellow
    exit 1
}

Write-Info "Cloning Mimir repository to '$INSTALL_DIR'..."
git clone https://github.com/orneryd/Mimir.git $INSTALL_DIR

Write-Info "Changing to project directory..."
Set-Location $INSTALL_DIR

Write-Info "Setting up environment..."
if (Test-Path "env.example") {
    Copy-Item "env.example" ".env"
    Write-Success "Created .env file"
}

Write-Info "Installing Node.js dependencies..."
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm install
    Write-Success "Dependencies installed"
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "               Installation Complete! 🎉                        " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Mimir is now installed in: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  cd $INSTALL_DIR" -ForegroundColor White
Write-Host "  npm run start" -ForegroundColor White
Write-Host ""
Write-Host "Access Mimir:" -ForegroundColor Yellow
Write-Host "  Portal:  http://localhost:9042/portal" -ForegroundColor White
Write-Host "  Studio:  http://localhost:9042/studio" -ForegroundColor White
Write-Host "  Neo4j:   http://localhost:7474" -ForegroundColor White
Write-Host ""
