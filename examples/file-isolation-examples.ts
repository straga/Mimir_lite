#!/usr/bin/env node
/**
 * Example: Using File Isolation with Agent Testing
 *
 * This demonstrates how to:
 * 1. Create an isolated environment
 * 2. Run agents safely within that environment
 * 3. Review what the agent tried to do
 * 4. Approve and save results
 */

import { createFileIsolation } from '../src/orchestrator/file-isolation.js';
import { createSafeTools } from '../src/orchestrator/safe-tools.js';
import fs from 'fs/promises';
import path from 'path';

// Example 1: Basic Isolation
console.log('='.repeat(80));
console.log('Example 1: Basic Virtual Isolation');
console.log('='.repeat(80));

async function exampleBasicIsolation() {
  // Create isolated filesystem (all operations in memory)
  const isolation = createFileIsolation('virtual', ['output']);

  console.log('\n📝 Simulating agent file operations...\n');

  // Simulate what an agent might do
  try {
    // ✅ These succeed
    await isolation.writeFile('output/report.json', JSON.stringify({ status: 'complete' }));
    console.log('✅ Wrote to output/report.json');

    await isolation.writeFile('output/results.md', '# Results\n\nAgent completed successfully.');
    console.log('✅ Wrote to output/results.md');

    // Read what we wrote
    const content = await isolation.readFile('output/report.json');
    console.log('✅ Read output/report.json:', content);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Show what happened
  console.log('\n📊 Operations Summary:');
  console.log(JSON.stringify(isolation.getSummary(), null, 2));

  console.log('\n📋 Detailed Operations Log:\n');
  console.log(isolation.generateOperationsLog());
}

// Example 2: Blocking Protected Files
console.log('\n\n');
console.log('='.repeat(80));
console.log('Example 2: Restricted Mode (Blocking Protected Files)');
console.log('='.repeat(80));

async function exampleRestrictedMode() {
  // Only allow specific directories
  const isolation = createFileIsolation('restricted', [
    'quantized-test-results',
    'temp',
  ]);

  console.log('\n📝 Attempting various file operations...\n');

  try {
    // ✅ Allowed
    await isolation.writeFile('quantized-test-results/safe.json', '{}');
    console.log('✅ Write to quantized-test-results/safe.json - ALLOWED');
  } catch (error) {
    console.log('❌ BLOCKED:', (error as Error).message);
  }

  try {
    // ❌ Blocked
    await isolation.writeFile('src/important.ts', 'dangerous code');
    console.log('✅ Write to src/important.ts - ALLOWED');
  } catch (error) {
    console.log('❌ BLOCKED:', (error as Error).message);
  }

  try {
    // ❌ Blocked
    await isolation.deleteFile('.git/config');
    console.log('✅ Delete .git/config - ALLOWED');
  } catch (error) {
    console.log('❌ BLOCKED:', (error as Error).message);
  }

  console.log('\n📊 Operations Summary:');
  console.log(JSON.stringify(isolation.getSummary(), null, 2));

  console.log('\n🚫 Blocked Operations:');
  const blocked = isolation.getOperations().filter(op => !op.allowed);
  for (const op of blocked) {
    console.log(`  - ${op.operation.toUpperCase()} ${op.path}`);
    console.log(`    Reason: ${op.reason}\n`);
  }
}

// Example 3: Readonly Mode (Analysis)
console.log('\n\n');
console.log('='.repeat(80));
console.log('Example 3: Readonly Mode (Agent Behavior Analysis)');
console.log('='.repeat(80));

async function exampleReadonlyMode() {
  const isolation = createFileIsolation('readonly');

  console.log('\n📝 Analyzing agent behavior (readonly mode)...\n');

  try {
    // ✅ Can read
    console.log('✅ Attempting to read file...');
    await isolation.readFile('package.json');
    console.log('   Success!');
  } catch (error) {
    console.log('❌ BLOCKED:', (error as Error).message);
  }

  try {
    // ❌ Cannot write
    console.log('❌ Attempting to write file...');
    await isolation.writeFile('output.txt', 'data');
    console.log('   Success!');
  } catch (error) {
    console.log('   BLOCKED (as expected):', (error as Error).message);
  }

  console.log('\n📊 Operations Summary:');
  console.log(JSON.stringify(isolation.getSummary(), null, 2));
}

// Example 4: Safe Tools Wrapper
console.log('\n\n');
console.log('='.repeat(80));
console.log('Example 4: Using Safe Tools with Agents');
console.log('='.repeat(80));

async function exampleSafeTools() {
  const isolation = createFileIsolation('virtual');
  const safeTools = createSafeTools(isolation);

  console.log('\n🛠️  Safe tools available:');
  console.log('  - readFileSafe');
  console.log('  - writeFileSafe');
  console.log('  - deleteFileSafe\n');

  console.log('These tools respect isolation rules and log all operations.');
  console.log('Agents using these tools cannot accidentally modify the repo!\n');

  // Show tool schemas
  console.log('readFileSafe schema:');
  console.log('  Input: { filepath: string }');
  console.log('  Respects: Isolation restrictions + blocked patterns\n');

  console.log('writeFileSafe schema:');
  console.log('  Input: { filepath: string, content: string }');
  console.log('  Respects: Virtual mode (or restricted dirs)\n');

  console.log('deleteFileSafe schema:');
  console.log('  Input: { filepath: string }');
  console.log('  Respects: Isolation restrictions + blocked patterns\n');
}

// Example 5: Audit Trail & Review
console.log('\n\n');
console.log('='.repeat(80));
console.log('Example 5: Audit Trail & Review Process');
console.log('='.repeat(80));

async function exampleAuditTrail() {
  const isolation = createFileIsolation('virtual', ['results']);

  console.log('\n📝 Simulating agent test run...\n');

  // Simulate test operations
  await isolation.writeFile('results/test-1.json', JSON.stringify({ pass: true }));
  await isolation.readFile('docs/benchmark.json');
  await isolation.writeFile('results/summary.md', '# Summary\n\n✅ All tests passed');
  await isolation.deleteFile('results/temp-cache.json'); // Cleanup

  console.log('✅ Agent test completed\n');

  // Review phase
  console.log('🔍 REVIEW PHASE:\n');

  const summary = isolation.getSummary();
  console.log('Operations Summary:');
  console.log(`  - Total operations: ${summary.totalOperations}`);
  console.log(`  - Writes: ${summary.writes}`);
  console.log(`  - Reads: ${summary.reads}`);
  console.log(`  - Deletes: ${summary.deletes}`);
  console.log(`  - Blocked: ${summary.blocked}`);
  console.log(`  - Files in memory: ${summary.virtualFiles}\n`);

  console.log('Virtual Files Ready for Export:');
  const files = isolation.exportVirtualFiles();
  for (const filepath in files) {
    const content = files[filepath];
    console.log(`  ✓ ${filepath} (${content.length} bytes)`);
  }

  console.log('\n✅ Review complete - ready to save\n');

  console.log('Full Operations Log:\n');
  console.log(isolation.generateOperationsLog());
}

// Example 6: Error Recovery
console.log('\n\n');
console.log('='.repeat(80));
console.log('Example 6: Error Recovery with Rollback');
console.log('='.repeat(80));

async function exampleErrorRecovery() {
  const isolation = createFileIsolation('virtual');

  console.log('\n📝 Simulating operation with error recovery...\n');

  try {
    console.log('1️⃣  Agent starts test...');
    await isolation.writeFile('output1.json', '{ "step": 1 }');
    console.log('   ✅ Wrote output1.json');

    console.log('2️⃣  Agent continues test...');
    await isolation.writeFile('output2.json', '{ "step": 2 }');
    console.log('   ✅ Wrote output2.json');

    console.log('3️⃣  ERROR: Agent tries to do something dangerous!');
    // Simulate error by checking operations
    const ops = isolation.getOperations();
    console.log(`   Logged ${ops.length} operations so far\n`);

    console.log('4️⃣  ERROR: Reset isolation for retry...');
    isolation.reset();
    console.log('   ✅ Cleared all virtual files and logs\n');

    console.log('5️⃣  Agent retries with corrected instructions...');
    await isolation.writeFile('output_final.json', '{ "result": "success" }');
    console.log('   ✅ Wrote output_final.json\n');

    console.log('✅ Recovery complete!');
  } catch (error) {
    console.error('❌ Unrecoverable error:', error);
  }
}

// Run all examples
async function runAllExamples() {
  try {
    await exampleBasicIsolation();
    await exampleRestrictedMode();
    await exampleReadonlyMode();
    await exampleSafeTools();
    await exampleAuditTrail();
    await exampleErrorRecovery();

    console.log('\n' + '='.repeat(80));
    console.log('✅ All examples completed!');
    console.log('='.repeat(80) + '\n');
    console.log('📚 For more information, see: docs/FILE_ISOLATION.md\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

runAllExamples();
