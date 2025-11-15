#!/usr/bin/env node

import { createGraphManager } from '../build/managers/index.js';
import { EmbeddingsService } from '../build/indexing/EmbeddingsService.js';

async function regenerateEmbeddings() {
  console.log('🔄 Starting embedding regeneration...\n');
  
  const graphManager = await createGraphManager();
  const driver = graphManager.getDriver();
  const embeddingsService = new EmbeddingsService();
  
  await embeddingsService.initialize();
  
  if (!embeddingsService.isEnabled()) {
    console.error('❌ Embeddings service is not enabled. Check your LLM configuration.');
    process.exit(1);
  }
  
  const session = driver.session();
  
  try {
    // Find all nodes marked for embedding regeneration
    const result = await session.run(`
      MATCH (n:Node)
      WHERE n.needs_embedding = true OR n.embedding_model = 'nomic-embed-text'
      RETURN n.id as id, n.type as type, n.title as title, n.content as content, n.text as text
    `);
    
    const nodes = result.records.map(r => ({
      id: r.get('id'),
      type: r.get('type'),
      title: r.get('title'),
      content: r.get('content'),
      text: r.get('text')
    }));
    
    console.log(`📊 Found ${nodes.length} nodes needing embedding regeneration\n`);
    
    if (nodes.length === 0) {
      console.log('✅ No nodes need embedding regeneration');
      return;
    }
    
    for (const node of nodes) {
      console.log(`\n🔨 Processing: ${node.type} - ${node.id}`);
      if (node.title) console.log(`   Title: ${node.title.substring(0, 60)}`);
      
      // Get text content for embedding
      let textContent = node.content || node.text || node.title || '';
      
      if (!textContent) {
        console.log('   ⚠️  No text content found, skipping');
        continue;
      }
      
      try {
        // Generate new embedding with mxbai-embed-large
        const embeddingResult = await embeddingsService.generateEmbedding(textContent);
        
        console.log(`   ✅ Generated embedding (${embeddingResult.dimensions} dims, ${embeddingResult.model})`);
        
        // Update node with new embedding
        await session.run(`
          MATCH (n:Node {id: $id})
          SET n.embedding = $embedding,
              n.embedding_model = $model,
              n.embedding_dimensions = $dimensions,
              n.has_embedding = true
          REMOVE n.needs_embedding
        `, {
          id: node.id,
          embedding: embeddingResult.embedding,
          model: embeddingResult.model,
          dimensions: embeddingResult.dimensions
        });
        
        console.log(`   💾 Updated node in database`);
        
      } catch (error) {
        console.error(`   ❌ Failed to regenerate embedding: ${error.message}`);
      }
    }
    
    console.log('\n\n✅ Embedding regeneration complete!');
    
    // Show final statistics
    const statsResult = await session.run(`
      MATCH (n:Node)
      WHERE n.embedding_model IS NOT NULL
      RETURN n.embedding_model as model, count(n) as count
      ORDER BY model
    `);
    
    console.log('\n📊 Final embedding statistics:');
    statsResult.records.forEach(r => {
      console.log(`   ${r.get('model')}: ${r.get('count')} nodes`);
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
