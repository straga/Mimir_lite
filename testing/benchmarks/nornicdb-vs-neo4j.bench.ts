/**
 * NornicDB vs Neo4j Benchmark Suite
 * 
 * Compares performance between:
 * - NornicDB (drop-in replacement): bolt://localhost:7687
 * - Neo4j: bolt://localhost:7687 (or configured via NEO4J_URI)
 * 
 * Uses the Neo4j Movies example dataset for realistic benchmarks.
 * 
 * Run with: npm run bench:compare-dbs
 * 
 * Configuration (environment variables):
 *   NORNICDB_URI=bolt://localhost:7687
 *   NORNICDB_USER=neo4j
 *   NORNICDB_PASSWORD=password
 *   
 *   NEO4J_URI=bolt://localhost:7687
 *   NEO4J_USER=neo4j
 *   NEO4J_PASSWORD=neo4j
 */

import { describe, bench, beforeAll, afterAll } from 'vitest';
import neo4j, { Driver, Session } from 'neo4j-driver';

// ============================================================================
// CONFIGURATION
// ============================================================================

// NornicDB (your drop-in replacement)
const NORNICDB_URI = process.env.NORNICDB_URI || 'bolt://localhost:7687';
const NORNICDB_USER = process.env.NORNICDB_USER || 'admin';
const NORNICDB_PASSWORD = process.env.NORNICDB_PASSWORD || 'admin';

// Neo4j (original for comparison)
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7688';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

// ============================================================================
// DATABASE CONNECTIONS
// ============================================================================

let nornicdbDriver: Driver;
let nornicdbSession: Session;
let neo4jDriver: Driver;
let neo4jSession: Session;

// ============================================================================
// MOVIES DATASET (Neo4j Example Data - simplified for loading)
// ============================================================================

async function loadMoviesDataset(session: Session): Promise<void> {
  // Clear existing data
  await session.run('MATCH (n) DETACH DELETE n');
  
  // Create Movies
  await session.run(`
    CREATE (m1:Movie {title:'The Matrix', released:1999, tagline:'Welcome to the Real World'})
    CREATE (m2:Movie {title:'The Matrix Reloaded', released:2003, tagline:'Free your mind'})
    CREATE (m3:Movie {title:'The Matrix Revolutions', released:2003, tagline:'Everything that has a beginning has an end'})
    CREATE (m4:Movie {title:"The Devil's Advocate", released:1997, tagline:'Evil has its winning ways'})
    CREATE (m5:Movie {title:"A Few Good Men", released:1992, tagline:"In the heart of the nation's capital"})
    CREATE (m6:Movie {title:"Top Gun", released:1986, tagline:'I feel the need, the need for speed.'})
    CREATE (m7:Movie {title:'Jerry Maguire', released:2000, tagline:'The rest of his life begins now.'})
    CREATE (m8:Movie {title:"Stand By Me", released:1986, tagline:"For some, it's the last real taste of innocence"})
    CREATE (m9:Movie {title:'As Good as It Gets', released:1997, tagline:'A comedy from the heart'})
    CREATE (m10:Movie {title:'What Dreams May Come', released:1998, tagline:'After life there is more'})
    CREATE (m11:Movie {title:'Snow Falling on Cedars', released:1999, tagline:'First loves last. Forever.'})
    CREATE (m12:Movie {title:"You've Got Mail", released:1998, tagline:'At odds in life... in love on-line.'})
    CREATE (m13:Movie {title:'Sleepless in Seattle', released:1993, tagline:'What if someone you never met'})
    CREATE (m14:Movie {title:'Joe Versus the Volcano', released:1990, tagline:'A story of love, lava'})
    CREATE (m15:Movie {title:'When Harry Met Sally', released:1998, tagline:'Can two friends sleep together'})
    CREATE (m16:Movie {title:'Cloud Atlas', released:2012, tagline:'Everything is connected'})
    CREATE (m17:Movie {title:'The Da Vinci Code', released:2006, tagline:'Break The Codes'})
    CREATE (m18:Movie {title:'V for Vendetta', released:2006, tagline:'Freedom! Forever!'})
    CREATE (m19:Movie {title:'Speed Racer', released:2008, tagline:'Speed has no limits'})
    CREATE (m20:Movie {title:'The Green Mile', released:1999, tagline:"Walk a mile you'll never forget."})
  `);
  
  // Create People
  await session.run(`
    CREATE (p1:Person {name:'Keanu Reeves', born:1964})
    CREATE (p2:Person {name:'Carrie-Anne Moss', born:1967})
    CREATE (p3:Person {name:'Laurence Fishburne', born:1961})
    CREATE (p4:Person {name:'Hugo Weaving', born:1960})
    CREATE (p5:Person {name:'Lilly Wachowski', born:1967})
    CREATE (p6:Person {name:'Lana Wachowski', born:1965})
    CREATE (p7:Person {name:'Joel Silver', born:1952})
    CREATE (p8:Person {name:'Tom Hanks', born:1956})
    CREATE (p9:Person {name:'Tom Cruise', born:1962})
    CREATE (p10:Person {name:'Jack Nicholson', born:1937})
    CREATE (p11:Person {name:'Demi Moore', born:1962})
    CREATE (p12:Person {name:'Kevin Bacon', born:1958})
    CREATE (p13:Person {name:'Cuba Gooding Jr.', born:1968})
    CREATE (p14:Person {name:'Renee Zellweger', born:1969})
    CREATE (p15:Person {name:'Meg Ryan', born:1961})
    CREATE (p16:Person {name:'Billy Crystal', born:1948})
    CREATE (p17:Person {name:'Robin Williams', born:1951})
    CREATE (p18:Person {name:'Natalie Portman', born:1981})
    CREATE (p19:Person {name:'Halle Berry', born:1966})
    CREATE (p20:Person {name:'Michael Clarke Duncan', born:1957})
  `);
  
  // Create ACTED_IN relationships
  await session.run(`
    MATCH (keanu:Person {name:'Keanu Reeves'}), (matrix:Movie {title:'The Matrix'})
    CREATE (keanu)-[:ACTED_IN {roles:['Neo']}]->(matrix)
  `);
  await session.run(`
    MATCH (carrie:Person {name:'Carrie-Anne Moss'}), (matrix:Movie {title:'The Matrix'})
    CREATE (carrie)-[:ACTED_IN {roles:['Trinity']}]->(matrix)
  `);
  await session.run(`
    MATCH (laurence:Person {name:'Laurence Fishburne'}), (matrix:Movie {title:'The Matrix'})
    CREATE (laurence)-[:ACTED_IN {roles:['Morpheus']}]->(matrix)
  `);
  await session.run(`
    MATCH (hugo:Person {name:'Hugo Weaving'}), (matrix:Movie {title:'The Matrix'})
    CREATE (hugo)-[:ACTED_IN {roles:['Agent Smith']}]->(matrix)
  `);
  
  // More ACTED_IN for Matrix sequels
  await session.run(`
    MATCH (keanu:Person {name:'Keanu Reeves'}), (m:Movie {title:'The Matrix Reloaded'})
    CREATE (keanu)-[:ACTED_IN {roles:['Neo']}]->(m)
  `);
  await session.run(`
    MATCH (keanu:Person {name:'Keanu Reeves'}), (m:Movie {title:'The Matrix Revolutions'})
    CREATE (keanu)-[:ACTED_IN {roles:['Neo']}]->(m)
  `);
  await session.run(`
    MATCH (carrie:Person {name:'Carrie-Anne Moss'}), (m:Movie {title:'The Matrix Reloaded'})
    CREATE (carrie)-[:ACTED_IN {roles:['Trinity']}]->(m)
  `);
  await session.run(`
    MATCH (carrie:Person {name:'Carrie-Anne Moss'}), (m:Movie {title:'The Matrix Revolutions'})
    CREATE (carrie)-[:ACTED_IN {roles:['Trinity']}]->(m)
  `);
  
  // Tom Hanks movies
  await session.run(`
    MATCH (tom:Person {name:'Tom Hanks'}), (m:Movie {title:"You've Got Mail"})
    CREATE (tom)-[:ACTED_IN {roles:['Joe Fox']}]->(m)
  `);
  await session.run(`
    MATCH (tom:Person {name:'Tom Hanks'}), (m:Movie {title:'Sleepless in Seattle'})
    CREATE (tom)-[:ACTED_IN {roles:['Sam Baldwin']}]->(m)
  `);
  await session.run(`
    MATCH (tom:Person {name:'Tom Hanks'}), (m:Movie {title:'Joe Versus the Volcano'})
    CREATE (tom)-[:ACTED_IN {roles:['Joe Banks']}]->(m)
  `);
  await session.run(`
    MATCH (tom:Person {name:'Tom Hanks'}), (m:Movie {title:'The Green Mile'})
    CREATE (tom)-[:ACTED_IN {roles:['Paul Edgecomb']}]->(m)
  `);
  await session.run(`
    MATCH (tom:Person {name:'Tom Hanks'}), (m:Movie {title:'Cloud Atlas'})
    CREATE (tom)-[:ACTED_IN {roles:['Zachry']}]->(m)
  `);
  await session.run(`
    MATCH (tom:Person {name:'Tom Hanks'}), (m:Movie {title:'The Da Vinci Code'})
    CREATE (tom)-[:ACTED_IN {roles:['Dr. Robert Langdon']}]->(m)
  `);
  
  // Meg Ryan movies
  await session.run(`
    MATCH (meg:Person {name:'Meg Ryan'}), (m:Movie {title:"You've Got Mail"})
    CREATE (meg)-[:ACTED_IN {roles:['Kathleen Kelly']}]->(m)
  `);
  await session.run(`
    MATCH (meg:Person {name:'Meg Ryan'}), (m:Movie {title:'Sleepless in Seattle'})
    CREATE (meg)-[:ACTED_IN {roles:['Annie Reed']}]->(m)
  `);
  await session.run(`
    MATCH (meg:Person {name:'Meg Ryan'}), (m:Movie {title:'Joe Versus the Volcano'})
    CREATE (meg)-[:ACTED_IN {roles:['DeDe', 'Angelica']}]->(m)
  `);
  await session.run(`
    MATCH (meg:Person {name:'Meg Ryan'}), (m:Movie {title:'When Harry Met Sally'})
    CREATE (meg)-[:ACTED_IN {roles:['Sally Albright']}]->(m)
  `);
  await session.run(`
    MATCH (meg:Person {name:'Meg Ryan'}), (m:Movie {title:'Top Gun'})
    CREATE (meg)-[:ACTED_IN {roles:['Carole']}]->(m)
  `);
  
  // Tom Cruise
  await session.run(`
    MATCH (tom:Person {name:'Tom Cruise'}), (m:Movie {title:'Top Gun'})
    CREATE (tom)-[:ACTED_IN {roles:['Maverick']}]->(m)
  `);
  await session.run(`
    MATCH (tom:Person {name:'Tom Cruise'}), (m:Movie {title:'Jerry Maguire'})
    CREATE (tom)-[:ACTED_IN {roles:['Jerry Maguire']}]->(m)
  `);
  await session.run(`
    MATCH (tom:Person {name:'Tom Cruise'}), (m:Movie {title:"A Few Good Men"})
    CREATE (tom)-[:ACTED_IN {roles:['Lt. Daniel Kaffee']}]->(m)
  `);
  
  // Others
  await session.run(`
    MATCH (jack:Person {name:'Jack Nicholson'}), (m:Movie {title:"A Few Good Men"})
    CREATE (jack)-[:ACTED_IN {roles:['Col. Nathan R. Jessup']}]->(m)
  `);
  await session.run(`
    MATCH (jack:Person {name:'Jack Nicholson'}), (m:Movie {title:'As Good as It Gets'})
    CREATE (jack)-[:ACTED_IN {roles:['Melvin Udall']}]->(m)
  `);
  await session.run(`
    MATCH (demi:Person {name:'Demi Moore'}), (m:Movie {title:"A Few Good Men"})
    CREATE (demi)-[:ACTED_IN {roles:['Lt. Cdr. JoAnne Galloway']}]->(m)
  `);
  await session.run(`
    MATCH (kevin:Person {name:'Kevin Bacon'}), (m:Movie {title:"A Few Good Men"})
    CREATE (kevin)-[:ACTED_IN {roles:['Capt. Jack Ross']}]->(m)
  `);
  await session.run(`
    MATCH (cuba:Person {name:'Cuba Gooding Jr.'}), (m:Movie {title:'Jerry Maguire'})
    CREATE (cuba)-[:ACTED_IN {roles:['Rod Tidwell']}]->(m)
  `);
  await session.run(`
    MATCH (renee:Person {name:'Renee Zellweger'}), (m:Movie {title:'Jerry Maguire'})
    CREATE (renee)-[:ACTED_IN {roles:['Dorothy Boyd']}]->(m)
  `);
  await session.run(`
    MATCH (billy:Person {name:'Billy Crystal'}), (m:Movie {title:'When Harry Met Sally'})
    CREATE (billy)-[:ACTED_IN {roles:['Harry Burns']}]->(m)
  `);
  await session.run(`
    MATCH (robin:Person {name:'Robin Williams'}), (m:Movie {title:'What Dreams May Come'})
    CREATE (robin)-[:ACTED_IN {roles:['Chris Nielsen']}]->(m)
  `);
  await session.run(`
    MATCH (natalie:Person {name:'Natalie Portman'}), (m:Movie {title:'V for Vendetta'})
    CREATE (natalie)-[:ACTED_IN {roles:['Evey Hammond']}]->(m)
  `);
  await session.run(`
    MATCH (hugo:Person {name:'Hugo Weaving'}), (m:Movie {title:'V for Vendetta'})
    CREATE (hugo)-[:ACTED_IN {roles:['V']}]->(m)
  `);
  await session.run(`
    MATCH (hugo:Person {name:'Hugo Weaving'}), (m:Movie {title:'Cloud Atlas'})
    CREATE (hugo)-[:ACTED_IN {roles:['Bill Smoke']}]->(m)
  `);
  await session.run(`
    MATCH (halle:Person {name:'Halle Berry'}), (m:Movie {title:'Cloud Atlas'})
    CREATE (halle)-[:ACTED_IN {roles:['Luisa Rey']}]->(m)
  `);
  await session.run(`
    MATCH (michael:Person {name:'Michael Clarke Duncan'}), (m:Movie {title:'The Green Mile'})
    CREATE (michael)-[:ACTED_IN {roles:['John Coffey']}]->(m)
  `);
  
  // Create DIRECTED relationships
  await session.run(`
    MATCH (lilly:Person {name:'Lilly Wachowski'}), (m:Movie {title:'The Matrix'})
    CREATE (lilly)-[:DIRECTED]->(m)
  `);
  await session.run(`
    MATCH (lana:Person {name:'Lana Wachowski'}), (m:Movie {title:'The Matrix'})
    CREATE (lana)-[:DIRECTED]->(m)
  `);
  await session.run(`
    MATCH (lilly:Person {name:'Lilly Wachowski'}), (m:Movie {title:'The Matrix Reloaded'})
    CREATE (lilly)-[:DIRECTED]->(m)
  `);
  await session.run(`
    MATCH (lana:Person {name:'Lana Wachowski'}), (m:Movie {title:'The Matrix Reloaded'})
    CREATE (lana)-[:DIRECTED]->(m)
  `);
  await session.run(`
    MATCH (lilly:Person {name:'Lilly Wachowski'}), (m:Movie {title:'The Matrix Revolutions'})
    CREATE (lilly)-[:DIRECTED]->(m)
  `);
  await session.run(`
    MATCH (lana:Person {name:'Lana Wachowski'}), (m:Movie {title:'The Matrix Revolutions'})
    CREATE (lana)-[:DIRECTED]->(m)
  `);
  await session.run(`
    MATCH (lilly:Person {name:'Lilly Wachowski'}), (m:Movie {title:'Cloud Atlas'})
    CREATE (lilly)-[:DIRECTED]->(m)
  `);
  await session.run(`
    MATCH (lana:Person {name:'Lana Wachowski'}), (m:Movie {title:'Cloud Atlas'})
    CREATE (lana)-[:DIRECTED]->(m)
  `);
  await session.run(`
    MATCH (lilly:Person {name:'Lilly Wachowski'}), (m:Movie {title:'V for Vendetta'})
    CREATE (lilly)-[:DIRECTED]->(m)
  `);
  await session.run(`
    MATCH (lana:Person {name:'Lana Wachowski'}), (m:Movie {title:'V for Vendetta'})
    CREATE (lana)-[:DIRECTED]->(m)
  `);
  await session.run(`
    MATCH (lilly:Person {name:'Lilly Wachowski'}), (m:Movie {title:'Speed Racer'})
    CREATE (lilly)-[:DIRECTED]->(m)
  `);
  await session.run(`
    MATCH (lana:Person {name:'Lana Wachowski'}), (m:Movie {title:'Speed Racer'})
    CREATE (lana)-[:DIRECTED]->(m)
  `);
  
  // Create PRODUCED relationships
  await session.run(`
    MATCH (joel:Person {name:'Joel Silver'}), (m:Movie {title:'The Matrix'})
    CREATE (joel)-[:PRODUCED]->(m)
  `);
  await session.run(`
    MATCH (joel:Person {name:'Joel Silver'}), (m:Movie {title:'The Matrix Reloaded'})
    CREATE (joel)-[:PRODUCED]->(m)
  `);
  await session.run(`
    MATCH (joel:Person {name:'Joel Silver'}), (m:Movie {title:'The Matrix Revolutions'})
    CREATE (joel)-[:PRODUCED]->(m)
  `);
}

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

beforeAll(async () => {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         NornicDB vs Neo4j Performance Benchmark Suite              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  // Connect to NornicDB
  console.log(`Connecting to NornicDB at ${NORNICDB_URI}...`);
  try {
    nornicdbDriver = neo4j.driver(NORNICDB_URI, neo4j.auth.basic(NORNICDB_USER, NORNICDB_PASSWORD));
    nornicdbSession = nornicdbDriver.session();
    await nornicdbSession.run('RETURN 1');
    console.log('✓ Connected to NornicDB');
    
    console.log('Loading Movies dataset into NornicDB...');
    await loadMoviesDataset(nornicdbSession);
    const result1 = await nornicdbSession.run('MATCH (n) RETURN count(n) as count');
    console.log(`  → ${result1.records[0].get('count')} nodes created in NornicDB`);
  } catch (error) {
    console.error(`✗ Failed to connect to NornicDB: ${error}`);
  }
  
  // Connect to Neo4j
  console.log(`\nConnecting to Neo4j at ${NEO4J_URI}...`);
  try {
    neo4jDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
    neo4jSession = neo4jDriver.session();
    await neo4jSession.run('RETURN 1');
    console.log('✓ Connected to Neo4j');
    
    console.log('Loading Movies dataset into Neo4j...');
    await loadMoviesDataset(neo4jSession);
    const result2 = await neo4jSession.run('MATCH (n) RETURN count(n) as count');
    console.log(`  → ${result2.records[0].get('count')} nodes created in Neo4j`);
  } catch (error) {
    console.error(`✗ Failed to connect to Neo4j: ${error}`);
  }
  
  console.log('\n' + '─'.repeat(72) + '\n');
});

afterAll(async () => {
  console.log('\n' + '─'.repeat(72));
  console.log('Cleaning up...');
  
  if (nornicdbSession) {
    await nornicdbSession.run('MATCH (n) DETACH DELETE n').catch(() => {});
    await nornicdbSession.close();
  }
  if (nornicdbDriver) await nornicdbDriver.close();
  
  if (neo4jSession) {
    await neo4jSession.run('MATCH (n) DETACH DELETE n').catch(() => {});
    await neo4jSession.close();
  }
  if (neo4jDriver) await neo4jDriver.close();
  
  console.log('✓ Cleanup complete\n');
});

// ============================================================================
// NORNICDB BENCHMARKS
// ============================================================================

describe('NornicDB Benchmarks', () => {
  // Basic reads
  bench('Count all nodes', async () => {
    await nornicdbSession.run('MATCH (n) RETURN count(n)');
  });
  
  bench('Count all relationships', async () => {
    await nornicdbSession.run('MATCH ()-[r]->() RETURN count(r)');
  });
  
  bench('Get all movies', async () => {
    await nornicdbSession.run('MATCH (m:Movie) RETURN m.title, m.released');
  });
  
  bench('Get all people', async () => {
    await nornicdbSession.run('MATCH (p:Person) RETURN p.name, p.born');
  });
  
  // Lookup by property
  bench('Find movie by title', async () => {
    await nornicdbSession.run("MATCH (m:Movie {title: 'The Matrix'}) RETURN m");
  });
  
  bench('Find person by name', async () => {
    await nornicdbSession.run("MATCH (p:Person {name: 'Keanu Reeves'}) RETURN p");
  });
  
  // Relationship traversal (1 hop)
  bench('Actors in The Matrix', async () => {
    await nornicdbSession.run(`
      MATCH (m:Movie {title: 'The Matrix'})<-[:ACTED_IN]-(p:Person)
      RETURN p.name, m.title
    `);
  });
  
  bench('Movies Keanu acted in', async () => {
    await nornicdbSession.run(`
      MATCH (p:Person {name: 'Keanu Reeves'})-[:ACTED_IN]->(m:Movie)
      RETURN m.title, m.released
    `);
  });
  
  // Relationship traversal (2 hops)
  bench('Co-actors of Keanu', async () => {
    await nornicdbSession.run(`
      MATCH (p:Person {name: 'Keanu Reeves'})-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(coactor:Person)
      WHERE coactor <> p
      RETURN DISTINCT coactor.name
    `);
  });
  
  // Relationship traversal (3 hops)
  bench('Directors of co-actors movies', async () => {
    await nornicdbSession.run(`
      MATCH (p:Person {name: 'Keanu Reeves'})-[:ACTED_IN]->(:Movie)<-[:ACTED_IN]-(coactor:Person)
      WHERE coactor <> p
      MATCH (coactor)-[:ACTED_IN]->(m:Movie)<-[:DIRECTED]-(d:Person)
      RETURN DISTINCT d.name, m.title
      LIMIT 20
    `);
  });
  
  // Aggregations
  bench('Movies per decade', async () => {
    await nornicdbSession.run(`
      MATCH (m:Movie)
      RETURN (m.released / 10) * 10 AS decade, count(m) AS count
      ORDER BY decade
    `);
  });
  
  bench('Most prolific actors', async () => {
    await nornicdbSession.run(`
      MATCH (p:Person)-[:ACTED_IN]->(m:Movie)
      RETURN p.name, count(m) AS movies
      ORDER BY movies DESC
      LIMIT 10
    `);
  });
  
  // Complex patterns
  bench('Actor-Director pairs', async () => {
    await nornicdbSession.run(`
      MATCH (a:Person)-[:ACTED_IN]->(m:Movie)<-[:DIRECTED]-(d:Person)
      RETURN a.name, d.name, count(m) AS collaborations
      ORDER BY collaborations DESC
      LIMIT 10
    `);
  });
  
  // OPTIONAL MATCH
  bench('Movies with or without directors', async () => {
    await nornicdbSession.run(`
      MATCH (m:Movie)
      OPTIONAL MATCH (m)<-[:DIRECTED]-(d:Person)
      RETURN m.title, d.name
      LIMIT 20
    `);
  });
  
  // WITH and ORDER
  bench('Top movies by actor count', async () => {
    await nornicdbSession.run(`
      MATCH (m:Movie)<-[:ACTED_IN]-(a:Person)
      WITH m, count(a) AS actorCount
      ORDER BY actorCount DESC
      LIMIT 10
      RETURN m.title, actorCount
    `);
  });
  
  // COLLECT aggregation
  bench('Movies with cast list', async () => {
    await nornicdbSession.run(`
      MATCH (m:Movie)<-[:ACTED_IN]-(a:Person)
      RETURN m.title, collect(a.name) AS cast
      LIMIT 5
    `);
  });
  
  // Write operations
  bench('Create and delete node', async () => {
    await nornicdbSession.run(`
      CREATE (t:TestNode {name: 'temp', created: timestamp()})
      WITH t
      DELETE t
      RETURN count(t)
    `);
  });
  
  bench('Create and delete relationship', async () => {
    await nornicdbSession.run(`
      MATCH (p:Person {name: 'Keanu Reeves'}), (m:Movie {title: 'The Matrix'})
      CREATE (p)-[r:TEST_REL]->(m)
      WITH r
      DELETE r
      RETURN count(r)
    `);
  });
});

// ============================================================================
// NEO4J BENCHMARKS
// ============================================================================

describe('Neo4j Benchmarks', () => {
  // Basic reads
  bench('Count all nodes', async () => {
    await neo4jSession.run('MATCH (n) RETURN count(n)');
  });
  
  bench('Count all relationships', async () => {
    await neo4jSession.run('MATCH ()-[r]->() RETURN count(r)');
  });
  
  bench('Get all movies', async () => {
    await neo4jSession.run('MATCH (m:Movie) RETURN m.title, m.released');
  });
  
  bench('Get all people', async () => {
    await neo4jSession.run('MATCH (p:Person) RETURN p.name, p.born');
  });
  
  // Lookup by property
  bench('Find movie by title', async () => {
    await neo4jSession.run("MATCH (m:Movie {title: 'The Matrix'}) RETURN m");
  });
  
  bench('Find person by name', async () => {
    await neo4jSession.run("MATCH (p:Person {name: 'Keanu Reeves'}) RETURN p");
  });
  
  // Relationship traversal (1 hop)
  bench('Actors in The Matrix', async () => {
    await neo4jSession.run(`
      MATCH (m:Movie {title: 'The Matrix'})<-[:ACTED_IN]-(p:Person)
      RETURN p.name, m.title
    `);
  });
  
  bench('Movies Keanu acted in', async () => {
    await neo4jSession.run(`
      MATCH (p:Person {name: 'Keanu Reeves'})-[:ACTED_IN]->(m:Movie)
      RETURN m.title, m.released
    `);
  });
  
  // Relationship traversal (2 hops)
  bench('Co-actors of Keanu', async () => {
    await neo4jSession.run(`
      MATCH (p:Person {name: 'Keanu Reeves'})-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(coactor:Person)
      WHERE coactor <> p
      RETURN DISTINCT coactor.name
    `);
  });
  
  // Relationship traversal (3 hops)
  bench('Directors of co-actors movies', async () => {
    await neo4jSession.run(`
      MATCH (p:Person {name: 'Keanu Reeves'})-[:ACTED_IN]->(:Movie)<-[:ACTED_IN]-(coactor:Person)
      WHERE coactor <> p
      MATCH (coactor)-[:ACTED_IN]->(m:Movie)<-[:DIRECTED]-(d:Person)
      RETURN DISTINCT d.name, m.title
      LIMIT 20
    `);
  });
  
  // Aggregations
  bench('Movies per decade', async () => {
    await neo4jSession.run(`
      MATCH (m:Movie)
      RETURN (m.released / 10) * 10 AS decade, count(m) AS count
      ORDER BY decade
    `);
  });
  
  bench('Most prolific actors', async () => {
    await neo4jSession.run(`
      MATCH (p:Person)-[:ACTED_IN]->(m:Movie)
      RETURN p.name, count(m) AS movies
      ORDER BY movies DESC
      LIMIT 10
    `);
  });
  
  // Complex patterns
  bench('Actor-Director pairs', async () => {
    await neo4jSession.run(`
      MATCH (a:Person)-[:ACTED_IN]->(m:Movie)<-[:DIRECTED]-(d:Person)
      RETURN a.name, d.name, count(m) AS collaborations
      ORDER BY collaborations DESC
      LIMIT 10
    `);
  });
  
  // OPTIONAL MATCH
  bench('Movies with or without directors', async () => {
    await neo4jSession.run(`
      MATCH (m:Movie)
      OPTIONAL MATCH (m)<-[:DIRECTED]-(d:Person)
      RETURN m.title, d.name
      LIMIT 20
    `);
  });
  
  // WITH and ORDER
  bench('Top movies by actor count', async () => {
    await neo4jSession.run(`
      MATCH (m:Movie)<-[:ACTED_IN]-(a:Person)
      WITH m, count(a) AS actorCount
      ORDER BY actorCount DESC
      LIMIT 10
      RETURN m.title, actorCount
    `);
  });
  
  // COLLECT aggregation
  bench('Movies with cast list', async () => {
    await neo4jSession.run(`
      MATCH (m:Movie)<-[:ACTED_IN]-(a:Person)
      RETURN m.title, collect(a.name) AS cast
      LIMIT 5
    `);
  });
  
  // Write operations
  bench('Create and delete node', async () => {
    await neo4jSession.run(`
      CREATE (t:TestNode {name: 'temp', created: timestamp()})
      WITH t
      DELETE t
      RETURN count(t)
    `);
  });
  
  bench('Create and delete relationship', async () => {
    await neo4jSession.run(`
      MATCH (p:Person {name: 'Keanu Reeves'}), (m:Movie {title: 'The Matrix'})
      CREATE (p)-[r:TEST_REL]->(m)
      WITH r
      DELETE r
      RETURN count(r)
    `);
  });
});
