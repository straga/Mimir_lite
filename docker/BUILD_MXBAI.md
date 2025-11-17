# Building llama.cpp with mxbai-embed-large (1024 dimensions)

This guide explains how to build a custom llama.cpp Docker image with the `mxbai-embed-large` model embedded for 1024-dimensional embeddings.

## Prerequisites

1. **Ollama with mxbai-embed-large model installed:**
   ```bash
   ollama pull mxbai-embed-large
   ```

2. **Docker logged in to your registry:**
   ```bash
   docker login
   ```

## Build Process

The build script automatically extracts the mxbai-embed-large model from your local Ollama installation:

```bash
# Build the image
npm run llama:build-mxbai

# Or directly:
./scripts/build-llama-cpp-mxbai.sh
```

### What the Script Does

1. **Finds the model** in `~/.ollama/models/manifests/registry.ollama.ai/library/mxbai-embed-large/latest`
2. **Extracts the GGUF blob** from Ollama's blob storage
3. **Copies it** to `docker/llama-cpp/models/mxbai-embed-large.gguf` (temporary)
4. **Builds the Docker image** with the model embedded
5. **Tags** as `timothyswt/llama-cpp-server-arm64-mxbai:latest`
6. **Cleans up** the temporary model copy

## Using the Image

### Update docker-compose.arm64.yml

Replace the llama-server service image:

```yaml
llama-server:
  image: timothyswt/llama-cpp-server-arm64-mxbai:latest  # Use mxbai image
  container_name: llama_server
  ports:
    - "11434:8080"
  restart: unless-stopped
  # ... rest of config
```

The environment variables are already configured for mxbai-embed-large:

```yaml
- MIMIR_EMBEDDINGS_MODEL=${MIMIR_EMBEDDINGS_MODEL:-mxbai-embed-large}
- MIMIR_EMBEDDINGS_DIMENSIONS=${MIMIR_EMBEDDINGS_DIMENSIONS:-1024}
```

### Restart Services

```bash
docker-compose -f docker-compose.arm64.yml down llama-server
docker-compose -f docker-compose.arm64.yml up -d llama-server
```

## Verify the Setup

```bash
# Check the model loaded
curl http://localhost:11434/v1/models

# Test embeddings (should return 1024 dimensions)
curl http://localhost:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "mxbai-embed-large", "input": "test"}'
```

## Reset Embeddings

After switching to the mxbai model, reset your embeddings:

```bash
# Check what needs to be regenerated
npm run embeddings:check

# Regenerate all mismatched embeddings
npm run embeddings:reset
```

## Publishing to Docker Hub

The build script will prompt you to push to Docker Hub after building:

```
Push to Docker Hub? (y/N) y
```

Or push manually:

```bash
docker push timothyswt/llama-cpp-server-arm64-mxbai:latest
```

## Model Comparison

| Model | Dimensions | Size | Performance |
|-------|-----------|------|-------------|
| nomic-embed-text | 768 | ~261 MB | Fast, good quality |
| mxbai-embed-large | 1024 | ~669 MB | Higher quality, slower |

## Troubleshooting

### Model Not Found

```bash
# Make sure model is pulled in Ollama
ollama list | grep mxbai

# If not found:
ollama pull mxbai-embed-large
```

### Build Fails

Check that jq is installed (required for parsing manifests):

```bash
brew install jq  # macOS
```

### Wrong Dimensions

Verify the model is correctly configured:

```bash
# Check model info
docker exec llama_server curl http://localhost:8080/v1/models

# Test embedding dimensions
docker exec llama_server curl http://localhost:8080/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "mxbai-embed-large", "input": "test"}' \
  | jq '.data[0].embedding | length'
# Should output: 1024
```

## Switching Back to nomic-embed-text

To switch back to the 768-dimension model:

```yaml
# docker-compose.arm64.yml
llama-server:
  image: timothyswt/llama-cpp-server-arm64:latest  # Original nomic image
```

And update the environment:

```bash
export MIMIR_EMBEDDINGS_MODEL=nomic-embed-text
export MIMIR_EMBEDDINGS_DIMENSIONS=768
```

Then run:

```bash
npm run embeddings:reset
```
