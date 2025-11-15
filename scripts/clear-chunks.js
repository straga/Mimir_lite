#!/usr/bin/env node

import neo4j from 'neo4j-driver';

async function clearChunks() {
  const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'password')
  );

  const session = driver.session();
  
  try {
    const result = await session.run('MATCH (c:FileChunk) DETACH DELETE c RETURN count(c) as deleted');
    console.log(`✅ Deleted ${result.records[0].get('deleted').toNumber()} FileChunk nodes`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

clearChunks();
