#!/usr/bin/env node
/**
 * Export Neo4j Data to JSON for NornicDB Testing
 * 
 * Usage:
 *   node scripts/export-neo4j-to-json.mjs [output-dir]
 * 
 * Examples:
 *   node scripts/export-neo4j-to-json.mjs
 *   node scripts/export-neo4j-to-json.mjs ./data/nornicdb
 * 
 * Environment Variables:
 *   NEO4J_URI - Neo4j connection URI (default: bolt://localhost:7687)
 *   NEO4J_USER - Neo4j username (default: neo4j)
 *   NEO4J_PASSWORD - Neo4j password (default: password)
 * 
 * Output Files:
 *   - nodes.json - All nodes with properties and labels (no embeddings)
 *   - embeddings.jsonl - Vector embeddings (JSON Lines format)
 *   - relationships.json - All relationships with properties
 *   - metadata.json - Database statistics and indexes
 */

import neo4j from 'neo4j-driver';
import fs from 'fs';
import path from 'path';

// Configuration
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const OUTPUT_DIR = process.argv[2] || './data/nornicdb';
const BATCH_SIZE = 1000; // Process in batches to avoid memory issues

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Convert Neo4j Integer to regular number
 */
function toNumber(value) {
  if (neo4j.isInt(value)) {
    return value.toNumber();
  }
  return value;
}

/**
 * Serialize node properties, handling special types
 */
function serializeProperties(props, excludeEmbedding = false) {
  const result = {};
  for (const [key, value] of Object.entries(props)) {
    if (excludeEmbedding && key === 'embedding') {
      continue;
    }
    if (value === null || value === undefined) {
      result[key] = null;
    } else if (neo4j.isInt(value)) {
      result[key] = value.toNumber();
    } else if (Array.isArray(value)) {
      // Handle arrays (including embedding vectors)
      result[key] = value.map(v => neo4j.isInt(v) ? v.toNumber() : v);
    } else if (typeof value === 'object' && value.constructor.name === 'Date') {
      result[key] = value.toISOString();
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Export all nodes with streaming
 */
async function exportNodes(session, outputDir) {
  console.log('📦 Exporting nodes...');
  
  // Count total nodes first
  const countResult = await session.run(`MATCH (n) RETURN count(n) as total`);
  const totalNodes = toNumber(countResult.records[0].get('total'));
  console.log(`   Total nodes: ${totalNodes}`);

  // Open file streams
  const nodesPath = path.join(outputDir, 'nodes.json');
  const embeddingsPath = path.join(outputDir, 'embeddings.jsonl');
  
  const nodesStream = fs.createWriteStream(nodesPath);
  const embeddingsStream = fs.createWriteStream(embeddingsPath);
  
  nodesStream.write('[\n');
  
  let processedCount = 0;
  let embeddingCount = 0;
  let firstNode = true;
  const labelCounts = {};

  // Process in batches
  for (let skip = 0; skip < totalNodes; skip += BATCH_SIZE) {
    const result = await session.run(`
      MATCH (n)
      RETURN 
        elementId(n) as elementId,
        id(n) as legacyId,
        labels(n) as labels,
        properties(n) as properties
      ORDER BY id(n)
      SKIP $skip
      LIMIT $limit
    `, { skip: neo4j.int(skip), limit: neo4j.int(BATCH_SIZE) });

    for (const record of result.records) {
      const elementId = record.get('elementId');
      const legacyId = toNumber(record.get('legacyId'));
      const labels = record.get('labels');
      const rawProps = record.get('properties');
      
      // Extract embedding if exists
      const embedding = rawProps.embedding;
      if (embedding && Array.isArray(embedding)) {
        const embeddingData = {
          nodeId: rawProps.id || elementId,
          elementId: elementId,
          legacyId: legacyId,
          embedding: embedding.map(v => neo4j.isInt(v) ? v.toNumber() : v),
          dimensions: embedding.length
        };
        embeddingsStream.write(JSON.stringify(embeddingData) + '\n');
        embeddingCount++;
      }

      // Write node (without embedding)
      const node = {
        elementId,
        legacyId,
        labels,
        properties: serializeProperties(rawProps, true) // exclude embedding
      };
      
      if (!firstNode) {
        nodesStream.write(',\n');
      }
      nodesStream.write('  ' + JSON.stringify(node));
      firstNode = false;

      // Track label counts
      const label = labels[0] || 'Unknown';
      labelCounts[label] = (labelCounts[label] || 0) + 1;
      
      processedCount++;
    }

    // Progress update
    const percent = Math.round((processedCount / totalNodes) * 100);
    process.stdout.write(`\r   Processing: ${processedCount}/${totalNodes} (${percent}%)`);
  }

  nodesStream.write('\n]');
  nodesStream.end();
  embeddingsStream.end();

  console.log(''); // New line after progress
  console.log('   Node breakdown:');
  Object.entries(labelCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([label, count]) => {
      console.log(`     - ${label}: ${count}`);
    });

  return { 
    count: processedCount, 
    embeddingCount,
    labelCounts 
  };
}

/**
 * Export all relationships
 */
async function exportRelationships(session, outputDir) {
  console.log('🔗 Exporting relationships...');
  
  // Count total relationships first
  const countResult = await session.run(`MATCH ()-[r]->() RETURN count(r) as total`);
  const totalRels = toNumber(countResult.records[0].get('total'));
  console.log(`   Total relationships: ${totalRels}`);

  const relsPath = path.join(outputDir, 'relationships.json');
  const relsStream = fs.createWriteStream(relsPath);
  relsStream.write('[\n');

  let processedCount = 0;
  let firstRel = true;
  const typeCounts = {};

  // Process in batches
  for (let skip = 0; skip < totalRels; skip += BATCH_SIZE) {
    const result = await session.run(`
      MATCH (a)-[r]->(b)
      RETURN 
        elementId(r) as elementId,
        id(r) as legacyId,
        type(r) as type,
        elementId(a) as sourceElementId,
        elementId(b) as targetElementId,
        id(a) as sourceLegacyId,
        id(b) as targetLegacyId,
        properties(r) as properties
      ORDER BY id(r)
      SKIP $skip
      LIMIT $limit
    `, { skip: neo4j.int(skip), limit: neo4j.int(BATCH_SIZE) });

    for (const record of result.records) {
      const rel = {
        elementId: record.get('elementId'),
        legacyId: toNumber(record.get('legacyId')),
        type: record.get('type'),
        source: {
          elementId: record.get('sourceElementId'),
          legacyId: toNumber(record.get('sourceLegacyId'))
        },
        target: {
          elementId: record.get('targetElementId'),
          legacyId: toNumber(record.get('targetLegacyId'))
        },
        properties: serializeProperties(record.get('properties'))
      };

      if (!firstRel) {
        relsStream.write(',\n');
      }
      relsStream.write('  ' + JSON.stringify(rel));
      firstRel = false;

      typeCounts[rel.type] = (typeCounts[rel.type] || 0) + 1;
      processedCount++;
    }

    const percent = Math.round((processedCount / totalRels) * 100);
    process.stdout.write(`\r   Processing: ${processedCount}/${totalRels} (${percent}%)`);
  }

  relsStream.write('\n]');
  relsStream.end();

  console.log('');
  console.log('   Relationship breakdown:');
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`     - ${type}: ${count}`);
    });

  return { count: processedCount, typeCounts };
}

/**
 * Export index information
 */
async function exportIndexes(session) {
  console.log('📇 Exporting indexes...');
  
  const result = await session.run(`SHOW INDEXES`);
  
  const indexes = result.records.map(record => ({
    name: record.get('name'),
    type: record.get('type'),
    entityType: record.get('entityType'),
    labelsOrTypes: record.get('labelsOrTypes'),
    properties: record.get('properties'),
    state: record.get('state')
  }));

  console.log(`   Found ${indexes.length} indexes`);
  indexes.forEach(idx => {
    console.log(`     - ${idx.name} (${idx.type}): ${idx.labelsOrTypes?.join(', ') || 'N/A'}`);
  });

  return indexes;
}

/**
 * Export constraints
 */
async function exportConstraints(session) {
  console.log('🔒 Exporting constraints...');
  
  try {
    const result = await session.run(`SHOW CONSTRAINTS`);
    
    const constraints = result.records.map(record => ({
      name: record.get('name'),
      type: record.get('type'),
      entityType: record.get('entityType'),
      labelsOrTypes: record.get('labelsOrTypes'),
      properties: record.get('properties')
    }));

    console.log(`   Found ${constraints.length} constraints`);
    return constraints;
  } catch (error) {
    console.log('   No constraints found or not supported');
    return [];
  }
}

/**
 * Main export function
 */
async function main() {
  console.log('🚀 Neo4j to JSON Export for NornicDB');
  console.log('=====================================');
  console.log(`   URI: ${NEO4J_URI}`);
  console.log(`   User: ${NEO4J_USER}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log('');

  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
  );

  const session = driver.session();

  try {
    // Export all data
    const nodesResult = await exportNodes(session, OUTPUT_DIR);
    const relsResult = await exportRelationships(session, OUTPUT_DIR);
    const indexes = await exportIndexes(session);
    const constraints = await exportConstraints(session);

    // Prepare metadata
    const metadata = {
      exportDate: new Date().toISOString(),
      source: {
        uri: NEO4J_URI,
        user: NEO4J_USER
      },
      statistics: {
        totalNodes: nodesResult.count,
        totalRelationships: relsResult.count,
        totalEmbeddings: nodesResult.embeddingCount,
        totalIndexes: indexes.length,
        totalConstraints: constraints.length,
        nodesByLabel: nodesResult.labelCounts,
        relationshipsByType: relsResult.typeCounts
      },
      indexes,
      constraints
    };

    // Write metadata
    console.log('');
    console.log('💾 Writing metadata...');
    const metaPath = path.join(OUTPUT_DIR, 'metadata.json');
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
    console.log(`   ✅ ${metaPath}`);

    // Summary
    console.log('');
    console.log('📊 Export Summary');
    console.log('=================');
    console.log(`   Nodes: ${nodesResult.count}`);
    console.log(`   Relationships: ${relsResult.count}`);
    console.log(`   Embeddings: ${nodesResult.embeddingCount}`);
    console.log(`   Indexes: ${indexes.length}`);
    console.log(`   Constraints: ${constraints.length}`);
    console.log('');
    console.log('✅ Export complete!');
    console.log('');
    console.log('📁 Output files:');
    console.log(`   ${OUTPUT_DIR}/`);
    console.log('   ├── nodes.json         # Nodes without embeddings');
    console.log('   ├── embeddings.jsonl   # Vector embeddings (JSON Lines)');
    console.log('   ├── relationships.json # All relationships');
    console.log('   └── metadata.json      # Statistics and indexes');

  } catch (error) {
    console.error('');
    console.error('❌ Export failed:', error.message);
    if (error.code === 'ServiceUnavailable') {
      console.error('   Make sure Neo4j is running: docker-compose up -d neo4j');
    }
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch(console.error);
