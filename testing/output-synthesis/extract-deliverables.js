#!/usr/bin/env node
/**
 * Extract deliverables from Neo4j graph and reconstruct files
 */

import neo4j from 'neo4j-driver';
import fs from 'fs/promises';
import path from 'path';

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

// Mapping of task IDs to expected file outputs
const TASK_FILE_MAPPING = {
  'task-1.1': 'task-1.1-research-notes.md',
  'task-1.2': 'vector-db-comparison.md',
  'task-1.3': 'vector-db-deepdives.md',
  'task-1.4': 'vector-db-pros-cons.md',
  'task-1.5': 'vector-db-pricing.md',
  'task-1.6': 'vector-db-recommendation.md',
};

async function extractDeliverables() {
  const session = driver.session();
  
  try {
    console.log('🔍 Querying Neo4j for completed task outputs...\n');
    
    const result = await session.run(`
      MATCH (n:Node)
      WHERE n.taskId IN ['task-1.1', 'task-1.2', 'task-1.3', 'task-1.4', 'task-1.5', 'task-1.6']
        AND n.status = 'success'
        AND n.output IS NOT NULL
      RETURN n.taskId AS taskId, n.output AS output
      ORDER BY n.taskId
    `);
    
    if (result.records.length === 0) {
      console.error('❌ No completed tasks found in graph');
      return;
    }
    
    console.log(`✅ Found ${result.records.length} completed tasks\n`);
    
    for (const record of result.records) {
      const taskId = record.get('taskId');
      const output = record.get('output');
      
      const fileName = TASK_FILE_MAPPING[taskId];
      
      if (!fileName) {
        console.warn(`⚠️  No file mapping for ${taskId}, skipping`);
        continue;
      }
      
      if (!output) {
        console.error(`❌ ${taskId}: No output stored`);
        continue;
      }
      
      console.log(`📄 ${taskId} → ${fileName} (${output.length} bytes)`);
      
      // Extract the actual content from the worker output
      let content = extractContent(output, taskId);
      
      if (!content) {
        console.error(`   ❌ Failed to extract content from output`);
        console.log(`   Raw output preview: ${output.substring(0, 200)}...`);
        continue;
      }
      
      // Write file
      await fs.writeFile(fileName, content, 'utf-8');
      console.log(`   ✅ Written ${content.length} bytes to ${fileName}\n`);
    }
    
    console.log('✅ All deliverables extracted!');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

/**
 * Extract the actual deliverable content from worker output
 * Worker outputs contain reasoning, tool calls, and the final deliverable
 */
function extractContent(output, taskId) {
  // Try to parse as JSON first (some outputs are wrapped in JSON)
  try {
    const parsed = JSON.parse(output);
    if (parsed.result && typeof parsed.result === 'string') {
      return parsed.result;
    }
  } catch {
    // Not JSON, continue with text extraction
  }
  
  // Look for markdown content in various formats
  
  // Pattern 1: Content between triple backticks (markdown code blocks)
  const codeBlockMatch = output.match(/```(?:markdown)?\n([\s\S]+?)\n```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // Pattern 2: Content after "---" divider (common pattern in worker outputs)
  const dividerMatch = output.match(/---\n\n([\s\S]+)$/);
  if (dividerMatch) {
    return dividerMatch[1].trim();
  }
  
  // Pattern 3: Content after reasoning block
  const reasoningMatch = output.match(/<\/reasoning>\s*\n\n([\s\S]+)$/);
  if (reasoningMatch) {
    return reasoningMatch[1].trim();
  }
  
  // Pattern 4: Look for markdown headings (# or ##) and extract everything from first heading
  const headingMatch = output.match(/^(#{1,6}\s+.+[\s\S]+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }
  
  // Fallback: return the entire output (may contain worker reasoning)
  console.warn(`   ⚠️  Using fallback extraction for ${taskId}`);
  return output;
}

// Run
extractDeliverables().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

