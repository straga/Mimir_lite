# Building CUDA-Enabled llama.cpp Images for Windows/AMD64

This guide covers building GPU-accelerated Docker images for llama.cpp on Windows with NVIDIA GPUs.

## Available Images

### 1. Embeddings Server (CUDA)
- **Image:** `timothyswt/llama-cpp-server-amd64-mxbai:latest`
- **Model:** mxbai-embed-large (1024 dimensions)
- **Size:** ~640MB model + 2GB Docker image
- **Memory:** ~1.5GB VRAM when running
- **Build command:** `npm run llama:build-mxbai-cuda`

### 2. Vision Server 2B (CUDA)
- **Image:** `timothyswt/llama-cpp-server-amd64-qwen-vl-2b:latest`
- **Model:** Qwen2.5-VL-2B-Instruct (multimodal)
- **Size:** ~1.5GB model + 2GB Docker image
- **Memory:** ~4-6GB VRAM when running
- **Context:** 32K tokens
- **Build command:** `npm run llama:build-qwen-2b-cuda`

### 3. Vision Server 7B (CUDA)
- **Image:** `timothyswt/llama-cpp-server-amd64-qwen-vl-7b:latest`
- **Model:** Qwen2.5-VL-7B-Instruct (multimodal)
- **Size:** ~4.5GB model + 2GB Docker image
- **Memory:** ~8-10GB VRAM when running
- **Context:** 128K tokens
- **Build command:** `npm run llama:build-qwen-7b-cuda`

## Prerequisites

### 1. NVIDIA GPU with CUDA Support
```powershell
# Check if NVIDIA GPU is detected
nvidia-smi
```

### 2. Docker Desktop with WSL2 Backend
- Enable "Use WSL 2 based engine" in Docker Desktop settings
- Install NVIDIA Container Toolkit in WSL2:

```bash
# Inside WSL2 terminal
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### 3. Ollama (for embeddings model only)
```powershell
# Pull the mxbai-embed-large model
ollama pull mxbai-embed-large
```

## Build Instructions

### Embeddings Server (mxbai-embed-large)

```powershell
# Build the image (extracts model from Ollama)
npm run llama:build-mxbai-cuda

# Or manually:
.\scripts\build-llama-cpp-mxbai-cuda.ps1

# Push to Docker Hub (optional)
.\scripts\build-llama-cpp-mxbai-cuda.ps1 -Push
```

**What it does:**
1. Extracts mxbai-embed-large model from `~/.ollama/models`
2. Builds Docker image with CUDA support
3. Embeds the model in the image (~3.5GB total)
4. Optionally pushes to Docker Hub

### Vision Server 2B (Qwen2.5-VL)

```powershell
# Build the image (auto-downloads models)
npm run llama:build-qwen-2b-cuda

# Or manually:
.\scripts\build-llama-cpp-qwen-vl-cuda.ps1 -ModelSize 2b

# Skip download if models already exist:
.\scripts\build-llama-cpp-qwen-vl-cuda.ps1 -ModelSize 2b -SkipDownload

# Push to Docker Hub:
.\scripts\build-llama-cpp-qwen-vl-cuda.ps1 -ModelSize 2b -Push
```

**What it does:**
1. Downloads Qwen2.5-VL-2B-Instruct (Q4_K_M) from HuggingFace (~1.5GB)
2. Downloads vision projector (~300MB)
3. Builds Docker image with CUDA support
4. Embeds models in the image (~4GB total)
5. Optionally pushes to Docker Hub

### Vision Server 7B (Qwen2.5-VL)

```powershell
# Build the image (auto-downloads models)
npm run llama:build-qwen-7b-cuda

# Or manually:
.\scripts\build-llama-cpp-qwen-vl-cuda.ps1 -ModelSize 7b

# Skip download if models already exist:
.\scripts\build-llama-cpp-qwen-vl-cuda.ps1 -ModelSize 7b -SkipDownload

# Push to Docker Hub:
.\scripts\build-llama-cpp-qwen-vl-cuda.ps1 -ModelSize 7b -Push
```

**What it does:**
1. Downloads Qwen2.5-VL-7B-Instruct (Q4_K_M) from HuggingFace (~4.5GB)
2. Downloads vision projector (~600MB)
3. Builds Docker image with CUDA support
4. Embeds models in the image (~7.5GB total)
5. Optionally pushes to Docker Hub

## Build Time Estimates

| Image | Download Time | Build Time | Total |
|-------|--------------|------------|-------|
| mxbai-embed-large | N/A (from Ollama) | 10-15 min | 10-15 min |
| Qwen 2B | 5-10 min | 15-20 min | 20-30 min |
| Qwen 7B | 15-20 min | 15-20 min | 30-40 min |

*Times vary based on internet speed and CPU performance*

## Using the Images

### Update docker-compose.amd64.yml

The images are already configured in `docker-compose.amd64.yml`. Uncomment the service you want to use:

```yaml
# For embeddings (default - already enabled):
llama-server:
  image: timothyswt/llama-cpp-server-amd64-mxbai:latest
  # GPU support already configured

# For vision 2B (uncomment to enable):
# llama-vl-server-2b:
#   image: timothyswt/llama-cpp-server-amd64-qwen-vl-2b:latest
#   # ... rest of config ...

# For vision 7B (uncomment to enable):
# llama-vl-server-7b:
#   image: timothyswt/llama-cpp-server-amd64-qwen-vl-7b:latest
#   # ... rest of config ...
```

### Restart Services

```powershell
# Rebuild and restart
npm run stop
npm run build:docker
npm run start

# Or just restart specific service:
docker-compose -f docker-compose.amd64.yml up -d llama-server
```

## Verifying GPU Usage

### Check GPU Access

```powershell
# Verify GPU is accessible in container
docker exec llama_server nvidia-smi

# Expected output: GPU info with ~1-2GB memory used
```

### Check Model Loading

```powershell
# Check startup logs for CUDA initialization
docker logs llama_server | Select-String "CUDA","GPU","offload"

# Expected output:
# - "CUDA support enabled"
# - "offloading X layers to GPU"
# - "GPU backend initialized"
```

### Test Embeddings Performance

```powershell
# Before GPU (CPU only): ~200-500ms per request
# After GPU: ~20-50ms per request (10x faster)

Measure-Command {
  $body = @{input='Test sentence';model='mxbai-embed-large'} | ConvertTo-Json
  Invoke-RestMethod -Uri 'http://localhost:11434/v1/embeddings' -Method Post -Body $body -ContentType 'application/json'
}
```

### Test Vision API

```powershell
# Test 2B model (port 8081)
curl http://localhost:8081/v1/chat/completions `
  -H "Content-Type: application/json" `
  -d '{
    "model": "vision-2b",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "What is in this image?"},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
      ]
    }]
  }'

# Test 7B model (port 8082)
curl http://localhost:8082/v1/chat/completions `
  -H "Content-Type: application/json" `
  -d '{
    "model": "vision-7b",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "What is in this image?"},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
      ]
    }]
  }'
```

## Troubleshooting

### Issue: "CUDA not found" during build

**Solution:**
- Ensure NVIDIA GPU drivers are installed
- Verify Docker Desktop is using WSL2 backend
- Install NVIDIA Container Toolkit in WSL2 (see Prerequisites)

### Issue: Model loads on CPU instead of GPU

**Symptoms:**
```
load_tensors: CPU_Mapped model buffer
```

**Solution:**
- This means the image wasn't built with CUDA support
- Rebuild using the `-cuda` scripts: `npm run llama:build-mxbai-cuda`
- Verify logs show "CUDA support enabled"

### Issue: "Out of memory" when loading model

**Solution:**
- Check available VRAM: `nvidia-smi`
- For 2B models: Need 4-6GB VRAM
- For 7B models: Need 8-10GB VRAM
- Reduce `--parallel` parameter in Dockerfile (default: 4)
- Use smaller model variant (2B instead of 7B)

### Issue: Download fails from HuggingFace

**Solution:**
```powershell
# Download manually using curl or browser
curl -L -o docker/llama-cpp/models/qwen2.5-vl-2b.gguf `
  "https://huggingface.co/Qwen/Qwen2.5-VL-2B-Instruct-GGUF/resolve/main/qwen2.5-vl-2b-instruct-q4_k_m.gguf"

# Then run build with -SkipDownload
.\scripts\build-llama-cpp-qwen-vl-cuda.ps1 -ModelSize 2b -SkipDownload
```

### Issue: GPU utilization is low

**Check:**
```powershell
# Watch GPU usage in real-time
nvidia-smi -l 1

# Verify layers are offloaded
docker logs llama_server | Select-String "ngl"

# Expected: "-ngl 99" means all layers on GPU
```

## Performance Comparisons

### Embeddings (mxbai-embed-large, 1024 dims)

| Backend | Time per Request | GPU Memory |
|---------|-----------------|------------|
| CPU only | 200-500ms | 0 MB |
| **CUDA** | **20-50ms** | **~1.5 GB** |

**Speedup: ~10x faster**

### Vision Models (Qwen2.5-VL)

| Model | Backend | Time per Image | GPU Memory |
|-------|---------|---------------|------------|
| 2B | CPU only | 5-15 seconds | 0 MB |
| **2B** | **CUDA** | **1-3 seconds** | **~4-6 GB** |
| 7B | CPU only | 15-45 seconds | 0 MB |
| **7B** | **CUDA** | **2-5 seconds** | **~8-10 GB** |

**Speedup: ~5-10x faster**

## Publishing Images

After building, you can publish to Docker Hub:

```powershell
# Login to Docker Hub
docker login

# Build and push embeddings
.\scripts\build-llama-cpp-mxbai-cuda.ps1 -Push

# Build and push vision 2B
.\scripts\build-llama-cpp-qwen-vl-cuda.ps1 -ModelSize 2b -Push

# Build and push vision 7B
.\scripts\build-llama-cpp-qwen-vl-cuda.ps1 -ModelSize 7b -Push
```

## Advanced Configuration

### Custom Layer Offloading

Edit Dockerfile CMD to control GPU layers:

```dockerfile
# Full GPU (default):
CMD ["--ngl", "99"]

# Partial GPU (save VRAM):
CMD ["--ngl", "32"]  # Offload 32 layers only

# CPU only:
CMD ["--ngl", "0"]
```

### Custom Context Size

```dockerfile
# For 2B model - increase from 32K to 64K:
CMD ["--ctx-size", "65536"]

# For 7B model - reduce from 128K to 64K (saves VRAM):
CMD ["--ctx-size", "65536"]
```

### Custom Parallelism

```dockerfile
# More parallel requests (needs more VRAM):
CMD ["--parallel", "8"]

# Fewer parallel requests (saves VRAM):
CMD ["--parallel", "2"]
```

## References

- [llama.cpp GitHub](https://github.com/ggerganov/llama.cpp)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
- [Qwen2.5-VL Models](https://huggingface.co/Qwen)
- [Docker GPU Support](https://docs.docker.com/config/containers/resource_constraints/#gpu)
