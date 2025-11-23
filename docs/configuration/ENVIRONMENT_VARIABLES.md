# Mimir Environment Variables

**Last Updated:** 2025-01-21  
**Purpose:** Complete reference for all Mimir environment variables

---

## 🚀 Quick Start

Create a `.env` file in the project root with your configuration:

```bash
cp env.example .env
# Edit .env with your settings
```

---

## 📋 Environment Variables Reference

### Execution Settings

#### `MIMIR_PARALLEL_EXECUTION`

**Type:** Boolean (`true` | `false`)  
**Default:** `false`  
**Description:** Enable parallel execution of independent tasks

**When to use:**
- ✅ **Serial (`false`):** Initial testing, debugging, complex dependencies
- ✅ **Parallel (`true`):** Production workflows, independent tasks, faster execution

**Example:**
```bash
# Serial execution (one task at a time)
MIMIR_PARALLEL_EXECUTION=false

# Parallel execution (independent tasks run simultaneously)
MIMIR_PARALLEL_EXECUTION=true
```

**Notes:**
- Serial mode is recommended for initial testing
- Parallel mode requires tasks to be truly independent
- Tasks with dependencies always execute in correct order

---

### LLM Provider Settings

#### `MIMIR_LLM_PROVIDER`

**Type:** String (`copilot` | `openai` | `anthropic`)  
**Default:** `copilot`  
**Description:** Primary LLM provider for agent execution

**Example:**
```bash
MIMIR_LLM_PROVIDER=copilot
```

#### `OPENAI_API_KEY`

**Type:** String  
**Default:** None  
**Description:** OpenAI API key (required if using OpenAI provider)

**Example:**
```bash
OPENAI_API_KEY=sk-...
```

#### `ANTHROPIC_API_KEY`

**Type:** String  
**Default:** None  
**Description:** Anthropic API key (required if using Anthropic provider)

**Example:**
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

---

### Embeddings Settings

#### `MIMIR_EMBEDDINGS_ENABLED`

**Type:** Boolean (`true` | `false`)  
**Default:** `false`  
**Description:** Enable vector embeddings for semantic search

**Example:**
```bash
MIMIR_EMBEDDINGS_ENABLED=false
```

#### `MIMIR_EMBEDDINGS_PROVIDER`

**Type:** String (`ollama` | `copilot`)  
**Default:** `copilot`  
**Description:** Embeddings provider

**Example:**
```bash
MIMIR_EMBEDDINGS_PROVIDER=copilot
```

**Notes:**
- `ollama` requires Ollama server to be running
- `copilot` uses GitHub Copilot API (no additional setup)

#### `MIMIR_FEATURE_VECTOR_EMBEDDINGS`

**Type:** Boolean (`true` | `false`)  
**Default:** `false`  
**Description:** Enable feature vector embeddings

**Example:**
```bash
MIMIR_FEATURE_VECTOR_EMBEDDINGS=false
```

---

### Neo4j Database Settings

#### `NEO4J_URI`

**Type:** String  
**Default:** `bolt://localhost:7687`  
**Description:** Neo4j connection URL

**Example:**
```bash
NEO4J_URI=bolt://localhost:7687
```

#### `NEO4J_USER`

**Type:** String  
**Default:** `neo4j`  
**Description:** Neo4j username

**Example:**
```bash
NEO4J_USER=neo4j
```

#### `NEO4J_PASSWORD`

**Type:** String  
**Default:** `password`  
**Description:** Neo4j password

**Example:**
```bash
NEO4J_PASSWORD=your-secure-password
```

---

### MCP Server Settings

#### `MCP_SERVER_PORT`

**Type:** Number  
**Default:** `3000`  
**Description:** MCP server port

**Example:**
```bash
MCP_SERVER_PORT=3000
```

#### `MCP_SERVER_HOST`

**Type:** String  
**Default:** `localhost`  
**Description:** MCP server host

**Example:**
```bash
MCP_SERVER_HOST=localhost
```

---

### Feature Flags

#### `MIMIR_ENABLE_ECKO`

**Type:** Boolean (`true` | `false`)  
**Default:** `false`  
**Description:** Enable Ecko (Prompt Architect) stage before PM

**Example:**
```bash
MIMIR_ENABLE_ECKO=false
```

**Notes:**
- Ecko optimizes raw user prompts before PM decomposition
- Adds extra LLM call overhead
- Recommended for vague/complex user requests

#### `MIMIR_AUTO_DIAGNOSTICS`

**Type:** Boolean (`true` | `false`)  
**Default:** `true`  
**Description:** Enable automatic diagnostic data capture

**Example:**
```bash
MIMIR_AUTO_DIAGNOSTICS=true
```

#### `MIMIR_ENABLE_QC`

**Type:** Boolean (`true` | `false`)  
**Default:** `true`  
**Description:** Enable QC verification

**Example:**
```bash
MIMIR_ENABLE_QC=true
```

---

### Debugging & Logging

#### `LOG_LEVEL`

**Type:** String (`debug` | `info` | `warn` | `error`)  
**Default:** `info`  
**Description:** Log level

**Example:**
```bash
LOG_LEVEL=info
```

#### `MIMIR_VERBOSE`

**Type:** Boolean (`true` | `false`)  
**Default:** `false`  
**Description:** Enable verbose logging

**Example:**
```bash
MIMIR_VERBOSE=false
```

---

### Circuit Breaker Settings

#### `MIMIR_DEFAULT_CIRCUIT_BREAKER`

**Type:** Number  
**Default:** `100`  
**Description:** Default circuit breaker limit (tool calls) when PM doesn't provide estimate

**Example:**
```bash
MIMIR_DEFAULT_CIRCUIT_BREAKER=100
```

#### `MIMIR_CIRCUIT_BREAKER_MULTIPLIER`

**Type:** Number  
**Default:** `10`  
**Description:** Multiplier applied to PM's estimated tool calls

**Example:**
```bash
MIMIR_CIRCUIT_BREAKER_MULTIPLIER=10
```

**Formula:**
```
Circuit Breaker Limit = PM Estimated Tool Calls × Multiplier
```

---

## 📝 Example Configurations

### Development (Serial, Copilot, No Embeddings)

```bash
# Execution
MIMIR_PARALLEL_EXECUTION=false

# LLM
MIMIR_LLM_PROVIDER=copilot

# Embeddings
MIMIR_EMBEDDINGS_ENABLED=false

# Features
MIMIR_ENABLE_ECKO=false
MIMIR_AUTO_DIAGNOSTICS=true
MIMIR_ENABLE_QC=true

# Logging
LOG_LEVEL=debug
MIMIR_VERBOSE=true
```

### Production (Parallel, OpenAI, Embeddings)

```bash
# Execution
MIMIR_PARALLEL_EXECUTION=true

# LLM
MIMIR_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Embeddings
MIMIR_EMBEDDINGS_ENABLED=true
MIMIR_EMBEDDINGS_PROVIDER=copilot

# Features
MIMIR_ENABLE_ECKO=false
MIMIR_AUTO_DIAGNOSTICS=true
MIMIR_ENABLE_QC=true

# Logging
LOG_LEVEL=info
MIMIR_VERBOSE=false

# Circuit Breaker
MIMIR_DEFAULT_CIRCUIT_BREAKER=100
MIMIR_CIRCUIT_BREAKER_MULTIPLIER=10
```

### Testing (Serial, Local Models, Verbose)

```bash
# Execution
MIMIR_PARALLEL_EXECUTION=false

# LLM
MIMIR_LLM_PROVIDER=copilot

# Embeddings
MIMIR_EMBEDDINGS_ENABLED=false

# Features
MIMIR_ENABLE_ECKO=false
MIMIR_AUTO_DIAGNOSTICS=true
MIMIR_ENABLE_QC=true

# Logging
LOG_LEVEL=debug
MIMIR_VERBOSE=true

# Circuit Breaker (generous for testing)
MIMIR_DEFAULT_CIRCUIT_BREAKER=200
MIMIR_CIRCUIT_BREAKER_MULTIPLIER=15
```

---

## 🔧 Setting Environment Variables

### Option 1: .env File (Recommended)

Create `.env` in project root:

```bash
MIMIR_PARALLEL_EXECUTION=false
MIMIR_LLM_PROVIDER=copilot
# ... other variables
```

### Option 2: Shell Export

```bash
export MIMIR_PARALLEL_EXECUTION=false
export MIMIR_LLM_PROVIDER=copilot
```

### Option 3: Inline with Command

```bash
MIMIR_PARALLEL_EXECUTION=true npm run execute chain-output.md
```

---

## 📊 Feature Flag Decision Matrix

| Scenario | Parallel | Ecko | QC | Embeddings |
|----------|----------|------|----|-----------| 
| Initial Testing | ❌ | ❌ | ✅ | ❌ |
| Development | ❌ | ❌ | ✅ | ❌ |
| Production | ✅ | ❌ | ✅ | ✅ |
| Complex Prompts | ❌ | ✅ | ✅ | ❌ |
| Fast Execution | ✅ | ❌ | ✅ | ✅ |
| Debugging | ❌ | ❌ | ✅ | ❌ |

---

## 🚨 Important Notes

1. **Parallel Execution:**
   - Always test with serial execution first
   - Verify task dependencies are correct
   - Monitor for race conditions

2. **Circuit Breakers:**
   - Default multiplier of 10x provides safety margin
   - Increase for complex tasks
   - Decrease for tighter control

3. **Embeddings:**
   - Ollama provider requires Docker container running
   - Copilot provider is simpler but may have rate limits
   - Disable if not using semantic search

4. **QC Verification:**
   - Disabling QC skips adversarial verification
   - Only disable for trusted/simple tasks
   - Always enable for production

---

**Version:** 1.0.0  
**Status:** ✅ Complete
