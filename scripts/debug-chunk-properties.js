#!/usr/bin/env node

import neo4j from 'neo4j-driver';

async function debugProperties() {
  const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j', 'password')
  );

  const session = driver.session();
  
  try {
    console.log('=== Raw FileChunk properties ===');
    const result = await session.run('MATCH (c:FileChunk) RETURN properties(c) as props LIMIT 3');
    result.records.forEach((r, i) => {
      console.log(`\nChunk ${i + 1} raw properties:`, JSON.stringify(r.get('props'), null, 2));
    });

    console.log('\n=== Check if id exists as property ===');
    const idCheck = await session.run(`
      MATCH (c:FileChunk) 
      RETURN 
        c.id as id_property,
        id(c) as neo4j_internal_id,
        keys(c) as all_keys
      LIMIT 3
    `);
    idCheck.records.forEach((r, i) => {
      console.log(`\nChunk ${i + 1}:`);
      console.log('  id property:', r.get('id_property'));
      console.log('  neo4j internal id:', r.get('neo4j_internal_id').toNumber());
      console.log('  all property keys:', r.get('all_keys'));
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

debugProperties();
