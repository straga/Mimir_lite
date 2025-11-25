# Build and publish llama.cpp server for AMD64 with CUDA support and mxbai-embed-large
# Usage: .\build-llama-cpp-mxbai-cuda.ps1 [-Version "1.0.0"] [-Push]

param(
    [string]$Version = "latest",
    [switch]$Push = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$IMAGE_NAME = "timothyswt/llama-cpp-server-amd64-mxbai-cuda"
$DOCKER_USERNAME = if ($env:DOCKER_USERNAME) { $env:DOCKER_USERNAME } else { "timothyswt" }

Write-Host "[BUILD] llama.cpp server for AMD64 with CUDA and mxbai-embed-large..." -ForegroundColor Cyan
Write-Host "Image: $IMAGE_NAME`:$Version" -ForegroundColor Yellow
Write-Host "Dimensions: 1024" -ForegroundColor Yellow
Write-Host "GPU: CUDA Enabled" -ForegroundColor Green
Write-Host ""

# Find and copy model from Ollama models directory
# Check multiple possible Ollama locations
$OLLAMA_LOCATIONS = @(
    "C:\Games\ollama",
    "$env:USERPROFILE\.ollama\models",
    "$env:LOCALAPPDATA\ollama\models",
    "$env:PROGRAMFILES\ollama\models"
)

$OLLAMA_MODELS = $null
foreach ($location in $OLLAMA_LOCATIONS) {
    $testPath = Join-Path $location "manifests\registry.ollama.ai\library\mxbai-embed-large\latest"
    if (Test-Path $testPath) {
        $OLLAMA_MODELS = $location
        break
    }
}

$TARGET_DIR = "docker\llama-cpp\models"
$TARGET_PATH = "$TARGET_DIR\mxbai-embed-large.gguf"

Write-Host "[CHECK] Looking for mxbai-embed-large in Ollama models..." -ForegroundColor Cyan

if (-not $OLLAMA_MODELS) {
    Write-Host "[ERROR] Model not found in any Ollama location" -ForegroundColor Red
    Write-Host ""
    Write-Host "Searched locations:" -ForegroundColor Yellow
    foreach ($loc in $OLLAMA_LOCATIONS) {
        Write-Host "  - $loc" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Please pull the model first:" -ForegroundColor Yellow
    Write-Host "  ollama pull mxbai-embed-large" -ForegroundColor White
    Write-Host ""
    exit 1
}

$MANIFEST_PATH = Join-Path $OLLAMA_MODELS "manifests\registry.ollama.ai\library\mxbai-embed-large\latest"

Write-Host "[OK] Found Ollama models at: $OLLAMA_MODELS" -ForegroundColor Green

# Extract model blob digest
$manifest = Get-Content $MANIFEST_PATH | ConvertFrom-Json
$modelLayer = $manifest.layers | Where-Object { $_.mediaType -eq "application/vnd.ollama.image.model" } | Select-Object -First 1

if (-not $modelLayer) {
    Write-Host "[ERROR] Could not find model digest in manifest" -ForegroundColor Red
    exit 1
}

$MODEL_DIGEST = $modelLayer.digest
Write-Host "[INFO] Model digest: $MODEL_DIGEST" -ForegroundColor Cyan

# Copy model blob to target location (Ollama uses dash instead of colon on Windows)
$BLOB_FILE = $MODEL_DIGEST -replace ':', '-'
$BLOB_PATH = Join-Path $OLLAMA_MODELS "blobs\$BLOB_FILE"

if (-not (Test-Path $BLOB_PATH)) {
    Write-Host "[ERROR] Model blob not found: $BLOB_PATH" -ForegroundColor Red
    exit 1
}

Write-Host "[COPY] Copying model to build context..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $TARGET_DIR | Out-Null
Copy-Item $BLOB_PATH $TARGET_PATH -Force

Write-Host "[OK] Model copied to: $TARGET_PATH" -ForegroundColor Green
$MODEL_SIZE = [math]::Round((Get-Item $TARGET_PATH).Length / 1MB, 2)
Write-Host "   Size: $MODEL_SIZE MB" -ForegroundColor White
Write-Host ""

# Build the image with CUDA support
Write-Host "[BUILD] Building Docker image with CUDA support..." -ForegroundColor Cyan
Write-Host "   This may take 10-15 minutes (compiling CUDA kernels)..." -ForegroundColor Yellow
Write-Host ""

docker build `
    --platform linux/amd64 `
    -t "${IMAGE_NAME}:${Version}" `
    -t "${IMAGE_NAME}:latest" `
    -f docker/llama-cpp/Dockerfile.mxbai-cuda `
    .

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    Remove-Item $TARGET_PATH -Force
    exit 1
}

Write-Host ""
Write-Host "[OK] Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Image details:" -ForegroundColor Cyan
docker images | Select-String "llama-cpp-server-amd64-mxbai"

Write-Host ""
Write-Host "[INFO] Image ready for push to Docker Hub" -ForegroundColor Cyan
Write-Host "   (Make sure you're logged in: docker login)" -ForegroundColor Yellow
Write-Host ""

# Push to Docker Hub
if ($Push) {
    Write-Host "[PUSH] Pushing to Docker Hub..." -ForegroundColor Cyan
    docker push "${IMAGE_NAME}:${Version}"
    if ($Version -ne "latest") {
        docker push "${IMAGE_NAME}:latest"
    }
    Write-Host "[OK] Published to Docker Hub!" -ForegroundColor Green
} else {
    $response = Read-Host "Push to Docker Hub? (y/N)"
    if ($response -match '^[Yy]$') {
        docker push "${IMAGE_NAME}:${Version}"
        if ($Version -ne "latest") {
            docker push "${IMAGE_NAME}:latest"
        }
        Write-Host "[OK] Published to Docker Hub!" -ForegroundColor Green
    } else {
        Write-Host "[SKIP] Skipped push. To push manually:" -ForegroundColor Yellow
        Write-Host "   docker push ${IMAGE_NAME}:${Version}" -ForegroundColor White
        Write-Host "   docker push ${IMAGE_NAME}:latest" -ForegroundColor White
    }
}

# Clean up copied model
Write-Host ""
Write-Host "[CLEANUP] Cleaning up..." -ForegroundColor Cyan
Remove-Item $TARGET_PATH -Force
Write-Host "[OK] Removed temporary model copy" -ForegroundColor Green

Write-Host ""
Write-Host "[DONE] To use this image in docker-compose.amd64.yml:" -ForegroundColor Green
Write-Host "   llama-server:" -ForegroundColor White
Write-Host "     image: ${IMAGE_NAME}:${Version}" -ForegroundColor White
Write-Host "     deploy:" -ForegroundColor White
Write-Host "       resources:" -ForegroundColor White
Write-Host "         reservations:" -ForegroundColor White
Write-Host "           devices:" -ForegroundColor White
Write-Host "             - driver: nvidia" -ForegroundColor White
Write-Host "               count: 1" -ForegroundColor White
Write-Host "               capabilities: [gpu]" -ForegroundColor White
Write-Host ""
Write-Host "[NEXT] Remember to restart your containers:" -ForegroundColor Yellow
Write-Host "   npm run stop" -ForegroundColor White
Write-Host "   docker-compose -f docker-compose.amd64.yml up -d llama-server" -ForegroundColor White
Write-Host ""
Write-Host "[TEST] Test GPU usage after restart:" -ForegroundColor Cyan
Write-Host "   docker exec llama_server nvidia-smi" -ForegroundColor White
Write-Host "   docker logs llama_server | Select-String 'CUDA','GPU','layers'" -ForegroundColor White
