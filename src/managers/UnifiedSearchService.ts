/**
 * @file src/managers/UnifiedSearchService.ts
 * @description Unified search service with automatic fallback from vector to full-text search
 * 
 * Search Strategy:
 * 1. If embeddings enabled AND query can be embedded → vector search (semantic)
 * 2. If vector search returns no results OR embeddings disabled → full-text search (keyword)
 * 
 * Used by:
 * - vector_search_nodes tool (primary semantic search interface)
 * - memory_node(operation='search') (semantic by default, keyword fallback)
 * - File indexing (stores full content for fallback when embeddings disabled)
 */

import { Driver, Session } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import { EmbeddingsService } from '../indexing/EmbeddingsService.js';
import { Node } from '../types/index.js';

export interface SearchResult {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  similarity?: number;
  avg_similarity?: number;
  relevance?: number;
  content_preview: string;
  path?: string;
  absolute_path?: string; // Absolute filesystem path for agent access
  chunk_text?: string; // Full chunk text content for RAG injection
  chunk_index?: number;
  chunks_matched?: number; // For file_chunk results: number of chunks that matched
  parent_file?: {
    path: string;
    absolute_path?: string; // Absolute path to parent file
    name: string;
    language: string;
  };
}

export interface UnifiedSearchOptions {
  types?: string[];
  limit?: number;
  minSimilarity?: number;
  offset?: number;
  vectorOnly?: boolean; // If true, don't fallback to full-text
}

export interface UnifiedSearchResponse {
  status: 'success' | 'error';
  query: string;
  results: SearchResult[];
  total_candidates: number;
  returned: number;
  search_method: 'vector' | 'fulltext' | 'hybrid';
  fallback_triggered?: boolean;
  message?: string;
}

export class UnifiedSearchService {
  private driver: Driver;
  private embeddingsService: EmbeddingsService;
  private initialized: boolean = false;

  constructor(driver: Driver) {
    this.driver = driver;
    this.embeddingsService = new EmbeddingsService();
  }

  /**
   * Initialize embeddings service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.embeddingsService.initialize();
      this.initialized = true;
      
      if (this.embeddingsService.isEnabled()) {
        console.log('✅ UnifiedSearchService: Vector search enabled');
      } else {
        console.log('ℹ️  UnifiedSearchService: Vector search disabled, using full-text only');
      }
    } catch (error: any) {
      console.warn('⚠️  Failed to initialize embeddings service:', error.message);
      this.initialized = true; // Mark as initialized anyway, just disabled
    }
  }

  /**
   * Unified search with automatic fallback
   * Tries vector search first (if enabled), falls back to full-text if needed
   */
  async search(query: string, options: UnifiedSearchOptions = {}): Promise<UnifiedSearchResponse> {
    await this.initialize();

    // Handle empty query - return empty results gracefully
    if (!query || query.trim().length === 0) {
      return {
        status: 'success',
        query: query || '',
        results: [],
        total_candidates: 0,
        returned: 0,
        search_method: 'fulltext',
        fallback_triggered: false
      };
    }

    // Try vector search first if enabled
    if (this.embeddingsService.isEnabled()) {
        const vectorResults = await this.vectorSearch(query, options);
        return {
            status: 'success',
            query,
            results: vectorResults,
            total_candidates: vectorResults.length,
            returned: vectorResults.length,
            search_method: 'vector',
            fallback_triggered: false
        };
    }
    
    // Embeddings disabled or vectorOnly mode, use full-text directly
    const fulltextResults = await this.fullTextSearch(query, options);
    
    return {
      status: 'success',
      query,
      results: fulltextResults,
      total_candidates: fulltextResults.length,
      returned: fulltextResults.length,
      search_method: 'fulltext',
      fallback_triggered: false,
      message: 'Vector embeddings disabled. Using full-text search.'
    };
  }

  /**
   * Vector similarity search
   */
  private async vectorSearch(query: string, options: UnifiedSearchOptions): Promise<SearchResult[]> {
    const session = this.driver.session();
    
    try {
      // Generate embedding for query
      const queryEmbedding = await this.embeddingsService.generateEmbedding(query);
      
      const limit = Math.floor(options.limit || 10);
      const minSimilarity = options.minSimilarity || 0.75;

      // Build type filter if provided
      let typeFilter = '';
      const queryParams: any = {
        queryVector: queryEmbedding.embedding,
        limit: Math.floor(limit * 2) // Get more candidates for filtering
      };
      
      if (options.types && Array.isArray(options.types) && options.types.length > 0) {
        typeFilter = 'AND node.type IN $types';
        queryParams.types = options.types;
      }

      // Use Neo4j's native vector similarity search
      // For file_chunk results: aggregate by parent file to show match counts
      const result = await session.run(`
        CALL db.index.vector.queryNodes('node_embedding_index', toInteger($limit), $queryVector)
        YIELD node, score
        WHERE score >= $minSimilarity ${typeFilter}
        
        // For FileChunk nodes, get parent File information
        OPTIONAL MATCH (node)<-[:HAS_CHUNK]-(parentFile:File)
        
        // Determine the grouping key (file path for chunks, node id for others)
        WITH node, score, parentFile,
             CASE 
               WHEN node.type = 'file_chunk' AND parentFile IS NOT NULL THEN parentFile.path
               ELSE COALESCE(node.id, node.path)
             END AS groupKey,
             CASE 
               WHEN node.type = 'file_chunk' THEN parentFile.path 
               ELSE null 
             END AS filePathForChunks
        
        // Aggregate by groupKey (this groups all chunks from the same file together)
        WITH groupKey,
             filePathForChunks,
             // Collect all matching nodes and their scores for this group
             collect({
               node: node, 
               score: score, 
               parentFile: parentFile
             }) AS matches,
             max(score) AS best_similarity,
             avg(score) AS avg_similarity,
             // Count only file_chunk nodes in this group
             count(CASE WHEN node.type = 'file_chunk' THEN 1 END) AS chunks_matched
        
        // Get the best match from the group for returning
        // Sort matches by score DESC and take the first one
        WITH groupKey,
             filePathForChunks,
             matches,
             best_similarity,
             avg_similarity,
             chunks_matched,
             [m IN matches WHERE m.score = best_similarity][0] AS bestMatch
        
        // Extract fields from the best match
        WITH groupKey,
             bestMatch.node AS node,
             bestMatch.score AS similarity,
             bestMatch.parentFile AS parentFile,
             best_similarity,
             avg_similarity,
             // Only set chunks_matched for file_chunk results
             CASE WHEN bestMatch.node.type = 'file_chunk' THEN chunks_matched ELSE null END AS chunks_matched
        
        ORDER BY similarity DESC
        LIMIT toInteger($finalLimit)
        
        RETURN CASE 
                 WHEN node.type = 'file_chunk' AND parentFile IS NOT NULL 
                 THEN parentFile.path 
                 ELSE COALESCE(node.id, node.path)
               END AS id,
               node.type AS type,
               CASE 
                 WHEN node.type = 'file_chunk' AND parentFile IS NOT NULL 
                 THEN parentFile.name 
                 ELSE COALESCE(node.title, node.name)
               END AS title,
               node.name AS name,
               node.description AS description,
               node.content AS content,
               node.path AS path,
               CASE 
                 WHEN node.type = 'file_chunk' AND parentFile IS NOT NULL 
                 THEN parentFile.absolute_path 
                 ELSE node.absolute_path
               END AS absolute_path,
               node.text AS chunk_text,
               node.chunk_index AS chunk_index,
               node.id AS chunk_id,
               similarity,
               chunks_matched,
               avg_similarity,
               parentFile.path AS parent_file_path,
               parentFile.absolute_path AS parent_file_absolute_path,
               parentFile.name AS parent_file_name,
               parentFile.language AS parent_file_language
      `, { ...queryParams, minSimilarity, finalLimit: limit });

      return result.records.map(record => this.formatSearchResult(record, 'vector'));
      
    } finally {
      await session.close();
    }
  }

  /**
   * Full-text keyword search
   * Searches across all string properties: content, path, name, description, etc.
   */
  private async fullTextSearch(query: string, options: UnifiedSearchOptions): Promise<SearchResult[]> {
    const session = this.driver.session();
    
    try {
      const limit = options.limit || 100;
      const offset = options.offset || 0;

      // Search across string properties only to avoid type errors with arrays
      const result = await session.run(
        `
        MATCH (n)
        WHERE (
          (n.path IS NOT NULL AND toLower(n.path) CONTAINS toLower($query)) OR
          (n.language IS NOT NULL AND toLower(n.language) CONTAINS toLower($query)) OR
          (n.content IS NOT NULL AND toLower(n.content) CONTAINS toLower($query)) OR
          (n.text IS NOT NULL AND toLower(n.text) CONTAINS toLower($query)) OR
          (n.name IS NOT NULL AND toLower(n.name) CONTAINS toLower($query)) OR
          (n.description IS NOT NULL AND toLower(n.description) CONTAINS toLower($query)) OR
          (n.status IS NOT NULL AND toLower(n.status) CONTAINS toLower($query)) OR
          (n.priority IS NOT NULL AND toLower(n.priority) CONTAINS toLower($query)) OR
          (n.type IS NOT NULL AND toLower(n.type) CONTAINS toLower($query)) OR
          (n.title IS NOT NULL AND toLower(n.title) CONTAINS toLower($query))
        )
        ${options.types && options.types.length > 0 ? `AND n.type IN $types` : ''}
        
        // For FileChunk nodes, get parent File information
        OPTIONAL MATCH (n)<-[:HAS_CHUNK]-(parentFile:File)
        
        RETURN COALESCE(n.id, n.path) AS id,
               n.type AS type,
               COALESCE(n.title, n.name) AS title,
               n.name AS name,
               n.description AS description,
               n.content AS content,
               n.path AS path,
               CASE 
                 WHEN n.type = 'file_chunk' AND parentFile IS NOT NULL 
                 THEN parentFile.absolute_path 
                 ELSE n.absolute_path
               END AS absolute_path,
               n.text AS chunk_text,
               n.chunk_index AS chunk_index,
               parentFile.path AS parent_file_path,
               parentFile.absolute_path AS parent_file_absolute_path,
               parentFile.name AS parent_file_name,
               parentFile.language AS parent_file_language,
               // Calculate simple relevance score based on field matches
               CASE 
                 WHEN n.title IS NOT NULL AND toLower(n.title) CONTAINS toLower($query) THEN 1.0
                 WHEN n.name IS NOT NULL AND toLower(n.name) CONTAINS toLower($query) THEN 0.9
                 WHEN n.description IS NOT NULL AND toLower(n.description) CONTAINS toLower($query) THEN 0.8
                 WHEN n.content IS NOT NULL AND toLower(n.content) CONTAINS toLower($query) THEN 0.7
                 WHEN n.text IS NOT NULL AND toLower(n.text) CONTAINS toLower($query) THEN 0.7
                 ELSE 0.5
               END AS relevance
        ORDER BY relevance DESC
        SKIP $offset
        LIMIT $limit
        `,
        { 
          query, 
          types: options.types || [], 
          offset: neo4j.int(offset), 
          limit: neo4j.int(limit) 
        }
      );

      return result.records.map(record => this.formatSearchResult(record, 'fulltext'));
      
    } finally {
      await session.close();
    }
  }

  /**
   * Format search result from Neo4j record
   */
  private formatSearchResult(record: any, searchMethod: 'vector' | 'fulltext'): SearchResult {
    const content = record.get('content');
    const description = record.get('description');
    const title = record.get('title');
    const name = record.get('name');
    const path = record.get('path');
    const absolutePath = record.get('absolute_path');
    const chunkText = record.get('chunk_text');
    const chunkIndex = record.get('chunk_index');
    const chunkId = record.get('chunk_id');
    const chunksMatched = record.get('chunks_matched');
    const avgSimilarity = record.get('avg_similarity');
    const parentFilePath = record.get('parent_file_path');
    const parentFileAbsolutePath = record.get('parent_file_absolute_path');
    const parentFileName = record.get('parent_file_name');
    const parentFileLanguage = record.get('parent_file_language');
    const nodeType = record.get('type');
    
    // Create a preview from available text fields
    let preview = '';
    if (chunkText) preview = chunkText.substring(0, 200);
    else if (title) preview = title;
    else if (name) preview = name;
    else if (description) preview = description;
    else if (content && typeof content === 'string') preview = content.substring(0, 200);
    
    const resultObj: SearchResult = {
      id: record.get('id'),
      type: nodeType,
      title: title || name || null,
      description: description || null,
      content_preview: preview
    };
    
    // Add score based on search method
    if (searchMethod === 'vector') {
      resultObj.similarity = record.get('similarity');
      if (avgSimilarity) {
        resultObj.avg_similarity = avgSimilarity;
      }
    } else {
      resultObj.relevance = record.get('relevance');
    }
    
    // Add chunk-specific information
    if (nodeType === 'file_chunk') {
      if (chunkIndex !== null && chunkIndex !== undefined) {
        resultObj.chunk_index = chunkIndex;
      }
      if (chunksMatched && chunksMatched > 0) {
        resultObj.chunks_matched = typeof chunksMatched.toNumber === 'function' 
          ? chunksMatched.toNumber() 
          : chunksMatched;
      }
      if (parentFilePath) {
        resultObj.parent_file = {
          path: parentFilePath,
          absolute_path: parentFileAbsolutePath,
          name: parentFileName,
          language: parentFileLanguage
        };
      }
      // For chunks, include the chunk text as content for RAG
      if (chunkText) {
        resultObj.chunk_text = chunkText;
      }
    }
    
    // Add path for file nodes (both relative and absolute)
    if (path) {
      resultObj.path = path;
    }
    if (absolutePath) {
      resultObj.absolute_path = absolutePath;
    }
    
    return resultObj;
  }

  /**
   * Check if embeddings are enabled
   */
  isEmbeddingsEnabled(): boolean {
    return this.embeddingsService.isEnabled();
  }

  /**
   * Get embeddings service instance
   */
  getEmbeddingsService(): EmbeddingsService {
    return this.embeddingsService;
  }
}
