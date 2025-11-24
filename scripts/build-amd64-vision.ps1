# Build llama.cpp AMD64 Docker images for Qwen2.5-VL vision models
# Creates TWO separate images: one for 2B, one for 7B

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "latest",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("2b", "7b", "both")]
    [string]$Model = "both",
    
    [Parameter(Mandatory=$false)]
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Building llama.cpp AMD64 Vision Docker Images" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Version: $Version" -ForegroundColor Yellow
Write-Host "Model: $Model" -ForegroundColor Yellow
Write-Host ""

# Check model files
Write-Host "[1/4] Checking model files..." -ForegroundColor Green

$modelsDir = "docker\llama-cpp\models"
$model2BFiles = @("Qwen2.5_VL_2B.Q4_K_M.gguf", "Qwen2.5_VL_2B.mmproj-Q8_0.gguf")
$model7BFiles = @("Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf", "mmproj-F16.gguf")

$requiredFiles = @()
if ($Model -eq "2b" -or $Model -eq "both") { $requiredFiles += $model2BFiles }
if ($Model -eq "7b" -or $Model -eq "both") { $requiredFiles += $model7BFiles }

$missingFiles = @()
foreach ($file in $requiredFiles) {
    $path = Join-Path $modelsDir $file
    if (-not (Test-Path $path)) {
        $missingFiles += $file
    } else {
        $sizeMB = [math]::Round((Get-Item $path).Length / 1MB, 0)
        Write-Host "  * Found: $file ($sizeMB MB)" -ForegroundColor Green
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "  X Missing files:" -ForegroundColor Red
    foreach ($file in $missingFiles) { Write-Host "    - $file" -ForegroundColor Red }
    exit 1
}

# Build images
Write-Host ""
Write-Host "[2/4] Building Docker images..." -ForegroundColor Green

$builtImages = @()

if ($Model -eq "2b" -or $Model -eq "both") {
    Write-Host ""
    Write-Host "  === Building 2B Model Image ===" -ForegroundColor Cyan
    
    $image2B = "timothyswt/llama-cpp-server-amd64-qwen-vl-2b"
    
    docker build --platform linux/amd64 -t "${image2B}:latest" -t "${image2B}:${Version}" -f docker/llama-cpp/Dockerfile.amd64-vision --build-arg MODEL_FILE=Qwen2.5_VL_2B.Q4_K_M.gguf --build-arg MMPROJ_FILE=Qwen2.5_VL_2B.mmproj-Q8_0.gguf .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  X 2B build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  * 2B image built" -ForegroundColor Green
    
    $builtImages += @{Name=$image2B; Port=8081}
}

if ($Model -eq "7b" -or $Model -eq "both") {
    Write-Host ""
    Write-Host "  === Building 7B Model Image ===" -ForegroundColor Cyan
    
    $image7B = "timothyswt/llama-cpp-server-amd64-qwen-vl-7b"
    
    docker build --platform linux/amd64 -t "${image7B}:latest" -t "${image7B}:${Version}" -f docker/llama-cpp/Dockerfile.amd64-vision --build-arg MODEL_FILE=Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf --build-arg MMPROJ_FILE=mmproj-F16.gguf .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  X 7B build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  * 7B image built" -ForegroundColor Green
    
    $builtImages += @{Name=$image7B; Port=8082}
}

# Test images
Write-Host ""
Write-Host "[3/4] Testing images..." -ForegroundColor Green

foreach ($img in $builtImages) {
    Write-Host "  Testing $($img.Name):latest..." -ForegroundColor Cyan
    
    $testContainer = "test-$(Get-Random)"
    docker run -d --name $testContainer -p "$($img.Port):8080" "$($img.Name):latest" | Out-Null
    Start-Sleep -Seconds 5
    
    $health = docker inspect $testContainer --format '{{.State.Health.Status}}' 2>$null
    if ($health -eq "healthy" -or $health -eq "starting") {
        Write-Host "    * Container healthy" -ForegroundColor Green
    } else {
        Write-Host "    ! Health: $health" -ForegroundColor Yellow
    }
    
    docker stop $testContainer | Out-Null
    docker rm $testContainer | Out-Null
}

# Push
if (-not $NoPush) {
    Write-Host ""
    Write-Host "[4/4] Push to Docker Hub?" -ForegroundColor Green
    $response = Read-Host "  Push? (y/N)"
    
    if ($response -eq "y" -or $response -eq "Y") {
        foreach ($img in $builtImages) {
            Write-Host "  Pushing $($img.Name)..." -ForegroundColor Cyan
            docker push "$($img.Name):latest"
            docker push "$($img.Name):${Version}"
        }
        Write-Host "  * Pushed" -ForegroundColor Green
    } else {
        Write-Host "  Skipped" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[4/4] Skipping push (-NoPush)" -ForegroundColor Yellow
}

# Done
Write-Host ""
Write-Host "* Build Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Test:" -ForegroundColor Cyan
Write-Host "  docker run -d -p 8081:8080 timothyswt/llama-cpp-server-amd64-qwen-vl-2b:latest" -ForegroundColor White
Write-Host "  docker run -d -p 8082:8080 timothyswt/llama-cpp-server-amd64-qwen-vl-7b:latest" -ForegroundColor White
Write-Host ""
