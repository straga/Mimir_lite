#!/usr/bin/env node

/**
 * Create Agent Script
 * 
 * Uses claudette-agentinator to generate a new agent preamble based on a role description.
 * This is the first hop in the two-hop validation process.
 * 
 * Usage:
 *   npm run create-agent "role description"
 * 
 * Example:
 *   npm run create-agent "senior developer with golang and cryptography expertise"
 */

import { CopilotAgentClient } from './llm-client.js';
import { CopilotModel } from './types.js';
import fs from 'fs/promises';
import path from 'path';

interface AgentRequest {
  roleDescription: string;
  benchmarkTask: string;
  benchmarkName: string;
}

/**
 * Clean LLM output - remove markdown code blocks and extra whitespace
 */
function cleanLLMOutput(output: string): string {
  let cleaned = output.trim();
  
  // Remove markdown code blocks (```markdown ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:markdown)?\s*\n/i, '');
  cleaned = cleaned.replace(/\n```\s*$/i, '');
  
  // Remove any leading/trailing whitespace again
  cleaned = cleaned.trim();
  
  return cleaned;
}

async function createAgent(
  roleDescription: string,
  outputDir: string,
  model: CopilotModel | string
): Promise<string> {
  console.log(`\n🎨 Creating agent with Agentinator`);
  console.log(`👤 Role: "${roleDescription}"\n`);


  // 2. Initialize Agentinator
  const agentinator = new CopilotAgentClient({
    preamblePath: 'docs/agents/claudette-agentinator.md',
    model,
    temperature: 0.0,
  });

  await agentinator.loadPreamble('docs/agents/claudette-agentinator.md');

  // 3. Create task prompt for Agentinator
  const aginatorTask = `YOU ARE DESIGNING AN AGENT FOR THIS ROLE:

"${roleDescription}"

CRITICAL INSTRUCTIONS:
1. Read the role description above carefully
2. The agent's name, identity, and capabilities MUST match ONLY that role description
3. Ignore any file paths, directory names, or system context you see
4. Do NOT create an agent for this repository or codebase
5. Create an agent for the role specified in quotes above

AGENT DESIGN REQUIREMENTS:
- Apply ALL 7 principles from AGENTIC_PROMPTING_FRAMEWORK.md
- Use gold standard structure (top 500 tokens: identity + rules + behaviors)
- Include negative prohibitions ("Don't stop after X", "Do NOT ask about Y")
- Add 5+ reinforcement points for critical behaviors
- Make fully autonomous (no permission-seeking, explicit stop conditions)
- Include concrete examples with real data (not placeholders)
- Target 3,500-5,300 tokens for production quality

TECHNICAL CONTEXT (for agent design only):
- Agent will have access to: run_terminal_cmd, read_file, write, search_replace, list_dir, grep, delete_file
- Agent must work autonomously without user intervention

OUTPUT FORMAT:
- Output ONLY the agent preamble markdown (NO code blocks, NO explanations)
- Start with YAML frontmatter (description, tools)
- Agent name must be based on "${roleDescription}" - NOT on file paths or directory names
- Do NOT wrap in \`\`\`markdown code blocks
- Do NOT include design notes or meta-commentary

EXAMPLE OF WHAT TO DO:
Role: "senior golang developer with cryptography expertise"
→ Agent Name: "Senior Golang Cryptography Developer"
→ Description: "Expert in Go programming and cryptographic implementations"

EXAMPLE OF WHAT NOT TO DO:
Role: "senior golang developer"
→ Agent Name: "Build Orchestrator Agent" ❌ (based on file path, not role)
→ Agent Name: "MCP Repository Agent" ❌ (based on directory, not role)

NOW: Design an agent for the role "${roleDescription}" - nothing else.`;

  // 4. Execute Agentinator
  console.log('⚙️  Generating agent preamble with Agentinator...\n');
  
  const result = await agentinator.execute(aginatorTask);
  
  console.log(`✅ Preamble generated - Tool calls: ${result.toolCalls}, Tokens: ${result.tokens.input + result.tokens.output}\n`);

  // 5. Clean the output (remove markdown code blocks if present)
  const cleanedOutput = cleanLLMOutput(result.output);
  
  if (cleanedOutput !== result.output) {
    console.log('🧹 Cleaned markdown code blocks from output\n');
  }

  // 6. Save generated agent preamble
  const timestamp = new Date().toISOString().split('T')[0];
  const sanitizedRole = roleDescription
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  
  const agentFilename = `${timestamp}_generated_${sanitizedRole}.md`;
  const agentPath = path.join(outputDir, agentFilename);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(agentPath, cleanedOutput, 'utf-8');

  console.log(`📄 Agent preamble saved to: ${agentPath}`);
  console.log(`📊 Generation stats:`);
  console.log(`   - Tool calls: ${result.toolCalls}`);
  console.log(`   - Input tokens: ${result.tokens.input}`);
  console.log(`   - Output tokens: ${result.tokens.output}`);
  console.log(`   - Preamble length: ${cleanedOutput.length} characters\n`);

  // 7. Save metadata
  const metadataPath = agentPath.replace('.md', '.meta.json');
  await fs.writeFile(
    metadataPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        roleDescription,
        model,
        generationStats: {
          toolCalls: result.toolCalls,
          tokens: result.tokens,
          preambleLength: cleanedOutput.length,
          cleaningApplied: cleanedOutput !== result.output,
        },
        conversationHistory: result.conversationHistory,
      },
      null,
      2
    )
  );

  console.log(`📦 Metadata saved to: ${metadataPath}\n`);

  return agentPath;
}

// CLI usage
const args = process.argv.slice(2); // Skip node and script path

if (args.length < 1) {
  console.error('Usage: npm run create-agent "role description"');
  console.error('\nExample:');
  console.error('  npm run create-agent "senior golang developer"');
  console.error('\nSet model: export COPILOT_MODEL=gpt-4_1');
  process.exit(1);
}

const [roleDescription] = args;
const model = process.env.COPILOT_MODEL || CopilotModel.CLAUDE_SONNET_4;

createAgent(
  roleDescription,
  'generated-agents',
  model
).then((agentPath) => {
  console.log('✅ Agent creation complete!');
  console.log(`\n💡 Next step: Validate the generated agent:`);
  console.log(`   npm run validate ${agentPath}\n`);
}).catch(console.error);
