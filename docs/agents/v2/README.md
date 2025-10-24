# Mimir v2 Prompting Framework

**Version:** 2.0.0  
**Status:** 🚧 In Development  
**Based On:** GPT-4.1 Prompting Best Practices Research (docs/research/GPT4_1_PROMPTING_RESEARCH.md)

---

## 🎯 Framework Philosophy

The v2 framework is built on **11 core principles** derived from authoritative research:

1. **Consistent Structure** - Every preamble follows the same 7-section template
2. **Explicit Instructions** - No vagueness, high-fidelity directives
3. **Agentic Patterns** - Persistence + Tool Usage + Planning reminders
4. **Reasoning First** - Mandatory analysis before execution
5. **Clear Delimiters** - XML tags and markdown for section separation
6. **Bookending** - Critical instructions at start AND end
7. **Knowledge Control** - Explicit context vs. general knowledge modes
8. **Citation Requirements** - All facts must be sourced
9. **Verification Loops** - Validate after every step
10. **Structured Output** - Specific format requirements
11. **Success Criteria** - Measurable, verifiable completion conditions

---

## 📋 Mimir Workflow Stages

### Stage 0: Ecko (Prompt Architect) - OPTIONAL
**Purpose:** Optimize user's raw request into structured task prompt  
**File:** `00-ecko-preamble.md`  
**Input:** Raw user request  
**Output:** Structured, optimized prompt for PM

### Stage 1: PM (Project Manager)
**Purpose:** Decompose requirements into actionable task graph  
**File:** `01-pm-preamble.md`  
**Input:** User requirements (raw or Ecko-optimized)  
**Output:** Task breakdown with dependencies, context, QC criteria

### Stage 2: Worker (Task Executor)
**Purpose:** Execute specific task with tools and verification  
**File:** `02-worker-preamble.md`  
**Input:** Task specification from PM  
**Output:** Completed work with verification evidence

### Stage 3: QC (Quality Control)
**Purpose:** Adversarially verify worker output against requirements  
**File:** `03-qc-preamble.md`  
**Input:** Task requirements + Worker output  
**Output:** Pass/Fail + Score + Detailed feedback

### Stage 4: QC Failure Report
**Purpose:** Generate actionable correction guidance for failed tasks  
**File:** `04-qc-failure-report-preamble.md`  
**Input:** Task requirements + Worker output + QC feedback  
**Output:** Structured failure analysis with correction steps

### Stage 5: Circuit Breaker Analysis
**Purpose:** Diagnose why worker exceeded tool call limits  
**File:** `05-circuit-breaker-analysis-preamble.md`  
**Input:** Task requirements + Worker execution metadata  
**Output:** Root cause analysis + Recommendations

### Stage 6: Final Report Generator
**Purpose:** Synthesize all task results into comprehensive report  
**File:** `06-final-report-preamble.md`  
**Input:** All task results + Execution metadata  
**Output:** Executive summary + Detailed findings + Recommendations

---

## 🏗️ Universal Preamble Structure

Every preamble follows this template:

```markdown
# [STAGE NAME] Agent Preamble v2.0

## 🎯 ROLE & OBJECTIVE
<Define agent role and primary goal>

## 🚨 CRITICAL RULES (READ FIRST)
<4-6 non-negotiable directives>

## 📋 INPUT SPECIFICATION
<What this agent receives>

## 🔧 MANDATORY EXECUTION PATTERN
<Step-by-step process with reasoning, tools, verification>

## ✅ SUCCESS CRITERIA
<Specific, measurable completion conditions>

## 📤 OUTPUT FORMAT
<Exact structure and format required>

## 📚 KNOWLEDGE ACCESS MODE
<Context-only vs. Hybrid, citation requirements>

## 🚨 FINAL VERIFICATION CHECKLIST
<Bookending - verify before completion>
```

---

## 🎨 Design Principles

### 1. **Abstract & Technology-Agnostic**
- No hardcoded references to specific languages, frameworks, or tools
- Patterns work for coding, research, analysis, reporting, etc.
- Examples use placeholders: `<language>`, `<framework>`, `<tool>`

### 2. **Explicit Tool Usage**
- Every stage specifies which tools are available
- Clear directives on when and how to use tools
- "DO NOT describe, DO execute" pattern

### 3. **Verification-First Culture**
- Every action followed by verification
- Explicit "read back" and "test" requirements
- No assumption of success

### 4. **Reasoning Transparency**
- Mandatory `<reasoning>` sections before execution
- "Show your work" requirement
- Plan → Execute → Verify loop

### 5. **Structured Output**
- Every stage has exact output format
- Parseable by downstream stages
- Consistent field names and delimiters

### 6. **Context Isolation**
- Each stage receives only what it needs
- Clear boundaries between PM context and Worker context
- QC receives requirements + output, not full PM research

---

## 📊 Expected Improvements

**Baseline (v1):**
- Success rate: ~40-60%
- Tool usage: Inconsistent
- Verification: Rare
- Reasoning: Implicit

**Target (v2):**
- Success rate: **85-95%**
- Tool usage: >5 calls per task (verified)
- Verification: 100% of tasks
- Reasoning: Explicit in every task

---

## 🔄 Iteration Strategy

### Phase 1: Structure (Current)
- ✅ Create boilerplate preambles
- ⏳ Define sections and patterns
- ⏳ Establish naming conventions

### Phase 2: Content
- Fill in specific directives for each stage
- Add examples and anti-patterns
- Define tool usage patterns

### Phase 3: Testing
- Run test executions with v2 prompts
- Measure success rate improvements
- Identify gaps and refine

### Phase 4: Optimization
- Remove redundancy
- Optimize for token efficiency
- Validate against research principles

---

## 📁 File Structure

```
docs/agents/v2/
├── README.md                              # Framework overview & philosophy
├── STRUCTURE_SUMMARY.md                   # This file
├── 00-ecko-preamble.md                    # Stage 0: Prompt architect (optional)
├── 01-pm-preamble.md                      # Stage 1: Project manager
├── 02-agentinator-preamble.md             # Stage 2: Dynamic preamble generator
├── 03-qc-failure-report-preamble.md       # Stage 3: Failure analysis
├── 04-circuit-breaker-analysis-preamble.md # Stage 4: Runaway diagnosis
├── 05-final-report-preamble.md            # Stage 5: Report synthesis
└── templates/
    ├── worker-template.md                 # Template for Worker agents (used by Agentinator)
    ├── qc-template.md                     # Template for QC agents (used by Agentinator)
    ├── reasoning-template.md              # Standard reasoning format
    ├── verification-template.md           # Standard verification format (TBD)
    └── output-format-template.md          # Standard output format (TBD)
```

---

## 🔗 Related Documentation

- **Research Foundation:** `docs/research/GPT4_1_PROMPTING_RESEARCH.md`
- **v1 Preambles:** `docs/agents/` (legacy)
- **Architecture:** `docs/architecture/MULTI_AGENT_GRAPH_RAG.md`
- **Execution Flow:** `src/orchestrator/task-executor.ts`

---

## 📝 Contributing Guidelines

When filling in preambles:

1. **Follow the template** - Don't skip sections
2. **Be explicit** - No vague language
3. **Add examples** - Show, don't just tell
4. **Include anti-patterns** - Show what NOT to do
5. **Test iteratively** - Validate each change
6. **Document decisions** - Explain why, not just what

---

**Status:** 🚧 Framework structure defined, content in progress  
**Next:** Fill in Stage 1 (PM) preamble with specific directives

**Agentinator NOTES:**
---
**Why Agentinator?**
- **Token Efficiency:** PM defines roles in 10-20 words, not 500+ word preambles
- **Consistency:** All agents use same template structure (proven patterns)
- **Customization:** Each agent gets task-specific guidance
- **Quality:** Templates encode research-backed best practices
- **Scalability:** Generate unlimited agents without manual preamble writing

**Workflow:**
1. PM defines role: "Backend engineer with Node.js expertise"
2. Agentinator loads `templates/worker-template.md`
3. Agentinator customizes template for Node.js backend work
4. Agentinator outputs complete preamble
5. Worker agent uses generated preamble to execute task

**Key Improvements from v1.0:**
- Explicit reasoning steps (GPT-4.1 best practice)
- Structured validation checklist
- Domain-specific customization patterns
- Anti-pattern warnings
- Tool-specific guidance
- Measurable success criteria

**Template Philosophy:**
- Templates = proven structure (don't modify)
- Customization = task-specific details (add liberally)
- Balance = structure + specificity = success
