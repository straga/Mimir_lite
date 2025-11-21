#!/usr/bin/env node

import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

async function createFullTextIndex() {
  const session = driver.session();
  
  try {
    console.log('🔍 Checking for existing full-text index...');
    
    // Check if index exists (use SHOW INDEXES for Neo4j 5.x)
    const existingIndexes = await session.run(`
      SHOW INDEXES YIELD name, type, labelsOrTypes, properties
      WHERE type = 'FULLTEXT' AND name = 'node_search'
      RETURN name, labelsOrTypes, properties
    `);
    
    if (existingIndexes.records.length > 0) {
      console.log('📋 Found existing index "node_search"');
      console.log('\n❓ Dropping existing index to recreate...');
      await session.run(`DROP INDEX node_search IF EXISTS`);
      console.log('✅ Dropped old index');
    }
    
    console.log('\n🔨 Creating comprehensive full-text index with BM25...');
    
    // Create full-text index
    await session.run(`
      CREATE FULLTEXT INDEX node_search
      FOR (n:File|FileChunk|Memory|Todo|Concept|Person|Project|Module|Function|Class|TodoList|Preamble)
      ON EACH [n.content, n.text, n.title, n.name, n.description, n.path, n.workerRole, n.requirements]
      OPTIONS {
        indexConfig: {
          \`fulltext.analyzer\`: 'standard',
          \`fulltext.eventually_consistent\`: true
        }
      }
    `);
    
    console.log('✅ Full-text index "node_search" created!');
    console.log('\n📊 Index: BM25 (Lucene 9.x)');
    console.log('🎯 Try: "accessibility", "accessability~", "title:test^3"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

createFullTextIndex();
