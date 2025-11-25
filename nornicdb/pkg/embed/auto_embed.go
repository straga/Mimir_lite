// Package embed provides automatic embedding generation for NornicDB.
// This integrates embedding generation directly into the database server,
// eliminating the need for clients to generate and send embeddings.
package embed

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"sync"
	"time"
)

// EmbeddableProperties defines which node properties should be embedded.
// Text from these properties is concatenated for embedding generation.
var EmbeddableProperties = []string{
	"content",
	"text",
	"title",
	"name",
	"description",
}

// AutoEmbedder handles automatic embedding generation for nodes.
// It supports background batch processing and caching.
type AutoEmbedder struct {
	embedder   Embedder
	mu         sync.RWMutex
	
	// Cache: content hash -> embedding
	cache      map[string][]float32
	cacheSize  int
	maxCache   int
	
	// Background processing
	queue      chan *EmbedRequest
	workers    int
	wg         sync.WaitGroup
	ctx        context.Context
	cancel     context.CancelFunc
	
	// Stats
	embedCount    int64
	cacheHits     int64
	cacheMisses   int64
	errorCount    int64
}

// EmbedRequest represents a request to embed node content.
type EmbedRequest struct {
	NodeID     string
	Content    string
	Callback   func(nodeID string, embedding []float32, err error)
}

// AutoEmbedConfig configures the auto-embedder.
type AutoEmbedConfig struct {
	// Embedder to use for generating embeddings
	Embedder Embedder
	
	// MaxCacheSize is the max number of embeddings to cache (default: 10000)
	MaxCacheSize int
	
	// Workers is the number of background embedding workers (default: 4)
	Workers int
	
	// QueueSize is the size of the embedding queue (default: 1000)
	QueueSize int
}

// DefaultAutoEmbedConfig returns default configuration.
func DefaultAutoEmbedConfig(embedder Embedder) *AutoEmbedConfig {
	return &AutoEmbedConfig{
		Embedder:     embedder,
		MaxCacheSize: 10000,
		Workers:      4,
		QueueSize:    1000,
	}
}

// NewAutoEmbedder creates a new auto-embedder.
func NewAutoEmbedder(config *AutoEmbedConfig) *AutoEmbedder {
	ctx, cancel := context.WithCancel(context.Background())
	
	ae := &AutoEmbedder{
		embedder:  config.Embedder,
		cache:     make(map[string][]float32),
		maxCache:  config.MaxCacheSize,
		queue:     make(chan *EmbedRequest, config.QueueSize),
		workers:   config.Workers,
		ctx:       ctx,
		cancel:    cancel,
	}
	
	// Start background workers
	for i := 0; i < config.Workers; i++ {
		ae.wg.Add(1)
		go ae.worker(i)
	}
	
	return ae
}

// worker processes embedding requests from the queue.
func (ae *AutoEmbedder) worker(id int) {
	defer ae.wg.Done()
	
	for {
		select {
		case <-ae.ctx.Done():
			return
		case req, ok := <-ae.queue:
			if !ok {
				return
			}
			
			embedding, err := ae.generateEmbedding(ae.ctx, req.Content)
			if req.Callback != nil {
				req.Callback(req.NodeID, embedding, err)
			}
		}
	}
}

// Stop stops the auto-embedder and waits for workers to finish.
func (ae *AutoEmbedder) Stop() {
	ae.cancel()
	close(ae.queue)
	ae.wg.Wait()
}

// ExtractEmbeddableText extracts text from node properties for embedding.
func ExtractEmbeddableText(properties map[string]any) string {
	var parts []string
	
	for _, prop := range EmbeddableProperties {
		if val, ok := properties[prop]; ok {
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

// Embed generates an embedding for text, using cache if available.
// This is synchronous - use QueueEmbed for async processing.
func (ae *AutoEmbedder) Embed(ctx context.Context, text string) ([]float32, error) {
	if text == "" {
		return nil, nil
	}
	
	// Check cache
	hash := hashContent(text)
	ae.mu.RLock()
	if emb, ok := ae.cache[hash]; ok {
		ae.mu.RUnlock()
		ae.cacheHits++
		return emb, nil
	}
	ae.mu.RUnlock()
	ae.cacheMisses++
	
	// Generate embedding
	return ae.generateEmbedding(ctx, text)
}

// EmbedNode extracts embeddable text from node properties and generates embedding.
func (ae *AutoEmbedder) EmbedNode(ctx context.Context, properties map[string]any) ([]float32, error) {
	text := ExtractEmbeddableText(properties)
	if text == "" {
		return nil, nil
	}
	return ae.Embed(ctx, text)
}

// QueueEmbed queues an embedding request for background processing.
// The callback will be called with the result.
func (ae *AutoEmbedder) QueueEmbed(nodeID string, content string, callback func(nodeID string, embedding []float32, err error)) error {
	select {
	case ae.queue <- &EmbedRequest{
		NodeID:   nodeID,
		Content:  content,
		Callback: callback,
	}:
		return nil
	default:
		return fmt.Errorf("embedding queue full")
	}
}

// QueueEmbedNode queues a node for background embedding.
func (ae *AutoEmbedder) QueueEmbedNode(nodeID string, properties map[string]any, callback func(nodeID string, embedding []float32, err error)) error {
	text := ExtractEmbeddableText(properties)
	if text == "" {
		if callback != nil {
			callback(nodeID, nil, nil)
		}
		return nil
	}
	return ae.QueueEmbed(nodeID, text, callback)
}

// generateEmbedding generates an embedding and caches it.
func (ae *AutoEmbedder) generateEmbedding(ctx context.Context, text string) ([]float32, error) {
	if ae.embedder == nil {
		return nil, fmt.Errorf("no embedder configured")
	}
	
	// Generate embedding
	embedding, err := ae.embedder.Embed(ctx, text)
	if err != nil {
		ae.errorCount++
		return nil, err
	}
	
	ae.embedCount++
	
	// Cache the result
	hash := hashContent(text)
	ae.mu.Lock()
	defer ae.mu.Unlock()
	
	// Evict old entries if cache is full
	if ae.cacheSize >= ae.maxCache {
		// Simple eviction: remove ~10% of oldest entries
		// In production, use LRU
		count := 0
		for k := range ae.cache {
			delete(ae.cache, k)
			count++
			if count >= ae.maxCache/10 {
				break
			}
		}
		ae.cacheSize -= count
	}
	
	ae.cache[hash] = embedding
	ae.cacheSize++
	
	return embedding, nil
}

// BatchEmbed generates embeddings for multiple texts.
// Uses concurrency for better throughput.
func (ae *AutoEmbedder) BatchEmbed(ctx context.Context, texts []string) ([][]float32, error) {
	if ae.embedder == nil {
		return nil, fmt.Errorf("no embedder configured")
	}
	
	results := make([][]float32, len(texts))
	var mu sync.Mutex
	var wg sync.WaitGroup
	var firstErr error
	
	// Process in batches with limited concurrency
	semaphore := make(chan struct{}, ae.workers)
	
	for i, text := range texts {
		if text == "" {
			continue
		}
		
		wg.Add(1)
		go func(idx int, txt string) {
			defer wg.Done()
			
			semaphore <- struct{}{}
			defer func() { <-semaphore }()
			
			emb, err := ae.Embed(ctx, txt)
			mu.Lock()
			if err != nil && firstErr == nil {
				firstErr = err
			}
			results[idx] = emb
			mu.Unlock()
		}(i, text)
	}
	
	wg.Wait()
	
	if firstErr != nil {
		return results, firstErr
	}
	return results, nil
}

// Stats returns embedding statistics.
func (ae *AutoEmbedder) Stats() map[string]int64 {
	ae.mu.RLock()
	defer ae.mu.RUnlock()
	
	return map[string]int64{
		"embed_count":  ae.embedCount,
		"cache_hits":   ae.cacheHits,
		"cache_misses": ae.cacheMisses,
		"cache_size":   int64(ae.cacheSize),
		"error_count":  ae.errorCount,
		"queue_length": int64(len(ae.queue)),
	}
}

// ClearCache clears the embedding cache.
func (ae *AutoEmbedder) ClearCache() {
	ae.mu.Lock()
	defer ae.mu.Unlock()
	ae.cache = make(map[string][]float32)
	ae.cacheSize = 0
}

// WaitForQueue waits for the embedding queue to drain with a timeout.
func (ae *AutoEmbedder) WaitForQueue(timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if len(ae.queue) == 0 {
			return true
		}
		time.Sleep(100 * time.Millisecond)
	}
	return len(ae.queue) == 0
}

// hashContent generates a hash of content for caching.
func hashContent(content string) string {
	h := sha256.Sum256([]byte(content))
	return hex.EncodeToString(h[:16]) // Use first 128 bits
}
