import { CopilotAgentClient } from './llm-client.js';
import { evaluateAgent } from './evaluators/index.js';
import { generateReport } from './report-generator.js';
import fs from 'fs/promises';
import path from 'path';
import { CopilotModel } from './types.js';

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
  outputDir: string,
  model: CopilotModel | string
): Promise<void> {
  console.log(`\n🔍 Validating agent: ${agentPath}`);
  console.log(`📋 Benchmark: ${benchmarkPath}\n`);

  // 1. Load benchmark
  const benchmark: BenchmarkTask = JSON.parse(
    await fs.readFile(benchmarkPath, 'utf-8')
  );

  // 2. Initialize agent with GitHub Copilot
  console.log(`🤖 Using model: ${model}\n`);
  
  const client = new CopilotAgentClient({
    preamblePath: agentPath,
    model: model,
    temperature: 0.0,
    maxTokens: 8000,
  });

  await client.loadPreamble(agentPath);

  // 3. Execute benchmark task
  console.log('⚙️  Executing benchmark task...');
  console.log(`📝 Task: ${benchmark.task.substring(0, 100)}...\n`);
  
  const result = await client.execute(benchmark.task);
  console.log(`✅ Task completed - Tool calls: ${result.toolCalls}, Tokens: ${result.tokens.input + result.tokens.output}\n`);
  
  // If no tool calls were made, show a warning
  if (result.toolCalls === 0) {
    console.warn('⚠️  WARNING: Agent made 0 tool calls! Agent may not be using tools properly.\n');
  }

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
        model,
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
    model,
    result,
    scores,
  });

  await fs.writeFile(`${outputPath}.md`, report);

  console.log(`📄 Report saved to: ${outputPath}.md`);
  console.log(`📊 Tool calls made: ${result.toolCalls || 0}`);
}

/**
 * List available models
 */
function listModels(): void {
  console.log('\n📋 Available Models via GitHub Copilot API:\n');
  console.log('GPT Models:');
  console.log(`  - ${CopilotModel.GPT_4_1} (default)`);
  console.log(`  - ${CopilotModel.GPT_4_1_COPILOT}`);
  console.log(`  - ${CopilotModel.GPT_4_1_LATEST}`);
  console.log(`  - ${CopilotModel.GPT_5}`);
  console.log(`  - ${CopilotModel.GPT_4O}`);
  console.log(`  - ${CopilotModel.GPT_4O_LATEST}`);
  console.log(`  - ${CopilotModel.GPT_4O_MINI}`);
  console.log(`  - ${CopilotModel.GPT_4}`);
  console.log(`  - ${CopilotModel.GPT_4_TURBO}`);
  console.log(`  - ${CopilotModel.GPT_3_5_TURBO}`);
//   console.log('\nO-Series:');
//   console.log(`  - ${CopilotModel.O3_MINI}`);
//   console.log(`  - ${CopilotModel.O3_MINI_LATEST}`);
//   console.log('\nClaude:');
//   console.log(`  - ${CopilotModel.CLAUDE_SONNET_4}`);
//   console.log(`  - ${CopilotModel.CLAUDE_3_7_SONNET}`);
//   console.log(`  - ${CopilotModel.CLAUDE_3_7_SONNET_THINKING}`);
//   console.log(`  - ${CopilotModel.CLAUDE_3_5_SONNET}`);
//   console.log('\nGemini:');
//   console.log(`  - ${CopilotModel.GEMINI_2_5_PRO}`);
//   console.log(`  - ${CopilotModel.GEMINI_2_0_FLASH}`);
  console.log('\n💡 Set model: `export COPILOT_MODEL=gpt-4.1');
}

// CLI usage
const args = process.argv.slice(2);

if (args.includes('--list-models') || args.includes('-l')) {
  listModels();
  process.exit(0);
}

const [agentPath, benchmarkPath, model] = args;

if (!agentPath || !benchmarkPath) {
  console.error('Usage: npm run validate <agent.md> <benchmark.json>');
  console.error('       npm run validate --list-models  (show available models)');
  console.error('\nSet model: export COPILOT_MODEL=gpt-4.1');
  process.exit(1);
}

validateAgent(
  agentPath,
  benchmarkPath,
  'validation-output',
  model || CopilotModel.GPT_4_1 // Default to GPT-4o (proven function calling support)
).catch(console.error);

