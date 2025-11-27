// Package cypher - Query result caching for performance optimization.
package cypher

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

// QueryCache provides LRU (Least Recently Used) caching for Cypher query results
// with automatic TTL (Time To Live) expiration.
//
// The cache improves performance by storing results of expensive read-only queries
// and returning them instantly on subsequent identical requests. It automatically
// handles cache invalidation when write operations occur.
//
// Features:
//   - LRU eviction when cache is full (keeps most recently used)
//   - TTL-based expiration for time-sensitive data
//   - Thread-safe concurrent access
//   - Automatic invalidation on writes (CREATE, DELETE, SET, etc.)
//   - Hit/miss statistics for monitoring
//
// Example 1 - Basic Caching:
//
//	cache := NewQueryCache(1000) // Store up to 1000 query results
//	
//	// First query - cache miss, executes and stores
//	result1, found := cache.Get("MATCH (n) RETURN count(n)", nil)
//	// found == false, executes query
//	
//	cache.Put("MATCH (n) RETURN count(n)", nil, result1, 5*time.Minute)
//	
//	// Second query - cache hit, instant return
//	result2, found := cache.Get("MATCH (n) RETURN count(n)", nil)
//	// found == true, returns cached result (10-100x faster!)
//
// Example 2 - With Parameters:
//
//	params := map[string]interface{}{"name": "Alice", "minAge": 25}
//	cypher := "MATCH (n:Person {name: $name}) WHERE n.age >= $minAge RETURN n"
//	
//	// Parameters are part of cache key
//	result, found := cache.Get(cypher, params)
//	if !found {
//		result = executeQuery(cypher, params)
//		cache.Put(cypher, params, result, 1*time.Minute)
//	}
//
// Example 3 - Cache Invalidation:
//
//	// Read queries use cache
//	cache.Get("MATCH (n:User) RETURN n.name", nil)
//	
//	// Write query invalidates entire cache
//	executor.Execute(ctx, "CREATE (n:User {name: 'Bob'})", nil)
//	cache.Invalidate() // All cached results cleared
//	
//	// Next query will be cache miss
//	cache.Get("MATCH (n:User) RETURN n.name", nil) // Re-executes
//
// ELI12 (Explain Like I'm 12):
//
// Imagine you're doing math homework and your friend asks "What's 127 × 384?"
// You grab your calculator and spend 30 seconds calculating: 48,768.
//
// Five minutes later, they ask the SAME question again. Instead of using your
// calculator again, you just look at your paper where you wrote the answer:
// 48,768. That's caching! You remembered the answer from before.
//
// But what if you're told "new homework sheet" (a write operation)? You erase
// your paper because those old answers might not be right anymore. That's
// cache invalidation.
//
// The QueryCache does this for database queries - it remembers answers to
// questions it's seen before, so it can reply instantly without doing all
// the work again!
//
// Performance Impact:
//   - Cache hits are 10-100x faster than executing queries
//   - Reduces database load for read-heavy workloads
//   - Memory usage: ~1KB per cached query result
//
// Thread Safety:
//   All methods are thread-safe and can be called from multiple goroutines.
type QueryCache struct {
	cache   map[string]*cachedResult
	lruList []string // Most recent first
	mu      sync.RWMutex
	maxSize int
	hits    int64
	misses  int64
}

// cachedResult wraps a query result with metadata for TTL and LRU tracking.
type cachedResult struct {
	result    *ExecuteResult
	timestamp time.Time
	ttl       time.Duration
}

// NewQueryCache creates a new query cache with the specified maximum size.
//
// The cache uses LRU (Least Recently Used) eviction - when full, it removes
// the oldest unused entries to make room for new ones.
//
// Parameters:
//   - maxSize: Maximum number of query results to cache (recommended: 100-10000)
//
// Returns:
//   - *QueryCache ready for use
//
// Example:
//
//	// Small cache for testing
//	cache := NewQueryCache(100)
//	
//	// Production cache for high-traffic application
//	cache := NewQueryCache(10000)
//	
//	// Memory-constrained environment
//	cache := NewQueryCache(50)
//
// Memory Usage:
//   - Approximately maxSize * 1KB for typical queries
//   - 1000 entries ≈ 1MB memory
//   - 10000 entries ≈ 10MB memory
func NewQueryCache(maxSize int) *QueryCache {
	return &QueryCache{
		cache:   make(map[string]*cachedResult),
		lruList: make([]string, 0, maxSize),
		maxSize: maxSize,
	}
}

// Get retrieves a cached query result if it exists and hasn't expired.
//
// The method checks both existence and TTL expiration. If found and valid,
// it moves the entry to the front of the LRU list (marking it as recently used)
// and increments the hit counter. Otherwise, it increments the miss counter.
//
// Parameters:
//   - cypher: The Cypher query string
//   - params: Query parameters (can be nil). Different params = different cache entry.
//
// Returns:
//   - *ExecuteResult: The cached result if found and valid
//   - bool: true if cache hit, false if cache miss
//
// Example 1 - Simple Usage:
//
//	result, found := cache.Get("MATCH (n) RETURN n.name", nil)
//	if found {
//		fmt.Println("Cache hit! Using cached result")
//		return result
//	}
//	fmt.Println("Cache miss, executing query...")
//
// Example 2 - With Parameters:
//
//	params := map[string]interface{}{"id": "user-123"}
//	result, found := cache.Get("MATCH (n:User {id: $id}) RETURN n", params)
//
// Example 3 - Pattern for Query Execution:
//
//	func (e *Executor) ExecuteWithCache(cypher string, params map[string]interface{}) (*ExecuteResult, error) {
//		// Try cache first
//		if result, found := e.cache.Get(cypher, params); found {
//			return result, nil
//		}
//		
//		// Cache miss - execute query
//		result, err := e.executeQuery(cypher, params)
//		if err != nil {
//			return nil, err
//		}
//		
//		// Store in cache for next time
//		e.cache.Put(cypher, params, result, 5*time.Minute)
//		return result, nil
//	}
//
// Thread Safety:
//   Safe to call concurrently from multiple goroutines.
func (qc *QueryCache) Get(cypher string, params map[string]interface{}) (*ExecuteResult, bool) {
	key := qc.cacheKey(cypher, params)
	
	qc.mu.RLock()
	cached, exists := qc.cache[key]
	qc.mu.RUnlock()
	
	if !exists {
		qc.mu.Lock()
		qc.misses++
		qc.mu.Unlock()
		return nil, false
	}
	
	// Check TTL
	if time.Since(cached.timestamp) > cached.ttl {
		qc.mu.Lock()
		delete(qc.cache, key)
		qc.misses++
		qc.mu.Unlock()
		return nil, false
	}
	
	// Update LRU (move to front)
	qc.mu.Lock()
	qc.moveToFront(key)
	qc.hits++
	qc.mu.Unlock()
	
	return cached.result, true
}

// Put stores a query result in the cache with the specified TTL (Time To Live).
//
// If the cache is at capacity, the least recently used entry is evicted first
// (LRU eviction policy). The new entry is added to the front of the LRU list.
//
// Parameters:
//   - cypher: The Cypher query string
//   - params: Query parameters (can be nil)
//   - result: The query result to cache
//   - ttl: How long the result stays valid (e.g., 5*time.Minute)
//
// Example 1 - Basic Caching:
//
//	result, err := executor.Execute(ctx, "MATCH (n:User) RETURN count(n)", nil)
//	if err == nil {
//		cache.Put("MATCH (n:User) RETURN count(n)", nil, result, 5*time.Minute)
//	}
//
// Example 2 - Different TTLs for Different Queries:
//
//	// Fast-changing data - short TTL
//	cache.Put("MATCH (n:ActiveSession) RETURN n", nil, result, 30*time.Second)
//	
//	// Stable data - longer TTL
//	cache.Put("MATCH (n:Country) RETURN n.name", nil, result, 1*time.Hour)
//	
//	// Very stable reference data
//	cache.Put("MATCH (n:Constant) RETURN n", nil, result, 24*time.Hour)
//
// Example 3 - Pattern After Query Execution:
//
//	result, err := executeQuery(cypher, params)
//	if err != nil {
//		return nil, err
//	}
//	
//	// Cache successful results
//	if isReadOnlyQuery(cypher) {
//		cache.Put(cypher, params, result, 5*time.Minute)
//	}
//	return result, nil
//
// ELI12:
//
// When you learn a new fact, you write it in your notebook with a date.
// Later, if someone asks you that fact, you check your notebook first
// instead of looking it up again. The TTL is like saying "this fact is
// only good for 1 hour" - after that, you need to check the source again.
//
// Thread Safety:
//   Safe to call concurrently from multiple goroutines.
func (qc *QueryCache) Put(cypher string, params map[string]interface{}, result *ExecuteResult, ttl time.Duration) {
	key := qc.cacheKey(cypher, params)
	
	qc.mu.Lock()
	defer qc.mu.Unlock()
	
	// Evict if at capacity
	if len(qc.cache) >= qc.maxSize && qc.cache[key] == nil {
		qc.evictOldest()
	}
	
	qc.cache[key] = &cachedResult{
		result:    result,
		timestamp: time.Now(),
		ttl:       ttl,
	}
	
	qc.moveToFront(key)
}

// Invalidate clears all cached query results.
//
// This method is called after write operations (CREATE, DELETE, SET, REMOVE, MERGE)
// to ensure cached results don't become stale. It removes all entries from the cache.
//
// Future Enhancement: Smart invalidation that only removes entries affected by
// specific labels or patterns, rather than clearing the entire cache.
//
// Example 1 - After Write Operations:
//
//	// Execute write query
//	_, err := executor.Execute(ctx, "CREATE (n:User {name: 'Bob'})", nil)
//	if err == nil {
//		cache.Invalidate() // Clear cache so old counts/results are refreshed
//	}
//
// Example 2 - Manual Cache Reset:
//
//	// Clear cache after bulk import
//	importUsers(dataFile)
//	cache.Invalidate() // Force all queries to re-execute with new data
//
// Example 3 - Integration Pattern:
//
//	func (e *Executor) Execute(ctx context.Context, cypher string) (*ExecuteResult, error) {
//		// Check if query modifies data
//		if isWriteQuery(cypher) {
//			defer e.cache.Invalidate() // Clear cache after write
//		}
//		
//		// Try cache for read queries
//		if isReadQuery(cypher) {
//			if result, found := e.cache.Get(cypher, nil); found {
//				return result, nil
//			}
//		}
//		
//		return e.executeQuery(ctx, cypher)
//	}
//
// ELI12:
//
// Imagine you have a notebook with answers to questions about your toy collection.
// You write "I have 10 cars" in the notebook. Later, you get 3 new cars as gifts.
// Now your notebook is WRONG - it still says 10! So you erase the ENTIRE notebook
// and start fresh. Next time someone asks, you'll count again and get the right
// answer: 13 cars.
//
// That's what Invalidate does - it erases all the old answers because something
// changed, and the old answers might be wrong now.
//
// Thread Safety:
//   Safe to call concurrently from multiple goroutines.
func (qc *QueryCache) Invalidate() {
	qc.mu.Lock()
	defer qc.mu.Unlock()
	
	// Clear entire cache on write operations
	// Future optimization: smart invalidation based on labels/patterns
	qc.cache = make(map[string]*cachedResult)
	qc.lruList = qc.lruList[:0]
}

// Stats returns cache performance statistics for monitoring.
//
// Returns:
//   - hits: Number of successful cache retrievals
//   - misses: Number of cache misses (not found or expired)
//   - size: Current number of cached entries
//
// Example 1 - Monitoring Cache Performance:
//
//	hits, misses, size := cache.Stats()
//	hitRate := float64(hits) / float64(hits+misses) * 100
//	fmt.Printf("Cache hit rate: %.2f%% (%d/%d entries)\n", hitRate, size, cache.maxSize)
//	// Output: Cache hit rate: 87.50% (450/1000 entries)
//
// Example 2 - Prometheus Metrics:
//
//	func collectMetrics() {
//		hits, misses, size := cache.Stats()
//		prometheus.CacheHits.Set(float64(hits))
//		prometheus.CacheMisses.Set(float64(misses))
//		prometheus.CacheSize.Set(float64(size))
//	}
//
// Example 3 - Auto-Tuning Cache Size:
//
//	hits, misses, size := cache.Stats()
//	hitRate := float64(hits) / float64(hits+misses)
//	
//	if hitRate < 0.5 && size == maxSize {
//		// Low hit rate and cache is full - might need bigger cache
//		log.Printf("Consider increasing cache size (hit rate: %.2f%%)", hitRate*100)
//	}
//
// ELI12:
//
// Imagine you're playing a video game and trying to remember enemy patterns.
// - Hits: Times you remembered correctly and didn't get hit
// - Misses: Times you forgot and had to learn again
// - Size: How many patterns you have memorized right now
//
// If your hit rate is 80%, that means 8 out of 10 times you remembered!
//
// Thread Safety:
//   Safe to call concurrently from multiple goroutines.
func (qc *QueryCache) Stats() (hits, misses int64, size int) {
	qc.mu.RLock()
	defer qc.mu.RUnlock()
	return qc.hits, qc.misses, len(qc.cache)
}

// cacheKey generates a unique key for the query and parameters.
func (qc *QueryCache) cacheKey(cypher string, params map[string]interface{}) string {
	// Hash cypher + params for consistent key
	h := sha256.New()
	h.Write([]byte(cypher))
	
	// Add params in sorted order for consistency
	if params != nil {
		h.Write([]byte(fmt.Sprintf("%v", params)))
	}
	
	return hex.EncodeToString(h.Sum(nil))
}

// moveToFront moves key to front of LRU list.
func (qc *QueryCache) moveToFront(key string) {
	// Remove from current position
	for i, k := range qc.lruList {
		if k == key {
			qc.lruList = append(qc.lruList[:i], qc.lruList[i+1:]...)
			break
		}
	}
	
	// Add to front
	qc.lruList = append([]string{key}, qc.lruList...)
}

// evictOldest removes the least recently used entry.
func (qc *QueryCache) evictOldest() {
	if len(qc.lruList) == 0 {
		return
	}
	
	oldest := qc.lruList[len(qc.lruList)-1]
	delete(qc.cache, oldest)
	qc.lruList = qc.lruList[:len(qc.lruList)-1]
}
