# Agent Chaining Architecture

**Version**: 1.0.0  
**Status**: Implemented (Phase 1 Complete)

---

## Usage

### Step 1: Generate Plan

```bash
npm run chain "Draft migration plan for Docker"
# Output: generated-agents/chain-output.md
```

### Step 2: Execute Plan

```bash
# Ensure MCP server is running
npm run start:http  # Terminal 1: http://localhost:3000/mcp

# Execute tasks
npm run execute generated-agents/chain-output.md  # Terminal 2
```

## Flow

```
User Request 
    ↓
PM (Analysis) 
    ↓
Ecko (Optimize Tasks) 
    ↓
PM (Assembly + Agent Roles) 
    ↓
chain-output.md
    ↓
Agentinator (Generate Preambles)
    ↓
Execute Tasks Sequentially
```

## Output Format

Each task in the generated plan includes:
- **Task ID**: Unique identifier for KG storage
- **Agent Role**: Single-sentence agent background/specialization (e.g., "Backend engineer with Kafka experience, prefers simple PoC implementations")
- **Recommended Model**: Best model for task type (GPT-4.1, Claude Sonnet 4, O3-mini, etc.)
- **Optimized Prompt**: Complete, self-contained task instructions from Ecko
- **Dependencies**: Task prerequisites
- **Estimated Duration**: Time estimate

**Agent roles feed into Agentinator** to generate specialized preambles for each task.

---

## Implementation

**File**: `src/orchestrator/agent-chain.ts`

**Agents**:
1. PM Agent (`claudette-pm.md`) - Task decomposition
2. Ecko Agent (`claudette-ecko.md`) - Prompt optimization
3. PM Agent - Final assembly + agent role definition

---

## Next: Knowledge Graph Integration

Phase 2 will auto-store tasks in KG and enable worker execution.

