/**
 * @file src/tools/vectorSearch.tools.ts
 * @description Vector search MCP tools for semantic file search
 * Now uses UnifiedSearchService for automatic fallback to full-text search
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Driver } from 'neo4j-driver';
import { UnifiedSearchService } from '../managers/UnifiedSearchService.js';

export function createVectorSearchTools(driver: Driver): Tool[] {
  return [
    // ========================================================================
    // vector_search_nodes
    // ========================================================================
    {
      name: 'vector_search_nodes',
      description: 'Semantic search across all nodes using vector embeddings (with automatic fallback to full-text search). Returns nodes most similar to the query by MEANING (not exact text match). If embeddings are disabled or no results found, automatically falls back to keyword search. For files, searches individual chunks and returns parent file context. Use this to find related concepts, similar problems, or relevant context when you don\'t know exact keywords. Works with todos, memories, file chunks, and all other node types. Supports multi-hop graph traversal via depth parameter.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language search query (e.g., "authentication code", "database connections", "pending tasks")'
          },
          types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional: Filter by node types (e.g., ["todo", "memory", "file", "file_chunk"]). If not provided, searches all types.'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 10)',
            default: 10
          },
          min_similarity: {
            type: 'number',
            description: 'Minimum cosine similarity threshold 0-1 (default: 0.75)',
            default: 0.75
          },
          depth: {
            type: 'number',
            description: 'Graph traversal depth for multi-hop search (1-3). At depth 1 (default), returns only direct matches. At depth 2+, also fetches connected nodes via relationships. Higher depth = wider context but more results.',
            default: 1,
            minimum: 1,
            maximum: 3
          }
        },
        required: ['query']
      }
    },

    // ========================================================================
    // get_embedding_stats
    // ========================================================================
    {
      name: 'get_embedding_stats',
      description: 'Get statistics about nodes with embeddings, broken down by type',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
  ];
}

/**
 * Handle vector_search_nodes tool call
 * Uses UnifiedSearchService for automatic fallback
 * Supports multi-hop graph traversal when depth > 1
 */
export async function handleVectorSearchNodes(
  params: any,
  driver: Driver
): Promise<any> {
  const searchService = new UnifiedSearchService(driver);
  await searchService.initialize();
  
  try {
    const depth = Math.max(1, Math.min(3, params.depth || 1)); // Clamp 1-3
    const limit = params.limit || 10;
    
    // Initial vector search
    const result = await searchService.search(params.query, {
      types: params.types,
      limit,
      minSimilarity: params.min_similarity || 0.5,
      offset: 0
    });
    
    // If depth > 1, perform multi-hop graph traversal
    if (depth > 1 && result.results && result.results.length > 0) {
      const session = driver.session();
      try {
        // Get connected nodes for top results (up to 5 to avoid explosion)
        const topResults = result.results.slice(0, Math.min(5, result.results.length));
        const nodeIds = topResults.map((r: any) => r.id);
        
        // Multi-hop traversal query
        const traversalResult = await session.run(
          `
          MATCH (start:Node)
          WHERE start.id IN $nodeIds
          CALL apoc.path.subgraphNodes(start, {
            maxLevel: $maxDepth,
            relationshipFilter: "EDGE",
            labelFilter: "+Node"
          })
          YIELD node
          WHERE node.id <> start.id
          RETURN DISTINCT 
            node.id as id,
            node.type as type,
            node.title as title,
            node.content as content,
            labels(node) as labels,
            properties(node) as props
          LIMIT $expandLimit
          `,
          { 
            nodeIds, 
            maxDepth: depth - 1,
            expandLimit: limit * 2 // Fetch more connected nodes
          }
        );
        
        // Format connected nodes
        const connectedNodes = traversalResult.records.map(record => ({
          id: record.get('id'),
          type: record.get('type'),
          title: record.get('title') || 'Untitled',
          description: `Connected via graph traversal (depth ${depth})`,
          content_preview: (record.get('content') || '').substring(0, 200),
          similarity: 0.0, // Mark as connected, not direct match
        }));
        
        // Merge with original results (cast to any to allow custom properties on result object)
        const enhancedResult = result as any;
        enhancedResult.results = [...result.results, ...connectedNodes];
        enhancedResult.total_candidates = enhancedResult.results.length;
        enhancedResult.returned = enhancedResult.results.length;
        enhancedResult.depth_used = depth;
        enhancedResult.multi_hop_enabled = true;
        enhancedResult.connected_nodes_count = connectedNodes.length;
        
      } catch (traversalError: any) {
        // If APOC is not available, fall back to simple neighbor query
        console.warn('APOC traversal failed, using simple neighbor query:', traversalError.message);
        
        const topResults = result.results.slice(0, Math.min(5, result.results.length));
        const nodeIds = topResults.map((r: any) => r.id);
        
        const neighborResult = await session.run(
          `
          MATCH (start:Node)-[r:EDGE*1..${depth - 1}]-(connected:Node)
          WHERE start.id IN $nodeIds
            AND connected.id <> start.id
          RETURN DISTINCT
            connected.id as id,
            connected.type as type,
            connected.title as title,
            connected.content as content
          LIMIT ${limit * 2}
          `,
          { nodeIds }
        );
        
        const connectedNodes = neighborResult.records.map(record => ({
          id: record.get('id'),
          type: record.get('type'),
          title: record.get('title') || 'Untitled',
          description: `Connected via simple neighbor query (depth ${depth})`,
          content_preview: (record.get('content') || '').substring(0, 200),
          similarity: 0.0,
        }));
        
        const enhancedResult = result as any;
        enhancedResult.results = [...result.results, ...connectedNodes];
        enhancedResult.total_candidates = enhancedResult.results.length;
        enhancedResult.returned = enhancedResult.results.length;
        enhancedResult.depth_used = depth;
        enhancedResult.multi_hop_enabled = true;
        enhancedResult.connected_nodes_count = connectedNodes.length;
        
      } finally {
        await session.close();
      }
    }
    
    return result;
    
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Handle get_embedding_stats tool call
 */
export async function handleGetEmbeddingStats(
  params: any,
  driver: Driver
): Promise<any> {
  const searchService = new UnifiedSearchService(driver);
  await searchService.initialize();
  
  const session = driver.session();
  
  try {
    // Get total count and breakdown by type (including FileChunk)
    // Match nodes with embeddings, but exclude system nodes like WatchConfig
    const result = await session.run(`
      MATCH (n)
      WHERE n.embedding IS NOT NULL 
        AND NOT n:WatchConfig
        AND n.type IS NOT NULL
      RETURN n.type AS type, count(*) AS count
      ORDER BY count DESC
    `);

    const byType: Record<string, number> = {};
    let total = 0;

    for (const record of result.records) {
      const type = record.get('type');
      const countValue = record.get('count');
      const count = typeof countValue === 'object' && countValue.toNumber ? countValue.toNumber() : Number(countValue);
      byType[type] = count;
      total += count;
    }

    return {
      status: 'success',
      embeddings_enabled: searchService.isEmbeddingsEnabled(),
      total_nodes_with_embeddings: total,
      breakdown_by_type: byType
    };

  } catch (error: any) {
    return {
      status: 'error',
      message: error.message
    };
  } finally {
    await session.close();
  }
}
