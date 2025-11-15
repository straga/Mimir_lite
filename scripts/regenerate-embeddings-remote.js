#!/usr/bin/env node

import neo4j from 'neo4j-driver';
import { EmbeddingsService } from '../build/indexing/EmbeddingsService.js';

async function regenerateEmbeddings() {
  console.log('🔄 Starting embedding regeneration (REMOTE)...\n');
  
  // Get Neo4j connection details from environment or defaults
  const NEO4J_URI = process.env.NEO4J_URI || 'neo4j://192.168.1.167:7687';
  const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
  const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
  
  console.log(`📡 Connecting to: ${NEO4J_URI}`);
  console.log(`👤 User: ${NEO4J_USER}\n`);
  
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
  );
  
  const embeddingsService = new EmbeddingsService();
  await embeddingsService.initialize();
  
  if (!embeddingsService.isEnabled()) {
    console.error('❌ Embeddings service is not enabled. Check your LLM configuration.');
    await driver.close();
    process.exit(1);
  }
  
  const session = driver.session({ database: 'neo4j' });
  
  try {
    // Find all nodes marked for embedding regeneration
    const result = await session.run(`
      MATCH (n)
      WHERE n.needs_embedding = true OR n.embedding_model = 'nomic-embed-text'
      RETURN id(n) as nodeId, n.id as id, n.type as type, n.title as title, n.content as content, n.text as text, n.name as name, n.filePath as filePath, n.fileName as fileName
    `);
    
    const nodes = result.records.map(r => ({
      nodeId: r.get('nodeId').toNumber(),
      id: r.get('id'),
      type: r.get('type'),
      title: r.get('title'),
      name: r.get('name'),
      content: r.get('content'),
      text: r.get('text'),
      filePath: r.get('filePath'),
      fileName: r.get('fileName')
    }));
    
    console.log(`📊 Found ${nodes.length} nodes needing embedding regeneration\n`);
    
    if (nodes.length === 0) {
      console.log('✅ No nodes need embedding regeneration');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const node of nodes) {
      const identifier = node.id || `internal-${node.nodeId}`;
      console.log(`\n🔨 Processing: ${node.type} - ${identifier}`);
      const displayName = node.title || node.name || node.fileName || node.filePath || identifier;
      console.log(`   Name: ${displayName ? displayName.substring(0, 80) : 'unnamed'}`);
      
      // Get text content for embedding - file_chunk uses 'text' property
      let textContent = node.text || node.content || node.title || node.name || '';
      
      if (!textContent) {
        console.log('   ⚠️  No text content found, skipping');
        failCount++;
        continue;
      }
      
      try {
        // Generate new embedding with mxbai-embed-large
        const embeddingResult = await embeddingsService.generateEmbedding(textContent);
        
        console.log(`   ✅ Generated embedding (${embeddingResult.dimensions} dims, ${embeddingResult.model})`);
        
        // Update node with new embedding (using internal node ID for file_chunk nodes without id property)
        const updateQuery = node.id 
          ? `MATCH (n {id: $id})
             SET n.embedding = $embedding,
                 n.embedding_model = $model,
                 n.embedding_dimensions = $dimensions,
                 n.has_embedding = true
             REMOVE n.needs_embedding`
          : `MATCH (n)
             WHERE id(n) = $nodeId
             SET n.embedding = $embedding,
                 n.embedding_model = $model,
                 n.embedding_dimensions = $dimensions,
                 n.has_embedding = true
             REMOVE n.needs_embedding`;
        
        await session.run(updateQuery, {
          id: node.id,
          nodeId: node.nodeId,
          embedding: embeddingResult.embedding,
          model: embeddingResult.model,
          dimensions: embeddingResult.dimensions
        });
        
        console.log(`   💾 Updated node in database`);
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Failed to regenerate embedding: ${error.message}`);
        failCount++;
      }
    }
    
    console.log('\n\n✅ Embedding regeneration complete!');
    console.log(`   ✅ Success: ${successCount} nodes`);
    if (failCount > 0) {
      console.log(`   ❌ Failed: ${failCount} nodes`);
    }
    
    // Show final statistics
    const statsResult = await session.run(`
      MATCH (n:Node)
      WHERE n.embedding_model IS NOT NULL
      RETURN n.embedding_model as model, count(n) as count
      ORDER BY model
    `);
    
    console.log('\n📊 Final embedding statistics:');
    statsResult.records.forEach(r => {
      console.log(`   ${r.get('model')}: ${r.get('count').toNumber()} nodes`);
    });
    
  } finally {
    await session.close();
    await driver.close();
  }
}

regenerateEmbeddings().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
