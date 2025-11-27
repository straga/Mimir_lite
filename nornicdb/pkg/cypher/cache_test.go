// Package cypher - Query cache tests.
package cypher

import (
	"testing"
	"time"
)

func TestQueryCache_Basic(t *testing.T) {
	cache := NewQueryCache(10)
	
	result := &ExecuteResult{
		Columns: []string{"n"},
		Rows:    [][]interface{}{{"value"}},
	}
	
	// Cache miss
	_, found := cache.Get("MATCH (n) RETURN n", nil)
	if found {
		t.Error("Expected cache miss, got hit")
	}
	
	// Store result
	cache.Put("MATCH (n) RETURN n", nil, result, 1*time.Second)
	
	// Cache hit
	cached, found := cache.Get("MATCH (n) RETURN n", nil)
	if !found {
		t.Error("Expected cache hit, got miss")
	}
	
	if len(cached.Rows) != 1 || cached.Rows[0][0] != "value" {
		t.Error("Cached result doesn't match original")
	}
}

func TestQueryCache_TTL(t *testing.T) {
	cache := NewQueryCache(10)
	
	result := &ExecuteResult{
		Columns: []string{"n"},
		Rows:    [][]interface{}{{"value"}},
	}
	
	// Store with very short TTL
	cache.Put("MATCH (n) RETURN n", nil, result, 1*time.Millisecond)
	
	// Immediate hit
	_, found := cache.Get("MATCH (n) RETURN n", nil)
	if !found {
		t.Error("Expected cache hit immediately after put")
	}
	
	// Wait for TTL to expire
	time.Sleep(5 * time.Millisecond)
	
	// Should be expired
	_, found = cache.Get("MATCH (n) RETURN n", nil)
	if found {
		t.Error("Expected cache miss after TTL expiration")
	}
}

func TestQueryCache_LRUEviction(t *testing.T) {
	cache := NewQueryCache(3) // Small cache
	
	result := &ExecuteResult{Columns: []string{"n"}}
	
	// Fill cache
	cache.Put("query1", nil, result, 1*time.Minute)
	cache.Put("query2", nil, result, 1*time.Minute)
	cache.Put("query3", nil, result, 1*time.Minute)
	
	// All should be cached
	_, found := cache.Get("query1", nil)
	if !found {
		t.Error("query1 should be cached")
	}
	
	// Add fourth item - should evict query2 (least recently used)
	cache.Put("query4", nil, result, 1*time.Minute)
	
	// query2 should be evicted
	_, found = cache.Get("query2", nil)
	if found {
		t.Error("query2 should have been evicted")
	}
	
	// query1, query3, query4 should still be there
	_, found = cache.Get("query1", nil)
	if !found {
		t.Error("query1 should still be cached")
	}
	
	_, found = cache.Get("query3", nil)
	if !found {
		t.Error("query3 should still be cached")
	}
	
	_, found = cache.Get("query4", nil)
	if !found {
		t.Error("query4 should be cached")
	}
}

func TestQueryCache_ParameterizedQueries(t *testing.T) {
	cache := NewQueryCache(10)
	
	result1 := &ExecuteResult{Rows: [][]interface{}{{"Alice"}}}
	result2 := &ExecuteResult{Rows: [][]interface{}{{"Bob"}}}
	
	params1 := map[string]interface{}{"name": "Alice"}
	params2 := map[string]interface{}{"name": "Bob"}
	
	// Cache same query with different params
	cache.Put("MATCH (n {name: $name}) RETURN n", params1, result1, 1*time.Minute)
	cache.Put("MATCH (n {name: $name}) RETURN n", params2, result2, 1*time.Minute)
	
	// Should retrieve correct results for each param set
	cached1, found := cache.Get("MATCH (n {name: $name}) RETURN n", params1)
	if !found || cached1.Rows[0][0] != "Alice" {
		t.Error("Should retrieve Alice result")
	}
	
	cached2, found := cache.Get("MATCH (n {name: $name}) RETURN n", params2)
	if !found || cached2.Rows[0][0] != "Bob" {
		t.Error("Should retrieve Bob result")
	}
}

func TestQueryCache_Invalidate(t *testing.T) {
	cache := NewQueryCache(10)
	
	result := &ExecuteResult{Columns: []string{"n"}}
	
	// Cache multiple queries
	cache.Put("query1", nil, result, 1*time.Minute)
	cache.Put("query2", nil, result, 1*time.Minute)
	cache.Put("query3", nil, result, 1*time.Minute)
	
	// Verify cached
	_, found := cache.Get("query1", nil)
	if !found {
		t.Error("query1 should be cached before invalidation")
	}
	
	// Invalidate entire cache
	cache.Invalidate()
	
	// All should be gone
	_, found = cache.Get("query1", nil)
	if found {
		t.Error("query1 should be invalidated")
	}
	
	_, found = cache.Get("query2", nil)
	if found {
		t.Error("query2 should be invalidated")
	}
	
	_, found = cache.Get("query3", nil)
	if found {
		t.Error("query3 should be invalidated")
	}
}

func TestQueryCache_Stats(t *testing.T) {
	cache := NewQueryCache(10)
	
	result := &ExecuteResult{Columns: []string{"n"}}
	
	// Initial stats
	hits, misses, size := cache.Stats()
	if hits != 0 || misses != 0 || size != 0 {
		t.Errorf("Initial stats wrong: hits=%d, misses=%d, size=%d", hits, misses, size)
	}
	
	// Cache miss
	cache.Get("query1", nil)
	hits, misses, size = cache.Stats()
	if hits != 0 || misses != 1 {
		t.Errorf("After miss: hits=%d, misses=%d", hits, misses)
	}
	
	// Add to cache
	cache.Put("query1", nil, result, 1*time.Minute)
	hits, misses, size = cache.Stats()
	if size != 1 {
		t.Errorf("Cache size should be 1, got %d", size)
	}
	
	// Cache hit
	cache.Get("query1", nil)
	hits, misses, size = cache.Stats()
	if hits != 1 || misses != 1 {
		t.Errorf("After hit: hits=%d, misses=%d", hits, misses)
	}
}

func BenchmarkQueryCache_Hit(b *testing.B) {
	cache := NewQueryCache(1000)
	result := &ExecuteResult{Columns: []string{"n"}, Rows: [][]interface{}{{"value"}}}
	cache.Put("query", nil, result, 1*time.Minute)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cache.Get("query", nil)
	}
}

func BenchmarkQueryCache_Miss(b *testing.B) {
	cache := NewQueryCache(1000)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cache.Get("nonexistent", nil)
	}
}
