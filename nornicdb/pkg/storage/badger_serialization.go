// Package storage - Serialization helpers for BadgerDB.
package storage

import (
	"encoding/json"
	"fmt"
)

// serializeNode converts a Node to JSON bytes for BadgerDB storage.
func serializeNode(node *Node) ([]byte, error) {
	return json.Marshal(node)
}

// deserializeNode converts JSON bytes back to a Node.
func deserializeNode(data []byte) (*Node, error) {
	var node Node
	if err := json.Unmarshal(data, &node); err != nil {
		return nil, fmt.Errorf("unmarshaling node: %w", err)
	}
	return &node, nil
}

// serializeEdge converts an Edge to JSON bytes for BadgerDB storage.
func serializeEdge(edge *Edge) ([]byte, error) {
	return json.Marshal(edge)
}

// deserializeEdge converts JSON bytes back to an Edge.
func deserializeEdge(data []byte) (*Edge, error) {
	var edge Edge
	if err := json.Unmarshal(data, &edge); err != nil {
		return nil, fmt.Errorf("unmarshaling edge: %w", err)
	}
	return &edge, nil
}
