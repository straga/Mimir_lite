/**
 * Reciprocal Rank Fusion (RRF)
 * 
 * Industry-standard method for combining ranked lists from multiple search algorithms.
 * Used by Azure AI Search, Google Cloud, Weaviate, Elasticsearch, and others.
 * 
 * Formula: RRF_score(doc) = Σ (weight_i / (k + rank_i))
 * 
 * Where:
 * - k = constant (typically 60)
 * - rank_i = rank of document in result set i (1-indexed)
 * - weight_i = importance weight for result set i
 * 
 * References:
 * - https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf (Original paper)
 * - https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking
 */

export interface RRFConfig {
  k: number;              // Constant for rank normalization (default: 60)
  vectorWeight: number;   // Weight for vector search results (default: 1.0)
  bm25Weight: number;     // Weight for BM25 search results (default: 1.0)
  minScore: number;       // Minimum RRF score to include result (default: 0.01)
}

export interface SearchResult {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  content_preview: string;
  similarity?: number;
  avg_similarity?: number;
  [key: string]: any;
}

export interface RRFResult extends SearchResult {
  rrfScore: number;
  vectorRank?: number;
  bm25Rank?: number;
}

/**
 * Default RRF configuration
 * k=60 is the standard value from research
 */
export const DEFAULT_RRF_CONFIG: RRFConfig = {
  k: 60,
  vectorWeight: 1.0,
  bm25Weight: 1.0,
  minScore: 0.005  // Lowered to support KEYWORD profile with vectorWeight=0.5
};

/**
 * Adaptive RRF profiles for different query types
 */
export const RRF_PROFILES = {
  // Emphasize semantic understanding (long queries, conceptual searches)
  SEMANTIC: {
    ...DEFAULT_RRF_CONFIG,
    vectorWeight: 1.5,
    bm25Weight: 0.5
  },
  
  // Emphasize keyword matching (short queries, exact terms)
  KEYWORD: {
    ...DEFAULT_RRF_CONFIG,
    vectorWeight: 0.5,
    bm25Weight: 1.5
  },
  
  // Balanced approach (medium queries)
  BALANCED: DEFAULT_RRF_CONFIG
};

/**
 * Reciprocal Rank Fusion implementation
 */
export class ReciprocalRankFusion {
  private config: RRFConfig;
  
  constructor(config: Partial<RRFConfig> = {}) {
    this.config = {
      ...DEFAULT_RRF_CONFIG,
      ...config
    };
  }
  
  /**
   * Fuse multiple ranked lists using Reciprocal Rank Fusion
   * 
   * Combines results from vector search (semantic) and BM25 search (keyword)
   * into a single ranked list. This hybrid approach leverages the strengths
   * of both search methods:
   * - Vector search: Understands semantic meaning and context
   * - BM25 search: Excels at exact keyword matching
   * 
   * The RRF formula gives higher scores to documents that appear in both
   * result sets and rank highly in either. Documents appearing in only one
   * result set can still score well if they rank highly there.
   * 
   * @param vectorResults - Results from vector/semantic search, ranked by cosine similarity
   * @param bm25Results - Results from BM25 keyword search, ranked by relevance score
   * @returns Fused results sorted by RRF score (highest first), with rank metadata
   * 
   * @example
   * ```ts
   * const rrf = new ReciprocalRankFusion({ k: 60 });
   * 
   * const vectorResults = [
   *   { id: 'doc1', title: 'Machine Learning', similarity: 0.95, ... },
   *   { id: 'doc2', title: 'Deep Learning', similarity: 0.88, ... }
   * ];
   * 
   * const bm25Results = [
   *   { id: 'doc2', title: 'Deep Learning', ... },
   *   { id: 'doc3', title: 'Neural Networks', ... }
   * ];
   * 
   * const fused = rrf.fuse(vectorResults, bm25Results);
   * // doc2 appears in both lists, so it gets highest RRF score
   * // Result: [doc2, doc1, doc3] with rrfScore, vectorRank, bm25Rank
   * ```
   */
  fuse(
    vectorResults: SearchResult[],
    bm25Results: SearchResult[]
  ): RRFResult[] {
    // Create rank maps (1-indexed as per RRF formula)
    const vectorRanks = new Map<string, number>();
    vectorResults.forEach((result, index) => {
      vectorRanks.set(result.id, index + 1);
    });
    
    const bm25Ranks = new Map<string, number>();
    bm25Results.forEach((result, index) => {
      bm25Ranks.set(result.id, index + 1);
    });
    
    // Get all unique document IDs from both result sets
    const allIds = new Set([
      ...vectorRanks.keys(),
      ...bm25Ranks.keys()
    ]);
    
    // Calculate RRF scores for all documents
    const rrfScores: RRFResult[] = [];
    
    for (const id of allIds) {
      const vectorRank = vectorRanks.get(id);
      const bm25Rank = bm25Ranks.get(id);
      
      // RRF formula with weights
      // If document doesn't appear in a result set, it contributes 0 to the score
      const vectorComponent = vectorRank !== undefined
        ? this.config.vectorWeight / (this.config.k + vectorRank)
        : 0;
      
      const bm25Component = bm25Rank !== undefined
        ? this.config.bm25Weight / (this.config.k + bm25Rank)
        : 0;
      
      const rrfScore = vectorComponent + bm25Component;
      
      // Skip results below minimum score threshold
      if (rrfScore < this.config.minScore) {
        continue;
      }
      
      // Get the original result (prefer vector result if available)
      const originalResult = vectorResults.find(r => r.id === id) 
        || bm25Results.find(r => r.id === id)!;
      
      rrfScores.push({
        ...originalResult,
        rrfScore,
        vectorRank,
        bm25Rank,
        similarity: rrfScore // Use RRF score as the similarity for consistency
      });
    }
    
    // Sort by RRF score descending
    rrfScores.sort((a, b) => b.rrfScore - a.rrfScore);
    
    return rrfScores;
  }
  
  /**
   * Get adaptive RRF configuration based on query characteristics
   * 
   * Automatically selects the best RRF profile based on query length:
   * - Short queries (1-2 words): Emphasize keyword matching (KEYWORD profile)
   *   Example: "docker compose" → Better with exact term matching
   * - Long queries (6+ words): Emphasize semantic understanding (SEMANTIC profile)
   *   Example: "How do I configure Docker containers for production?" → Better with semantic search
   * - Medium queries (3-5 words): Balanced approach (BALANCED profile)
   *   Example: "configure docker production" → Equal weight to both
   * 
   * This adaptive approach improves search quality without requiring manual
   * configuration for each query type.
   * 
   * @param query - The search query string
   * @returns Optimized RRF configuration for the query type
   * 
   * @example
   * ```ts
   * // Short query - emphasizes keyword matching
   * const config1 = ReciprocalRankFusion.getAdaptiveConfig('docker');
   * // Returns: { k: 60, vectorWeight: 0.5, bm25Weight: 1.5, ... }
   * 
   * // Long query - emphasizes semantic understanding
   * const config2 = ReciprocalRankFusion.getAdaptiveConfig(
   *   'How do I set up a development environment with Docker and Node.js?'
   * );
   * // Returns: { k: 60, vectorWeight: 1.5, bm25Weight: 0.5, ... }
   * 
   * // Use adaptive config for search
   * const rrf = new ReciprocalRankFusion(
   *   ReciprocalRankFusion.getAdaptiveConfig(userQuery)
   * );
   * const results = rrf.fuse(vectorResults, bm25Results);
   * ```
   */
  static getAdaptiveConfig(query: string): RRFConfig {
    const words = query.trim().split(/\s+/);
    const wordCount = words.length;
    
    // Short queries (1-2 words): Emphasize keyword matching
    if (wordCount <= 2) {
      return RRF_PROFILES.KEYWORD;
    }
    
    // Long queries (6+ words): Emphasize semantic understanding
    if (wordCount >= 6) {
      return RRF_PROFILES.SEMANTIC;
    }
    
    // Medium queries: Balanced approach
    return RRF_PROFILES.BALANCED;
  }
}

