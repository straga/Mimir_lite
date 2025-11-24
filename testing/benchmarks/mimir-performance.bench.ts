/**
 * Mimir Neo4j Graph Performance Benchmark Suite
 * 
 * Benchmarks Neo4j graph database operations:
 * 1. Vector search queries (cosine similarity, hybrid search)
 * 2. Relationship traversal (1-3 hops)
 * 3. Batch operations (bulk writes)
 * 4. Complex queries (aggregations, subgraphs)
 * 
 * Note: Uses pre-populated mock embeddings - does NOT test embedding generation
 * 
 * Run with: npm run bench
 * Results are written to: testing/benchmarks/results/
 */

import { describe, bench, beforeAll, afterAll } from 'vitest';
import neo4j, { Driver, Session } from 'neo4j-driver';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const NEO4J_URI = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const RESULTS_DIR = path.join(__dirname, 'results');

let driver: Driver;
let session: Session;

// Setup
beforeAll(async () => {
  driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  session = driver.session();
  
  // Ensure results directory exists
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  
  // Create test data
  await setupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await session.close();
  await driver.close();
});

// Test data setup
async function setupTestData() {
  console.log('Setting up test data...');
  
  // Create 1000 nodes with mock embeddings
  await session.run(`
    UNWIND range(1, 1000) AS i
    CREATE (n:BenchmarkNode {
      id: 'bench-' + toString(i),
      type: 'test',
      content: 'Test content ' + toString(i),
      value: i,
      created: timestamp()
    })
  `);
  
  // Add mock embeddings (1024 dimensions) to nodes
  // Using a deterministic pattern for reproducibility
  const batchSize = 100;
  for (let batch = 0; batch < 10; batch++) {
    const startId = batch * batchSize + 1;
    const endId = (batch + 1) * batchSize;
    
    await session.run(`
      MATCH (n:BenchmarkNode)
      WHERE toInteger(substring(n.id, 6)) >= $startId 
        AND toInteger(substring(n.id, 6)) <= $endId
      SET n.embedding = [x IN range(0, 1023) | toFloat(toInteger(substring(n.id, 6)) + x) / 2048.0]
    `, { startId, endId });
  }
  
  // Create relationships between nodes
  await session.run(`
    MATCH (n:BenchmarkNode)
    WHERE toInteger(substring(n.id, 6)) % 10 = 0
    WITH n LIMIT 100
    MATCH (m:BenchmarkNode)
    WHERE m.id <> n.id AND toInteger(substring(m.id, 6)) > toInteger(substring(n.id, 6))
    WITH n, m LIMIT 500
    CREATE (n)-[:RELATED_TO {weight: rand(), created: timestamp()}]->(m)
  `);
  
  console.log('Test data setup complete');
}

async function cleanupTestData() {
  await session.run(`
    MATCH (n:BenchmarkNode)
    DETACH DELETE n
  `);
}

// ============================================================================
// 1. VECTOR SEARCH BENCHMARKS
// ============================================================================

describe('Vector Search Performance', () => {
  bench('Vector similarity search (top 10)', async () => {
    // Generate a query embedding (mock)
    const queryEmbedding = Array.from({ length: 1024 }, (_, i) => (Math.sin(i) + 1) / 2);
    
    await session.run(`
      MATCH (n:BenchmarkNode)
      WHERE n.embedding IS NOT NULL
      WITH n, 
           reduce(dot = 0.0, i IN range(0, size(n.embedding)-1) | 
             dot + n.embedding[i] * $embedding[i]
           ) AS similarity
      ORDER BY similarity DESC
      LIMIT 10
      RETURN n.id, similarity
    `, { embedding: queryEmbedding });
  }, { iterations: 100 });

  bench('Vector similarity search (top 25)', async () => {
    const queryEmbedding = Array.from({ length: 1024 }, (_, i) => (Math.cos(i) + 1) / 2);
    
    await session.run(`
      MATCH (n:BenchmarkNode)
      WHERE n.embedding IS NOT NULL
      WITH n, 
           reduce(dot = 0.0, i IN range(0, size(n.embedding)-1) | 
             dot + n.embedding[i] * $embedding[i]
           ) AS similarity
      ORDER BY similarity DESC
      LIMIT 25
      RETURN n.id, similarity
    `, { embedding: queryEmbedding });
  }, { iterations: 100 });

  bench('Vector similarity search (top 50)', async () => {
    const queryEmbedding = Array.from({ length: 1024 }, (_, i) => Math.random());
    
    await session.run(`
      MATCH (n:BenchmarkNode)
      WHERE n.embedding IS NOT NULL
      WITH n, 
           reduce(dot = 0.0, i IN range(0, size(n.embedding)-1) | 
             dot + n.embedding[i] * $embedding[i]
           ) AS similarity
      ORDER BY similarity DESC
      LIMIT 50
      RETURN n.id, similarity
    `, { embedding: queryEmbedding });
  }, { iterations: 100 });

  bench('Vector search with filter', async () => {
    const queryEmbedding = Array.from({ length: 1024 }, (_, i) => (i % 2) / 2);
    
    await session.run(`
      MATCH (n:BenchmarkNode)
      WHERE n.embedding IS NOT NULL 
        AND n.type = 'test'
        AND n.value > 100
      WITH n, 
           reduce(dot = 0.0, i IN range(0, size(n.embedding)-1) | 
             dot + n.embedding[i] * $embedding[i]
           ) AS similarity
      ORDER BY similarity DESC
      LIMIT 25
      RETURN n.id, similarity
    `, { embedding: queryEmbedding });
  }, { iterations: 100 });
});

// ============================================================================
// 2. GRAPH TRAVERSAL BENCHMARKS
// ============================================================================

describe('Graph Traversal Performance', () => {
  bench('Node lookup by ID', async () => {
    await session.run(`
      MATCH (n:BenchmarkNode {id: 'bench-500'})
      RETURN n
    `);
  }, { iterations: 1000 });

  bench('Node lookup by property index', async () => {
    await session.run(`
      MATCH (n:BenchmarkNode)
      WHERE n.type = 'test' AND n.value > 500
      RETURN n
      LIMIT 100
    `);
  }, { iterations: 500 });

  bench('Relationship traversal (depth 1)', async () => {
    await session.run(`
      MATCH (n:BenchmarkNode)-[r:RELATED_TO]->(m)
      RETURN n.id, m.id, r.weight
      LIMIT 100
    `);
  }, { iterations: 200 });

  bench('Relationship traversal (depth 2)', async () => {
    await session.run(`
      MATCH path = (n:BenchmarkNode)-[:RELATED_TO*1..2]->(m)
      RETURN path
      LIMIT 50
    `);
  }, { iterations: 100 });

  bench('Relationship traversal (depth 3)', async () => {
    await session.run(`
      MATCH path = (n:BenchmarkNode)-[:RELATED_TO*1..3]->(m)
      RETURN path
      LIMIT 25
    `);
  }, { iterations: 50 });

  bench('Bidirectional traversal', async () => {
    await session.run(`
      MATCH (n:BenchmarkNode {id: 'bench-100'})
      MATCH (n)-[:RELATED_TO]-(connected)
      RETURN connected
      LIMIT 50
    `);
  }, { iterations: 200 });

  bench('Find shortest path', async () => {
    await session.run(`
      MATCH (start:BenchmarkNode {id: 'bench-10'})
      MATCH (end:BenchmarkNode {id: 'bench-990'})
      MATCH path = shortestPath((start)-[:RELATED_TO*..5]-(end))
      RETURN path
    `);
  }, { iterations: 50 });
});

// ============================================================================
// 3. BATCH OPERATIONS BENCHMARKS
// ============================================================================

describe('Batch Operations Performance', () => {
  bench('Batch node creation (100 nodes)', async () => {
    await session.run(`
      UNWIND range(1, 100) AS i
      CREATE (n:TempBenchNode {
        id: randomUUID(),
        value: i,
        created: timestamp()
      })
    `);
    
    // Cleanup
    await session.run(`
      MATCH (n:TempBenchNode)
      DELETE n
    `);
  }, { iterations: 50 });

  bench('Batch node creation (1000 nodes)', async () => {
    await session.run(`
      UNWIND range(1, 1000) AS i
      CREATE (n:TempBenchNode {
        id: randomUUID(),
        value: i,
        created: timestamp()
      })
    `);
    
    // Cleanup
    await session.run(`
      MATCH (n:TempBenchNode)
      DELETE n
    `);
  }, { iterations: 10 });

  bench('Batch relationship creation (100 edges)', async () => {
    await session.run(`
      MATCH (n:BenchmarkNode)
      WITH collect(n) AS nodes
      UNWIND range(0, 99) AS i
      WITH nodes[i % size(nodes)] AS n1, nodes[(i + 1) % size(nodes)] AS n2
      CREATE (n1)-[:TEMP_EDGE {weight: rand(), created: timestamp()}]->(n2)
    `);
    
    // Cleanup
    await session.run(`
      MATCH ()-[r:TEMP_EDGE]->()
      DELETE r
    `);
  }, { iterations: 50 });

  bench('Batch property update (100 nodes)', async () => {
    await session.run(`
      MATCH (n:BenchmarkNode)
      WHERE n.value <= 100
      SET n.updated = timestamp(), n.batch_updated = true
    `);
    
    // Cleanup
    await session.run(`
      MATCH (n:BenchmarkNode)
      WHERE n.batch_updated = true
      REMOVE n.updated, n.batch_updated
    `);
  }, { iterations: 100 });

  bench('Batch delete with relationships (50 nodes)', async () => {
    // Create temp nodes with relationships
    await session.run(`
      UNWIND range(1, 50) AS i
      CREATE (n:TempDeleteNode {id: 'temp-' + i})
      WITH n
      MATCH (m:BenchmarkNode)
      WHERE m.value = toInteger(n.id[5..])
      CREATE (n)-[:TEMP_REL]->(m)
    `);
    
    // Delete them
    await session.run(`
      MATCH (n:TempDeleteNode)
      DETACH DELETE n
    `);
  }, { iterations: 50 });
});

// ============================================================================
// 4. COMPLEX QUERY BENCHMARKS
// ============================================================================

describe('Complex Query Performance', () => {
  bench('Aggregation query', async () => {
    await session.run(`
      MATCH (n:BenchmarkNode)-[r:RELATED_TO]->(m)
      WITH n, count(r) AS outDegree, avg(r.weight) AS avgWeight
      WHERE outDegree > 0
      RETURN n.id, outDegree, avgWeight
      ORDER BY outDegree DESC
      LIMIT 50
    `);
  }, { iterations: 100 });

  bench('Subgraph extraction', async () => {
    await session.run(`
      MATCH (start:BenchmarkNode {id: 'bench-100'})
      CALL {
        WITH start
        MATCH path = (start)-[:RELATED_TO*1..2]-(connected)
        RETURN connected
        LIMIT 50
      }
      RETURN DISTINCT connected
    `);
  }, { iterations: 50 });

  bench('Pattern matching with multiple conditions', async () => {
    await session.run(`
      MATCH (n:BenchmarkNode)-[r:RELATED_TO]->(m:BenchmarkNode)
      WHERE n.value < 500 
        AND m.value > 500
        AND r.weight > 0.5
      RETURN n, r, m
      LIMIT 100
    `);
  }, { iterations: 100 });

  bench('Union query', async () => {
    await session.run(`
      MATCH (n:BenchmarkNode)
      WHERE n.value < 100
      RETURN n.id, n.value, 'low' AS category
      UNION
      MATCH (n:BenchmarkNode)
      WHERE n.value >= 900
      RETURN n.id, n.value, 'high' AS category
      ORDER BY value
      LIMIT 50
    `);
  }, { iterations: 100 });

  bench('Collect and unwind pattern', async () => {
    await session.run(`
      MATCH (n:BenchmarkNode)
      WHERE n.value % 100 = 0
      WITH collect(n) AS nodes
      UNWIND nodes AS node
      MATCH (node)-[:RELATED_TO]->(connected)
      RETURN node.id, collect(connected.id) AS connections
      LIMIT 25
    `);
  }, { iterations: 50 });
});

