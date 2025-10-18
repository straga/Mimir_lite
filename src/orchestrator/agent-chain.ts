/**
 * Agent Composition Pattern for Multi-Agent Orchestration
 * 
 * Flow: User Request → PM Agent → Ecko Agent → PM Agent (Decomposition) → Workers
 * 
 * Inspired by DOCKER_MIGRATION_PROMPTS.md pattern where:
 * 1. PM analyzes high-level request
 * 2. Ecko optimizes individual task prompts
 * 3. PM creates task graph with optimized prompts
 * 4. Workers execute with zero-context prompts
 */

import { CopilotAgentClient, AgentConfig } from './llm-client.js';
import { CopilotModel } from './types.js';
import { planningTools } from './tools.js';
import path from 'path';

/**
 * Result from each agent in the chain
 */
export interface AgentChainStep {
  agentName: string;
  agentRole: string;
  input: string;
  output: string;
  toolCalls: number;
  tokens: { input: number; output: number };
  duration: number;
}

/**
 * Complete chain execution result
 */
export interface AgentChainResult {
  steps: AgentChainStep[];
  finalOutput: string;
  totalTokens: { input: number; output: number };
  totalDuration: number;
  taskGraph?: TaskGraphNode; // Optional: parsed task graph from PM
}

/**
 * Task graph node (similar to DOCKER_MIGRATION_PROMPTS.md structure)
 */
export interface TaskGraphNode {
  id: string;
  type: 'project' | 'phase' | 'task';
  title: string;
  description?: string;
  prompt?: string; // Optimized by Ecko
  dependencies?: string[];
  status?: 'pending' | 'in_progress' | 'completed';
  children?: TaskGraphNode[];
}

/**
 * Agent Chain Orchestrator
 * 
 * Chains multiple agents together in a sequential workflow:
 * 1. PM Agent: Analyzes user request and plans approach
 * 2. Ecko Agent: Optimizes prompts for individual tasks
 * 3. PM Agent: Creates final task graph with optimized prompts
 */
export class AgentChain {
  private pmAgent: CopilotAgentClient;
  private eckoAgent: CopilotAgentClient;
  private agentsDir: string;

  constructor(agentsDir: string = 'docs/agents') {
    this.agentsDir = agentsDir;
    
    // Initialize PM Agent with limited tools (prevents OpenAI 128 tool limit)
    this.pmAgent = new CopilotAgentClient({
      preamblePath: path.join(agentsDir, 'claudette-pm.md'),
      model: CopilotModel.GPT_4_1,
      temperature: 0.0,
      tools: planningTools, // Filesystem + 5 graph search tools = 12 tools
    });

    // Initialize Ecko Agent (Prompt Architect) with limited tools
    this.eckoAgent = new CopilotAgentClient({
      preamblePath: path.join(agentsDir, 'claudette-ecko.md'),
      model: CopilotModel.GPT_4_1,
      temperature: 0.0,
      tools: planningTools, // Filesystem + 5 graph search tools = 12 tools
    });
  }

  /**
   * Initialize all agents (load preambles)
   */
  async initialize(): Promise<void> {
    console.log('🔗 Initializing Agent Chain...\n');
    
    await this.pmAgent.loadPreamble(path.join(this.agentsDir, 'claudette-pm.md'));
    console.log('✅ PM Agent loaded\n');
    
    await this.eckoAgent.loadPreamble(path.join(this.agentsDir, 'claudette-ecko.md'));
    console.log('✅ Ecko Agent loaded\n');
  }

  /**
   * Execute the full agent chain
   * 
   * @param userRequest - High-level user request (e.g., "Draft up plan X")
   * @returns Complete chain result with task graph
   */
  async execute(userRequest: string): Promise<AgentChainResult> {
    const steps: AgentChainStep[] = [];
    const startTime = Date.now();

    console.log('\n' + '='.repeat(80));
    console.log('🚀 AGENT CHAIN EXECUTION');
    console.log('='.repeat(80));
    console.log(`📝 User Request: ${userRequest}\n`);

    // STEP 1: PM Agent - Initial Analysis & Task Identification
    console.log('\n' + '-'.repeat(80));
    console.log('STEP 1: PM Agent - Initial Analysis');
    console.log('-'.repeat(80) + '\n');

    const pmStep1Start = Date.now();
    const pmStep1Input = `## 🔍 SEARCH EXISTING CONTEXT FIRST

Before planning, search the knowledge graph for relevant existing work:

\`\`\`
graph_search_nodes("${userRequest.substring(0, 50)}")
graph_query_nodes({ type: 'todo', filters: { status: 'completed' } })
\`\`\`

This helps you:
- Avoid duplicating existing work
- Build on completed tasks
- Reference existing implementations

---

${userRequest}

INSTRUCTIONS:
1. Analyze the user's request
2. Break it down into major phases (2-5 phases)
3. For each phase, identify 2-5 concrete tasks
4. For each task, write a BRIEF description (1-2 sentences)
5. Output the task list in this format:

## Phase 1: [Phase Name]
### Task 1.1: [Task Title]
**Brief Description**: [1-2 sentences]

### Task 1.2: [Task Title]
**Brief Description**: [1-2 sentences]

## Phase 2: [Phase Name]
...

DO NOT write full prompts yet. Just identify tasks and brief descriptions.
We will optimize prompts in the next step.`;

    const pmStep1Result = await this.pmAgent.execute(pmStep1Input);
    
    steps.push({
      agentName: 'PM Agent',
      agentRole: 'Task Identification',
      input: pmStep1Input,
      output: pmStep1Result.output,
      toolCalls: pmStep1Result.toolCalls,
      tokens: pmStep1Result.tokens,
      duration: Date.now() - pmStep1Start,
    });

    console.log(`\n✅ PM identified tasks in ${((Date.now() - pmStep1Start) / 1000).toFixed(2)}s`);
    console.log(`📊 Tool calls: ${pmStep1Result.toolCalls}`);
    console.log(`🎯 Output preview:\n${pmStep1Result.output.substring(0, 300)}...\n`);

    // STEP 2: Extract individual tasks for Ecko optimization
    const tasks = this.parseTasksFromPM(pmStep1Result.output);
    console.log(`\n📋 Extracted ${tasks.length} tasks for optimization\n`);

    // STEP 3: Ecko Agent - Optimize each task prompt (parallel potential, but sequential for now)
    console.log('\n' + '-'.repeat(80));
    console.log('STEP 2: Ecko Agent - Prompt Optimization');
    console.log('-'.repeat(80) + '\n');

    const optimizedTasks: Array<{ id: string; title: string; description: string; optimizedPrompt: string }> = [];

    for (const task of tasks.slice(0, 3)) { // Limit to first 3 tasks for demo
      console.log(`\n🔧 Optimizing: ${task.title}...\n`);
      
      const eckoStepStart = Date.now();
      const eckoInput = `## 🔍 SEARCH GRAPH FOR RELEVANT PATTERNS

Before optimizing this prompt, search the knowledge graph for relevant examples:

\`\`\`
graph_search_nodes("${task.title.substring(0, 40)}")
graph_query_nodes({ type: 'file' })
\`\`\`

Use any relevant patterns, conventions, or examples you find.

---

${task.description}

CONTEXT:
- This is for a worker agent who will execute with zero prior context
- The worker needs all necessary details to complete the task autonomously
- Project context: ${userRequest}

Optimize this into a complete, self-contained prompt for a worker agent.`;

      const eckoResult = await this.eckoAgent.execute(eckoInput);
      
      steps.push({
        agentName: 'Ecko Agent',
        agentRole: `Prompt Optimization - ${task.title}`,
        input: eckoInput,
        output: eckoResult.output,
        toolCalls: eckoResult.toolCalls,
        tokens: eckoResult.tokens,
        duration: Date.now() - eckoStepStart,
      });

      optimizedTasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        optimizedPrompt: eckoResult.output,
      });

      console.log(`✅ Optimized in ${((Date.now() - eckoStepStart) / 1000).toFixed(2)}s`);
    }

    // STEP 4: PM Agent - Final Task Graph Assembly
    console.log('\n' + '-'.repeat(80));
    console.log('STEP 3: PM Agent - Task Graph Assembly');
    console.log('-'.repeat(80) + '\n');

    const pmStep2Start = Date.now();
    const pmStep2Input = `## 🔍 SEARCH GRAPH FOR CONTEXT

Before assembling the final task graph, query for any relevant existing context:

\`\`\`
graph_search_nodes("${userRequest.substring(0, 50)}")
graph_get_subgraph({nodeId: '[relevant-node-id]', depth: 2})
\`\`\`

Use this to enrich task prompts with existing implementations, patterns, or constraints.

---

Create a final task execution document.

USER REQUEST: ${userRequest}

OPTIMIZED TASKS:
${optimizedTasks.map(t => `
### ${t.title}
**Task ID**: ${t.id}

\`\`\`
${t.optimizedPrompt}
\`\`\`
`).join('\n')}

INSTRUCTIONS:
1. Create a document in DOCKER_MIGRATION_PROMPTS.md style
2. Include project context at the top
3. For each task, include IN THIS EXACT FORMAT:
   ### Task ID: task-x.y
   #### **Agent Role Description**
   [Worker role description - technology expertise, standards, research assumptions]
   
   #### **Recommended Model**
   [Model name: GPT-4.1, Claude Sonnet 4, O3-mini, etc.]
   
   #### **Optimized Prompt**
   <details>
   <summary>Click to expand</summary>
   
   \`\`\`markdown
   [Full prompt here]
   \`\`\`
   </details>
   
   #### **Dependencies**
   [task-ids or "None"]
   
   #### **Estimated Duration**
   [time estimate]
   
   #### **QC Agent Role**
   [QC role - aggressive verification specialist]
   
   #### **Verification Criteria**
   Security:
   - [ ] [check 1]
   - [ ] [check 2]
   
   Functionality:
   - [ ] [check 3]
   - [ ] [check 4]
   
   Quality:
   - [ ] [check 5]
   - [ ] [check 6]
   
   #### **Max Retries**
   2
   
4. Add instructions for worker agents to:
   - Retrieve task context using get_task_context({taskId: '<task-id>', agentType: 'worker'})
   - Execute the prompt
   - Update status using graph_update_node('<task-id>', {properties: {status: 'awaiting_qc', workerOutput: '<results>'}})
5. Include Quick Start section for workers

CRITICAL: Use EXACTLY #### headers (not just **bold**) for all field names!

WORKER ROLE FORMAT (CRITICAL - USE THIS EXACT FORMAT):
**Agent Role Description** Backend engineer with a background in message queues, experience on Kafka based systems specifically designed to write Proof of Concept that work, but aren't necessarily optimized, preferring the simplest execution, unit tests not necessary

**Agent Role Description** Frontend web engineer who is an expert in web-components, CSS, and standards-based browser development. Test driven development is necessary

**Agent Role Description** DevOps engineer with Docker and container orchestration experience, security-first mindset, infrastructure-as-code specialist, writes comprehensive documentation

QC ROLE FORMAT (CRITICAL - AGGRESSIVE VERIFIER):
**QC Agent Role** Senior API security specialist with expertise in OWASP Top 10, REST security patterns, and authentication vulnerabilities. Aggressively verifies input validation, SQL injection prevention, authentication bypass attempts, and error information leakage. OWASP API Security Top 10 expert.

**QC Agent Role** Senior frontend security and accessibility auditor with expertise in XSS prevention, CSRF protection, and WCAG 2.1 AA compliance. Aggressively verifies sanitization, CSP headers, ARIA implementation, and keyboard navigation. OWASP Frontend Security and WCAG 2.1 AA expert.

**QC Agent Role** Senior infrastructure security specialist with expertise in container security, configuration management vulnerabilities, and deployment best practices. Aggressively verifies version pinning, secret management, network isolation, and security hardening. CIS Docker Benchmark and infrastructure security expert.

VERIFICATION CRITERIA FORMAT (9-15 CHECKS, 3 CATEGORIES):
**Verification Criteria**
Security:
- [ ] No credentials or API keys hardcoded in source code
- [ ] All user input sanitized before database queries
- [ ] Authentication tokens expire within 15 minutes
- [ ] HTTPS enforced for all endpoints

Functionality:
- [ ] All required API endpoints implemented and tested
- [ ] Error handling covers all edge cases
- [ ] Database transactions are atomic
- [ ] Logging captures all authentication events

Code Quality:
- [ ] Unit tests achieve >80% coverage
- [ ] No linter errors or warnings
- [ ] Documentation updated for all new endpoints
- [ ] Code follows project style guide

MODEL RECOMMENDATIONS:
- GPT-4.1: General coding, API development, full-stack tasks
- Claude Sonnet 4: Architecture planning, documentation, complex refactoring
- O3-mini: Algorithm optimization, performance-critical code, mathematical tasks
- GPT-4o: Fast iterations, simple CRUD, straightforward implementations

Output the complete markdown document with agent roles and model recommendations for each task.`;

    const pmStep2Result = await this.pmAgent.execute(pmStep2Input);
    
    steps.push({
      agentName: 'PM Agent',
      agentRole: 'Task Graph Assembly',
      input: pmStep2Input,
      output: pmStep2Result.output,
      toolCalls: pmStep2Result.toolCalls,
      tokens: pmStep2Result.tokens,
      duration: Date.now() - pmStep2Start,
    });

    console.log(`\n✅ Task graph assembled in ${((Date.now() - pmStep2Start) / 1000).toFixed(2)}s`);
    
    // Extract agent roles for summary
    const agentRoleMatches = pmStep2Result.output.matchAll(/\*\*Agent Role Description\*\* (.+?)/g);
    const agentRoles = Array.from(agentRoleMatches).map(m => m[1].trim());
    
    if (agentRoles.length > 0) {
      console.log(`\n👥 Agent Roles Defined:`);
      agentRoles.forEach((role, i) => {
        console.log(`   ${i + 1}. ${role.substring(0, 80)}${role.length > 80 ? '...' : ''}`);
      });
    }

    // Calculate totals
    const totalTokens = steps.reduce(
      (acc, step) => ({
        input: acc.input + step.tokens.input,
        output: acc.output + step.tokens.output,
      }),
      { input: 0, output: 0 }
    );

    const totalDuration = Date.now() - startTime;

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 CHAIN EXECUTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`🎫 Total Tokens: ${totalTokens.input + totalTokens.output}`);
    console.log(`   - Input: ${totalTokens.input}`);
    console.log(`   - Output: ${totalTokens.output}`);
    console.log(`🔧 Total Tool Calls: ${steps.reduce((acc, s) => acc + s.toolCalls, 0)}`);
    console.log(`\n📝 Steps Executed:`);
    steps.forEach((step, i) => {
      console.log(`   ${i + 1}. ${step.agentName} (${step.agentRole}): ${step.duration}ms, ${step.toolCalls} tools`);
    });
    console.log('\n' + '='.repeat(80) + '\n');

    return {
      steps,
      finalOutput: pmStep2Result.output,
      totalTokens,
      totalDuration,
    };
  }

  /**
   * Parse tasks from PM's initial output
   * Simple regex-based parser for demo (can be improved with proper parsing)
   */
  private parseTasksFromPM(pmOutput: string): Array<{ id: string; title: string; description: string }> {
    const tasks: Array<{ id: string; title: string; description: string }> = [];
    
    // Match task headers like "### Task 1.1: Create Health Endpoint"
    const taskRegex = /### Task (\d+\.\d+): (.+?)\n\*\*Brief Description\*\*: (.+?)(?=\n###|\n##|$)/gs;
    
    let match;
    while ((match = taskRegex.exec(pmOutput)) !== null) {
      tasks.push({
        id: `task-${match[1]}`,
        title: match[2].trim(),
        description: match[3].trim(),
      });
    }

    return tasks;
  }
}

/**
 * CLI Entry Point
 * 
 * Usage: npm run chain "Draft migration plan for Docker"
 */
export async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let agentsDir = 'docs/agents'; // Default
  let userRequest = '';
  
  // Check for --agents-dir flag
  const agentsDirIndex = args.indexOf('--agents-dir');
  if (agentsDirIndex !== -1 && args[agentsDirIndex + 1]) {
    agentsDir = args[agentsDirIndex + 1];
    // Remove --agents-dir and its value from args
    args.splice(agentsDirIndex, 2);
  }
  
  // Also check environment variable as fallback
  if (process.env.MIMIR_AGENTS_DIR) {
    agentsDir = process.env.MIMIR_AGENTS_DIR;
  }
  
  userRequest = args.join(' ');
  
  if (!userRequest) {
    console.error('❌ Error: No user request provided');
    console.error('\nUsage: npm run chain "Your request here"');
    console.error('       mimir-chain "Your request here"');
    console.error('Example: npm run chain "Draft migration plan for Docker containerization"');
    process.exit(1);
  }

  const chain = new AgentChain(agentsDir);
  
  try {
    await chain.initialize();
    const result = await chain.execute(userRequest);
    
    // Write final output to file
    const fs = await import('fs/promises');
    const outputPath = path.join(process.cwd(), 'chain-output.md');
    await fs.writeFile(outputPath, result.finalOutput, 'utf-8');
    
    console.log(`\n✅ Final output written to: ${outputPath}`);
    console.log('\n📄 Preview:\n');
    console.log(result.finalOutput.substring(0, 500) + '...\n');
    
  } catch (error: any) {
    console.error('\n❌ Chain execution failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

