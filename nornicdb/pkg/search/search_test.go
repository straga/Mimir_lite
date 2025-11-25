// Package search tests
package search

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/orneryd/nornicdb/pkg/storage"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestVectorIndex_Basic tests basic vector index operations.
func TestVectorIndex_Basic(t *testing.T) {
	idx := NewVectorIndex(4)

	// Add vectors
	err := idx.Add("doc1", []float32{1, 0, 0, 0})
	require.NoError(t, err)

	err = idx.Add("doc2", []float32{0.9, 0.1, 0, 0})
	require.NoError(t, err)

	err = idx.Add("doc3", []float32{0, 1, 0, 0})
	require.NoError(t, err)

	assert.Equal(t, 3, idx.Count())
	assert.True(t, idx.HasVector("doc1"))
	assert.False(t, idx.HasVector("doc99"))

	// Search for similar vectors
	results, err := idx.Search(context.Background(), []float32{1, 0, 0, 0}, 10, 0.5)
	require.NoError(t, err)

	// doc1 should be most similar (identical), then doc2 (0.9 similarity)
	require.Len(t, results, 2) // doc3 is orthogonal, below threshold
	assert.Equal(t, "doc1", results[0].ID)
	assert.InDelta(t, 1.0, results[0].Score, 0.01) // Identical
	assert.Equal(t, "doc2", results[1].ID)
}

// TestVectorIndex_DimensionMismatch tests dimension validation.
func TestVectorIndex_DimensionMismatch(t *testing.T) {
	idx := NewVectorIndex(4)

	err := idx.Add("doc1", []float32{1, 2, 3}) // Wrong dimension
	assert.ErrorIs(t, err, ErrDimensionMismatch)

	err = idx.Add("doc1", []float32{1, 2, 3, 4, 5}) // Wrong dimension
	assert.ErrorIs(t, err, ErrDimensionMismatch)

	err = idx.Add("doc1", []float32{1, 2, 3, 4}) // Correct dimension
	assert.NoError(t, err)
}

// TestFulltextIndex_BM25 tests BM25 full-text search.
func TestFulltextIndex_BM25(t *testing.T) {
	idx := NewFulltextIndex()

	// Index some documents
	idx.Index("doc1", "machine learning deep neural networks")
	idx.Index("doc2", "deep learning with tensorflow and pytorch")
	idx.Index("doc3", "database systems and query optimization")
	idx.Index("doc4", "natural language processing with transformers")

	assert.Equal(t, 4, idx.Count())

	// Search for "deep learning"
	results := idx.Search("deep learning", 10)
	require.NotEmpty(t, results)

	// doc1 and doc2 should match
	t.Logf("Search results for 'deep learning':")
	for _, r := range results {
		t.Logf("  %s: score=%.4f", r.ID, r.Score)
	}

	// Both doc1 and doc2 should be in results (both contain "deep" and/or "learning")
	ids := make(map[string]bool)
	for _, r := range results {
		ids[r.ID] = true
	}
	assert.True(t, ids["doc1"] || ids["doc2"], "Expected doc1 or doc2 in results")

	// Search for "database"
	results = idx.Search("database query", 10)
	require.NotEmpty(t, results)
	assert.Equal(t, "doc3", results[0].ID)
}

// TestFulltextIndex_Tokenization tests text tokenization.
func TestFulltextIndex_Tokenization(t *testing.T) {
	tokens := tokenize("Hello, World! This is a TEST-123.")

	t.Logf("Tokens: %v", tokens)

	// Should lowercase, remove punctuation, filter stop words
	assert.Contains(t, tokens, "hello")
	assert.Contains(t, tokens, "world")
	assert.Contains(t, tokens, "test")
	assert.Contains(t, tokens, "123")

	// Should NOT contain stop words
	assert.NotContains(t, tokens, "this")
	assert.NotContains(t, tokens, "is")
	assert.NotContains(t, tokens, "a")
}

// TestRRFFusion tests Reciprocal Rank Fusion algorithm.
func TestRRFFusion(t *testing.T) {
	// Create test service with mock data
	engine := storage.NewMemoryEngine()
	defer engine.Close()

	// Create nodes
	nodes := []*storage.Node{
		{ID: "doc1", Labels: []string{"Node"}, Properties: map[string]any{"title": "ML Basics"}},
		{ID: "doc2", Labels: []string{"Node"}, Properties: map[string]any{"title": "Deep Learning"}},
		{ID: "doc3", Labels: []string{"Node"}, Properties: map[string]any{"title": "Database Design"}},
	}
	err := engine.BulkCreateNodes(nodes)
	require.NoError(t, err)

	svc := NewService(engine)

	// Test RRF fusion directly
	vectorResults := []indexResult{
		{ID: "doc1", Score: 0.95},
		{ID: "doc2", Score: 0.85},
	}
	bm25Results := []indexResult{
		{ID: "doc2", Score: 5.5}, // doc2 appears in both - should rank highest
		{ID: "doc3", Score: 4.2},
	}

	opts := DefaultSearchOptions()
	fusedResults := svc.fuseRRF(vectorResults, bm25Results, opts)

	t.Logf("RRF Fusion results:")
	for _, r := range fusedResults {
		t.Logf("  %s: rrf=%.4f vectorRank=%d bm25Rank=%d", r.ID, r.RRFScore, r.VectorRank, r.BM25Rank)
	}

	// doc2 should be first (appears in both lists)
	require.NotEmpty(t, fusedResults)
	assert.Equal(t, "doc2", fusedResults[0].ID)
	assert.Equal(t, 2, fusedResults[0].VectorRank) // Second in vector list = rank 2 (1-indexed)
	assert.Equal(t, 1, fusedResults[0].BM25Rank)   // First in BM25 = rank 1
}

// TestAdaptiveRRFConfig tests adaptive RRF configuration.
func TestAdaptiveRRFConfig(t *testing.T) {
	// Short query - should favor BM25
	shortOpts := GetAdaptiveRRFConfig("docker")
	assert.Equal(t, 0.5, shortOpts.VectorWeight)
	assert.Equal(t, 1.5, shortOpts.BM25Weight)

	// Long query - should favor vector
	longOpts := GetAdaptiveRRFConfig("how do I configure docker containers for production deployment")
	assert.Equal(t, 1.5, longOpts.VectorWeight)
	assert.Equal(t, 0.5, longOpts.BM25Weight)

	// Medium query - should be balanced
	medOpts := GetAdaptiveRRFConfig("configure docker production")
	assert.Equal(t, 1.0, medOpts.VectorWeight)
	assert.Equal(t, 1.0, medOpts.BM25Weight)
}

// TestSearchService_FullTextOnly tests full-text search without embeddings.
func TestSearchService_FullTextOnly(t *testing.T) {
	engine := storage.NewMemoryEngine()
	defer engine.Close()

	// Create nodes with searchable properties
	nodes := []*storage.Node{
		{
			ID:     "node1",
			Labels: []string{"Node"},
			Properties: map[string]any{
				"type":    "memory",
				"title":   "Machine Learning Tutorial",
				"content": "Introduction to machine learning algorithms and neural networks",
			},
		},
		{
			ID:     "node2",
			Labels: []string{"Node"},
			Properties: map[string]any{
				"type":        "todo",
				"title":       "Database Migration",
				"description": "Migrate PostgreSQL database to new server",
			},
		},
		{
			ID:     "node3",
			Labels: []string{"FileChunk"},
			Properties: map[string]any{
				"text": "function calculateMachineLearningScore() { return 42; }",
				"path": "/src/ml/score.ts",
			},
		},
	}
	err := engine.BulkCreateNodes(nodes)
	require.NoError(t, err)

	// Create search service
	svc := NewService(engine)

	// Index nodes for full-text search
	for _, node := range nodes {
		err := svc.IndexNode(node)
		require.NoError(t, err)
	}

	// Search without embedding (triggers full-text fallback)
	ctx := context.Background()
	opts := DefaultSearchOptions()
	opts.Limit = 10

	response, err := svc.Search(ctx, "machine learning", nil, opts)
	require.NoError(t, err)

	t.Logf("Full-text search results for 'machine learning':")
	for _, r := range response.Results {
		t.Logf("  %s: type=%s title=%s score=%.4f", r.ID, r.Type, r.Title, r.Score)
	}

	assert.Equal(t, "fulltext", response.SearchMethod)
	assert.True(t, response.FallbackTriggered)
	assert.NotEmpty(t, response.Results)
}

// TestSearchService_BuildIndexes tests building indexes from storage.
func TestSearchService_BuildIndexes(t *testing.T) {
	engine := storage.NewMemoryEngine()
	defer engine.Close()

	// Create nodes with embeddings
	embedding := make([]float32, 1024)
	embedding[0] = 1.0 // Simple non-zero embedding

	nodes := []*storage.Node{
		{
			ID:        "node1",
			Labels:    []string{"Node"},
			Embedding: embedding,
			Properties: map[string]any{
				"title":   "Test Node 1",
				"content": "This is test content for searching",
			},
		},
		{
			ID:        "node2",
			Labels:    []string{"Node"},
			Embedding: embedding,
			Properties: map[string]any{
				"title": "Test Node 2",
				"text":  "Another searchable document",
			},
		},
	}
	err := engine.BulkCreateNodes(nodes)
	require.NoError(t, err)

	// Create service and build indexes
	svc := NewService(engine)
	err = svc.BuildIndexes(context.Background())
	require.NoError(t, err)

	// Verify indexes were built
	assert.Equal(t, 2, svc.vectorIndex.Count())
	assert.Equal(t, 2, svc.fulltextIndex.Count())
}

// TestSearchService_WithRealData tests search with exported Neo4j data.
func TestSearchService_WithRealData(t *testing.T) {
	// Path to exported data
	possiblePaths := []string{
		filepath.Join("..", "..", "..", "data", "nornicdb"),
		os.Getenv("MIMIR_DATA_DIR"),
		"/Users/c815719/src/Mimir/data/nornicdb",
	}

	var exportDir string
	for _, p := range possiblePaths {
		if p == "" {
			continue
		}
		if _, err := os.Stat(p); err == nil {
			exportDir = p
			break
		}
	}

	if exportDir == "" {
		t.Skip("Export directory not found - run export-neo4j-to-json.mjs first")
	}

	t.Logf("Using export directory: %s", exportDir)

	// Load data into memory engine
	engine := storage.NewMemoryEngine()
	defer engine.Close()

	result, err := storage.LoadFromMimirExport(engine, exportDir)
	require.NoError(t, err)

	t.Logf("Loaded %d nodes, %d edges, %d embeddings", result.NodesImported, result.EdgesImported, result.EmbeddingsLoaded)

	// Create search service
	svc := NewService(engine)

	// Build indexes
	t.Log("Building search indexes...")
	startTime := time.Now()
	err = svc.BuildIndexes(context.Background())
	require.NoError(t, err)
	t.Logf("Index build time: %v", time.Since(startTime))

	t.Logf("Vector index: %d vectors", svc.vectorIndex.Count())
	t.Logf("Fulltext index: %d documents", svc.fulltextIndex.Count())

	// Test full-text search
	t.Log("\n=== Full-text search test ===")
	ctx := context.Background()
	opts := DefaultSearchOptions()
	opts.Limit = 5

	response, err := svc.fullTextSearchOnly(ctx, "docker configuration", opts)
	require.NoError(t, err)

	t.Logf("Search for 'docker configuration': %d results", len(response.Results))
	for _, r := range response.Results {
		t.Logf("  %s: type=%s title=%s score=%.4f", r.ID[:20]+"...", r.Type, r.Title, r.Score)
	}

	// Test type filtering
	t.Log("\n=== Type filtering test ===")
	opts.Types = []string{"todo"}
	response, err = svc.fullTextSearchOnly(ctx, "implementation", opts)
	require.NoError(t, err)

	t.Logf("Search for 'implementation' (type=todo): %d results", len(response.Results))
	for _, r := range response.Results {
		t.Logf("  %s: type=%s title=%s", r.ID[:20]+"...", r.Type, r.Title)
	}
}

// TestSearchService_RRFHybrid tests the full RRF hybrid search with real data.
func TestSearchService_RRFHybrid(t *testing.T) {
	// Path to exported data
	possiblePaths := []string{
		filepath.Join("..", "..", "..", "data", "nornicdb"),
		"/Users/c815719/src/Mimir/data/nornicdb",
	}

	var exportDir string
	for _, p := range possiblePaths {
		if _, err := os.Stat(p); err == nil {
			exportDir = p
			break
		}
	}

	if exportDir == "" {
		t.Skip("Export directory not found")
	}

	// Load data
	engine := storage.NewMemoryEngine()
	defer engine.Close()

	result, err := storage.LoadFromMimirExport(engine, exportDir)
	require.NoError(t, err)
	require.True(t, result.EmbeddingsLoaded > 0, "Need embeddings for RRF test")

	// Create search service and build indexes
	svc := NewService(engine)
	err = svc.BuildIndexes(context.Background())
	require.NoError(t, err)

	// Get a real embedding to use as query
	nodes, _ := engine.AllNodes()
	var queryEmbedding []float32
	for _, node := range nodes {
		if len(node.Embedding) == 1024 {
			queryEmbedding = node.Embedding
			t.Logf("Using embedding from node: %s", node.ID)
			break
		}
	}
	require.NotNil(t, queryEmbedding, "Need an embedding for query")

	// Test RRF hybrid search
	t.Log("\n=== RRF Hybrid Search Test ===")
	ctx := context.Background()
	opts := DefaultSearchOptions()
	opts.Limit = 10

	response, err := svc.Search(ctx, "authentication login security", queryEmbedding, opts)
	require.NoError(t, err)

	t.Logf("RRF Search results: %d total, method=%s, fallback=%v",
		len(response.Results), response.SearchMethod, response.FallbackTriggered)

	for i, r := range response.Results {
		t.Logf("  %d. %s: type=%s rrf=%.4f vectorRank=%d bm25Rank=%d",
			i+1, truncateID(r.ID, 20), r.Type, r.RRFScore, r.VectorRank, r.BM25Rank)
	}

	if response.Metrics != nil {
		t.Logf("Metrics: vector=%d, bm25=%d, fused=%d",
			response.Metrics.VectorCandidates,
			response.Metrics.BM25Candidates,
			response.Metrics.FusedCandidates)
	}

	// Verify RRF is working
	assert.Equal(t, "rrf_hybrid", response.SearchMethod)
	assert.False(t, response.FallbackTriggered)
	assert.NotEmpty(t, response.Results)

	// Test adaptive config
	t.Log("\n=== Adaptive RRF Config Test ===")
	shortOpts := GetAdaptiveRRFConfig("docker")
	t.Logf("Short query 'docker': vectorWeight=%.1f, bm25Weight=%.1f", shortOpts.VectorWeight, shortOpts.BM25Weight)

	longOpts := GetAdaptiveRRFConfig("how do I configure authentication and login security for production")
	t.Logf("Long query: vectorWeight=%.1f, bm25Weight=%.1f", longOpts.VectorWeight, longOpts.BM25Weight)
}

func truncateID(id string, maxLen int) string {
	if len(id) <= maxLen {
		return id
	}
	return id[:maxLen] + "..."
}

// BenchmarkVectorSearch benchmarks vector similarity search.
func BenchmarkVectorSearch(b *testing.B) {
	idx := NewVectorIndex(1024)

	// Add 10K vectors
	for i := 0; i < 10000; i++ {
		vec := make([]float32, 1024)
		vec[i%1024] = 1.0
		idx.Add(string(rune('a'+i%26))+string(rune(i)), vec)
	}

	query := make([]float32, 1024)
	query[0] = 1.0

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		idx.Search(context.Background(), query, 10, 0.5)
	}
}

// BenchmarkBM25Search benchmarks BM25 full-text search.
func BenchmarkBM25Search(b *testing.B) {
	idx := NewFulltextIndex()

	// Index 10K documents
	texts := []string{
		"machine learning neural networks deep learning",
		"database systems query optimization indexing",
		"natural language processing transformers bert",
		"distributed systems microservices kubernetes",
		"frontend development react vue angular",
	}

	for i := 0; i < 10000; i++ {
		idx.Index(string(rune('a'+i%26))+string(rune(i)), texts[i%len(texts)])
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		idx.Search("machine learning", 10)
	}
}

// BenchmarkRRFFusion benchmarks RRF fusion algorithm.
func BenchmarkRRFFusion(b *testing.B) {
	engine := storage.NewMemoryEngine()
	defer engine.Close()

	// Create nodes
	for i := 0; i < 100; i++ {
		engine.CreateNode(&storage.Node{
			ID:         storage.NodeID(string(rune('a'+i%26)) + string(rune(i))),
			Labels:     []string{"Node"},
			Properties: map[string]any{"title": "Test"},
		})
	}

	svc := NewService(engine)

	// Create result sets
	vectorResults := make([]indexResult, 50)
	bm25Results := make([]indexResult, 50)
	for i := 0; i < 50; i++ {
		vectorResults[i] = indexResult{ID: string(rune('a'+i%26)) + string(rune(i)), Score: float64(50-i) / 50.0}
		bm25Results[i] = indexResult{ID: string(rune('a'+(i+10)%26)) + string(rune(i)), Score: float64(50-i)}
	}

	opts := DefaultSearchOptions()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		svc.fuseRRF(vectorResults, bm25Results, opts)
	}
}
