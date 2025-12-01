package search

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCrossEncoderDisabled(t *testing.T) {
	ce := NewCrossEncoder(&CrossEncoderConfig{
		Enabled: false,
	})

	candidates := []RerankCandidate{
		{ID: "1", Content: "First document", Score: 0.9},
		{ID: "2", Content: "Second document", Score: 0.8},
		{ID: "3", Content: "Third document", Score: 0.7},
	}

	results, err := ce.Rerank(context.Background(), "test query", candidates)
	require.NoError(t, err)

	// Should pass through without reranking
	assert.Len(t, results, 3)
	assert.Equal(t, "1", results[0].ID)
	assert.Equal(t, "2", results[1].ID)
	assert.Equal(t, "3", results[2].ID)

	// Scores should be preserved
	assert.Equal(t, 0.9, results[0].BiScore)
	assert.Equal(t, 0.9, results[0].FinalScore)
}

func TestCrossEncoderRerank(t *testing.T) {
	// Create mock reranking server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Return Cohere-style response that reverses the ranking
		response := map[string]interface{}{
			"results": []map[string]interface{}{
				{"index": 2, "relevance_score": 0.95}, // Third doc is most relevant
				{"index": 0, "relevance_score": 0.80}, // First doc second
				{"index": 1, "relevance_score": 0.60}, // Second doc last
			},
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	ce := NewCrossEncoder(&CrossEncoderConfig{
		Enabled: true,
		APIURL:  server.URL,
		Model:   "test-model",
		TopK:    100,
		Timeout: 5 * time.Second,
	})

	candidates := []RerankCandidate{
		{ID: "1", Content: "First document", Score: 0.9},
		{ID: "2", Content: "Second document", Score: 0.8},
		{ID: "3", Content: "Third document", Score: 0.7},
	}

	results, err := ce.Rerank(context.Background(), "test query", candidates)
	require.NoError(t, err)

	// Reranked order should be: 3, 1, 2
	assert.Len(t, results, 3)
	assert.Equal(t, "3", results[0].ID, "Third doc should be first after rerank")
	assert.Equal(t, "1", results[1].ID, "First doc should be second after rerank")
	assert.Equal(t, "2", results[2].ID, "Second doc should be third after rerank")

	// Check scores
	assert.Equal(t, 0.95, results[0].CrossScore)
	assert.Equal(t, 0.80, results[1].CrossScore)
	assert.Equal(t, 0.60, results[2].CrossScore)

	// Check rank tracking
	assert.Equal(t, 3, results[0].OriginalRank, "Third doc was originally rank 3")
	assert.Equal(t, 1, results[0].NewRank, "Third doc is now rank 1")
}

func TestCrossEncoderMinScore(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"results": []map[string]interface{}{
				{"index": 0, "relevance_score": 0.9},
				{"index": 1, "relevance_score": 0.5},
				{"index": 2, "relevance_score": 0.2}, // Below threshold
			},
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	ce := NewCrossEncoder(&CrossEncoderConfig{
		Enabled:  true,
		APIURL:   server.URL,
		MinScore: 0.3, // Filter out scores below 0.3
		Timeout:  5 * time.Second,
	})

	candidates := []RerankCandidate{
		{ID: "1", Content: "First", Score: 0.9},
		{ID: "2", Content: "Second", Score: 0.8},
		{ID: "3", Content: "Third", Score: 0.7},
	}

	results, err := ce.Rerank(context.Background(), "query", candidates)
	require.NoError(t, err)

	// Only 2 results should pass MinScore filter
	assert.Len(t, results, 2)
	assert.Equal(t, "1", results[0].ID)
	assert.Equal(t, "2", results[1].ID)
}

func TestCrossEncoderHuggingFaceFormat(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// HuggingFace TEI format - scores in order
		response := map[string]interface{}{
			"scores": []float64{0.3, 0.9, 0.6},
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	ce := NewCrossEncoder(&CrossEncoderConfig{
		Enabled: true,
		APIURL:  server.URL,
		Timeout: 5 * time.Second,
	})

	candidates := []RerankCandidate{
		{ID: "1", Content: "First", Score: 0.9},
		{ID: "2", Content: "Second", Score: 0.8},
		{ID: "3", Content: "Third", Score: 0.7},
	}

	results, err := ce.Rerank(context.Background(), "query", candidates)
	require.NoError(t, err)

	// Should rerank based on HF scores: 2 (0.9) > 3 (0.6) > 1 (0.3)
	assert.Equal(t, "2", results[0].ID)
	assert.Equal(t, "3", results[1].ID)
	assert.Equal(t, "1", results[2].ID)
}

func TestCrossEncoderTopK(t *testing.T) {
	callCount := 0
	var receivedDocs []string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++

		var req map[string]interface{}
		json.NewDecoder(r.Body).Decode(&req)
		if docs, ok := req["documents"].([]interface{}); ok {
			receivedDocs = make([]string, len(docs))
			for i, d := range docs {
				receivedDocs[i] = d.(string)
			}
		}

		// Return scores for whatever we received
		scores := make([]float64, len(receivedDocs))
		for i := range scores {
			scores[i] = float64(len(receivedDocs)-i) / float64(len(receivedDocs))
		}
		json.NewEncoder(w).Encode(map[string]interface{}{"scores": scores})
	}))
	defer server.Close()

	ce := NewCrossEncoder(&CrossEncoderConfig{
		Enabled: true,
		APIURL:  server.URL,
		TopK:    3, // Only rerank top 3
		Timeout: 5 * time.Second,
	})

	// Send 5 candidates
	candidates := []RerankCandidate{
		{ID: "1", Content: "Doc 1", Score: 0.9},
		{ID: "2", Content: "Doc 2", Score: 0.8},
		{ID: "3", Content: "Doc 3", Score: 0.7},
		{ID: "4", Content: "Doc 4", Score: 0.6},
		{ID: "5", Content: "Doc 5", Score: 0.5},
	}

	_, err := ce.Rerank(context.Background(), "query", candidates)
	require.NoError(t, err)

	// Only 3 documents should be sent to the API
	assert.Len(t, receivedDocs, 3)
}

func TestCrossEncoderAPIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	ce := NewCrossEncoder(&CrossEncoderConfig{
		Enabled: true,
		APIURL:  server.URL,
		Timeout: 5 * time.Second,
	})

	candidates := []RerankCandidate{
		{ID: "1", Content: "First", Score: 0.9},
		{ID: "2", Content: "Second", Score: 0.8},
	}

	// Should fallback to original ranking on error
	results, err := ce.Rerank(context.Background(), "query", candidates)
	require.NoError(t, err) // No error returned - graceful fallback

	// Original order preserved
	assert.Equal(t, "1", results[0].ID)
	assert.Equal(t, "2", results[1].ID)
}

func TestCrossEncoderEmptyCandidates(t *testing.T) {
	ce := NewCrossEncoder(&CrossEncoderConfig{
		Enabled: true,
	})

	results, err := ce.Rerank(context.Background(), "query", []RerankCandidate{})
	require.NoError(t, err)
	assert.Empty(t, results)
}

func TestDefaultCrossEncoderConfig(t *testing.T) {
	config := DefaultCrossEncoderConfig()

	assert.False(t, config.Enabled)
	assert.Equal(t, "http://localhost:8081/rerank", config.APIURL)
	assert.Equal(t, "cross-encoder/ms-marco-MiniLM-L-6-v2", config.Model)
	assert.Equal(t, 100, config.TopK)
	assert.Equal(t, 30*time.Second, config.Timeout)
	assert.Equal(t, 0.0, config.MinScore)
}

func TestCrossEncoderWithAuth(t *testing.T) {
	var receivedAuth string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedAuth = r.Header.Get("Authorization")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"scores": []float64{0.9, 0.8},
		})
	}))
	defer server.Close()

	ce := NewCrossEncoder(&CrossEncoderConfig{
		Enabled: true,
		APIURL:  server.URL,
		APIKey:  "test-api-key",
		Timeout: 5 * time.Second,
	})

	candidates := []RerankCandidate{
		{ID: "1", Content: "First", Score: 0.9},
		{ID: "2", Content: "Second", Score: 0.8},
	}

	_, err := ce.Rerank(context.Background(), "query", candidates)
	require.NoError(t, err)

	assert.Equal(t, "Bearer test-api-key", receivedAuth)
}
