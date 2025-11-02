#!/usr/bin/env node
/**
 * Test quantized preamble against multiple Ollama models
 * 
 * Usage:
 *   npm run test:quantized
 *   npm run test:quantized -- --server http://192.168.1.167:11434
 *   npm run test:quantized -- --models qwen2.5-coder:1.5b,phi3:mini
 * 
 * Environment:
 *   OLLAMA_BASE_URL - Override Ollama server URL (default: http://localhost:11434)
 */

import { CopilotAgentClient } from './llm-client.js';
import { evaluateAgent } from './evaluators/index.js';
import { generateReport } from './report-generator.js';
import { createFileIsolation } from './file-isolation.js';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Recommended models for quantized testing (10B or less)
// Excludes cloud models and models > 10B parameters
// NOTE: Update these to match your Ollama server's available models
const RECOMMENDED_MODELS = [
  'deepseek-coder:6.7b',      // 7B parameters - available
  'qwen3:8b',                 // 8.2B parameters - available
  'gemma3:4b',                // 4.3B parameters - available
  'phi4-mini:3.8b',           // 3.8B parameters - available
  'deepcoder:1.5b',           // 1.8B parameters - available
  'exaone-deep:7.8b',         // 7.8B parameters - available
  'deepseek-r1:8b',           // 8.2B parameters - available
  // Large models (>10B) - excluded from testing
  // 'mistral-nemo:12b',       // 12.2B - too large
  // 'gemma3:12b',             // 12.2B - too large
  // 'qwen3:14b',              // 14.8B - too large
  // 'phi4-reasoning:14b',     // 14.7B - too large
  // 'phi4:14b',               // 14.7B - too large
  // 'qwen2.5-coder:14b',      // 14.8B - too large
];

// Model size mapping (in billions of parameters)
const MODEL_SIZES: Record<string, number> = {
  'deepcoder:1.5b': 1.8,
  'phi4-mini:3.8b': 3.8,
  'gemma3:4b': 4.3,
  'deepseek-coder:6.7b': 7,
  'exaone-deep:7.8b': 7.8,
  'qwen3:8b': 8.2,
  'deepseek-r1:8b': 8.2,
  // Large models (>10B)
  'gemma3:12b': 12.2,
  'mistral-nemo:12b': 12.2,
  'qwen3:14b': 14.8,
  'phi4-reasoning:14b': 14.7,
  'phi4:14b': 14.7,
  'qwen2.5-coder:14b': 14.8,
  'deepseek-coder-v2:16b': 15.7,
};

// Cloud/large models to exclude (> 10B or API-only)
const EXCLUDED_MODELS = [
  'gpt', 'claude', 'gemini', // Cloud APIs
  'llama3:70b', 'llama3.1:70b', 'llama3.1:405b', // Large models
  'qwen2.5-coder:14b', 'qwen2.5-coder:32b', // Large Qwen models
  'codestral', 'mixtral', 'command-r', // Large/MoE models
];

interface TestConfig {
  server: string;
  models: string[];
  preambles: string[];
  benchmark: string;
  outputDir: string;
}

interface BenchmarkTask {
  name: string;
  description: string;
  task: string;
  rubric: any;
}

/**
 * Check if model should be excluded (> 10B or cloud model)
 */
function isModelExcluded(modelName: string): boolean {
  const lowerName = modelName.toLowerCase();
  
  // Check against exclusion list
  for (const excluded of EXCLUDED_MODELS) {
    if (lowerName.includes(excluded.toLowerCase())) {
      return true;
    }
  }
  
  // Extract parameter size from model name
  const sizeMatch = modelName.match(/(\d+(?:\.\d+)?)b/i);
  if (sizeMatch) {
    const size = parseFloat(sizeMatch[1]);
    if (size > 10) {
      return true;
    }
  }
  
  // Check known model sizes
  for (const [pattern, size] of Object.entries(MODEL_SIZES)) {
    if (lowerName.includes(pattern.toLowerCase())) {
      return size > 10;
    }
  }
  
  // If no size info found, allow (assume small model)
  return false;
}

/**
 * Check if Ollama model is available
 */
async function checkModelAvailable(server: string, model: string): Promise<boolean> {
  try {
    const response = await fetch(`${server}/api/tags`);
    if (!response.ok) {
      console.warn(`⚠️  Could not connect to Ollama server at ${server}`);
      return false;
    }
    const data = await response.json();
    const available = data.models?.some((m: any) => m.name === model || m.name.startsWith(model + ':'));
    return available;
  } catch (error) {
    console.error(`❌ Error checking model availability: ${error}`);
    return false;
  }
}

/**
 * List available models on Ollama server (filtered to 10B or less)
 */
async function listAvailableModels(server: string): Promise<string[]> {
  try {
    const response = await fetch(`${server}/api/tags`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    const allModels = data.models?.map((m: any) => m.name) || [];
    
    // Filter to 10B or less
    const filteredModels = allModels.filter((name: string) => !isModelExcluded(name));
    
    if (allModels.length !== filteredModels.length) {
      console.log(`   Filtered ${allModels.length - filteredModels.length} models (>10B or cloud models)`);
    }
    
    return filteredModels;
  } catch (error) {
    console.error(`❌ Error listing models: ${error}`);
    return [];
  }
}

/**
 * Test single preamble with single model
 */
async function testPreambleModel(
  preamblePath: string,
  model: string,
  benchmark: BenchmarkTask,
  server: string,
  outputDir: string
): Promise<any> {
  const preambleName = path.basename(preamblePath, '.md');
  const modelSafe = model.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${preambleName} with ${model}`);
  console.log(`${'='.repeat(80)}\n`);

  // Check if model supports tools
  const configLoader = (await import('../config/LLMConfigLoader.js')).LLMConfigLoader.getInstance();
  let modelConfig;
  let supportsTools = true; // Default to true for backward compatibility
  
  try {
    modelConfig = await configLoader.getModelConfig('ollama', model);
    supportsTools = modelConfig.supportsTools !== false; // Default to true if not specified
    
    if (!supportsTools) {
      console.log(`⚠️  Model does not support tool calling - using direct LLM mode`);
    }
  } catch (error) {
    console.log(`⚠️  Model config not found, assuming tool support`);
  }

  // Initialize client with Ollama provider
  const client = new CopilotAgentClient({
    preamblePath,
    provider: 'ollama',
    model,
    ollamaBaseUrl: server,
    temperature: 0.0,
    maxTokens: 8000,
    tools: supportsTools ? undefined : [], // Empty tools array disables agent mode
  });

  await client.loadPreamble(preamblePath);

  // Execute benchmark
  console.log(`📝 Task: ${benchmark.task.substring(0, 100)}...\n`);
  const startTime = Date.now();
  
  let result;
  try {
    result = await client.execute(benchmark.task);
  } catch (error: any) {
    if (error.message?.includes('does not support tools') && supportsTools) {
      // Fallback: model config says it supports tools but it actually doesn't
      console.log(`⚠️  Tool calling failed, retrying without tools...`);
      const fallbackClient = new CopilotAgentClient({
        preamblePath,
        provider: 'ollama',
        model,
        ollamaBaseUrl: server,
        temperature: 0.0,
        maxTokens: 8000,
        tools: [], // Disable tools
      });
      await fallbackClient.loadPreamble(preamblePath);
      result = await fallbackClient.execute(benchmark.task);
    } else {
      throw error;
    }
  }
  
  const duration = Date.now() - startTime;

  console.log(`✅ Completed in ${(duration / 1000).toFixed(1)}s`);
  console.log(`📊 Tool calls: ${result.toolCalls}, Tokens: ${result.tokens.input + result.tokens.output}\n`);

  // Evaluate
  console.log('📊 Evaluating output...');
  const scores = await evaluateAgent(result.output, benchmark.rubric);
  console.log(`📈 Score: ${scores.total}/100\n`);

  // Save results
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(outputDir, `${timestamp}_${preambleName}_${modelSafe}`);

  fs.mkdirSync(outputDir, { recursive: true });

  const resultData = {
    timestamp: new Date().toISOString(),
    preamble: preamblePath,
    model,
    server,
    duration,
    result,
    scores,
  };

  // Save JSON
  fs.writeFileSync(`${outputPath}.json`, JSON.stringify(resultData, null, 2));

  // Save report
  const report = generateReport({
    agent: preambleName,
    benchmark: benchmark.name,
    model: `ollama/${model}`,
    result,
    scores,
  });
  fs.writeFileSync(`${outputPath}.md`, report);

  console.log(`💾 Saved: ${outputPath}.{json,md}`);

  return resultData;
}

/**
 * Run comparison test suite
 */
async function runComparisonTests(config: TestConfig): Promise<void> {
  // Initialize file isolation to protect repo
  const isolation = createFileIsolation('virtual', [
    path.resolve(config.outputDir),
    path.resolve('temp'),
  ]);

  console.log('\n🚀 Quantized Preamble Testing Suite\n');
  console.log(`📡 Server: ${config.server}`);
  console.log(`🤖 Models: ${config.models.join(', ')}`);
  console.log(`📋 Preambles: ${config.preambles.map(p => path.basename(p)).join(', ')}`);
  console.log(`📊 Benchmark: ${config.benchmark}`);
  console.log(`🔒 File Protection: ENABLED (virtual mode)\n`);

  // Load benchmark
  const benchmark: BenchmarkTask = JSON.parse(
    fs.readFileSync(config.benchmark, 'utf-8')
  );

  // Check server connectivity
  console.log('🔍 Checking Ollama server...');
  const availableModels = await listAvailableModels(config.server);
  
  if (availableModels.length === 0) {
    console.error(`❌ Cannot connect to Ollama server at ${config.server}`);
    console.error('   Make sure Ollama is running and accessible.');
    process.exit(1);
  }

  console.log(`✅ Connected! Found ${availableModels.length} models\n`);

  // Validate models
  const validModels: string[] = [];
  for (const model of config.models) {
    // Check if model is excluded
    if (isModelExcluded(model)) {
      console.log(`⚠️  ${model} - excluded (>10B or cloud model)`);
      continue;
    }
    
    const available = await checkModelAvailable(config.server, model);
    if (available) {
      console.log(`✅ ${model} - available`);
      validModels.push(model);
    } else {
      console.log(`⚠️  ${model} - not found (will be skipped)`);
      console.log(`   Run: ollama pull ${model}`);
    }
  }

  if (validModels.length === 0) {
    console.error('\n❌ No valid models available. Please pull models first:');
    for (const model of config.models) {
      console.error(`   ollama pull ${model}`);
    }
    process.exit(1);
  }

  console.log(`\n🎯 Testing ${validModels.length} models x ${config.preambles.length} preambles = ${validModels.length * config.preambles.length} runs\n`);

  // Run tests
  const results: any[] = [];

  for (const preamble of config.preambles) {
    for (const model of validModels) {
      try {
        const result = await testPreambleModel(
          preamble,
          model,
          benchmark,
          config.server,
          config.outputDir
        );
        results.push(result);
      } catch (error) {
        console.error(`\n❌ Error testing ${preamble} with ${model}:`);
        console.error(error);
        results.push({
          preamble,
          model,
          error: String(error),
          scores: { total: 0 },
        });
      }
    }
  }

  // Generate comparison report
  generateComparisonReport(results, config);

  // Log file operations
  const opsLog = isolation.generateOperationsLog();
  const opsPath = path.join(config.outputDir, `${new Date().toISOString().split('T')[0]}_operations.md`);
  fs.mkdirSync(config.outputDir, { recursive: true });
  fs.writeFileSync(opsPath, opsLog);
  console.log(`📋 Operations log: ${opsPath}`);

  console.log('\n✅ Testing complete!\n');
}

/**
 * Generate comparison report across all tests (Synchronous)
 */
function generateComparisonReport(results: any[], config: TestConfig): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const reportPath = path.join(config.outputDir, `${timestamp}_comparison-report.md`);

  let report = `# Quantized Preamble Testing Report\n\n`;
  report += `**Date:** ${new Date().toISOString()}\n`;
  report += `**Server:** ${config.server}\n`;
  report += `**Benchmark:** ${path.basename(config.benchmark)}\n\n`;

  // Summary table
  report += `## Results Summary\n\n`;
  report += `| Preamble | Model | Score | Tool Calls | Duration (s) | Status |\n`;
  report += `|----------|-------|-------|------------|-------------|--------|\n`;

  for (const result of results) {
    const preambleName = path.basename(result.preamble || 'unknown', '.md');
    const score = result.scores?.total || 0;
    const toolCalls = result.result?.toolCalls || 0;
    const duration = result.duration ? (result.duration / 1000).toFixed(1) : 'N/A';
    const status = result.error ? '❌ Error' : score >= 80 ? '✅ Pass' : '⚠️ Low';
    
    report += `| ${preambleName} | ${result.model} | ${score}/100 | ${toolCalls} | ${duration} | ${status} |\n`;
  }

  // Score breakdown by preamble
  report += `\n## Score Breakdown by Preamble\n\n`;
  const preambleGroups = results.reduce((acc, r) => {
    const name = path.basename(r.preamble || 'unknown', '.md');
    if (!acc[name]) acc[name] = [];
    acc[name].push(r);
    return acc;
  }, {} as Record<string, any[]>);

  for (const [preamble, preambleResults] of Object.entries(preambleGroups)) {
    const results = preambleResults as any[];
    const avgScore = results.reduce((sum: number, r: any) => sum + (r.scores?.total || 0), 0) / results.length;
    const avgToolCalls = results.reduce((sum: number, r: any) => sum + (r.result?.toolCalls || 0), 0) / results.length;
    
    report += `### ${preamble}\n\n`;
    report += `**Average Score:** ${avgScore.toFixed(1)}/100\n`;
    report += `**Average Tool Calls:** ${avgToolCalls.toFixed(1)}\n\n`;
    
    report += `| Model | Score | Tool Calls | Duration |\n`;
    report += `|-------|-------|------------|----------|\n`;
    
    for (const r of results) {
      const score = r.scores?.total || 0;
      const toolCalls = r.result?.toolCalls || 0;
      const duration = r.duration ? (r.duration / 1000).toFixed(1) : 'N/A';
      report += `| ${r.model} | ${score}/100 | ${toolCalls} | ${duration}s |\n`;
    }
    report += `\n`;
  }

  // Detailed category scores
  report += `## Detailed Category Scores\n\n`;
  for (const result of results) {
    if (result.error) continue;
    
    const preambleName = path.basename(result.preamble, '.md');
    report += `### ${preambleName} + ${result.model}\n\n`;
    
    if (result.scores?.categories) {
      report += `| Category | Score | Max |\n`;
      report += `|----------|-------|-----|\n`;
      
      for (const cat of result.scores.categories) {
        report += `| ${cat.name} | ${cat.score} | ${cat.maxPoints} |\n`;
      }
      report += `\n`;
    }
  }

  fs.writeFileSync(reportPath, report);
  console.log(`\n📊 Comparison report: ${reportPath}`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const config: TestConfig = {
  server: process.env.OLLAMA_BASE_URL || 'http://192.168.1.167:11434',
  models: RECOMMENDED_MODELS,
  preambles: [
    path.join(__dirname, '../../docs/agents/claudette-quantized.md'),
    path.join(__dirname, '../../docs/agents/claudette-auto.md'),
  ],
  benchmark: path.join(__dirname, '../../docs/benchmarks/quantized-preamble-benchmark.json'),
  outputDir: 'quantized-test-results',
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--server' && args[i + 1]) {
    config.server = args[i + 1];
    i++;
  } else if (args[i] === '--models' && args[i + 1]) {
    config.models = args[i + 1].split(',').map(m => m.trim());
    i++;
  } else if (args[i] === '--preambles' && args[i + 1]) {
    config.preambles = args[i + 1].split(',').map(p => p.trim());
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    config.outputDir = args[i + 1];
    i++;
  } else if (args[i] === '--list-models' || args[i] === '-l') {
    // List models and exit
    console.log('\n📋 Recommended Models for Quantized Testing (≤10B parameters):\n');
    RECOMMENDED_MODELS.forEach(m => console.log(`  - ${m}`));
    console.log('\n🚫 Excluded: Cloud models (GPT, Claude, Gemini) and models >10B');
    console.log('\n💡 Connect to your Ollama server:');
    console.log('   npm run test:quantized -- --server http://192.168.1.167:11434\n');
    process.exit(0);
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Usage: npm run test:quantized [options]

Options:
  --server <url>       Ollama server URL (default: http://localhost:11434)
  --models <list>      Comma-separated model names (default: recommended models)
  --preambles <list>   Comma-separated preamble paths (default: quantized + auto)
  --output <dir>       Output directory (default: quantized-test-results)
  --list-models, -l    List recommended models (≤10B parameters)
  --help, -h           Show this help

Model Selection:
  - Only models ≤10B parameters are tested
  - Cloud models (GPT, Claude, Gemini) are automatically excluded
  - Large models (>10B) are automatically filtered out

Examples:
  # Test with remote Ollama server
  npm run test:quantized -- --server http://192.168.1.167:11434

  # Test specific models (will filter out any >10B)
  npm run test:quantized -- --models qwen2.5-coder:1.5b,phi3:mini

  # Test only quantized preamble
  npm run test:quantized -- --preambles docs/agents/claudette-quantized.md

Environment:
  OLLAMA_BASE_URL      Override default Ollama server URL
`);
    process.exit(0);
  }
}

// Run tests
runComparisonTests(config).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
