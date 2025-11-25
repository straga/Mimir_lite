// Package search provides unified search with RRF, vector, and full-text capabilities.
// This implements the same hybrid search approach used by Azure AI Search, Elasticsearch, and Weaviate.
package search

import (
	"context"
	"math"
	"sort"
	"strings"
	"sync"

	"github.com/orneryd/nornicdb/pkg/storage"
)

// SearchableProperties defines which node properties are included in full-text search.
// These match Mimir's Neo4j fulltext index configuration.
var SearchableProperties = []string{
	"content",
	"text",
	"title",
	"name",
	"description",
	"path",
	"workerRole",
	"requirements",
}

// SearchResult represents a unified search result.
type SearchResult struct {
	ID             string            `json:"id"`
	NodeID         storage.NodeID    `json:"nodeId"`
	Type           string            `json:"type"`
	Labels         []string          `json:"labels"`
	Title          string            `json:"title,omitempty"`
	Description    string            `json:"description,omitempty"`
	ContentPreview string            `json:"content_preview,omitempty"`
	Properties     map[string]any    `json:"properties,omitempty"`
	
	// Scoring
	Score          float64           `json:"score"`
	Similarity     float64           `json:"similarity,omitempty"`
	
	// RRF metadata
	RRFScore       float64           `json:"rrf_score,omitempty"`
	VectorRank     int               `json:"vector_rank,omitempty"`
	BM25Rank       int               `json:"bm25_rank,omitempty"`
}

// SearchResponse is the response from a search operation.
type SearchResponse struct {
	Status           string         `json:"status"`
	Query            string         `json:"query"`
	Results          []SearchResult `json:"results"`
	TotalCandidates  int            `json:"total_candidates"`
	Returned         int            `json:"returned"`
	SearchMethod     string         `json:"search_method"`
	FallbackTriggered bool          `json:"fallback_triggered"`
	Message          string         `json:"message,omitempty"`
	Metrics          *SearchMetrics `json:"metrics,omitempty"`
}

// SearchMetrics contains timing and statistics.
type SearchMetrics struct {
	VectorSearchTimeMs int `json:"vector_search_time_ms"`
	BM25SearchTimeMs   int `json:"bm25_search_time_ms"`
	FusionTimeMs       int `json:"fusion_time_ms"`
	TotalTimeMs        int `json:"total_time_ms"`
	VectorCandidates   int `json:"vector_candidates"`
	BM25Candidates     int `json:"bm25_candidates"`
	FusedCandidates    int `json:"fused_candidates"`
}

// SearchOptions configures the search behavior.
type SearchOptions struct {
	// Limit is the maximum number of results to return
	Limit int
	
	// MinSimilarity is the minimum similarity threshold for vector search
	MinSimilarity float64
	
	// Types filters results by node type (labels)
	Types []string
	
	// RRF configuration
	RRFK         float64  // RRF constant (default: 60)
	VectorWeight float64  // Weight for vector results (default: 1.0)
	BM25Weight   float64  // Weight for BM25 results (default: 1.0)
	MinRRFScore  float64  // Minimum RRF score threshold (default: 0.01)
}

// DefaultSearchOptions returns sensible defaults.
func DefaultSearchOptions() *SearchOptions {
	return &SearchOptions{
		Limit:         50,
		MinSimilarity: 0.5,
		RRFK:          60,
		VectorWeight:  1.0,
		BM25Weight:    1.0,
		MinRRFScore:   0.01,
	}
}

// Service provides unified search capabilities.
type Service struct {
	engine       storage.Engine
	vectorIndex  *VectorIndex
	fulltextIndex *FulltextIndex
	mu           sync.RWMutex
}

// NewService creates a new search service.
func NewService(engine storage.Engine) *Service {
	return &Service{
		engine:        engine,
		vectorIndex:   NewVectorIndex(1024), // Default to 1024 dimensions (mxbai-embed-large)
		fulltextIndex: NewFulltextIndex(),
	}
}

// IndexNode adds a node to all search indexes.
func (s *Service) IndexNode(node *storage.Node) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Add to vector index if node has embedding
	if len(node.Embedding) > 0 {
		if err := s.vectorIndex.Add(string(node.ID), node.Embedding); err != nil {
			return err
		}
	}

	// Add to fulltext index
	text := s.extractSearchableText(node)
	if text != "" {
		s.fulltextIndex.Index(string(node.ID), text)
	}

	return nil
}

// RemoveNode removes a node from all search indexes.
func (s *Service) RemoveNode(nodeID storage.NodeID) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.vectorIndex.Remove(string(nodeID))
	s.fulltextIndex.Remove(string(nodeID))
	return nil
}

// BuildIndexes builds search indexes from all nodes in the engine.
func (s *Service) BuildIndexes(ctx context.Context) error {
	// Get all nodes via the storage engine
	if exportable, ok := s.engine.(storage.ExportableEngine); ok {
		nodes, err := exportable.AllNodes()
		if err != nil {
			return err
		}

		for _, node := range nodes {
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
				if err := s.IndexNode(node); err != nil {
					// Log error but continue
					continue
				}
			}
		}
	}

	return nil
}

// Search performs RRF hybrid search (vector + BM25) with fallback.
func (s *Service) Search(ctx context.Context, query string, embedding []float32, opts *SearchOptions) (*SearchResponse, error) {
	if opts == nil {
		opts = DefaultSearchOptions()
	}

	// If no embedding provided, fall back to full-text only
	if len(embedding) == 0 {
		return s.fullTextSearchOnly(ctx, query, opts)
	}

	// Try RRF hybrid search
	response, err := s.rrfHybridSearch(ctx, query, embedding, opts)
	if err == nil && len(response.Results) > 0 {
		return response, nil
	}

	// Fallback to vector-only
	response, err = s.vectorSearchOnly(ctx, embedding, opts)
	if err == nil && len(response.Results) > 0 {
		response.FallbackTriggered = true
		response.Message = "RRF search returned no results, fell back to vector search"
		return response, nil
	}

	// Final fallback to full-text
	return s.fullTextSearchOnly(ctx, query, opts)
}

// rrfHybridSearch performs Reciprocal Rank Fusion combining vector and BM25 results.
func (s *Service) rrfHybridSearch(ctx context.Context, query string, embedding []float32, opts *SearchOptions) (*SearchResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Get more candidates for better fusion
	candidateLimit := opts.Limit * 2

	// Step 1: Vector search
	vectorResults, err := s.vectorIndex.Search(ctx, embedding, candidateLimit, opts.MinSimilarity)
	if err != nil {
		return nil, err
	}

	// Step 2: BM25 full-text search
	bm25Results := s.fulltextIndex.Search(query, candidateLimit)

	// Step 3: Filter by type if specified
	if len(opts.Types) > 0 {
		vectorResults = s.filterByType(vectorResults, opts.Types)
		bm25Results = s.filterByType(bm25Results, opts.Types)
	}

	// Step 4: Fuse with RRF
	fusedResults := s.fuseRRF(vectorResults, bm25Results, opts)

	// Step 5: Convert to SearchResult and enrich with node data
	results := s.enrichResults(fusedResults, opts.Limit)

	return &SearchResponse{
		Status:          "success",
		Query:           query,
		Results:         results,
		TotalCandidates: len(fusedResults),
		Returned:        len(results),
		SearchMethod:    "rrf_hybrid",
		Message:         "Reciprocal Rank Fusion (Vector + BM25)",
		Metrics: &SearchMetrics{
			VectorCandidates: len(vectorResults),
			BM25Candidates:   len(bm25Results),
			FusedCandidates:  len(fusedResults),
		},
	}, nil
}

// fuseRRF implements Reciprocal Rank Fusion algorithm.
// Formula: RRF_score(doc) = Σ (weight_i / (k + rank_i))
func (s *Service) fuseRRF(vectorResults, bm25Results []indexResult, opts *SearchOptions) []rrfResult {
	// Create rank maps (1-indexed per RRF formula)
	vectorRanks := make(map[string]int)
	for i, r := range vectorResults {
		vectorRanks[r.ID] = i + 1
	}

	bm25Ranks := make(map[string]int)
	for i, r := range bm25Results {
		bm25Ranks[r.ID] = i + 1
	}

	// Get all unique document IDs
	allIDs := make(map[string]struct{})
	for _, r := range vectorResults {
		allIDs[r.ID] = struct{}{}
	}
	for _, r := range bm25Results {
		allIDs[r.ID] = struct{}{}
	}

	// Calculate RRF scores
	var results []rrfResult
	k := opts.RRFK
	if k == 0 {
		k = 60 // Default
	}

	for id := range allIDs {
		var vectorComponent, bm25Component float64

		if rank, ok := vectorRanks[id]; ok {
			vectorComponent = opts.VectorWeight / (k + float64(rank))
		}
		if rank, ok := bm25Ranks[id]; ok {
			bm25Component = opts.BM25Weight / (k + float64(rank))
		}

		rrfScore := vectorComponent + bm25Component

		// Skip below threshold
		if rrfScore < opts.MinRRFScore {
			continue
		}

		// Get original score (prefer vector if available)
		var originalScore float64
		if idx := findResultIndex(vectorResults, id); idx >= 0 {
			originalScore = vectorResults[idx].Score
		} else if idx := findResultIndex(bm25Results, id); idx >= 0 {
			originalScore = bm25Results[idx].Score
		}

		results = append(results, rrfResult{
			ID:          id,
			RRFScore:    rrfScore,
			VectorRank:  vectorRanks[id],
			BM25Rank:    bm25Ranks[id],
			OriginalScore: originalScore,
		})
	}

	// Sort by RRF score descending
	sort.Slice(results, func(i, j int) bool {
		return results[i].RRFScore > results[j].RRFScore
	})

	return results
}

// vectorSearchOnly performs vector-only search.
func (s *Service) vectorSearchOnly(ctx context.Context, embedding []float32, opts *SearchOptions) (*SearchResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	results, err := s.vectorIndex.Search(ctx, embedding, opts.Limit*2, opts.MinSimilarity)
	if err != nil {
		return nil, err
	}

	if len(opts.Types) > 0 {
		results = s.filterByType(results, opts.Types)
	}

	searchResults := s.enrichIndexResults(results, opts.Limit)

	return &SearchResponse{
		Status:          "success",
		Results:         searchResults,
		TotalCandidates: len(results),
		Returned:        len(searchResults),
		SearchMethod:    "vector",
		Message:         "Vector similarity search (cosine)",
	}, nil
}

// fullTextSearchOnly performs full-text BM25 search only.
func (s *Service) fullTextSearchOnly(ctx context.Context, query string, opts *SearchOptions) (*SearchResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	results := s.fulltextIndex.Search(query, opts.Limit*2)

	if len(opts.Types) > 0 {
		results = s.filterByType(results, opts.Types)
	}

	searchResults := s.enrichIndexResults(results, opts.Limit)

	return &SearchResponse{
		Status:           "success",
		Query:            query,
		Results:          searchResults,
		TotalCandidates:  len(results),
		Returned:         len(searchResults),
		SearchMethod:     "fulltext",
		FallbackTriggered: true,
		Message:          "Full-text BM25 search (vector search unavailable or returned no results)",
	}, nil
}

// extractSearchableText extracts text from searchable properties.
func (s *Service) extractSearchableText(node *storage.Node) string {
	var parts []string

	for _, prop := range SearchableProperties {
		if val, ok := node.Properties[prop]; ok {
			switch v := val.(type) {
			case string:
				if v != "" {
					parts = append(parts, v)
				}
			}
		}
	}

	return strings.Join(parts, " ")
}

// filterByType filters results to only include specified node types.
func (s *Service) filterByType(results []indexResult, types []string) []indexResult {
	if len(types) == 0 {
		return results
	}

	typeSet := make(map[string]struct{})
	for _, t := range types {
		typeSet[strings.ToLower(t)] = struct{}{}
	}

	var filtered []indexResult
	for _, r := range results {
		node, err := s.engine.GetNode(storage.NodeID(r.ID))
		if err != nil {
			continue
		}

		// Check if any label matches
		for _, label := range node.Labels {
			if _, ok := typeSet[strings.ToLower(label)]; ok {
				filtered = append(filtered, r)
				break
			}
		}
		
		// Also check type property
		if nodeType, ok := node.Properties["type"].(string); ok {
			if _, ok := typeSet[strings.ToLower(nodeType)]; ok {
				filtered = append(filtered, r)
			}
		}
	}

	return filtered
}

// enrichResults converts RRF results to SearchResult with full node data.
func (s *Service) enrichResults(rrfResults []rrfResult, limit int) []SearchResult {
	var results []SearchResult

	for i, rrf := range rrfResults {
		if i >= limit {
			break
		}

		node, err := s.engine.GetNode(storage.NodeID(rrf.ID))
		if err != nil {
			continue
		}

		result := SearchResult{
			ID:         rrf.ID,
			NodeID:     node.ID,
			Labels:     node.Labels,
			Properties: node.Properties,
			Score:      rrf.RRFScore,
			Similarity: rrf.OriginalScore,
			RRFScore:   rrf.RRFScore,
			VectorRank: rrf.VectorRank,
			BM25Rank:   rrf.BM25Rank,
		}

		// Extract common fields
		if t, ok := node.Properties["type"].(string); ok {
			result.Type = t
		}
		if title, ok := node.Properties["title"].(string); ok {
			result.Title = title
		}
		if desc, ok := node.Properties["description"].(string); ok {
			result.Description = desc
		}
		if content, ok := node.Properties["content"].(string); ok {
			result.ContentPreview = truncate(content, 200)
		} else if text, ok := node.Properties["text"].(string); ok {
			result.ContentPreview = truncate(text, 200)
		}

		results = append(results, result)
	}

	return results
}

// enrichIndexResults converts raw index results to SearchResult.
func (s *Service) enrichIndexResults(indexResults []indexResult, limit int) []SearchResult {
	var results []SearchResult

	for i, ir := range indexResults {
		if i >= limit {
			break
		}

		node, err := s.engine.GetNode(storage.NodeID(ir.ID))
		if err != nil {
			continue
		}

		result := SearchResult{
			ID:         ir.ID,
			NodeID:     node.ID,
			Labels:     node.Labels,
			Properties: node.Properties,
			Score:      ir.Score,
			Similarity: ir.Score,
		}

		// Extract common fields
		if t, ok := node.Properties["type"].(string); ok {
			result.Type = t
		}
		if title, ok := node.Properties["title"].(string); ok {
			result.Title = title
		}
		if desc, ok := node.Properties["description"].(string); ok {
			result.Description = desc
		}
		if content, ok := node.Properties["content"].(string); ok {
			result.ContentPreview = truncate(content, 200)
		} else if text, ok := node.Properties["text"].(string); ok {
			result.ContentPreview = truncate(text, 200)
		}

		results = append(results, result)
	}

	return results
}

// GetAdaptiveRRFConfig returns RRF weights based on query characteristics.
func GetAdaptiveRRFConfig(query string) *SearchOptions {
	words := strings.Fields(query)
	wordCount := len(words)

	opts := DefaultSearchOptions()

	// Short queries (1-2 words): Emphasize keyword matching
	if wordCount <= 2 {
		opts.VectorWeight = 0.5
		opts.BM25Weight = 1.5
		return opts
	}

	// Long queries (6+ words): Emphasize semantic understanding
	if wordCount >= 6 {
		opts.VectorWeight = 1.5
		opts.BM25Weight = 0.5
		return opts
	}

	// Medium queries: Balanced
	return opts
}

// Helper types
type indexResult struct {
	ID    string
	Score float64
}

type rrfResult struct {
	ID            string
	RRFScore      float64
	VectorRank    int
	BM25Rank      int
	OriginalScore float64
}

func findResultIndex(results []indexResult, id string) int {
	for i, r := range results {
		if r.ID == id {
			return i
		}
	}
	return -1
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

// sqrt returns the square root of x.
func sqrt(x float64) float64 {
	return math.Sqrt(x)
}
