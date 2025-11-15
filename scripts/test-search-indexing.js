#!/usr/bin/env node

import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

async function testSearchAndRelationships() {
  const session = driver.session();
  
  try {
    console.log('\n📊 === INDEXING STATUS ===\n');
    
    // Check indexed files
    const filesResult = await session.run(`
      MATCH (f:File)
      RETURN f.path as path, f.name as name, f.language as language
      ORDER BY f.indexed_date DESC
      LIMIT 10
    `);
    
    console.log(`Found ${filesResult.records.length} indexed files:`);
    filesResult.records.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.get('name')} (${r.get('language')}) - ${r.get('path')}`);
    });
    
    // Check file chunks with embeddings
    console.log('\n📦 === FILE CHUNKS ===\n');
    const chunksResult = await session.run(`
      MATCH (f:File)-[:HAS_CHUNK]->(c:FileChunk)
      RETURN f.name as file, count(c) as chunk_count
      ORDER BY chunk_count DESC
      LIMIT 5
    `);
    
    console.log('Files with most chunks:');
    chunksResult.records.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.get('file')}: ${r.get('chunk_count')} chunks`);
    });
    
    // Check chunk IDs
    console.log('\n🔗 === CHUNK IDS & RELATIONSHIPS ===\n');
    const chunkIdResult = await session.run(`
      MATCH (c:FileChunk)
      WHERE c.id IS NOT NULL
      RETURN c.id as chunk_id, c.filePath as file, c.chunk_index as idx
      ORDER BY c.filePath, c.chunk_index
      LIMIT 5
    `);
    
    console.log('Sample chunk IDs:');
    chunkIdResult.records.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.get('chunk_id')} (index: ${r.get('idx')})`);
    });
    
    // Check NEXT_CHUNK relationships
    const nextChunkResult = await session.run(`
      MATCH (c1:FileChunk)-[r:NEXT_CHUNK]->(c2:FileChunk)
      RETURN c1.filePath as file, count(r) as relationship_count
      LIMIT 5
    `);
    
    console.log('\nNEXT_CHUNK relationships per file:');
    nextChunkResult.records.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.get('file')}: ${r.get('relationship_count')} links`);
    });
    
    // Test semantic search with embeddings
    console.log('\n🔍 === TESTING SEMANTIC SEARCH ===\n');
    
    // Get a sample text from a chunk to search for
    const sampleResult = await session.run(`
      MATCH (c:FileChunk)
      WHERE c.text IS NOT NULL AND size(c.text) > 50
      RETURN c.text as text, c.filePath as file
      LIMIT 1
    `);
    
    if (sampleResult.records.length > 0) {
      const sampleText = sampleResult.records[0].get('text').substring(0, 100);
      const sampleFile = sampleResult.records[0].get('file');
      console.log(`Searching for text from: ${sampleFile}`);
      console.log(`Sample text: "${sampleText}..."`);
      
      // Search using vector similarity (if embeddings exist)
      const searchResult = await session.run(`
        MATCH (c:FileChunk)
        WHERE c.embedding IS NOT NULL
        RETURN c.filePath as file, c.chunk_index as idx, 
               size(c.embedding) as embedding_dims
        LIMIT 3
      `);
      
      console.log(`\nChunks with embeddings (${searchResult.records.length} found):`);
      searchResult.records.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.get('file')} [chunk ${r.get('idx')}] - ${r.get('embedding_dims')} dimensions`);
      });
    } else {
      console.log('No chunks with text content found yet');
    }
    
    // Check aggregation - chunks grouped by file
    console.log('\n📑 === CHUNK AGGREGATION ===\n');
    const aggResult = await session.run(`
      MATCH (f:File)-[:HAS_CHUNK]->(c:FileChunk)
      WHERE c.embedding IS NOT NULL
      WITH f.path as file, 
           count(c) as total_chunks,
           avg(c.chunk_index) as avg_index
      RETURN file, total_chunks, avg_index
      ORDER BY total_chunks DESC
      LIMIT 5
    `);
    
    console.log('File chunk aggregation:');
    aggResult.records.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.get('file')}`);
      console.log(`     Total chunks: ${r.get('total_chunks')}`);
      console.log(`     Avg index: ${r.get('avg_index').toFixed(1)}`);
    });
    
    // Check vector index
    console.log('\n⚡ === VECTOR INDEX STATUS ===\n');
    try {
      const indexResult = await session.run(`
        SHOW INDEXES
        YIELD name, type, labelsOrTypes, properties, options
        WHERE type = 'VECTOR'
        RETURN name, labelsOrTypes, options
      `);
      
      if (indexResult.records.length > 0) {
        indexResult.records.forEach(r => {
          const options = r.get('options');
          console.log(`Vector index: ${r.get('name')}`);
          console.log(`  Labels: ${r.get('labelsOrTypes')}`);
          if (options && options.indexConfig) {
            console.log(`  Dimensions: ${options.indexConfig['vector.dimensions']}`);
            console.log(`  Similarity: ${options.indexConfig['vector.similarity_function']}`);
          }
        });
      } else {
        console.log('No vector indexes found');
      }
    } catch (err) {
      console.log('Could not query indexes (requires Neo4j 5.0+)');
    }
    
    console.log('\n✅ === TEST COMPLETE ===\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

testSearchAndRelationships()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
