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
  minScore: 0.01
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
   * Fuse multiple ranked lists using RRF
   * 
   * @param vectorResults - Results from vector search (ranked by cosine similarity)
   * @param bm25Results - Results from BM25 keyword search (ranked by relevance)
   * @returns Fused results sorted by RRF score
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
   * @param query - The search query
   * @returns Optimized RRF config for the query type
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

