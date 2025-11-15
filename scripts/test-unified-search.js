#!/usr/bin/env node

import { GraphManager } from '../build/managers/GraphManager.js';

async function testUnifiedSearch() {
  const graphManager = new GraphManager(
    'bolt://localhost:7687',
    'neo4j',
    'password'
  );
  
  await graphManager.initialize();
  
  console.log('\n🔍 === TESTING UNIFIED SEARCH ===\n');
  
  // Test 1: Search for "authentication" - should find chunks and aggregate
  console.log('Test 1: Semantic search for "authentication"...');
  const authResults = await graphManager.searchNodes('authentication', {
    limit: 5
  });
  
  console.log(`\nFound ${authResults.length} results:`);
  authResults.forEach((node, i) => {
    console.log(`\n${i + 1}. ${node.properties.name || node.properties.path || node.id}`);
    console.log(`   Type: ${node.type}`);
    if (node.properties.chunks_matched) {
      console.log(`   ✨ Chunks matched: ${node.properties.chunks_matched}`);
    }
    if (node.properties.avg_similarity) {
      console.log(`   📊 Avg similarity: ${node.properties.avg_similarity.toFixed(3)}`);
    }
    if (node.properties.chunk_index !== undefined) {
      console.log(`   📄 Chunk index: ${node.properties.chunk_index}`);
    }
    if (node.properties.parent_file_path) {
      console.log(`   📁 Parent file: ${node.properties.parent_file_path}`);
    }
  });
  
  // Test 2: Search for code-related terms
  console.log('\n\nTest 2: Semantic search for "TypeScript configuration"...');
  const tsResults = await graphManager.searchNodes('TypeScript configuration', {
    limit: 3
  });
  
  console.log(`\nFound ${tsResults.length} results:`);
  tsResults.forEach((node, i) => {
    console.log(`\n${i + 1}. ${node.properties.name || node.properties.path || node.id}`);
    console.log(`   Type: ${node.type}`);
    if (node.properties.language) {
      console.log(`   Language: ${node.properties.language}`);
    }
    if (node.properties.chunks_matched) {
      console.log(`   ✨ Chunks matched: ${node.properties.chunks_matched}`);
    }
  });
  
  // Test 3: Check chunk traversal via NEXT_CHUNK relationships
  console.log('\n\nTest 3: Testing chunk chain traversal...');
  const session = graphManager.getDriver().session();
  try {
    const result = await session.run(`
      MATCH (c1:FileChunk)-[:NEXT_CHUNK]->(c2:FileChunk)
      WHERE c1.filePath = c2.filePath
      RETURN c1.id as chunk1, c2.id as chunk2, 
             c1.chunk_index as idx1, c2.chunk_index as idx2,
             c1.filePath as file
      LIMIT 3
    `);
    
    console.log(`\nFound ${result.records.length} sequential chunk relationships:`);
    result.records.forEach((r, i) => {
      console.log(`\n${i + 1}. ${r.get('file')}`);
      console.log(`   ${r.get('chunk1')} [${r.get('idx1')}]`);
      console.log(`   → ${r.get('chunk2')} [${r.get('idx2')}]`);
    });
  } finally {
    await session.close();
  }
  
  await graphManager.close();
  console.log('\n✅ === ALL TESTS COMPLETE ===\n');
}

testUnifiedSearch()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
