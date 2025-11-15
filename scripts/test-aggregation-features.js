#!/usr/bin/env node

import { UnifiedSearchService } from '../build/managers/UnifiedSearchService.js';
import neo4j from 'neo4j-driver';

async function testAggregation() {
  const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'password')
  );
  
  const searchService = new UnifiedSearchService(driver);
  await searchService.initialize();
  
  console.log('\n�� === TESTING CHUNK AGGREGATION FEATURES ===\n');
  
  // Test semantic search that should return aggregated chunk results
  console.log('Searching for "agent" (should match many chunks)...\n');
  
  const result = await searchService.search('agent framework prompting', {
    types: ['file', 'file_chunk'],
    limit: 5,
    minSimilarity: 0.3
  });
  
  console.log(`Status: ${result.status}`);
  console.log(`Search method: ${result.search_method}`);
  console.log(`Total candidates: ${result.total_candidates}`);
  console.log(`Returned: ${result.returned}`);
  console.log(`Fallback triggered: ${result.fallback_triggered}`);
  
  console.log(`\n📊 Results (${result.results.length}):\n`);
  
  result.results.forEach((item, i) => {
    console.log(`${i + 1}. ${item.id || item.path || 'unknown'}`);
    console.log(`   Type: ${item.type}`);
    console.log(`   Name: ${item.name || 'N/A'}`);
    
    // These are the new aggregation fields
    if (item.chunks_matched !== undefined) {
      console.log(`   ✨ Chunks matched: ${item.chunks_matched}`);
    }
    
    if (item.avg_similarity !== undefined) {
      console.log(`   📊 Avg similarity: ${item.avg_similarity.toFixed(4)}`);
    }
    
    if (item.chunk_index !== undefined) {
      console.log(`   📄 Best chunk index: ${item.chunk_index}`);
    }
    
    if (item.parent_file) {
      console.log(`   📁 Parent file:`);
      console.log(`      Path: ${item.parent_file.path}`);
      console.log(`      Name: ${item.parent_file.name}`);
      console.log(`      Language: ${item.parent_file.language}`);
    }
    
    console.log('');
  });
  
  // Show the raw structure of one result
  if (result.results.length > 0) {
    console.log('\n📋 Sample result structure:');
    console.log(JSON.stringify(result.results[0], null, 2));
  }
  
  await driver.close();
  console.log('\n✅ === TEST COMPLETE ===\n');
}

testAggregation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  });
