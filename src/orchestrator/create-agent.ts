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
import crypto from 'crypto';

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

export async function createAgent(
  roleDescription: string,
  outputDir: string = 'generated-agents',
  model: CopilotModel = CopilotModel.GPT_4_1,
  taskExample?: any, // Optional: first task using this role for context
  isQC: boolean = false // Whether this is a QC agent (affects hash prefix)
): Promise<string> {
  console.log(`\n🤖 Creating ${isQC ? 'QC' : 'Worker'} Agent for role: ${roleDescription}\n`);
  
  // 1. Determine agent type from role description
  const agentType = isQC ? 'QC' : 'Worker';
  const templatePath = isQC 
    ? 'docs/agents/v2/templates/qc-template.md'
    : 'docs/agents/v2/templates/worker-template.md';
  
  console.log(`🔍 Detected agent type: ${agentType}`);
  console.log(`📄 Loading template: ${templatePath}\n`);

  // 2. Load the template
  let templateContent: string;
  try {
    templateContent = await fs.readFile(templatePath, 'utf-8');
    console.log(`✅ Template loaded: ${templateContent.length} characters\n`);
  } catch (error) {
    console.error(`❌ Failed to load template: ${error}`);
    throw new Error(`Template not found: ${templatePath}`);
  }

  // 3. Initialize Agentinator
  const agentinator = new CopilotAgentClient({
    preamblePath: 'docs/agents/v2/02-agentinator-preamble.md',
    model,
    temperature: 0.0,
  });

  await agentinator.loadPreamble('docs/agents/v2/02-agentinator-preamble.md');

  // 4. Create task prompt for Agentinator with template
  const aginatorTask = `YOU ARE GENERATING A ${agentType.toUpperCase()} AGENT PREAMBLE.

**CRITICAL: YOU MUST FOLLOW THE TEMPLATE STRUCTURE EXACTLY**

<agent_type>
${agentType}
</agent_type>

<role_description>
${roleDescription}
</role_description>

<task_requirements>
${taskExample ? `
**Specific Task Example:**
**Task ID:** ${taskExample.id}
**Title:** ${taskExample.title}
**Prompt:**
${taskExample.prompt}

**Success Criteria:**
${taskExample.verificationCriteria || 'Complete all requirements in the prompt above'}

**Estimated Tool Calls:** ${taskExample.estimatedToolCalls || 'Not specified'}
` : `The agent must be able to work autonomously on tasks related to: ${roleDescription}`}
</task_requirements>

<task_context>
${taskExample ? `
**Actual Task Context:**
- Task dependencies: ${taskExample.dependencies?.join(', ') || 'None'}
- Estimated duration: ${taskExample.estimatedDuration || 'Not specified'}
- Recommended model: ${taskExample.recommendedModel || 'Not specified'}
` : ''}
- Tools available: run_terminal_cmd, read_file, write, search_replace, list_dir, grep, delete_file, web_search
- Must work without user intervention
- Must provide evidence for all claims
- Must follow best practices for the domain
</task_context>

<template_path>
${templatePath}
</template_path>

<template_content>
${templateContent}
</template_content>

MANDATORY INSTRUCTIONS:

1. **LOAD THE TEMPLATE ABOVE** - The template content is provided in <template_content>
2. **PRESERVE EXACT STRUCTURE** - Follow the "CRITICAL: TEMPLATE STRUCTURE PRESERVATION" section in your preamble
3. **CUSTOMIZE CONTENT ONLY** - Replace placeholders like [ROLE_TITLE], [DOMAIN_EXPERTISE] with specifics
4. **DO NOT RENAME SECTIONS** - Section headers must match template exactly (emoji + text)
5. **DO NOT REORDER SECTIONS** - Keep sections in template order
6. **PRESERVE STEP STRUCTURE** - For Worker: STEP 0-5, For QC: STEP 1-5 as SEPARATE sections
7. **INCLUDE <reasoning> TAGS** - In STEP 1, use proper <reasoning></reasoning> format
8. **INCLUDE ALL CHECKLISTS** - Preserve all "- [ ]" checklists from template
9. **INCLUDE ANTI-PATTERNS** - Keep the Anti-Patterns section with all 6 patterns
10. **INCLUDE FINAL CHECKLIST** - Keep the Final Verification Checklist section

VALIDATION BEFORE OUTPUT:
- [ ] All 11 sections from template present?
- [ ] Section headers match template exactly?
- [ ] Section order matches template?
- [ ] STEP numbers correct (0-5 for Worker, 1-5 for QC)?
- [ ] <reasoning> tags in STEP 1?
- [ ] Checklists preserved?
- [ ] Anti-Patterns section included?
- [ ] Final Verification Checklist included?

OUTPUT FORMAT:
- Start with YAML frontmatter (description, tools)
- Then output the complete preamble following the template structure
- Do NOT wrap in \`\`\`markdown code blocks
- Do NOT add meta-commentary

NOW: Generate the ${agentType} agent preamble by customizing the template above.`;

  // 5. Execute Agentinator
  console.log('⚙️  Generating agent preamble with Agentinator...\n');
  
  const result = await agentinator.execute(aginatorTask);
  
  console.log(`✅ Preamble generated - Tool calls: ${result.toolCalls}, Tokens: ${result.tokens.input + result.tokens.output}\n`);

  // 6. Clean the output (remove markdown code blocks if present)
  const cleanedOutput = cleanLLMOutput(result.output);
  
  if (cleanedOutput !== result.output) {
    console.log('🧹 Cleaned markdown code blocks from output\n');
  }

  // 7. Generate hashed filename for caching
  const roleHash = crypto.createHash('md5').update(roleDescription).digest('hex').substring(0, 8);
  const prefix = isQC ? 'qc' : 'worker';
  const agentFilename = `${prefix}-${roleHash}.md`;
  const agentPath = path.join(outputDir, agentFilename);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(agentPath, cleanedOutput, 'utf-8');

  console.log(`📄 Agent preamble saved to: ${agentPath}`);
  console.log(`📊 Generation stats:`);
  console.log(`   - Tool calls: ${result.toolCalls}`);
  console.log(`   - Input tokens: ${result.tokens.input}`);
  console.log(`   - Output tokens: ${result.tokens.output}`);
  console.log(`   - Preamble length: ${cleanedOutput.length} characters\n`);

  // Metadata is no longer saved to reduce file clutter
  // (Can be re-enabled for debugging if needed)

  return agentPath;
}

// CLI usage - only run if this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2); // Skip node and script path

  if (args.length < 1) {
    console.error('Usage: npm run create-agent "role description"');
    console.error('\nExample:');
    console.error('  npm run create-agent "senior golang developer"');
    console.error('\nSet model: export COPILOT_MODEL=gpt-4_1');
    process.exit(1);
  }

  const [roleDescription] = args;
  const model = (process.env.COPILOT_MODEL as CopilotModel) || CopilotModel.GPT_4_1;

  createAgent(
    roleDescription,
    'generated-agents',
    model
  ).then((agentPath) => {
    console.log('✅ Agent creation complete!');
    console.log(`\n💡 Next step: Validate the generated agent:`);
    console.log(`   npm run validate ${agentPath}\n`);
  }).catch(console.error);
}
