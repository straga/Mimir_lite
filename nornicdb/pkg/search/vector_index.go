// Package search provides vector indexing with cosine similarity search.
package search

import (
	"context"
	"errors"
	"math"
	"sort"
	"sync"
)

var (
	ErrDimensionMismatch = errors.New("vector dimension mismatch")
)

// VectorIndex provides vector similarity search.
// Currently implements brute-force cosine similarity.
// TODO: Add HNSW for O(log n) search complexity.
type VectorIndex struct {
	dimensions int
	mu         sync.RWMutex
	vectors    map[string][]float32
}

// NewVectorIndex creates a new vector index.
func NewVectorIndex(dimensions int) *VectorIndex {
	return &VectorIndex{
		dimensions: dimensions,
		vectors:    make(map[string][]float32),
	}
}

// Add adds or updates a vector in the index.
func (v *VectorIndex) Add(id string, vector []float32) error {
	if len(vector) != v.dimensions {
		return ErrDimensionMismatch
	}

	v.mu.Lock()
	defer v.mu.Unlock()

	// Normalize for faster cosine similarity calculation
	v.vectors[id] = normalizeVector(vector)
	return nil
}

// Remove removes a vector from the index.
func (v *VectorIndex) Remove(id string) {
	v.mu.Lock()
	defer v.mu.Unlock()
	delete(v.vectors, id)
}

// Search finds vectors similar to the query vector.
// Returns results sorted by similarity (highest first).
func (v *VectorIndex) Search(ctx context.Context, query []float32, limit int, minSimilarity float64) ([]indexResult, error) {
	if len(query) != v.dimensions {
		return nil, ErrDimensionMismatch
	}

	v.mu.RLock()
	defer v.mu.RUnlock()

	// Normalize query
	normalizedQuery := normalizeVector(query)

	// Calculate similarities (brute force)
	type scored struct {
		id    string
		score float64
	}
	var results []scored

	for id, vec := range v.vectors {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		// Dot product of normalized vectors = cosine similarity
		sim := dotProduct(normalizedQuery, vec)
		if sim >= minSimilarity {
			results = append(results, scored{id: id, score: sim})
		}
	}

	// Sort by score descending
	sort.Slice(results, func(i, j int) bool {
		return results[i].score > results[j].score
	})

	// Limit results
	if len(results) > limit {
		results = results[:limit]
	}

	// Convert to indexResult
	output := make([]indexResult, len(results))
	for i, r := range results {
		output[i] = indexResult{ID: r.id, Score: r.score}
	}

	return output, nil
}

// Count returns the number of vectors in the index.
func (v *VectorIndex) Count() int {
	v.mu.RLock()
	defer v.mu.RUnlock()
	return len(v.vectors)
}

// HasVector checks if a vector exists for the given ID.
func (v *VectorIndex) HasVector(id string) bool {
	v.mu.RLock()
	defer v.mu.RUnlock()
	_, exists := v.vectors[id]
	return exists
}

// GetDimensions returns the vector dimensions.
func (v *VectorIndex) GetDimensions() int {
	return v.dimensions
}

// normalizeVector returns a unit vector (L2 norm = 1).
func normalizeVector(vec []float32) []float32 {
	var sumSquares float64
	for _, v := range vec {
		sumSquares += float64(v * v)
	}

	if sumSquares == 0 {
		return vec
	}

	norm := math.Sqrt(sumSquares)
	normalized := make([]float32, len(vec))
	for i, v := range vec {
		normalized[i] = float32(float64(v) / norm)
	}
	return normalized
}

// dotProduct calculates the dot product of two vectors.
// For normalized vectors, this equals cosine similarity.
func dotProduct(a, b []float32) float64 {
	var sum float64
	for i := range a {
		sum += float64(a[i] * b[i])
	}
	return sum
}

// cosineSimilarity calculates cosine similarity between two vectors.
// Range: [-1, 1] where 1 = identical, 0 = orthogonal, -1 = opposite
func cosineSimilarity(a, b []float32) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}

	var dotProd, normA, normB float64
	for i := range a {
		dotProd += float64(a[i] * b[i])
		normA += float64(a[i] * a[i])
		normB += float64(b[i] * b[i])
	}

	if normA == 0 || normB == 0 {
		return 0
	}

	return dotProd / (math.Sqrt(normA) * math.Sqrt(normB))
}
