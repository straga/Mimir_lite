// Package storage provides storage implementations.
// This file contains Mimir-specific JSON import/export functionality.
package storage

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// MimirExportNode represents a node in Mimir's export format.
type MimirExportNode struct {
	ElementID  string            `json:"elementId"`
	LegacyID   int64             `json:"legacyId"`
	Labels     []string          `json:"labels"`
	Properties map[string]any    `json:"properties"`
}

// MimirNodeRef is a reference to a node in Mimir relationship format.
type MimirNodeRef struct {
	ElementID string `json:"elementId"`
	LegacyID  int64  `json:"legacyId"`
}

// MimirExportRelationship represents a relationship in Mimir's export format.
type MimirExportRelationship struct {
	ElementID  string            `json:"elementId"`
	LegacyID   int64             `json:"legacyId"`
	Type       string            `json:"type"`
	Source     MimirNodeRef      `json:"source"`
	Target     MimirNodeRef      `json:"target"`
	Properties map[string]any    `json:"properties"`
}

// MimirExportEmbedding represents an embedding in Mimir's export format (JSONL).
type MimirExportEmbedding struct {
	NodeID     string    `json:"nodeId"`
	ElementID  string    `json:"elementId"`
	LegacyID   int64     `json:"legacyId"`
	Embedding  []float64 `json:"embedding"`
	Dimensions int       `json:"dimensions"`
}

// MimirExportMetadata represents metadata from Mimir export.
type MimirExportMetadata struct {
	ExportDate string `json:"exportDate"`
	Source     struct {
		URI  string `json:"uri"`
		User string `json:"user"`
	} `json:"source"`
	Statistics struct {
		TotalNodes         int            `json:"totalNodes"`
		TotalRelationships int            `json:"totalRelationships"`
		TotalEmbeddings    int            `json:"totalEmbeddings"`
		NodesByLabel       map[string]int `json:"nodesByLabel"`
		RelationshipsByType map[string]int `json:"relationshipsByType"`
	} `json:"statistics"`
}

// MimirImportResult contains statistics from the import operation.
type MimirImportResult struct {
	NodesImported      int
	EdgesImported      int
	EmbeddingsLoaded   int
	NodesByLabel       map[string]int
	EdgesByType        map[string]int
	Errors             []string
}

// LoadFromMimirExport loads nodes, edges, and embeddings from Mimir export format.
// This reads from the standard Mimir export directory structure:
//   - nodes.json - JSON array of nodes
//   - relationships.json - JSON array of relationships
//   - embeddings.jsonl - JSON Lines of embeddings
//   - metadata.json - Export metadata
func LoadFromMimirExport(engine Engine, dir string) (*MimirImportResult, error) {
	result := &MimirImportResult{
		NodesByLabel: make(map[string]int),
		EdgesByType:  make(map[string]int),
	}

	// 1. Load nodes
	nodesPath := filepath.Join(dir, "nodes.json")
	if err := loadMimirNodes(engine, nodesPath, result); err != nil {
		return result, fmt.Errorf("loading nodes: %w", err)
	}

	// 2. Load relationships
	relsPath := filepath.Join(dir, "relationships.json")
	if err := loadMimirRelationships(engine, relsPath, result); err != nil {
		return result, fmt.Errorf("loading relationships: %w", err)
	}

	// 3. Load embeddings (optional - enhances vector search)
	embeddingsPath := filepath.Join(dir, "embeddings.jsonl")
	if err := loadMimirEmbeddings(engine, embeddingsPath, result); err != nil {
		// Embeddings are optional, just log warning
		result.Errors = append(result.Errors, fmt.Sprintf("loading embeddings: %v", err))
	}

	return result, nil
}

// loadMimirNodes loads nodes from Mimir JSON array format.
func loadMimirNodes(engine Engine, path string, result *MimirImportResult) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	var mimirNodes []MimirExportNode
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&mimirNodes); err != nil {
		return fmt.Errorf("decoding nodes JSON: %w", err)
	}

	// Convert and bulk insert
	nodes := make([]*Node, 0, len(mimirNodes))
	for _, mn := range mimirNodes {
		node := &Node{
			// Use elementId as the primary ID (stable across exports)
			ID:         NodeID(mn.ElementID),
			Labels:     mn.Labels,
			Properties: make(map[string]any),
		}

		// Copy properties
		for k, v := range mn.Properties {
			node.Properties[k] = v
		}

		// Store legacyId for reference
		node.Properties["_legacyId"] = mn.LegacyID

		// Extract internal properties
		node.ExtractInternalProperties()

		nodes = append(nodes, node)

		// Track by label
		for _, label := range mn.Labels {
			result.NodesByLabel[label]++
		}
	}

	if err := engine.BulkCreateNodes(nodes); err != nil {
		return fmt.Errorf("bulk creating nodes: %w", err)
	}

	result.NodesImported = len(nodes)
	return nil
}

// loadMimirRelationships loads relationships from Mimir JSON array format.
func loadMimirRelationships(engine Engine, path string, result *MimirImportResult) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()

	var mimirRels []MimirExportRelationship
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&mimirRels); err != nil {
		return fmt.Errorf("decoding relationships JSON: %w", err)
	}

	// Convert and bulk insert
	edges := make([]*Edge, 0, len(mimirRels))
	for _, mr := range mimirRels {
		edge := &Edge{
			ID:         EdgeID(mr.ElementID),
			StartNode:  NodeID(mr.Source.ElementID),
			EndNode:    NodeID(mr.Target.ElementID),
			Type:       mr.Type,
			Properties: make(map[string]any),
		}

		// Copy properties
		for k, v := range mr.Properties {
			edge.Properties[k] = v
		}

		// Store legacy IDs for reference
		edge.Properties["_legacyId"] = mr.LegacyID
		edge.Properties["_sourceLegacyId"] = mr.Source.LegacyID
		edge.Properties["_targetLegacyId"] = mr.Target.LegacyID

		edges = append(edges, edge)

		// Track by type
		result.EdgesByType[mr.Type]++
	}

	if err := engine.BulkCreateEdges(edges); err != nil {
		return fmt.Errorf("bulk creating edges: %w", err)
	}

	result.EdgesImported = len(edges)
	return nil
}

// loadMimirEmbeddings loads embeddings from JSONL format and attaches to nodes.
func loadMimirEmbeddings(engine Engine, path string, result *MimirImportResult) error {
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // Optional file
		}
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	// Increase buffer for large embedding lines (~8KB per embedding)
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var emb MimirExportEmbedding
		if err := json.Unmarshal(line, &emb); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("parsing embedding: %v", err))
			continue
		}

		// Get the node and update with embedding
		node, err := engine.GetNode(NodeID(emb.ElementID))
		if err != nil {
			// Node might not exist (could be FileChunk which we filtered)
			continue
		}

		// Convert float64 to float32 for storage efficiency
		embedding := make([]float32, len(emb.Embedding))
		for i, v := range emb.Embedding {
			embedding[i] = float32(v)
		}
		node.Embedding = embedding

		if err := engine.UpdateNode(node); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("updating node embedding: %v", err))
			continue
		}

		result.EmbeddingsLoaded++
	}

	return scanner.Err()
}

// LoadMimirMetadata loads metadata from Mimir export.
func LoadMimirMetadata(dir string) (*MimirExportMetadata, error) {
	path := filepath.Join(dir, "metadata.json")
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var metadata MimirExportMetadata
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&metadata); err != nil {
		return nil, fmt.Errorf("decoding metadata JSON: %w", err)
	}

	return &metadata, nil
}

// StreamLoadMimirNodes loads nodes in a streaming fashion for large files.
// This is more memory efficient for very large exports.
func StreamLoadMimirNodes(engine Engine, path string) (*MimirImportResult, error) {
	result := &MimirImportResult{
		NodesByLabel: make(map[string]int),
		EdgesByType:  make(map[string]int),
	}

	file, err := os.Open(path)
	if err != nil {
		return result, err
	}
	defer file.Close()

	return streamLoadNodes(engine, file, result)
}

func streamLoadNodes(engine Engine, r io.Reader, result *MimirImportResult) (*MimirImportResult, error) {
	decoder := json.NewDecoder(r)

	// Read opening bracket
	t, err := decoder.Token()
	if err != nil {
		return result, fmt.Errorf("reading opening token: %w", err)
	}
	if t != json.Delim('[') {
		return result, fmt.Errorf("expected '[', got %v", t)
	}

	batchSize := 1000
	nodes := make([]*Node, 0, batchSize)

	for decoder.More() {
		var mn MimirExportNode
		if err := decoder.Decode(&mn); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("decoding node: %v", err))
			continue
		}

		node := &Node{
			ID:         NodeID(mn.ElementID),
			Labels:     mn.Labels,
			Properties: make(map[string]any),
		}

		for k, v := range mn.Properties {
			node.Properties[k] = v
		}
		node.Properties["_legacyId"] = mn.LegacyID
		node.ExtractInternalProperties()

		nodes = append(nodes, node)

		for _, label := range mn.Labels {
			result.NodesByLabel[label]++
		}

		// Bulk insert in batches
		if len(nodes) >= batchSize {
			if err := engine.BulkCreateNodes(nodes); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("bulk create: %v", err))
			}
			result.NodesImported += len(nodes)
			nodes = make([]*Node, 0, batchSize)
		}
	}

	// Insert remaining nodes
	if len(nodes) > 0 {
		if err := engine.BulkCreateNodes(nodes); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("bulk create final: %v", err))
		}
		result.NodesImported += len(nodes)
	}

	return result, nil
}
