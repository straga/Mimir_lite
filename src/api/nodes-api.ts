/**
 * Nodes API - Manage non-file nodes in Neo4j
 * Provides endpoints for browsing, viewing, and deleting nodes
 */

import { Router, Request, Response } from 'express';
import neo4j from 'neo4j-driver';

const router = Router();

/**
 * GET /api/nodes/types
 * Get all node types (excluding file/chunk types)
 */
router.get('/types', async (req: Request, res: Response) => {
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'password'
    )
  );

  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (n:Node)
      WHERE n.type IS NOT NULL
        AND n.type <> 'file'
        AND n.type <> 'file_chunk'
        AND n.type <> 'node_chunk'
      WITH DISTINCT n.type as nodeType
      MATCH (n:Node {type: nodeType})
      RETURN 
        nodeType,
        count(n) as nodeCount
      ORDER BY nodeType ASC
    `);

    const types = result.records.map(record => ({
      type: record.get('nodeType'),
      count: record.get('nodeCount').toInt()
    }));

    res.json({ types });
  } catch (error: any) {
    console.error('❌ Error fetching node types:', error);
    res.status(500).json({
      error: 'Failed to fetch node types',
      details: error.message
    });
  } finally {
    await session.close();
    await driver.close();
  }
});

/**
 * GET /api/nodes/vector-search
 * Vector search across nodes (excluding files and chunks)
 */
router.get('/vector-search', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const minSimilarity = parseFloat(req.query.min_similarity as string) || 0.75;
    const depth = parseInt(req.query.depth as string, 10) || 1;
    const typesParam = req.query.types as string;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Parse types
    let types: string[] | undefined;
    if (typesParam) {
      types = typesParam.split(',').map(t => t.trim());
    }

    // Import GraphManager and handleVectorSearchNodes
    const { GraphManager } = await import('../managers/GraphManager.js');
    const { handleVectorSearchNodes } = await import('../tools/vectorSearch.tools.js');
    
    const graphManager = new GraphManager(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'password'
    );

    // Use the same tool handler as chat API for consistency
    const results = await handleVectorSearchNodes(
      {
        query,
        types,
        limit,
        min_similarity: minSimilarity,
        depth
      },
      graphManager.getDriver()
    );

    res.json({
      query,
      results: results.results,
      count: results.results.length,
      total_results: results.total_results
    });
  } catch (error: any) {
    console.error('❌ Error in vector search:', error);
    res.status(500).json({
      error: 'Vector search failed',
      details: error.message
    });
  }
});

/**
 * GET /api/nodes/types/:type
 * Get paginated list of nodes of a specific type
 */
router.get('/types/:type', async (req: Request, res: Response) => {
  const { type } = req.params;
  const page = Math.floor(parseInt(req.query.page as string, 10)) || 1;
  const limit = Math.floor(parseInt(req.query.limit as string, 10)) || 20;
  const skip = (page - 1) * limit;

  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'password'
    )
  );

  const session = driver.session();

  try {
    // Get total count
    const countResult = await session.run(
      `
      MATCH (n:Node {type: $type})
      RETURN count(n) as total
      `,
      { type }
    );

    const total = countResult.records[0].get('total').toInt();

    // Get paginated nodes with edge counts and embedding counts
    const result = await session.run(
      `
      MATCH (n:Node {type: $type})
      OPTIONAL MATCH (n)-[r]-()
      OPTIONAL MATCH (n)-[:HAS_CHUNK]->(chunk:NodeChunk)
      WITH n, 
           count(DISTINCT r) as edgeCount,
           count(DISTINCT chunk) as chunkCount,
           CASE WHEN n.embedding IS NOT NULL THEN 1 ELSE 0 END as hasDirectEmbedding
      WITH n,
           edgeCount,
           CASE 
             WHEN n.has_chunks = true THEN chunkCount
             WHEN hasDirectEmbedding = 1 THEN 1
             ELSE 0
           END as embeddingCount
      RETURN 
        n.id as id,
        n.type as type,
        COALESCE(n.title, n.name, n.id) as displayName,
        n.created as created,
        n.updated as updated,
        edgeCount,
        embeddingCount,
        properties(n) as properties
      ORDER BY n.updated DESC, n.created DESC
      SKIP $skip
      LIMIT $limit
      `,
      { type, skip: neo4j.int(skip), limit: neo4j.int(limit) }
    );

    const nodes = result.records.map(record => ({
      id: record.get('id'),
      type: record.get('type'),
      displayName: record.get('displayName'),
      created: record.get('created'),
      updated: record.get('updated'),
      edgeCount: record.get('edgeCount').toInt(),
      embeddingCount: record.get('embeddingCount').toInt(),
      properties: record.get('properties')
    }));

    res.json({
      nodes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error(`❌ Error fetching nodes of type ${type}:`, error);
    res.status(500).json({
      error: `Failed to fetch nodes of type ${type}`,
      details: error.message
    });
  } finally {
    await session.close();
    await driver.close();
  }
});

/**
 * GET /api/nodes/types/:type/:id/details
 * Get detailed information about a specific node including edges
 */
router.get('/types/:type/:id/details', async (req: Request, res: Response) => {
  const { type, id } = req.params;

  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'password'
    )
  );

  const session = driver.session();

  try {
    // Get node properties
    const nodeResult = await session.run(
      `
      MATCH (n:Node {id: $id, type: $type})
      RETURN properties(n) as properties
      `,
      { id, type }
    );

    if (nodeResult.records.length === 0) {
      await session.close();
      await driver.close();
      return res.status(404).json({ error: 'Node not found' });
    }

    const properties = nodeResult.records[0].get('properties');

    // Get outgoing edges
    const outgoingResult = await session.run(
      `
      MATCH (n:Node {id: $id})-[r]->(target)
      RETURN 
        type(r) as relationshipType,
        target.id as targetId,
        target.type as targetType,
        COALESCE(target.title, target.name, target.id) as targetName,
        properties(r) as edgeProperties
      ORDER BY relationshipType, targetName
      `,
      { id }
    );

    const outgoing = outgoingResult.records.map(record => ({
      type: record.get('relationshipType'),
      targetId: record.get('targetId'),
      targetType: record.get('targetType'),
      targetName: record.get('targetName'),
      properties: record.get('edgeProperties')
    }));

    // Get incoming edges
    const incomingResult = await session.run(
      `
      MATCH (source)-[r]->(n:Node {id: $id})
      RETURN 
        type(r) as relationshipType,
        source.id as sourceId,
        source.type as sourceType,
        COALESCE(source.title, source.name, source.id) as sourceName,
        properties(r) as edgeProperties
      ORDER BY relationshipType, sourceName
      `,
      { id }
    );

    const incoming = incomingResult.records.map(record => ({
      type: record.get('relationshipType'),
      sourceId: record.get('sourceId'),
      sourceType: record.get('sourceType'),
      sourceName: record.get('sourceName'),
      properties: record.get('edgeProperties')
    }));

    res.json({
      node: {
        id,
        type,
        properties
      },
      edges: {
        outgoing,
        incoming,
        total: outgoing.length + incoming.length
      }
    });
  } catch (error: any) {
    console.error(`❌ Error fetching node details for ${id}:`, error);
    res.status(500).json({
      error: 'Failed to fetch node details',
      details: error.message
    });
  } finally {
    await session.close();
    await driver.close();
  }
});

/**
 * DELETE /api/nodes/:id
 * Delete a node and all its edges
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'password'
    )
  );

  const session = driver.session();

  try {
    // First, get node info for logging
    const nodeResult = await session.run(
      `
      MATCH (n:Node {id: $id})
      RETURN n.type as type, COALESCE(n.title, n.name, n.id) as name
      `,
      { id }
    );

    if (nodeResult.records.length === 0) {
      await session.close();
      await driver.close();
      return res.status(404).json({ error: 'Node not found' });
    }

    const nodeType = nodeResult.records[0].get('type');
    const nodeName = nodeResult.records[0].get('name');

    // Delete node and all its edges
    const deleteResult = await session.run(
      `
      MATCH (n:Node {id: $id})
      OPTIONAL MATCH (n)-[r]-()
      WITH n, count(DISTINCT r) as edgeCount
      DETACH DELETE n
      RETURN edgeCount
      `,
      { id }
    );

    const edgeCount = deleteResult.records[0].get('edgeCount').toInt();

    console.log(`🗑️  Deleted node ${id} (${nodeType}: ${nodeName}) and ${edgeCount} edges`);

    res.json({
      success: true,
      message: `Node deleted successfully`,
      deleted: {
        id,
        type: nodeType,
        name: nodeName,
        edgesRemoved: edgeCount
      }
    });
  } catch (error: any) {
    console.error(`❌ Error deleting node ${id}:`, error);
    res.status(500).json({
      error: 'Failed to delete node',
      details: error.message
    });
  } finally {
    await session.close();
    await driver.close();
  }
});

/**
 * POST /api/nodes/:id/embeddings
 * Generate or regenerate embeddings for a specific node
 */
router.post('/:id/embeddings', async (req: Request, res: Response) => {
  const { id } = req.params;

  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'password'
    )
  );

  const session = driver.session();

  try {
    // Import GraphManager to use its embedding generation logic
    const { GraphManager } = await import('../managers/GraphManager.js');
    const graphManager = new GraphManager(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'password'
    );

    // Get the node
    const nodeResult = await session.run(
      `MATCH (n:Node {id: $id}) RETURN n`,
      { id }
    );

    if (nodeResult.records.length === 0) {
      await driver.close();
      return res.status(404).json({ error: 'Node not found' });
    }

    const node = nodeResult.records[0].get('n').properties;

    console.log(`🔄 Generating embeddings for node ${id} (${node.type})...`);

    // Use GraphManager's private method to generate embeddings
    await (graphManager as any).generateEmbeddingsForNode(id, node);

    // Count embeddings after generation
    const countResult = await session.run(
      `
      MATCH (n:Node {id: $id})
      OPTIONAL MATCH (n)-[:HAS_CHUNK]->(chunk:NodeChunk)
      WITH n, 
           count(DISTINCT chunk) as chunkCount,
           CASE WHEN n.embedding IS NOT NULL THEN 1 ELSE 0 END as hasDirectEmbedding
      RETURN CASE 
        WHEN n.has_chunks = true THEN chunkCount
        WHEN hasDirectEmbedding = 1 THEN 1
        ELSE 0
      END as embeddingCount
      `,
      { id }
    );

    const embeddingCount = countResult.records[0].get('embeddingCount').toInt();

    console.log(`✅ Generated ${embeddingCount} embeddings for node ${id}`);

    res.json({
      success: true,
      message: `Generated ${embeddingCount} embedding${embeddingCount !== 1 ? 's' : ''}`,
      embeddingCount
    });
  } catch (error: any) {
    console.error('❌ Error generating embeddings:', error);
    res.status(500).json({
      error: 'Failed to generate embeddings',
      details: error.message
    });
  } finally {
    await session.close();
    await driver.close();
  }
});

export default router;
