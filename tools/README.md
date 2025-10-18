# Agent Validation Tools

Automated testing and validation for agent preambles using LangChain + GitHub Copilot API.

---

## 🚀 Quick Start

```bash
# 1. Setup (10 minutes)
gh auth login
pip install langchain-github-copilot langchain-core
npm install @langchain/core @langchain/community langchain

# 2. Verify
python3 -c "from langchain_github_copilot import ChatGitHubCopilot; llm = ChatGitHubCopilot(); print('✅', llm.invoke('Hi').content)"

# 3. Build validation tool
# See VALIDATION_TOOL_DESIGN.md for implementation code
```

---

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - 10-minute setup guide
- **[VALIDATION_TOOL_DESIGN.md](../docs/agents/VALIDATION_TOOL_DESIGN.md)** - Full implementation with code
- **[VALIDATION_SUMMARY.md](../docs/agents/VALIDATION_SUMMARY.md)** - Overview and architecture

---

## 🎯 What This Does

Automatically test agent preambles by:
1. **Loading** agent preamble as system prompt
2. **Executing** benchmark task via GitHub Copilot API
3. **Capturing** output and conversation history
4. **Scoring** against rubric using LLM-as-judge
5. **Generating** detailed reports (JSON + Markdown)

---

## 🏗️ Architecture

```
TypeScript Tool → Python Bridge → GitHub Copilot API
                                   (GPT-4 + Claude)
```

**Why GitHub Copilot?**
- ✅ Uses existing subscription (no new costs)
- ✅ High quality (GPT-4 + Claude models)
- ✅ Simple setup (just authenticate)
- ✅ Fast (cloud inference)

---

## 📦 Files to Create

```
tools/
├── llm-client.ts              # Copilot client (TypeScript → Python)
├── validate-agent.ts          # Main validation script
├── evaluators/
│   └── index.ts               # LLM-as-judge evaluators
└── report-generator.ts        # Report formatting
```

Full code provided in `VALIDATION_TOOL_DESIGN.md`.

---

## 🎯 Usage Examples

### Validate Single Agent
```bash
npm run validate docs/agents/claudette-debug.md benchmarks/debug-benchmark.json
```

### Test Agentinator (Two-Hop)
```bash
npm run validate:agentinator -- \
  --agentinator docs/agents/claudette-agentinator.md \
  --requirement "Design debug agent" \
  --benchmark benchmarks/debug-benchmark.json \
  --baseline 92
```

---

## 📊 Output

### Terminal
```
🔍 Validating agent: claudette-debug.md
⚙️  Executing benchmark task...
✅ Task completed in 12,451 tokens
📊 Evaluating output against rubric...
📈 Total score: 92/100
📄 Report saved to: validation-output/2025-10-15_claudette-debug.md
```

### Files Generated
```
validation-output/
├── 2025-10-15_claudette-debug.json    # Raw data
└── 2025-10-15_claudette-debug.md      # Readable report
```

---

## ⏱️ Timeline

| Phase | Task | Time |
|-------|------|------|
| Setup | Authenticate + install | 10 min |
| Implement | Create tool files | 4 hours |
| Benchmarks | Define tasks + rubrics | 1 hour |
| Test | First validation | 30 min |
| **Total** | **Working system** | **5.5 hours** |

---

## 🔧 Requirements

- **Node.js** 18+ (for TypeScript tool)
- **Python** 3.8+ (for Copilot integration)
- **GitHub Copilot** subscription (already have)
- **GitHub CLI** (`gh`) for authentication

---

## 🚀 Next Steps

1. **Setup** (10 min): Run commands in `SETUP.md`
2. **Implement** (4 hours): Copy code from `VALIDATION_TOOL_DESIGN.md`
3. **Test** (30 min): Validate `claudette-debug.md` baseline
4. **Iterate** (ongoing): Test Agentinator-generated agents

---

## 📖 See Also

- `docs/agents/AGENTIC_PROMPTING_FRAMEWORK.md` - Principles for agent design
- `docs/agents/claudette-agentinator.md` - Meta-agent that builds agents
- `docs/agents/claudette-debug.md` - Gold standard debug agent (92/100)
- `benchmarks/RESEARCH_AGENT_BENCHMARK.md` - Benchmark example

---

**Status**: Design complete, ready for implementation.

