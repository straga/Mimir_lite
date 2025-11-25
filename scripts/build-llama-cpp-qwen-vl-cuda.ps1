# Build and publish llama.cpp server for AMD64 with CUDA support and Qwen2.5-VL
# Usage: .\build-llama-cpp-qwen-vl-cuda.ps1 [-ModelSize "2b"|"7b"] [-Version "1.0.0"] [-Push]

param(
    [ValidateSet("2b", "7b")]
    [string]$ModelSize = "7b",
    [string]$Version = "latest",
    [switch]$Push = $false,
    [switch]$SkipDownload = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$IMAGE_NAME = "timothyswt/llama-cpp-server-amd64-qwen-vl-${ModelSize}-cuda"
$DOCKER_USERNAME = if ($env:DOCKER_USERNAME) { $env:DOCKER_USERNAME } else { "timothyswt" }

Write-Host "[BUILD] llama.cpp server for AMD64 with CUDA and Qwen2.5-VL-${ModelSize}..." -ForegroundColor Cyan
Write-Host "Image: $IMAGE_NAME`:$Version" -ForegroundColor Yellow
Write-Host "GPU: CUDA Enabled" -ForegroundColor Green
Write-Host ""

# Target directory for models
$TARGET_DIR = "docker\llama-cpp\models"
$TARGET_PATH = "$TARGET_DIR\qwen2.5-vl-${ModelSize}.gguf"
$VISION_PATH = "$TARGET_DIR\qwen2.5-vl-${ModelSize}-vision.gguf"

# Create models directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $TARGET_DIR | Out-Null

Write-Host "[CHECK] Looking for Qwen2.5-VL-${ModelSize} GGUF models..." -ForegroundColor Cyan
Write-Host ""

# Determine HuggingFace URLs based on model size
switch ($ModelSize) {
    "2b" {
        $HUGGINGFACE_URL = "https://huggingface.co/Qwen/Qwen2.5-VL-2B-Instruct-GGUF/resolve/main/qwen2.5-vl-2b-instruct-q4_k_m.gguf"
        $VISION_URL = "https://huggingface.co/Qwen/Qwen2.5-VL-2B-Instruct-GGUF/resolve/main/mmproj-qwen2.5-vl-2b-instruct-f16.gguf"
        $CTX_SIZE = "32768"
        $EXPECTED_SIZE_MB = 1500
    }
    "7b" {
        $HUGGINGFACE_URL = "https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct-GGUF/resolve/main/qwen2.5-vl-7b-instruct-q4_k_m.gguf"
        $VISION_URL = "https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct-GGUF/resolve/main/mmproj-qwen2.5-vl-7b-instruct-f16.gguf"
        $CTX_SIZE = "131072"
        $EXPECTED_SIZE_MB = 4500
    }
}

# Check if models already exist
$DOWNLOAD_SUCCESS = $true

if (-not (Test-Path $TARGET_PATH) -and -not $SkipDownload) {
    Write-Host "[DOWNLOAD] Downloading main model from HuggingFace..." -ForegroundColor Cyan
    Write-Host "URL: $HUGGINGFACE_URL" -ForegroundColor Gray
    Write-Host "This may take 10-30 minutes depending on your connection..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $HUGGINGFACE_URL -OutFile $TARGET_PATH -UseBasicParsing
        Write-Host "[OK] Main model downloaded" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Download failed: $_" -ForegroundColor Red
        $DOWNLOAD_SUCCESS = $false
    }
} elseif (Test-Path $TARGET_PATH) {
    Write-Host "[OK] Main model already exists: $TARGET_PATH" -ForegroundColor Green
    $MODEL_SIZE_MB = [math]::Round((Get-Item $TARGET_PATH).Length / 1MB, 2)
    Write-Host "   Size: $MODEL_SIZE_MB MB" -ForegroundColor White
}

if (-not (Test-Path $VISION_PATH) -and -not $SkipDownload) {
    Write-Host ""
    Write-Host "[DOWNLOAD] Downloading vision projector from HuggingFace..." -ForegroundColor Cyan
    Write-Host "URL: $VISION_URL" -ForegroundColor Gray
    Write-Host ""
    
    try {
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $VISION_URL -OutFile $VISION_PATH -UseBasicParsing
        Write-Host "[OK] Vision projector downloaded" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Download failed: $_" -ForegroundColor Red
        $DOWNLOAD_SUCCESS = $false
    }
} elseif (Test-Path $VISION_PATH) {
    Write-Host "[OK] Vision projector already exists: $VISION_PATH" -ForegroundColor Green
    $VISION_SIZE_MB = [math]::Round((Get-Item $VISION_PATH).Length / 1MB, 2)
    Write-Host "   Size: $VISION_SIZE_MB MB" -ForegroundColor White
}

# If download failed, provide manual instructions
if (-not $DOWNLOAD_SUCCESS) {
    Write-Host ""
    Write-Host "[ERROR] Automatic download failed. Manual download required." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please manually download the Qwen2.5-VL-${ModelSize} GGUF files:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Main model:" -ForegroundColor White
    Write-Host "  URL: $HUGGINGFACE_URL" -ForegroundColor Gray
    Write-Host "  Save to: $TARGET_PATH" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Vision projector:" -ForegroundColor White
    Write-Host "  URL: $VISION_URL" -ForegroundColor Gray
    Write-Host "  Save to: $VISION_PATH" -ForegroundColor Gray
    Write-Host ""
    Write-Host "After downloading, run this script again with -SkipDownload flag." -ForegroundColor Yellow
    exit 1
}

# Verify files exist
if (-not (Test-Path $TARGET_PATH)) {
    Write-Host "[ERROR] Main model file not found: $TARGET_PATH" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $VISION_PATH)) {
    Write-Host "[ERROR] Vision projector file not found: $VISION_PATH" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[OK] Model files ready" -ForegroundColor Green
$MODEL_SIZE_MB = [math]::Round((Get-Item $TARGET_PATH).Length / 1MB, 2)
$VISION_SIZE_MB = [math]::Round((Get-Item $VISION_PATH).Length / 1MB, 2)
$TOTAL_SIZE_MB = $MODEL_SIZE_MB + $VISION_SIZE_MB
Write-Host "   Main model: $MODEL_SIZE_MB MB" -ForegroundColor White
Write-Host "   Vision projector: $VISION_SIZE_MB MB" -ForegroundColor White
Write-Host "   Total: $TOTAL_SIZE_MB MB" -ForegroundColor White
Write-Host ""

Write-Host "[INFO] Model configuration:" -ForegroundColor Cyan
Write-Host "   Model: Qwen2.5-VL-${ModelSize}" -ForegroundColor White
Write-Host "   Context: ${CTX_SIZE} tokens" -ForegroundColor White
Write-Host "   GPU: CUDA enabled (all layers offloaded)" -ForegroundColor White
Write-Host ""

# Build the Docker image with CUDA support
Write-Host "[BUILD] Building Docker image with CUDA support..." -ForegroundColor Cyan
Write-Host "   This may take 15-20 minutes (compiling CUDA kernels)..." -ForegroundColor Yellow
Write-Host ""

docker build `
    --platform linux/amd64 `
    -t "${IMAGE_NAME}:${Version}" `
    -t "${IMAGE_NAME}:latest" `
    -f docker/llama-cpp/Dockerfile.qwen-vl-${ModelSize}-cuda `
    .

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[OK] Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Image details:" -ForegroundColor Cyan
docker images | Select-String "llama-cpp-server-amd64-qwen-vl-${ModelSize}"

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

# Clean up downloaded models
Write-Host ""
Write-Host "[CLEANUP] Cleaning up..." -ForegroundColor Cyan
$response = Read-Host "Remove temporary model files? (y/N)"
if ($response -match '^[Yy]$') {
    Remove-Item $TARGET_PATH -Force
    Remove-Item $VISION_PATH -Force
    Write-Host "[OK] Removed temporary model files" -ForegroundColor Green
} else {
    Write-Host "[KEEP] Keeping model files at:" -ForegroundColor Yellow
    Write-Host "   $TARGET_PATH" -ForegroundColor White
    Write-Host "   $VISION_PATH" -ForegroundColor White
}

Write-Host ""
Write-Host "[DONE] To use this image in docker-compose.amd64.yml:" -ForegroundColor Green
Write-Host ""
Write-Host "   llama-vl-server-${ModelSize}:" -ForegroundColor White
Write-Host "     image: ${IMAGE_NAME}:${Version}" -ForegroundColor White
Write-Host "     container_name: llama_server_vision_${ModelSize}" -ForegroundColor White
Write-Host "     ports:" -ForegroundColor White
if ($ModelSize -eq "2b") {
    Write-Host "       - `"8081:8080`"" -ForegroundColor White
} else {
    Write-Host "       - `"8082:8080`"" -ForegroundColor White
}
Write-Host "     deploy:" -ForegroundColor White
Write-Host "       resources:" -ForegroundColor White
Write-Host "         reservations:" -ForegroundColor White
Write-Host "           devices:" -ForegroundColor White
Write-Host "             - driver: nvidia" -ForegroundColor White
Write-Host "               count: 1" -ForegroundColor White
Write-Host "               capabilities: [gpu]" -ForegroundColor White
Write-Host ""
Write-Host "[NEXT] Remember to restart your containers:" -ForegroundColor Yellow
Write-Host "   docker-compose -f docker-compose.amd64.yml up -d llama-vl-server-${ModelSize}" -ForegroundColor White
Write-Host ""
Write-Host "[TEST] Test GPU usage and vision after restart:" -ForegroundColor Cyan
Write-Host "   docker exec llama_server_vision_${ModelSize} nvidia-smi" -ForegroundColor White
Write-Host "   docker logs llama_server_vision_${ModelSize} | Select-String 'CUDA','GPU','layers'" -ForegroundColor White
