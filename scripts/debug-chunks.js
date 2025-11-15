#!/usr/bin/env node

import neo4j from 'neo4j-driver';

async function debugChunks() {
  const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'password')
  );

  const session = driver.session();
  
  try {
    console.log('=== All FileChunk nodes ===');
    const chunks = await session.run('MATCH (c:FileChunk) RETURN c LIMIT 10');
    console.log(`Found ${chunks.records.length} FileChunk nodes`);
    chunks.records.forEach((r, i) => {
      const props = r.get('c').properties;
      console.log(`\nChunk ${i + 1}:`, {
        id: props.id,
        chunk_index: props.chunk_index,
        filePath: props.filePath,
        type: props.type
      });
    });

    console.log('\n=== All Node nodes with type=file_chunk ===');
    const nodes = await session.run("MATCH (n:Node {type: 'file_chunk'}) RETURN n LIMIT 10");
    console.log(`Found ${nodes.records.length} Node nodes with type='file_chunk'`);
    nodes.records.forEach((r, i) => {
      const props = r.get('n').properties;
      console.log(`\nNode ${i + 1}:`, {
        id: props.id,
        chunk_index: props.chunk_index,
        filePath: props.filePath,
        type: props.type
      });
    });

    console.log('\n=== All File nodes ===');
    const files = await session.run('MATCH (f:File) RETURN f.path, f.name LIMIT 10');
    console.log(`Found ${files.records.length} File nodes`);
    files.records.forEach((r, i) => {
      console.log(`File ${i + 1}: ${r.get('f.path')} (${r.get('f.name')})`);
    });

    console.log('\n=== HAS_CHUNK relationships ===');
    const rels = await session.run('MATCH (f:File)-[r:HAS_CHUNK]->(c) RETURN f.path, c.id, c.chunk_index LIMIT 10');
    console.log(`Found ${rels.records.length} HAS_CHUNK relationships`);
    rels.records.forEach((r, i) => {
      console.log(`Rel ${i + 1}: ${r.get('f.path')} -> ${r.get('c.id')} (index: ${r.get('c.chunk_index')})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

debugChunks();
