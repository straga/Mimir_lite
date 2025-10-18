# Mimir Global Commands

These scripts allow you to run the Mimir agent chain and executor from any directory without having to be inside the GRAPH-RAG-TODO-main folder.

## Installation

### Option 1: npm link (Recommended for Development)

From the GRAPH-RAG-TODO-main directory:

```bash
cd /Users/timothysweet/src/GRAPH-RAG-TODO-main
npm link
```

This creates global symlinks for:
- `mimir-chain` - Generate task execution plans
- `mimir-execute` - Execute task plans with QC verification

### Option 2: Add to PATH

Add the bin directory to your PATH in `~/.zshrc` or `~/.bashrc`:

```bash
export PATH="/Users/timothysweet/src/GRAPH-RAG-TODO-main/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.zshrc
```

### Option 3: Create Shell Aliases

Add to `~/.zshrc` or `~/.bashrc`:

```bash
alias mimir-chain="/Users/timothysweet/src/GRAPH-RAG-TODO-main/bin/mimir-chain"
alias mimir-execute="/Users/timothysweet/src/GRAPH-RAG-TODO-main/bin/mimir-execute"
```

## Usage

### Generate Task Execution Plan

From any directory:

```bash
cd /path/to/your/project
mimir-chain "Build authentication system with JWT"
```

**Output:** Creates `chain-output.md` in your current directory

### Execute Task Plan

```bash
cd /path/to/your/project
mimir-execute chain-output.md
```

**Output:** Creates `execution-report.md` in your current directory

## Example Workflow

```bash
# Navigate to your project
cd ~/my-project

# Start the MCP server (in another terminal)
cd /Users/timothysweet/src/GRAPH-RAG-TODO-main
npm start

# Back in your project directory
cd ~/my-project

# Generate plan
mimir-chain "Refactor user authentication module"

# Review the generated chain-output.md
cat chain-output.md

# Execute the plan
mimir-execute chain-output.md

# Check results
cat execution-report.md
```

## How It Works

1. **mimir-chain**:
   - Runs PM agent → Ecko agent → PM agent workflow
   - Searches knowledge graph for existing context
   - Generates optimized task prompts
   - Outputs `chain-output.md` to your current directory

2. **mimir-execute**:
   - Parses tasks from `chain-output.md`
   - Generates worker and QC agent preambles
   - Pre-fetches context from knowledge graph
   - Executes Worker → QC → Retry flow
   - Stores diagnostic data in graph
   - Outputs `execution-report.md` to your current directory

## Environment Variables

Both commands respect these environment variables:

- `MCP_SERVER_URL` - MCP server endpoint (default: `http://localhost:3000/mcp`)
- `OPENAI_API_KEY` - Required for agent execution
- `MIMIR_INSTALL_DIR` - Set automatically by wrappers

## Troubleshooting

### "command not found: mimir-chain"

Run `npm link` from the GRAPH-RAG-TODO-main directory:
```bash
cd /Users/timothysweet/src/GRAPH-RAG-TODO-main
npm link
```

### "Cannot find module"

Make sure the project is built:
```bash
cd /Users/timothysweet/src/GRAPH-RAG-TODO-main
npm run build
```

### "MCP server not reachable"

Start the MCP server:
```bash
cd /Users/timothysweet/src/GRAPH-RAG-TODO-main
npm start
```

## Uninstallation

```bash
cd /Users/timothysweet/src/GRAPH-RAG-TODO-main
npm unlink
```
