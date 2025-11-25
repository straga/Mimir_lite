// Package storage provides storage implementations.
// This file contains tests for Mimir-specific import functionality.
package storage

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestLoadFromMimirExport_RealData tests loading the actual exported Neo4j data.
// This test uses the real export in data/nornicdb/ directory.
func TestLoadFromMimirExport_RealData(t *testing.T) {
	// Try multiple possible paths for exported data
	possiblePaths := []string{
		// From nornicdb/pkg/storage (when running from nornicdb)
		filepath.Join("..", "..", "..", "data", "nornicdb"),
		// Direct path (when MIMIR_DATA_DIR is set)
		os.Getenv("MIMIR_DATA_DIR"),
		// Absolute fallback
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
	
	// Check if export directory exists
	if exportDir == "" {
		t.Skipf("Export directory not found in any of: %v (run export-neo4j-to-json.mjs first)", possiblePaths)
	}
	t.Logf("Using export directory: %s", exportDir)

	// Load metadata first to know what to expect
	metadata, err := LoadMimirMetadata(exportDir)
	if err != nil {
		t.Logf("Warning: Could not load metadata: %v", err)
	} else {
		t.Logf("Export metadata:")
		t.Logf("  Export date: %s", metadata.ExportDate)
		t.Logf("  Source: %s", metadata.Source.URI)
		t.Logf("  Expected nodes: %d", metadata.Statistics.TotalNodes)
		t.Logf("  Expected relationships: %d", metadata.Statistics.TotalRelationships)
		t.Logf("  Expected embeddings: %d", metadata.Statistics.TotalEmbeddings)
	}

	// Create a fresh memory engine
	engine := NewMemoryEngine()
	defer engine.Close()

	// Load the export
	t.Log("Starting import...")
	startTime := time.Now()
	
	result, err := LoadFromMimirExport(engine, exportDir)
	
	duration := time.Since(startTime)
	t.Logf("Import completed in %v", duration)

	// Check for errors
	if err != nil {
		t.Fatalf("Import failed: %v", err)
	}

	// Report results
	t.Logf("Import results:")
	t.Logf("  Nodes imported: %d", result.NodesImported)
	t.Logf("  Edges imported: %d", result.EdgesImported)
	t.Logf("  Embeddings loaded: %d", result.EmbeddingsLoaded)
	
	t.Logf("  Nodes by label:")
	for label, count := range result.NodesByLabel {
		t.Logf("    - %s: %d", label, count)
	}
	
	t.Logf("  Edges by type:")
	for edgeType, count := range result.EdgesByType {
		t.Logf("    - %s: %d", edgeType, count)
	}

	if len(result.Errors) > 0 {
		t.Logf("  Warnings/Errors (%d):", len(result.Errors))
		for i, e := range result.Errors {
			if i < 10 { // Only show first 10
				t.Logf("    - %s", e)
			}
		}
		if len(result.Errors) > 10 {
			t.Logf("    ... and %d more", len(result.Errors)-10)
		}
	}

	// Verify counts
	nodeCount, err := engine.NodeCount()
	require.NoError(t, err)
	assert.Equal(t, int64(result.NodesImported), nodeCount, "Node count mismatch")

	edgeCount, err := engine.EdgeCount()
	require.NoError(t, err)
	assert.Equal(t, int64(result.EdgesImported), edgeCount, "Edge count mismatch")

	// Verify we can query nodes by label
	fileChunks, err := engine.GetNodesByLabel("FileChunk")
	require.NoError(t, err)
	t.Logf("  Retrieved %d FileChunk nodes by label", len(fileChunks))

	nodes, err := engine.GetNodesByLabel("Node")
	require.NoError(t, err)
	t.Logf("  Retrieved %d Node nodes by label", len(nodes))

	// Test that we can traverse relationships
	if len(nodes) > 0 {
		sampleNode := nodes[0]
		t.Logf("Sample node: %s", sampleNode.ID)
		t.Logf("  Labels: %v", sampleNode.Labels)
		t.Logf("  Properties: %d keys", len(sampleNode.Properties))
		
		outgoing, err := engine.GetOutgoingEdges(sampleNode.ID)
		require.NoError(t, err)
		t.Logf("  Outgoing edges: %d", len(outgoing))

		incoming, err := engine.GetIncomingEdges(sampleNode.ID)
		require.NoError(t, err)
		t.Logf("  Incoming edges: %d", len(incoming))
	}

	// Performance stats
	t.Logf("Performance:")
	t.Logf("  Import rate: %.0f nodes/sec", float64(result.NodesImported)/duration.Seconds())
	t.Logf("  Import rate: %.0f edges/sec", float64(result.EdgesImported)/duration.Seconds())
}

// TestLoadFromMimirExport_SmallSample tests loading with a small sample.
func TestLoadFromMimirExport_SmallSample(t *testing.T) {
	// Create temporary directory with sample data
	tmpDir := t.TempDir()

	// Create sample nodes.json
	nodesJSON := `[
  {"elementId": "4:abc:1", "legacyId": 1, "labels": ["Node"], "properties": {"id": "node-1", "type": "todo", "title": "Test Todo"}},
  {"elementId": "4:abc:2", "legacyId": 2, "labels": ["Node"], "properties": {"id": "node-2", "type": "memory", "content": "Remember this"}},
  {"elementId": "4:abc:3", "legacyId": 3, "labels": ["FileChunk"], "properties": {"text": "function hello() {}", "chunk_index": 0}}
]`
	err := os.WriteFile(filepath.Join(tmpDir, "nodes.json"), []byte(nodesJSON), 0644)
	require.NoError(t, err)

	// Create sample relationships.json
	relsJSON := `[
  {"elementId": "5:abc:1", "legacyId": 1, "type": "RELATES_TO", "source": {"elementId": "4:abc:1", "legacyId": 1}, "target": {"elementId": "4:abc:2", "legacyId": 2}, "properties": {}},
  {"elementId": "5:abc:2", "legacyId": 2, "type": "depends_on", "source": {"elementId": "4:abc:2", "legacyId": 2}, "target": {"elementId": "4:abc:1", "legacyId": 1}, "properties": {"weight": 0.8}}
]`
	err = os.WriteFile(filepath.Join(tmpDir, "relationships.json"), []byte(relsJSON), 0644)
	require.NoError(t, err)

	// Create memory engine
	engine := NewMemoryEngine()
	defer engine.Close()

	// Load the sample
	result, err := LoadFromMimirExport(engine, tmpDir)
	require.NoError(t, err)

	// Verify results
	assert.Equal(t, 3, result.NodesImported)
	assert.Equal(t, 2, result.EdgesImported)
	assert.Equal(t, 2, result.NodesByLabel["Node"])
	assert.Equal(t, 1, result.NodesByLabel["FileChunk"])
	assert.Equal(t, 1, result.EdgesByType["RELATES_TO"])
	assert.Equal(t, 1, result.EdgesByType["depends_on"])

	// Verify we can retrieve nodes
	node1, err := engine.GetNode("4:abc:1")
	require.NoError(t, err)
	assert.Equal(t, "todo", node1.Properties["type"])
	assert.Equal(t, "Test Todo", node1.Properties["title"])

	// Verify edges
	outgoing, err := engine.GetOutgoingEdges("4:abc:1")
	require.NoError(t, err)
	assert.Len(t, outgoing, 1)
	assert.Equal(t, "RELATES_TO", outgoing[0].Type)
}

// TestLoadMimirEmbeddings tests loading embeddings from JSONL.
func TestLoadMimirEmbeddings(t *testing.T) {
	tmpDir := t.TempDir()

	// Create a node first
	nodesJSON := `[
  {"elementId": "4:abc:1", "legacyId": 1, "labels": ["Node"], "properties": {"id": "node-1", "type": "memory"}}
]`
	err := os.WriteFile(filepath.Join(tmpDir, "nodes.json"), []byte(nodesJSON), 0644)
	require.NoError(t, err)

	// Empty relationships
	err = os.WriteFile(filepath.Join(tmpDir, "relationships.json"), []byte("[]"), 0644)
	require.NoError(t, err)

	// Create embeddings.jsonl with a sample embedding
	embeddingsJSONL := `{"nodeId": "node-1", "elementId": "4:abc:1", "legacyId": 1, "embedding": [0.1, 0.2, 0.3, 0.4], "dimensions": 4}`
	err = os.WriteFile(filepath.Join(tmpDir, "embeddings.jsonl"), []byte(embeddingsJSONL), 0644)
	require.NoError(t, err)

	// Load
	engine := NewMemoryEngine()
	defer engine.Close()

	result, err := LoadFromMimirExport(engine, tmpDir)
	require.NoError(t, err)

	assert.Equal(t, 1, result.NodesImported)
	assert.Equal(t, 1, result.EmbeddingsLoaded)

	// Verify embedding was loaded
	node, err := engine.GetNode("4:abc:1")
	require.NoError(t, err)
	assert.Len(t, node.Embedding, 4)
	assert.InDelta(t, 0.1, float64(node.Embedding[0]), 0.001)
	assert.InDelta(t, 0.4, float64(node.Embedding[3]), 0.001)
}

// TestStreamLoadMimirNodes tests streaming load for large files.
func TestStreamLoadMimirNodes(t *testing.T) {
	tmpDir := t.TempDir()

	// Create a larger sample
	var nodes []string
	for i := 0; i < 100; i++ {
		nodes = append(nodes, fmt.Sprintf(
			`{"elementId": "4:abc:%d", "legacyId": %d, "labels": ["Node"], "properties": {"id": "node-%d"}}`,
			i, i, i,
		))
	}
	nodesJSON := "[" + "\n"
	for i, n := range nodes {
		if i > 0 {
			nodesJSON += ",\n"
		}
		nodesJSON += "  " + n
	}
	nodesJSON += "\n]"

	nodesPath := filepath.Join(tmpDir, "nodes.json")
	err := os.WriteFile(nodesPath, []byte(nodesJSON), 0644)
	require.NoError(t, err)

	// Stream load
	engine := NewMemoryEngine()
	defer engine.Close()

	result, err := StreamLoadMimirNodes(engine, nodesPath)
	require.NoError(t, err)

	assert.Equal(t, 100, result.NodesImported)
	assert.Equal(t, 100, result.NodesByLabel["Node"])

	// Verify count
	count, err := engine.NodeCount()
	require.NoError(t, err)
	assert.Equal(t, int64(100), count)
}

// BenchmarkLoadFromMimirExport benchmarks the import performance.
func BenchmarkLoadFromMimirExport(b *testing.B) {
	// Path to exported data
	exportDir := filepath.Join("..", "..", "data", "nornicdb")
	
	if _, err := os.Stat(exportDir); os.IsNotExist(err) {
		b.Skipf("Export directory not found: %s", exportDir)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		engine := NewMemoryEngine()
		_, err := LoadFromMimirExport(engine, exportDir)
		if err != nil {
			b.Fatalf("Import failed: %v", err)
		}
		engine.Close()
	}
}
