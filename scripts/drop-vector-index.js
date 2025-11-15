#!/usr/bin/env node

/**
 * Drop and recreate vector index with correct dimensions
 */

import neo4j from 'neo4j-driver';
import { LLMConfigLoader } from '../build/config/LLMConfigLoader.js';

async function dropVectorIndex() {
  const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'password')
  );

  const session = driver.session();
  
  try {
    console.log('🗑️  Dropping existing vector index...');
    await session.run('DROP INDEX node_embedding_index IF EXISTS');
    console.log('✅ Vector index dropped');
    
    // Get correct dimensions from env var or default to 768
    const dimensions = parseInt(process.env.MIMIR_EMBEDDINGS_DIMENSIONS || '768', 10);
    
    console.log(`🔧 MIMIR_EMBEDDINGS_DIMENSIONS env var: ${process.env.MIMIR_EMBEDDINGS_DIMENSIONS}`);
    console.log(`🔧 Creating vector index with ${dimensions} dimensions...`);
    
    await session.run(`
      CREATE VECTOR INDEX node_embedding_index IF NOT EXISTS
      FOR (n:Node) ON (n.embedding)
      OPTIONS {indexConfig: {
        \`vector.dimensions\`: ${dimensions},
        \`vector.similarity_function\`: 'cosine'
      }}
    `);
    
    console.log('✅ Vector index created successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

dropVectorIndex()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
