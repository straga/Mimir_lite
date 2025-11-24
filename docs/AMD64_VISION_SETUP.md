# AMD64 Vision Models Setup - Complete

## Overview
Successfully built and deployed **two separate AMD64 Docker images** for Qwen2.5-VL vision models:
- **2B Model** (faster, lower memory): `timothyswt/llama-cpp-server-amd64-qwen-vl-2b:latest`
- **7B Model** (higher quality): `timothyswt/llama-cpp-server-amd64-qwen-vl-7b:latest`

## Architecture Decision
- **TWO separate images** (one per model size) instead of single multi-model image
- Each image contains its specific model.gguf and mmproj.gguf files embedded
- Cleaner architecture, easier to deploy, no command overrides needed

## Model Sources
Downloaded from HuggingFace:
- **2B Model**: [mradermacher/Qwen2.5_VL_2B-GGUF](https://huggingface.co/mradermacher/Qwen2.5_VL_2B-GGUF)
  - `Qwen2.5_VL_2B.Q4_K_M.gguf` (1.84 GB)
  - `Qwen2.5_VL_2B.mmproj-Q8_0.gguf` (808 MB)
- **7B Model**: [unsloth/Qwen2.5-VL-7B-Instruct-GGUF](https://huggingface.co/unsloth/Qwen2.5-VL-7B-Instruct-GGUF)
  - `Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf` (4.47 GB)
  - `mmproj-F16.gguf` (1.29 GB)

## Files Modified/Created

### 1. Docker Configuration
- **`docker/llama-cpp/Dockerfile.amd64-vision`**: Single-model-per-image builder using ARG MODEL_FILE and MMPROJ_FILE
- **`docker-compose.amd64.yml`**: Two separate services:
  - `llama-server-vision-2b` on port 8081 (8G memory limit, 4G reservation)
  - `llama-server-vision-7b` on port 8082 (commented out, 16G limit when enabled)

### 2. Scripts
- **`scripts/download-vision-models.ps1`**: Downloads all 4 GGUF files from HuggingFace
  - Fixed PowerShell syntax errors (try-catch, backticks, string terminators)
- **`scripts/build-amd64-vision.ps1`**: Builds TWO separate images
  - Loops through 2B and 7B configs
  - Tests each container after build
  - Optional push to Docker Hub

### 3. Installation Automation
- **`install.sh`**: macOS/Linux automated installer with dependency checking
  - Detects OS (Linux/Mac/Windows)
  - Checks for git, docker, docker-compose, node
  - Platform-specific installation instructions
  - Verifies Docker daemon running
- **`install.ps1`**: Windows PowerShell equivalent
  - Same dependency checks
  - Windows-specific installation guidance
  - One-command install: `iwr -useb https://raw.githubusercontent.com/orneryd/Mimir/main/install.ps1 | iex`

### 4. Documentation
- **`docs/index.html`**: Updated Quick Start section
  - Added macOS/Linux vs Windows toggle
  - Copy-pasteable installation commands
  - One-command remote installation for both platforms

## Docker Images Built
```bash
✅ timothyswt/llama-cpp-server-amd64-qwen-vl-2b:latest
   - Port: 8081
   - Memory: 8G limit / 4G reservation
   - Model: Qwen2.5_VL_2B.Q4_K_M.gguf
   - MMProj: Qwen2.5_VL_2B.mmproj-Q8_0.gguf

✅ timothyswt/llama-cpp-server-amd64-qwen-vl-7b:latest
   - Port: 8082
   - Memory: 16G limit / 8G reservation
   - Model: Qwen2.5-VL-7B-Instruct-Q4_K_M.gguf
   - MMProj: mmproj-F16.gguf
```

## Testing Results
✅ **Vision recognition WORKING**
- Tested 7B model with character image
- Successfully provided detailed visual description
- Both containers running and healthy

## Usage

### Download Models (First Time Only)
```powershell
# Windows
cd docker/llama-cpp
../../scripts/download-vision-models.ps1
```

### Build Images
```powershell
# Windows
./scripts/build-amd64-vision.ps1
```

### Deploy with Docker Compose
```bash
# Start 2B model (default)
docker-compose -f docker-compose.amd64.yml up llama-server-vision-2b

# Start 7B model (uncomment in docker-compose.amd64.yml first)
docker-compose -f docker-compose.amd64.yml up llama-server-vision-7b

# Start both models
docker-compose -f docker-compose.amd64.yml up llama-server-vision-2b llama-server-vision-7b
```

### Test Vision API
```bash
# 2B Model
curl http://localhost:8081/v1/chat/completions -H "Content-Type: application/json" -d '{
  "model": "vision",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "What do you see in this image?"},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
      ]
    }
  ]
}'

# 7B Model
curl http://localhost:8082/v1/chat/completions ...
```

## One-Command Installation

### macOS / Linux
```bash
curl -fsSL https://raw.githubusercontent.com/orneryd/Mimir/main/install.sh | bash
```

### Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/orneryd/Mimir/main/install.ps1 | iex
```

## Resource Requirements

### 2B Model
- **Memory**: 8 GB RAM recommended (4 GB minimum)
- **Disk**: ~3 GB for model files
- **CPU**: Multi-core recommended for vision processing

### 7B Model
- **Memory**: 16 GB RAM recommended (8 GB minimum)
- **Disk**: ~6 GB for model files
- **CPU**: Multi-core recommended, benefits from more cores

## Troubleshooting

### PowerShell Execution Policy
If you get execution policy errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Docker Desktop Not Running
```powershell
# Start Docker Desktop manually, then verify:
docker info
```

### HuggingFace Download Issues
```powershell
# Install/upgrade huggingface-hub:
pip install -U huggingface-hub
```

### Out of Memory
- For 7B model, ensure you have at least 16 GB RAM
- Close other applications
- Consider using 2B model instead

## Next Steps
1. ✅ Models downloaded and built
2. ✅ Docker images created and tested
3. ✅ docker-compose.amd64.yml updated
4. ✅ Installation scripts created (bash + PowerShell)
5. ✅ Documentation website updated
6. 🔄 Ready for deployment!

## Links
- [HuggingFace Models](https://huggingface.co/models?search=Qwen2.5-VL)
- [Llama.cpp Documentation](https://github.com/ggerganov/llama.cpp)
- [Docker Hub Images](https://hub.docker.com/u/timothyswt)
