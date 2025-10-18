# Validation Tool Setup Guide (GitHub Copilot API)

## Quick Start (5 minutes) - Pure Node.js! 🎉

### 1. Authenticate with GitHub Copilot

```bash
# Install GitHub CLI (if not already)
brew install gh

# Authenticate (one-time)
gh auth login

# Verify
gh auth status
```

### 2. Install Copilot API Proxy (Pure Node.js!)

```bash
cd /Users/timothysweet/src/GRAPH-RAG-TODO-main

# Install copilot-api globally (OpenAI-compatible proxy)
npm install -g copilot-api

# Start Copilot proxy server (runs in background)
copilot-api start &

# Verify it's running
curl http://localhost:4141/v1/models
```

**What this does**: 
- Runs a local server that proxies GitHub Copilot API
- Exposes it as an OpenAI-compatible endpoint
- No Python needed! 🎉

### 3. Install Dependencies

```bash
# Install LangChain with OpenAI integration
npm install @langchain/core @langchain/openai langchain

# Install TypeScript tools
npm install -g ts-node typescript
```

### 4. Test Connection

```bash
# Test with Node.js (dummy API key required but not used)
node -e "const {ChatOpenAI} = require('@langchain/openai'); const llm = new ChatOpenAI({openAIApiKey: 'dummy-key-not-used', configuration: {baseURL: 'http://localhost:4141/v1'}}); llm.invoke('Hello!').then(r => console.log('✅ Copilot Response:', r.content));"
```

**Expected output**:
```
✅ Copilot Response: Hi! How can I assist you today?
```

**Note**: The `openAIApiKey` parameter is required by the LangChain OpenAI client but is not actually used by the copilot-api proxy.

---

## Next Steps

After setup completes:

1. **Create tool files** (see `VALIDATION_TOOL_DESIGN.md` for code)
   ```bash
   mkdir -p tools/evaluators
   touch tools/validate-agent.ts
   touch tools/llm-client.ts
   touch tools/evaluators/index.ts
   touch tools/report-generator.ts
   ```

2. **Create benchmark specs**
   ```bash
   touch benchmarks/debug-benchmark.json
   ```

3. **Run first validation**
   ```bash
   npm run validate docs/agents/claudette-debug.md benchmarks/debug-benchmark.json
   ```

---

## Advantages of GitHub Copilot API

| Feature | Local LLM (Ollama) | GitHub Copilot API |
|---------|-------------------|-------------------|
| **Setup** | Download ~18GB model | Just authenticate |
| **Quality** | Good (Qwen2.5 32B) | **Excellent (GPT-4 + Claude)** |
| **Speed** | Medium (local) | **Fast (cloud)** |
| **Cost** | Free | **Included in Copilot** |
| **Maintenance** | Manual updates | Auto-updated |

**Winner**: GitHub Copilot API ✅

---

## Troubleshooting

### "Authentication failed" error
```bash
# Re-authenticate
gh auth login

# Or regenerate token
python -c "from langchain_github_copilot import authenticate; authenticate.main()"
```

### "Token expired" error
```bash
# Token auto-refreshes, but if it doesn't:
rm .env
python -c "from langchain_github_copilot import authenticate; authenticate.main()"
```

### "Module not found: langchain_github_copilot" error
```bash
# Ensure Python package is installed
pip install -U langchain-github-copilot

# Check installation
python3 -c "import langchain_github_copilot; print('✅ Installed')"
```

---

## Ready?

After running these 3 steps, you're ready to implement the validation tool!

See `VALIDATION_TOOL_DESIGN.md` for full implementation guide.

