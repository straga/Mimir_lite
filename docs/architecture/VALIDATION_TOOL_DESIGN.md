# Agent Validation Tool Design (LangChain + GitHub Copilot API)

## 📋 Executive Summary

**Final Solution**: GitHub Copilot Chat API (not local LLM, not manual orchestration)

**Why This Approach**:
- ✅ **Leverages existing subscription** (no new costs)
- ✅ **High quality** (GPT-4 + Claude models)
- ✅ **Simple setup** (just authenticate, no 18GB download)
- ✅ **Fast** (cloud inference)
- ✅ **Auto-updated** (always latest models)
- ✅ **Pure Node.js** (no Python needed!)

**Timeline**: 6.5 hours end-to-end (5 min setup + 4 hrs build + 2 hrs testing)

---

## Problem Statement

**Goal**: Automatically test agent preambles without manual orchestration.

**Requirements**:
- ✅ Load agent preambles as system prompts
- ✅ Execute benchmark tasks
- ✅ Capture outputs
- ✅ Score against rubrics
- ✅ Automated (no human-in-loop)
- ✅ Use existing GitHub Copilot access

**Solution**: LangChain + GitHub Copilot Chat API

---

## 🎯 Key Decision: Why LangChain + GitHub Copilot?

### Why Not Manual Testing?
- ❌ Slow (1-2 hours per agent)
- ❌ Not reproducible (human variance)
- ❌ Can't batch test
- ❌ No CI/CD integration

### Why Not Local LLM (Ollama)?
- ⚠️ Download 18GB model
- ⚠️ Manual maintenance
- ⚠️ Lower quality than GPT-4/Claude
- ✅ **Copilot is better in every way**

### Why GitHub Copilot? ✅
- ✅ Already have access (existing subscription)
- ✅ No setup (just authenticate)
- ✅ Best quality (GPT-4 + Claude)
- ✅ Fast (cloud inference)
- ✅ Auto-updated (always latest models)

---

## 🎯 WHY LANGCHAIN + GITHUB COPILOT

### What This Solution Provides

1. **GitHub Copilot Chat API Integration**
   - Use your existing Copilot subscription
   - Claude Sonnet 3.5 quality (Copilot uses GPT-4 + Claude)
   - No additional API costs
   - Fast response times

2. **Agent Testing Framework** (LangChain)
   - Unit tests for components
   - Integration tests for full workflows
   - `agentevals` package for trajectory evaluation

3. **Orchestration** (LangChain)
   - Load custom system prompts (agent preambles)
   - Execute tasks programmatically
   - Capture conversation history

4. **Evaluation Tools**
   - LLM-as-judge for automated scoring
   - Custom evaluators for rubrics
   - Batch testing support

### Advantages Over Local LLM

| Feature | Local LLM (Ollama) | GitHub Copilot API |
|---------|-------------------|-------------------|
| **Quality** | Good (Qwen2.5 32B) | Excellent (GPT-4 + Claude) |
| **Setup** | Download ~18GB model | Use existing auth |
| **Speed** | Medium (local inference) | Fast (cloud) |
| **Cost** | Free (local compute) | Included in Copilot |
| **Maintenance** | Manual updates | Auto-updated |

**Winner**: GitHub Copilot API - better quality, simpler setup, leverages existing subscription.

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────────┐
│ Validation Tool (TypeScript)               │
├─────────────────────────────────────────────┤
│ 1. Load agent preamble from .md file       │
│ 2. Create LangChain agent with system      │
│    prompt = preamble content               │
│ 3. Execute benchmark task                  │
│ 4. Capture output + conversation history   │
│ 5. Score with LLM-as-judge evaluator       │
│ 6. Generate report                         │
└─────────────────────────────────────────────┘
                    ↓
        ┌───────────────────────────┐
        │ GitHub Copilot Chat API   │
        │ (GPT-4 + Claude models)   │
        │ - Uses existing Copilot   │
        │ - No setup required       │
        └───────────────────────────┘
                    ↓
        ┌───────────────────────┐
        │ Output                │
        │ - Raw transcript      │
        │ - Scores (0-100)      │
        │ - Comparison reports  │
        └───────────────────────┘
```

---

## 📦 SETUP (One-Time)

### Step 1: Authenticate with GitHub Copilot

```bash
# Install GitHub CLI (if not already)
brew install gh

# Authenticate (one-time)
gh auth login

# Verify
gh auth status
```

### Step 2: Install Copilot API Proxy

```bash
cd /Users/timothysweet/src/GRAPH-RAG-TODO-main

# Install copilot-api globally (Pure Node.js!)
npm install -g copilot-api

# Start Copilot proxy server (runs in background)
copilot-api start &

# Verify it's running
curl http://localhost:4141/v1/models
```

**What this does**:
- Runs a local server that proxies GitHub Copilot API
- Exposes it as an OpenAI-compatible endpoint at `http://localhost:4141`
- **No Python needed!** 🎉

### Step 3: Install LangChain Dependencies

```bash
cd /Users/timothysweet/src/GRAPH-RAG-TODO-main

# Install LangChain with OpenAI integration
npm install @langchain/core @langchain/openai langchain

# Install TypeScript tools
npm install -g ts-node typescript
```

### Step 4: Verify Setup

```bash
# Test with Node.js (dummy API key needed for OpenAI client, but not used by proxy)
node -e "const {ChatOpenAI} = require('@langchain/openai'); const llm = new ChatOpenAI({apiKey: 'dummy-key-not-used', configuration: {baseURL: 'http://localhost:4141/v1'}}); llm.invoke('Hello!').then(r => console.log('✅ Copilot Response:', r.content));"

# Expected output: "✅ Copilot Response: Hi! How can I assist you today?"
```

**Note**: The `apiKey` is required by the LangChain OpenAI client but is not actually used by the copilot-api proxy (which uses your `gh` authentication instead).

---

## 🛠️ IMPLEMENTATION

### Tool Structure

```
tools/
├── validate-agent.ts          # Main validation script
├── llm-client.ts              # Github + LangChain wrapper
├── evaluators/
│   ├── bug-discovery.ts       # Bug discovery evaluator
│   ├── root-cause.ts          # Root cause analysis evaluator
│   └── methodology.ts         # Methodology evaluator
└── report-generator.ts        # Report formatting

benchmarks/
├── debug-benchmark.json       # Task + rubric
├── research-benchmark.json
└── implementation-benchmark.json

validation-output/
├── 2025-10-15_claudette-debug-v1.0.0.json     # Raw transcript
└── 2025-10-15_claudette-debug-v1.0.0.md       # Readable report
```

### Code: `tools/llm-client.ts`

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import fs from 'fs/promises';

export interface AgentConfig {
  preamblePath: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Client for GitHub Copilot Chat API via copilot-api proxy
 * (Pure Node.js - no Python needed!)
 */
export class CopilotAgentClient {
  private llm: ChatOpenAI;
  private systemPrompt: string = '';

  constructor(config: AgentConfig) {
    // Use copilot-api proxy (OpenAI-compatible endpoint)
    this.llm = new ChatOpenAI({
      openAIApiKey: 'dummy-key-not-used', // Required by OpenAI client but not used by proxy
      configuration: {
        baseURL: 'http://localhost:4141/v1', // copilot-api proxy
      },
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 8000,
    });
  }

  async loadPreamble(path: string): Promise<void> {
    this.systemPrompt = await fs.readFile(path, 'utf-8');
  }

  async execute(task: string): Promise<{
    output: string;
    conversationHistory: Array<{ role: string; content: string }>;
    tokens: { input: number; output: number };
  }> {
    const messages = [
      new SystemMessage(this.systemPrompt),
      new HumanMessage(task),
    ];

    const response = await this.llm.invoke(messages);

    return {
      output: response.content.toString(),
      conversationHistory: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: task },
        { role: 'assistant', content: response.content.toString() },
      ],
      tokens: {
        input: this.estimateTokens(this.systemPrompt + task),
        output: this.estimateTokens(response.content.toString()),
      },
    };
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
```

### Code: `tools/validate-agent.ts`

```typescript
import { CopilotAgentClient } from './llm-client';
import { evaluateAgent } from './evaluators';
import { generateReport } from './report-generator';
import fs from 'fs/promises';
import path from 'path';

interface BenchmarkTask {
  name: string;
  description: string;
  task: string;
  rubric: {
    categories: Array<{
      name: string;
      maxPoints: number;
      criteria: string[];
    }>;
  };
}

async function validateAgent(
  agentPath: string,
  benchmarkPath: string,
  outputDir: string
): Promise<void> {
  console.log(`\n🔍 Validating agent: ${agentPath}`);
  console.log(`📋 Benchmark: ${benchmarkPath}\n`);

  // 1. Load benchmark
  const benchmark: BenchmarkTask = JSON.parse(
    await fs.readFile(benchmarkPath, 'utf-8')
  );

  // 2. Initialize agent with GitHub Copilot
  const client = new CopilotAgentClient({
    preamblePath: agentPath,
    temperature: 0.0,
    maxTokens: 8000,
  });

  await client.loadPreamble(agentPath);

  // 3. Execute benchmark task
  console.log('⚙️  Executing benchmark task...');
  const result = await client.execute(benchmark.task);
  console.log(`✅ Task completed in ${result.tokens.input + result.tokens.output} tokens\n`);

  // 4. Evaluate output
  console.log('📊 Evaluating output against rubric...');
  const scores = await evaluateAgent(result.output, benchmark.rubric);
  console.log(`📈 Total score: ${scores.total}/100\n`);

  // 5. Generate report
  const timestamp = new Date().toISOString().split('T')[0];
  const agentName = path.basename(agentPath, '.md');
  const outputPath = path.join(outputDir, `${timestamp}_${agentName}`);

  await fs.mkdir(outputDir, { recursive: true });

  // Save raw output
  await fs.writeFile(
    `${outputPath}.json`,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        agent: agentPath,
        benchmark: benchmarkPath,
        result,
        scores,
      },
      null,
      2
    )
  );

  // Save readable report
  const report = generateReport({
    agent: agentName,
    benchmark: benchmark.name,
    result,
    scores,
  });

  await fs.writeFile(`${outputPath}.md`, report);

  console.log(`📄 Report saved to: ${outputPath}.md`);
}

// CLI usage
const [agentPath, benchmarkPath] = process.argv.slice(2);

if (!agentPath || !benchmarkPath) {
  console.error('Usage: npm run validate <agent.md> <benchmark.json>');
  process.exit(1);
}

validateAgent(
  agentPath,
  benchmarkPath,
  'validation-output'
).catch(console.error);
```

### Code: `tools/evaluators/index.ts`

```typescript
import { ChatOpenAI } from '@langchain/openai';

interface Rubric {
  categories: Array<{
    name: string;
    maxPoints: number;
    criteria: string[];
  }>;
}

interface Scores {
  categories: Record<string, number>;
  total: number;
  feedback: Record<string, string>;
}

export async function evaluateAgent(
  agentOutput: string,
  rubric: Rubric
): Promise<Scores> {
  // Use GitHub Copilot for evaluation (LLM-as-judge)
  const evaluator = new ChatOpenAI({
    openAIApiKey: 'dummy-key-not-used', // Required by OpenAI client but not used by proxy
    configuration: {
      baseURL: 'http://localhost:4141/v1', // copilot-api proxy
    },
    temperature: 0.0, // Deterministic scoring
  });

  const scores: Scores = {
    categories: {},
    total: 0,
    feedback: {},
  };

  // Evaluate each category
  for (const category of rubric.categories) {
    const evaluationPrompt = `
You are an expert evaluator. Score the following agent output against this rubric category:

**Category**: ${category.name} (Max: ${category.maxPoints} points)

**Criteria**:
${category.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**Agent Output**:
${agentOutput}

**Instructions**:
1. Assign a score from 0 to ${category.maxPoints} based on how well the output meets the criteria.
2. Provide brief feedback explaining the score.
3. Format your response EXACTLY as:
   SCORE: <number>
   FEEDBACK: <explanation>
`.trim();

    const response = await evaluator.invoke(evaluationPrompt);
    const responseText = response.content.toString();

    // Parse score
    const scoreMatch = responseText.match(/SCORE:\s*(\d+)/);
    const feedbackMatch = responseText.match(/FEEDBACK:\s*(.+)/s);

    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : 'No feedback provided';

    scores.categories[category.name] = Math.min(score, category.maxPoints);
    scores.feedback[category.name] = feedback;
    scores.total += scores.categories[category.name];
  }

  return scores;
}
```

### Code: `tools/report-generator.ts`

```typescript
interface ReportData {
  agent: string;
  benchmark: string;
  result: {
    output: string;
    conversationHistory: Array<{ role: string; content: string }>;
    tokens: { input: number; output: number };
  };
  scores: {
    categories: Record<string, number>;
    total: number;
    feedback: Record<string, string>;
  };
}

export function generateReport(data: ReportData): string {
  return `
# Agent Validation Report

**Agent**: ${data.agent}
**Benchmark**: ${data.benchmark}
**Date**: ${new Date().toISOString().split('T')[0]}
**Total Score**: ${data.scores.total}/100

---

## Scoring Breakdown

${Object.entries(data.scores.categories)
  .map(
    ([category, score]) => `
### ${category}: ${score} points

**Feedback**: ${data.scores.feedback[category]}
`
  )
  .join('\n')}

---

## Agent Output

\`\`\`
${data.result.output}
\`\`\`

---

## Token Usage

- **Input**: ${data.result.tokens.input} tokens
- **Output**: ${data.result.tokens.output} tokens
- **Total**: ${data.result.tokens.input + data.result.tokens.output} tokens

---

## Conversation History

${data.result.conversationHistory
  .map(
    (msg) => `
### ${msg.role.toUpperCase()}

\`\`\`
${msg.content}
\`\`\`
`
  )
  .join('\n')}
`.trim();
}
```

---

## 📋 USAGE

### Validate Single Agent

```bash
npm run validate -- \
  docs/agents/claudette-debug.md \
  benchmarks/debug-benchmark.json
```

Output:
```
🔍 Validating agent: docs/agents/claudette-debug.md
📋 Benchmark: benchmarks/debug-benchmark.json

⚙️  Executing benchmark task...
✅ Task completed in 12,451 tokens

📊 Evaluating output against rubric...
  Bug Discovery: 32/35
  Root Cause Analysis: 18/20
  Methodology: 19/20
  Process Quality: 14/15
  Production Impact: 9/10
📈 Total score: 92/100

📄 Report saved to: validation-output/2025-10-15_claudette-debug.md
```

### Batch Validate Multiple Agents

```bash
# Create batch validation script
npm run validate:batch -- \
  docs/agents/claudette-debug.md \
  docs/agents/generated-debug-v1.md \
  docs/agents/generated-debug-v2.md
```

### Compare to Baseline

```bash
npm run validate:compare -- \
  --baseline docs/agents/claudette-debug.md \
  --candidate docs/agents/generated-debug-v1.md \
  --benchmark benchmarks/debug-benchmark.json
```

Output:
```
📊 Comparison Report

Baseline (claudette-debug):     92/100
Candidate (generated-debug-v1): 88/100
Delta:                          -4 points

Gaps:
- Bug Discovery: -3 pts (stopped after 6 bugs)
- Process Quality: -1 pt (missed cleanup)
```

---

## 🎯 TESTING THE AGENTINATOR (Two-Hop)

### Automated Two-Hop Validation

```typescript
// tools/validate-agentinator.ts

async function validateAgentinator(
  aginatorPath: string,
  requirement: string,
  benchmarkPath: string,
  baselineScore: number
): Promise<void> {
  console.log('🔍 Two-Hop Validation: Agentinator\n');

  // Hop 1: Generate agent
  console.log('📝 Hop 1: Generating agent with Agentinator...');
  const agentClient = new CopilotAgentClient({
    preamblePath: aginatorPath,
  });

  await agentClient.loadPreamble(aginatorPath);
  const generatedAgent = await agentClient.execute(requirement);

  // Save generated agent
  const generatedPath = 'generated-agents/debug-v1.md';
  await fs.writeFile(generatedPath, generatedAgent.output);
  console.log(`✅ Agent generated: ${generatedPath}\n`);

  // Hop 2: Validate generated agent
  console.log('📊 Hop 2: Validating generated agent...');
  await validateAgent(generatedPath, benchmarkPath, 'validation-output');

  // Load scores
  const reportPath = `validation-output/${new Date().toISOString().split('T')[0]}_debug-v1.json`;
  const report = JSON.parse(await fs.readFile(reportPath, 'utf-8'));

  // Compare to baseline
  const delta = report.scores.total - baselineScore;
  const success = delta >= -10 && delta <= 0;

  console.log(`\n🎯 Agentinator Validation Results:`);
  console.log(`   Baseline:  ${baselineScore}/100`);
  console.log(`   Generated: ${report.scores.total}/100`);
  console.log(`   Delta:     ${delta > 0 ? '+' : ''}${delta} points`);
  console.log(`   Status:    ${success ? '✅ PASS' : '❌ FAIL'}\n`);

  if (success) {
    console.log('✅ Agentinator produces agents within 10 pts of baseline!');
  } else {
    console.log('❌ Agentinator needs improvement. Gap too large.');
  }
}
```

Usage:
```bash
npm run validate:agentinator -- \
  --agentinator docs/agents/claudette-agentinator.md \
  --requirement "Design a debug agent like claudette-debug" \
  --benchmark benchmarks/debug-benchmark.json \
  --baseline 92
```

---

## ✅ ADVANTAGES OF LANGCHAIN + GITHUB COPILOT

| Feature | Manual (Cursor) | LangChain + Copilot |
|---------|-----------------|---------------------|
| **Automation** | ❌ Manual | ✅ Fully automated |
| **Setup** | ✅ None needed | ✅ Just authenticate |
| **Quality** | ✅ Claude Sonnet 4.5 | ✅ GPT-4 + Claude |
| **Batch Testing** | ❌ One at a time | ✅ Parallel |
| **Reproducibility** | ⚠️ Human variance | ✅ Deterministic |
| **Speed** | ⏱️ 1-2 hours/agent | ⚡ 5-10 min/agent |
| **Scoring** | ❌ Manual | ✅ LLM-as-judge |
| **CI/CD Integration** | ❌ No | ✅ Yes |
| **Cost** | ✅ Free (Cursor) | ✅ Included (Copilot) |

**Winner**: LangChain + GitHub Copilot for automated, fast, high-quality validation.

---

## 📊 Quick Reference: Expected Outputs

### Single Agent Validation
```
🔍 Validating agent: claudette-debug.md
⚙️  Executing benchmark task...
✅ Task completed in 12,451 tokens

📊 Evaluating output against rubric...
  Bug Discovery: 32/35
  Root Cause Analysis: 18/20
  Methodology: 19/20
  Process Quality: 14/15
  Production Impact: 9/10
📈 Total score: 92/100

📄 Report saved to: validation-output/2025-10-15_claudette-debug.md
```

### Two-Hop Validation (Agentinator)
```
📝 Hop 1: Generating agent...
✅ Agent generated: generated-agents/debug-v1.md

📊 Hop 2: Validating generated agent...
📈 Generated agent score: 88/100

🎯 Delta: -4 points
✅ PASS (within 10 pts of baseline)
```

### Comparison Feature Matrix

| Feature | Manual (Cursor) | LangChain + Copilot |
|---------|-----------------|---------------------|
| **Automation** | ❌ Manual | ✅ Fully automated |
| **Setup** | ✅ None needed | ✅ Just authenticate (5 min) |
| **Quality** | ✅ Claude Sonnet 4.5 | ✅ GPT-4 + Claude |
| **Batch Testing** | ❌ One at a time | ✅ Parallel |
| **Reproducibility** | ⚠️ Human variance | ✅ Deterministic |
| **Speed** | ⏱️ 1-2 hours/agent | ⚡ 5-10 min/agent |
| **Scoring** | ❌ Manual | ✅ LLM-as-judge |
| **CI/CD Integration** | ❌ No | ✅ Yes |
| **Cost** | ✅ Free (Cursor) | ✅ Included (Copilot) |

---

## 🚀 IMMEDIATE NEXT STEPS

### Phase 1: Setup (5 min) - Pure Node.js!
```bash
# Authenticate with GitHub Copilot
gh auth login

# Install copilot-api proxy (Pure Node.js!)
npm install -g copilot-api
copilot-api start &

# Install LangChain (TypeScript)
npm install @langchain/core @langchain/openai langchain

# Test connection
node -e "const {ChatOpenAI} = require('@langchain/openai'); const llm = new ChatOpenAI({configuration: {baseURL: 'http://localhost:11435/v1'}}); llm.invoke('Hello!').then(r => console.log('✅', r.content));"
```

### Phase 2: Build Tool (4 hours)
```bash
# Create tool structure
mkdir -p tools/evaluators
touch tools/validate-agent.ts
touch tools/llm-client.ts
touch tools/evaluators/index.ts
touch tools/report-generator.ts

# Implement (copy code above)
# ...

# Add npm scripts to package.json
npm pkg set scripts.validate="ts-node tools/validate-agent.ts"
```

### Phase 3: Create Benchmarks (1 hour)
```bash
# Create benchmark specs
touch benchmarks/debug-benchmark.json
# Fill with task + rubric (structured JSON)
```

### Phase 4: Run First Validation (30 min)
```bash
# Test claudette-debug (baseline)
npm run validate docs/agents/claudette-debug.md benchmarks/debug-benchmark.json

# Review output
cat validation-output/2025-10-15_claudette-debug.md
```

### Phase 5: Test Agentinator (1 hour)
```bash
# Two-hop validation
npm run validate:agentinator -- \
  --agentinator docs/agents/claudette-agentinator.md \
  --requirement "Design a debug agent" \
  --benchmark benchmarks/debug-benchmark.json \
  --baseline 92
```

---

## 🎓 WHY THIS IS THE CORRECT SOLUTION

**Your question**: "Why can't we use LangChain?"

**My answer**: **We absolutely should use LangChain!**

**Reasons**:
1. ✅ **No external APIs** - Ollama runs locally
2. ✅ **Automated** - No manual orchestration needed
3. ✅ **Industry standard** - LangChain is the de facto framework for agent testing
4. ✅ **Reproducible** - Same input → same output
5. ✅ **Fast** - 5-10 min per agent vs. 1-2 hours manual
6. ✅ **CI/CD ready** - Can run in GitHub Actions
7. ✅ **LLM-as-judge** - Automated scoring against rubrics

**My initial mistake**: I dismissed LangChain too quickly without researching its local LLM capabilities and evaluation tools.

**Correct approach**: LangChain + Ollama is the perfect solution for automated, local, reproducible agent validation.

---

## 📊 EXPECTED TIMELINE

| Phase | Task | Time |
|-------|------|------|
| 1 | Setup (Pure Node.js!) | 5 min |
| 2 | Build validation tool | 4 hours |
| 3 | Create benchmarks | 1 hour |
| 4 | Run first validation | 30 min |
| 5 | Test Agentinator | 1 hour |
| **Total** | **End-to-end working system** | **6.5 hours** |

**Next step**: `gh auth login && npm install -g copilot-api && copilot-api start`
