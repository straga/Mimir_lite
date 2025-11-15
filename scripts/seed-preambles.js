#!/usr/bin/env node

/**
 * Seed Script: Import Agent Preambles into Neo4j
 * 
 * Reads preamble markdown files from docs/agents/v2 and creates
 * preamble nodes in the Mimir knowledge graph.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import neo4j from 'neo4j-driver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'memorybank';

const PREAMBLES_DIR = path.join(__dirname, '../docs/agents/v2');

// Preamble file mappings
const PREAMBLE_FILES = [
  {
    file: '00-ecko-preamble.md',
    name: 'Ecko (Prompt Architect)',
    agentType: 'worker',
    version: '2.0',
  },
  {
    file: '01-pm-preamble.md',
    name: 'PM (Project Manager)',
    agentType: 'worker',
    version: '2.0',
  },
  {
    file: '02-agentinator-preamble.md',
    name: 'Agentinator (Preamble Generator)',
    agentType: 'worker',
    version: '2.1',
  },
  {
    file: '03-final-report-preamble.md',
    name: 'Final Report Synthesizer',
    agentType: 'worker',
    version: '2.0',
  },
  {
    file: 'templates/worker-template.md',
    name: 'Generic Worker Template',
    agentType: 'worker',
    version: '2.0',
  },
  {
    file: 'templates/qc-template.md',
    name: 'Generic QC Template',
    agentType: 'qc',
    version: '2.0',
  },
];

async function extractRole(content) {
  // Extract role from the first heading or description
  const roleMatch = content.match(/##\s+.*?ROLE.*?\n\n(.*?)(?=\n\n|$)/s);
  if (roleMatch) {
    return roleMatch[1].trim().replace(/\*\*/g, '').substring(0, 200);
  }
  
  // Fallback: extract first paragraph after title
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#') && !line.startsWith('**')) {
      return line.substring(0, 200);
    }
  }
  
  return 'Agent preamble for task execution';
}

async function seedPreambles() {
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session();

  try {
    console.log('🌱 Starting preamble seeding...\n');

    for (const preamble of PREAMBLE_FILES) {
      const filePath = path.join(PREAMBLES_DIR, preamble.file);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const role = await extractRole(content);

        // Create preamble node
        const result = await session.run(`
          MERGE (p:Node {id: $id})
          ON CREATE SET
            p.type = 'preamble',
            p.name = $name,
            p.role = $role,
            p.agentType = $agentType,
            p.content = $content,
            p.version = $version,
            p.created = datetime(),
            p.sourceFile = $sourceFile,
            p.generatedBy = 'seed-script'
          ON MATCH SET
            p.content = $content,
            p.role = $role,
            p.version = $version
          RETURN p
        `, {
          id: `preamble-${preamble.file.replace(/[^a-z0-9]/gi, '-')}`,
          name: preamble.name,
          role,
          agentType: preamble.agentType,
          content,
          version: preamble.version,
          sourceFile: preamble.file,
        });

        console.log(`✅ Seeded: ${preamble.name} (${preamble.agentType})`);
        console.log(`   Role: ${role.substring(0, 80)}...`);
        console.log(`   Node ID: ${result.records[0].get('p').properties.id}\n`);
      } catch (error) {
        console.error(`❌ Failed to seed ${preamble.file}:`, error.message);
      }
    }

    // Create index on preamble type if not exists
    await session.run(`
      CREATE INDEX node_type_index IF NOT EXISTS FOR (n:Node) ON (n.type)
    `);

    console.log('✨ Preamble seeding complete!');
    console.log(`📊 Seeded ${PREAMBLE_FILES.length} preambles`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run seeding
seedPreambles().catch(console.error);
