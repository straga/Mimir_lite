#!/usr/bin/env node

import neo4j from 'neo4j-driver';
import fetch from 'node-fetch';

const QUERY = "how do i integrate ngx-cmk-translate with ps-custom-radio-group in angular?";

async function generateEmbedding(text) {
  console.log(`\n🔮 Generating embedding for: "${text.substring(0, 80)}..."`);
  
  const response = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mxbai-embed-large',
      prompt: text
    })
  });
  
  const data = await response.json();
  console.log(`✅ Generated embedding with ${data.embedding.length} dimensions`);
  return data.embedding;
}

async function testQuery() {
  console.log('🔍 Testing RAG Query\n');
  console.log(`Query: "${QUERY}"\n`);
  
  // Generate embedding
  const embedding = await generateEmbedding(QUERY);
  
  // Extract keywords
  const keywords = QUERY.toLowerCase().split(' ').filter(w => w.length > 3);
  console.log(`🔑 Keywords: ${keywords.join(', ')}\n`);
  
  // Connect to Neo4j
  const driver = neo4j.driver(
    'neo4j://localhost:7687',
    neo4j.auth.basic('neo4j', 'password')
  );
  
  const session = driver.session();
  
  try {
    // Test with multiple thresholds
    const thresholds = [0.55, 0.4, 0.3, 0.2, 0.1];
    
    for (const threshold of thresholds) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Testing with threshold: ${threshold}`);
      console.log('='.repeat(70));
      
      const query = `
        CALL {
          // Search file chunks
          MATCH (file:File)-[:HAS_CHUNK]->(chunk:FileChunk)
          WHERE chunk.embedding IS NOT NULL
          WITH file, chunk,
               reduce(dot = 0.0, i IN range(0, size(chunk.embedding)-1) | 
                  dot + chunk.embedding[i] * $embedding[i]) AS dotProduct,
               sqrt(reduce(sum = 0.0, x IN chunk.embedding | sum + x * x)) AS normA,
               sqrt(reduce(sum = 0.0, x IN $embedding | sum + x * x)) AS normB,
               split(coalesce(file.absolute_path, file.path), '/') AS pathParts
          WITH coalesce(file.absolute_path, file.path) AS source_path, 
               file.name AS source_name, 
               chunk.text AS content, 
               chunk.start_offset AS start_offset, 
               dotProduct / (normA * normB) AS similarity, 
               'file_chunk' AS source_type, 
               pathParts,
               CASE 
                  WHEN size(pathParts) > 2 THEN pathParts[2]
                  ELSE 'unknown'
               END AS project_name
          WHERE similarity >= $minThreshold
          RETURN content, start_offset, source_path, source_name, similarity, source_type, project_name, pathParts
          
          UNION ALL
          
          // Search small files
          MATCH (file:File)
          WHERE file.embedding IS NOT NULL AND file.has_chunks = false
          WITH file,
               reduce(dot = 0.0, i IN range(0, size(file.embedding)-1) | 
                  dot + file.embedding[i] * $embedding[i]) AS dotProduct,
               sqrt(reduce(sum = 0.0, x IN file.embedding | sum + x * x)) AS normA,
               sqrt(reduce(sum = 0.0, x IN $embedding | sum + x * x)) AS normB,
               split(coalesce(file.absolute_path, file.path), '/') AS pathParts
          WITH coalesce(file.absolute_path, file.path) AS source_path, 
               file.name AS source_name, 
               file.content AS content,
               0 AS start_offset, 
               dotProduct / (normA * normB) AS similarity,
               'file' AS source_type, 
               pathParts,
               CASE 
                  WHEN size(pathParts) > 2 THEN pathParts[2]
                  ELSE 'unknown'
               END AS project_name
          WHERE similarity >= $minThreshold
          RETURN content, start_offset, source_path, source_name, similarity, source_type, project_name, pathParts
        }
        WITH content, start_offset, source_path, source_name, similarity, source_type, project_name, pathParts
        
        // Hybrid search: boost keyword matches
        WITH content, start_offset, source_path, source_name, similarity, source_type, project_name,
             CASE 
                WHEN $enableHybrid AND size($keywords) > 0 THEN
                    reduce(matches = 0, kw IN $keywords | 
                        matches + 
                        CASE WHEN toLower(coalesce(content, '')) CONTAINS kw THEN 1 ELSE 0 END +
                        CASE WHEN toLower(source_path) CONTAINS kw THEN 1 ELSE 0 END
                    ) * 0.02
                ELSE 0.0
             END AS keyword_boost
        WITH content, start_offset, source_path, source_name, 
             (similarity + keyword_boost) AS boosted_similarity,
             similarity AS original_similarity,
             source_type, project_name
        
        ORDER BY boosted_similarity DESC
        LIMIT 20
        
        RETURN source_path, source_name, original_similarity, boosted_similarity, source_type, project_name, content[0..100] as preview
      `;
      
      const result = await session.run(query, {
        embedding,
        minThreshold: threshold,
        enableHybrid: true,
        keywords
      });
      
      console.log(`\n📊 Found ${result.records.length} results`);
      
      if (result.records.length > 0) {
        const projects = new Set();
        console.log('\n🎯 Top Results:');
        result.records.slice(0, 10).forEach((record, idx) => {
          const path = record.get('source_path');
          const name = record.get('source_name');
          const origSim = record.get('original_similarity');
          const boostedSim = record.get('boosted_similarity');
          const project = record.get('project_name');
          const preview = record.get('preview') || '';
          
          projects.add(project);
          
          console.log(`\n${idx + 1}. [${project}] ${name}`);
          console.log(`   Path: ${path.substring(0, 80)}...`);
          console.log(`   Similarity: ${origSim.toFixed(4)} → Boosted: ${boostedSim.toFixed(4)}`);
          if (preview) {
            console.log(`   Preview: ${String(preview).substring(0, 100)}...`);
          }
        });
        
        console.log(`\n📁 Projects found: ${[...projects].join(', ')}`);
        
        if (projects.has('ngx-cmk-translate') && projects.has('digital-pulse-web')) {
          console.log('✅ CROSS-PROJECT MATCH FOUND!');
        } else {
          console.log(`⚠️ Missing projects - found: ${[...projects].join(', ')}`);
        }
        
        break; // Stop at first successful threshold
      } else {
        console.log(`❌ No results at threshold ${threshold}`);
      }
    }
    
  } finally {
    await session.close();
    await driver.close();
  }
}

testQuery().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
