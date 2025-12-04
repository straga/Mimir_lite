# NornicDB Multi-Database Implementation Specification

**Status:** Draft  
**Version:** 1.0  
**Date:** 2024-12-04  
**Strategy:** Key-Prefix Multi-DB (Strategy B)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagrams](#architecture-diagrams)
3. [Component Changes](#component-changes)
4. [New Files](#new-files)
5. [Modified Files](#modified-files)
6. [Data Model](#data-model)
7. [Protocol Changes](#protocol-changes)
8. [API Changes](#api-changes)
9. [Migration Strategy](#migration-strategy)
10. [Testing Strategy](#testing-strategy)
11. [Implementation Phases](#implementation-phases)
12. [Rollback Plan](#rollback-plan)

---

## Overview

### Goal
Implement Neo4j 4.x-style multi-database support allowing:
- `CREATE DATABASE tenant_name`
- `DROP DATABASE tenant_name`
- `SHOW DATABASES`
- `:USE database_name` / `database` in driver config
- Complete data isolation between databases

### Strategy
Use **key-prefix namespacing** within a single BadgerDB instance:
- All keys prefixed with database name: `{db}:{type}:{id}`
- Lightweight wrapper translates between namespaced and user-visible IDs
- Single storage engine, multiple logical databases

### Non-Goals (v1)
- Cross-database queries
- Database aliases
- Composite databases
- Per-database resource limits (future)

---

## Architecture Diagrams

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client                                      │
│                    (Neo4j Driver / Bolt Protocol)                        │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Bolt Server                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  Connection  │  │  Connection  │  │  Connection  │                   │
│  │   Handler    │  │   Handler    │  │   Handler    │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
│         │                 │                 │                            │
│         └─────────────────┼─────────────────┘                            │
│                           │                                              │
│                           ▼                                              │
│                 ┌──────────────────┐                                     │
│                 │  Cypher Executor │  ◄── Single instance                │
│                 │  (StorageExecutor)│                                    │
│                 └────────┬─────────┘                                     │
│                          │                                               │
└──────────────────────────┼───────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Storage Engine                                    │
│                    (Single BadgerDB instance)                            │
│                                                                          │
│   Keys: node:123, edge:456, idx:label:Person:123                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client                                      │
│              (Neo4j Driver with database parameter)                      │
│                                                                          │
│    driver = GraphDatabase.driver("bolt://...", database="tenant_a")      │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Bolt Server                                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     Connection Handler                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │ Conn 1      │  │ Conn 2      │  │ Conn 3      │               │   │
│  │  │ db=tenant_a │  │ db=tenant_b │  │ db=neo4j    │               │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘               │   │
│  │         │                │                │                       │   │
│  └─────────┼────────────────┼────────────────┼───────────────────────┘   │
│            │                │                │                           │
│            ▼                ▼                ▼                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Database Manager                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │    │
│  │  │ DB: neo4j   │  │ DB: tenant_a│  │ DB: tenant_b│              │    │
│  │  │ (default)   │  │             │  │             │              │    │
│  │  │ status: on  │  │ status: on  │  │ status: on  │              │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │    │
│  │                                                                  │    │
│  │  + system (metadata database)                                    │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                      │                                   │
└──────────────────────────────────────┼───────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Namespaced Storage Layer                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    NamespacedEngine                              │    │
│  │  Wraps storage.Engine, prefixes all keys with database name      │    │
│  │                                                                  │    │
│  │  CreateNode("123") → inner.CreateNode("tenant_a:123")            │    │
│  │  GetNode("123")    → inner.GetNode("tenant_a:123")               │    │
│  │  AllNodes()        → filter(inner.AllNodes(), "tenant_a:*")      │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                      │                                   │
└──────────────────────────────────────┼───────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Storage Engine                                    │
│                    (Single BadgerDB instance)                            │
│                                                                          │
│   Keys: tenant_a:node:123    tenant_b:node:789    neo4j:node:001         │
│         tenant_a:edge:456    tenant_b:edge:012    neo4j:edge:002         │
│         system:db:tenant_a   system:db:tenant_b   system:db:neo4j        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           Request Flow                                      │
└────────────────────────────────────────────────────────────────────────────┘

Client Request: session.run("CREATE (n:Person {name:'Alice'})")
                with database="tenant_a"

    │
    │  1. Bolt HELLO message with database="tenant_a"
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Bolt Server                                                             │
│                                                                          │
│  handleHello():                                                          │
│    1. Validate database exists: dbManager.Exists("tenant_a") ✓          │
│    2. Create namespaced storage: dbManager.GetStorage("tenant_a")        │
│    3. Create scoped executor: NewStorageExecutor(namespacedStorage)      │
│    4. Store in connection: conn.SetExecutor(scopedExecutor)              │
└─────────────────────────────────────────────────────────────────────────┘
    │
    │  2. Bolt RUN message: "CREATE (n:Person {name:'Alice'})"
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Connection Handler                                                      │
│                                                                          │
│  handleRun():                                                            │
│    executor := conn.GetExecutor()  // Already scoped to tenant_a        │
│    result := executor.Execute(ctx, query, params)                        │
└─────────────────────────────────────────────────────────────────────────┘
    │
    │  3. Cypher execution
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Cypher Executor (scoped to tenant_a)                                    │
│                                                                          │
│  Execute("CREATE (n:Person {name:'Alice'})"):                            │
│    1. Parse query                                                        │
│    2. Generate node ID: "uuid-12345"                                     │
│    3. Call storage.CreateNode(&Node{ID: "uuid-12345", ...})              │
└─────────────────────────────────────────────────────────────────────────┘
    │
    │  4. Namespaced storage
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NamespacedEngine (namespace="tenant_a")                                 │
│                                                                          │
│  CreateNode(node):                                                       │
│    1. Prefix ID: "uuid-12345" → "tenant_a:uuid-12345"                    │
│    2. Call inner.CreateNode(prefixedNode)                                │
└─────────────────────────────────────────────────────────────────────────┘
    │
    │  5. Actual storage
    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BadgerEngine                                                            │
│                                                                          │
│  CreateNode(node):                                                       │
│    key = "node:tenant_a:uuid-12345"                                      │
│    badger.Set(key, serialize(node))                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Changes

### Summary Table

| Component | Change Type | Effort | Description |
|-----------|-------------|--------|-------------|
| `pkg/storage/namespaced.go` | **NEW** | ~350 lines | Namespaced storage wrapper |
| `pkg/multidb/manager.go` | **NEW** | ~400 lines | Database manager |
| `pkg/multidb/metadata.go` | **NEW** | ~150 lines | Database metadata persistence |
| `pkg/multidb/errors.go` | **NEW** | ~50 lines | Multi-DB error types |
| `pkg/storage/types.go` | Modified | ~30 lines | Add DeleteByPrefix to Engine |
| `pkg/storage/badger.go` | Modified | ~80 lines | Implement DeleteByPrefix |
| `pkg/storage/memory.go` | Modified | ~40 lines | Implement DeleteByPrefix |
| `pkg/bolt/server.go` | Modified | ~150 lines | Database routing in HELLO |
| `pkg/bolt/connection.go` | Modified | ~50 lines | Per-connection DB context |
| `pkg/bolt/messages.go` | Modified | ~30 lines | Extend HELLO message |
| `pkg/cypher/executor.go` | Modified | ~100 lines | System command routing |
| `pkg/cypher/system_commands.go` | **NEW** | ~300 lines | CREATE/DROP/SHOW DATABASE |
| `pkg/nornicdb/db.go` | Modified | ~50 lines | DB manager integration |

**Total: ~1,780 lines (1,250 new + 530 modified)**

---

## New Files

### 1. `pkg/storage/namespaced.go`

**Purpose:** Wraps any `storage.Engine` with automatic key prefixing for database isolation.

```go
// pkg/storage/namespaced.go

package storage

import (
    "context"
    "strings"
    "sync"
)

// NamespacedEngine wraps a storage engine with database namespace isolation.
// All node and edge IDs are automatically prefixed with the namespace.
//
// This provides logical database separation within a single physical storage:
//   - Keys are prefixed: "tenant_a:node:123" instead of "node:123"
//   - Queries only see data in the current namespace
//   - DROP DATABASE = delete all keys with prefix
//
// Thread-safe: delegates to underlying engine's thread safety.
//
// Example:
//
//     inner := storage.NewBadgerEngine("./data")
//     tenantA := storage.NewNamespacedEngine(inner, "tenant_a")
//     
//     // Creates key "tenant_a:node:123" in BadgerDB
//     tenantA.CreateNode(&Node{ID: "123", Labels: []string{"Person"}})
//     
//     // Only sees nodes with "tenant_a:" prefix
//     nodes, _ := tenantA.AllNodes()
//
type NamespacedEngine struct {
    inner     Engine
    namespace string
    separator string // Default ":"
}

// NewNamespacedEngine creates a namespaced view of the storage engine.
//
// Parameters:
//   - inner: The underlying storage engine (shared across all namespaces)
//   - namespace: The database name (e.g., "tenant_a", "neo4j")
//
// The namespace is used as a key prefix for all operations.
func NewNamespacedEngine(inner Engine, namespace string) *NamespacedEngine {
    return &NamespacedEngine{
        inner:     inner,
        namespace: namespace,
        separator: ":",
    }
}

// Namespace returns the current database namespace.
func (n *NamespacedEngine) Namespace() string {
    return n.namespace
}

// prefixNodeID adds namespace prefix to a node ID.
// "123" → "tenant_a:123"
func (n *NamespacedEngine) prefixNodeID(id NodeID) NodeID {
    return NodeID(n.namespace + n.separator + string(id))
}

// unprefixNodeID removes namespace prefix from a node ID.
// "tenant_a:123" → "123"
func (n *NamespacedEngine) unprefixNodeID(id NodeID) NodeID {
    prefix := n.namespace + n.separator
    s := string(id)
    if strings.HasPrefix(s, prefix) {
        return NodeID(s[len(prefix):])
    }
    return id
}

// prefixEdgeID adds namespace prefix to an edge ID.
func (n *NamespacedEngine) prefixEdgeID(id EdgeID) EdgeID {
    return EdgeID(n.namespace + n.separator + string(id))
}

// unprefixEdgeID removes namespace prefix from an edge ID.
func (n *NamespacedEngine) unprefixEdgeID(id EdgeID) EdgeID {
    prefix := n.namespace + n.separator
    s := string(id)
    if strings.HasPrefix(s, prefix) {
        return EdgeID(s[len(prefix):])
    }
    return id
}

// hasNamespacePrefix checks if an ID belongs to this namespace.
func (n *NamespacedEngine) hasNodePrefix(id NodeID) bool {
    return strings.HasPrefix(string(id), n.namespace+n.separator)
}

func (n *NamespacedEngine) hasEdgePrefix(id EdgeID) bool {
    return strings.HasPrefix(string(id), n.namespace+n.separator)
}

// ============================================================================
// Node Operations
// ============================================================================

func (n *NamespacedEngine) CreateNode(node *Node) error {
    // Create a copy with namespaced ID
    namespacedNode := &Node{
        ID:           n.prefixNodeID(node.ID),
        Labels:       node.Labels,
        Properties:   node.Properties,
        CreatedAt:    node.CreatedAt,
        UpdatedAt:    node.UpdatedAt,
        DecayScore:   node.DecayScore,
        LastAccessed: node.LastAccessed,
        AccessCount:  node.AccessCount,
        Embedding:    node.Embedding,
    }
    return n.inner.CreateNode(namespacedNode)
}

func (n *NamespacedEngine) GetNode(id NodeID) (*Node, error) {
    namespacedID := n.prefixNodeID(id)
    node, err := n.inner.GetNode(namespacedID)
    if err != nil {
        return nil, err
    }
    
    // Return with unprefixed ID (user sees "123", not "tenant_a:123")
    node.ID = n.unprefixNodeID(node.ID)
    return node, nil
}

func (n *NamespacedEngine) UpdateNode(node *Node) error {
    namespacedNode := &Node{
        ID:           n.prefixNodeID(node.ID),
        Labels:       node.Labels,
        Properties:   node.Properties,
        CreatedAt:    node.CreatedAt,
        UpdatedAt:    node.UpdatedAt,
        DecayScore:   node.DecayScore,
        LastAccessed: node.LastAccessed,
        AccessCount:  node.AccessCount,
        Embedding:    node.Embedding,
    }
    return n.inner.UpdateNode(namespacedNode)
}

func (n *NamespacedEngine) DeleteNode(id NodeID) error {
    return n.inner.DeleteNode(n.prefixNodeID(id))
}

// ============================================================================
// Edge Operations
// ============================================================================

func (n *NamespacedEngine) CreateEdge(edge *Edge) error {
    namespacedEdge := &Edge{
        ID:            n.prefixEdgeID(edge.ID),
        Type:          edge.Type,
        StartNode:     n.prefixNodeID(edge.StartNode),
        EndNode:       n.prefixNodeID(edge.EndNode),
        Properties:    edge.Properties,
        CreatedAt:     edge.CreatedAt,
        UpdatedAt:     edge.UpdatedAt,
        Confidence:    edge.Confidence,
        AutoGenerated: edge.AutoGenerated,
    }
    return n.inner.CreateEdge(namespacedEdge)
}

func (n *NamespacedEngine) GetEdge(id EdgeID) (*Edge, error) {
    namespacedID := n.prefixEdgeID(id)
    edge, err := n.inner.GetEdge(namespacedID)
    if err != nil {
        return nil, err
    }
    
    // Unprefix all IDs
    edge.ID = n.unprefixEdgeID(edge.ID)
    edge.StartNode = n.unprefixNodeID(edge.StartNode)
    edge.EndNode = n.unprefixNodeID(edge.EndNode)
    return edge, nil
}

func (n *NamespacedEngine) UpdateEdge(edge *Edge) error {
    namespacedEdge := &Edge{
        ID:            n.prefixEdgeID(edge.ID),
        Type:          edge.Type,
        StartNode:     n.prefixNodeID(edge.StartNode),
        EndNode:       n.prefixNodeID(edge.EndNode),
        Properties:    edge.Properties,
        CreatedAt:     edge.CreatedAt,
        UpdatedAt:     edge.UpdatedAt,
        Confidence:    edge.Confidence,
        AutoGenerated: edge.AutoGenerated,
    }
    return n.inner.UpdateEdge(namespacedEdge)
}

func (n *NamespacedEngine) DeleteEdge(id EdgeID) error {
    return n.inner.DeleteEdge(n.prefixEdgeID(id))
}

// ============================================================================
// Query Operations - Filter to namespace
// ============================================================================

func (n *NamespacedEngine) GetNodesByLabel(label string) ([]*Node, error) {
    // Get all nodes with label, then filter to our namespace
    allNodes, err := n.inner.GetNodesByLabel(label)
    if err != nil {
        return nil, err
    }
    
    var filtered []*Node
    for _, node := range allNodes {
        if n.hasNodePrefix(node.ID) {
            node.ID = n.unprefixNodeID(node.ID)
            filtered = append(filtered, node)
        }
    }
    return filtered, nil
}

func (n *NamespacedEngine) GetFirstNodeByLabel(label string) (*Node, error) {
    nodes, err := n.GetNodesByLabel(label)
    if err != nil {
        return nil, err
    }
    if len(nodes) == 0 {
        return nil, ErrNotFound
    }
    return nodes[0], nil
}

func (n *NamespacedEngine) GetOutgoingEdges(nodeID NodeID) ([]*Edge, error) {
    edges, err := n.inner.GetOutgoingEdges(n.prefixNodeID(nodeID))
    if err != nil {
        return nil, err
    }
    
    for _, edge := range edges {
        edge.ID = n.unprefixEdgeID(edge.ID)
        edge.StartNode = n.unprefixNodeID(edge.StartNode)
        edge.EndNode = n.unprefixNodeID(edge.EndNode)
    }
    return edges, nil
}

func (n *NamespacedEngine) GetIncomingEdges(nodeID NodeID) ([]*Edge, error) {
    edges, err := n.inner.GetIncomingEdges(n.prefixNodeID(nodeID))
    if err != nil {
        return nil, err
    }
    
    for _, edge := range edges {
        edge.ID = n.unprefixEdgeID(edge.ID)
        edge.StartNode = n.unprefixNodeID(edge.StartNode)
        edge.EndNode = n.unprefixNodeID(edge.EndNode)
    }
    return edges, nil
}

func (n *NamespacedEngine) GetEdgesBetween(startID, endID NodeID) ([]*Edge, error) {
    edges, err := n.inner.GetEdgesBetween(n.prefixNodeID(startID), n.prefixNodeID(endID))
    if err != nil {
        return nil, err
    }
    
    for _, edge := range edges {
        edge.ID = n.unprefixEdgeID(edge.ID)
        edge.StartNode = n.unprefixNodeID(edge.StartNode)
        edge.EndNode = n.unprefixNodeID(edge.EndNode)
    }
    return edges, nil
}

func (n *NamespacedEngine) GetEdgeBetween(startID, endID NodeID, edgeType string) *Edge {
    edge := n.inner.GetEdgeBetween(n.prefixNodeID(startID), n.prefixNodeID(endID), edgeType)
    if edge == nil {
        return nil
    }
    edge.ID = n.unprefixEdgeID(edge.ID)
    edge.StartNode = n.unprefixNodeID(edge.StartNode)
    edge.EndNode = n.unprefixNodeID(edge.EndNode)
    return edge
}

func (n *NamespacedEngine) GetEdgesByType(edgeType string) ([]*Edge, error) {
    allEdges, err := n.inner.GetEdgesByType(edgeType)
    if err != nil {
        return nil, err
    }
    
    var filtered []*Edge
    for _, edge := range allEdges {
        if n.hasEdgePrefix(edge.ID) {
            edge.ID = n.unprefixEdgeID(edge.ID)
            edge.StartNode = n.unprefixNodeID(edge.StartNode)
            edge.EndNode = n.unprefixNodeID(edge.EndNode)
            filtered = append(filtered, edge)
        }
    }
    return filtered, nil
}

func (n *NamespacedEngine) AllNodes() ([]*Node, error) {
    allNodes, err := n.inner.AllNodes()
    if err != nil {
        return nil, err
    }
    
    var filtered []*Node
    for _, node := range allNodes {
        if n.hasNodePrefix(node.ID) {
            node.ID = n.unprefixNodeID(node.ID)
            filtered = append(filtered, node)
        }
    }
    return filtered, nil
}

func (n *NamespacedEngine) AllEdges() ([]*Edge, error) {
    allEdges, err := n.inner.AllEdges()
    if err != nil {
        return nil, err
    }
    
    var filtered []*Edge
    for _, edge := range allEdges {
        if n.hasEdgePrefix(edge.ID) {
            edge.ID = n.unprefixEdgeID(edge.ID)
            edge.StartNode = n.unprefixNodeID(edge.StartNode)
            edge.EndNode = n.unprefixNodeID(edge.EndNode)
            filtered = append(filtered, edge)
        }
    }
    return filtered, nil
}

func (n *NamespacedEngine) GetAllNodes() []*Node {
    nodes, _ := n.AllNodes()
    return nodes
}

// ============================================================================
// Degree Operations
// ============================================================================

func (n *NamespacedEngine) GetInDegree(nodeID NodeID) int {
    return n.inner.GetInDegree(n.prefixNodeID(nodeID))
}

func (n *NamespacedEngine) GetOutDegree(nodeID NodeID) int {
    return n.inner.GetOutDegree(n.prefixNodeID(nodeID))
}

// ============================================================================
// Schema Operations
// ============================================================================

func (n *NamespacedEngine) GetSchema() *SchemaManager {
    // Schema is currently global - might need namespacing later
    return n.inner.GetSchema()
}

// ============================================================================
// Bulk Operations
// ============================================================================

func (n *NamespacedEngine) BulkCreateNodes(nodes []*Node) error {
    prefixedNodes := make([]*Node, len(nodes))
    for i, node := range nodes {
        prefixedNodes[i] = &Node{
            ID:           n.prefixNodeID(node.ID),
            Labels:       node.Labels,
            Properties:   node.Properties,
            CreatedAt:    node.CreatedAt,
            UpdatedAt:    node.UpdatedAt,
            DecayScore:   node.DecayScore,
            LastAccessed: node.LastAccessed,
            AccessCount:  node.AccessCount,
            Embedding:    node.Embedding,
        }
    }
    return n.inner.BulkCreateNodes(prefixedNodes)
}

func (n *NamespacedEngine) BulkCreateEdges(edges []*Edge) error {
    prefixedEdges := make([]*Edge, len(edges))
    for i, edge := range edges {
        prefixedEdges[i] = &Edge{
            ID:            n.prefixEdgeID(edge.ID),
            Type:          edge.Type,
            StartNode:     n.prefixNodeID(edge.StartNode),
            EndNode:       n.prefixNodeID(edge.EndNode),
            Properties:    edge.Properties,
            CreatedAt:     edge.CreatedAt,
            UpdatedAt:     edge.UpdatedAt,
            Confidence:    edge.Confidence,
            AutoGenerated: edge.AutoGenerated,
        }
    }
    return n.inner.BulkCreateEdges(prefixedEdges)
}

func (n *NamespacedEngine) BulkDeleteNodes(ids []NodeID) error {
    prefixedIDs := make([]NodeID, len(ids))
    for i, id := range ids {
        prefixedIDs[i] = n.prefixNodeID(id)
    }
    return n.inner.BulkDeleteNodes(prefixedIDs)
}

func (n *NamespacedEngine) BulkDeleteEdges(ids []EdgeID) error {
    prefixedIDs := make([]EdgeID, len(ids))
    for i, id := range ids {
        prefixedIDs[i] = n.prefixEdgeID(id)
    }
    return n.inner.BulkDeleteEdges(prefixedIDs)
}

func (n *NamespacedEngine) BatchGetNodes(ids []NodeID) (map[NodeID]*Node, error) {
    prefixedIDs := make([]NodeID, len(ids))
    for i, id := range ids {
        prefixedIDs[i] = n.prefixNodeID(id)
    }
    
    result, err := n.inner.BatchGetNodes(prefixedIDs)
    if err != nil {
        return nil, err
    }
    
    // Unprefix the keys and node IDs
    unprefixed := make(map[NodeID]*Node, len(result))
    for id, node := range result {
        unprefixedID := n.unprefixNodeID(id)
        node.ID = unprefixedID
        unprefixed[unprefixedID] = node
    }
    return unprefixed, nil
}

// ============================================================================
// Lifecycle
// ============================================================================

func (n *NamespacedEngine) Close() error {
    // Don't close the inner engine - it's shared!
    // The inner engine is closed by the owner (DatabaseManager)
    return nil
}

// ============================================================================
// Stats - Namespace-scoped counts
// ============================================================================

func (n *NamespacedEngine) NodeCount() (int64, error) {
    nodes, err := n.AllNodes()
    if err != nil {
        return 0, err
    }
    return int64(len(nodes)), nil
}

func (n *NamespacedEngine) EdgeCount() (int64, error) {
    edges, err := n.AllEdges()
    if err != nil {
        return 0, err
    }
    return int64(len(edges)), nil
}
```

### 2. `pkg/multidb/manager.go`

**Purpose:** Manages database lifecycle (CREATE, DROP, SHOW) and provides namespaced storage views.

```go
// pkg/multidb/manager.go

package multidb

import (
    "fmt"
    "sync"
    "time"
    
    "nornicdb/pkg/storage"
)

// DatabaseManager manages multiple logical databases within a single storage engine.
//
// It provides:
//   - Database creation and deletion
//   - Database metadata tracking
//   - Namespaced storage engine views
//   - Neo4j 4.x multi-database compatibility
//
// Thread-safe: all operations are protected by mutex.
//
// Example:
//
//     // Create manager with shared storage
//     inner := storage.NewBadgerEngine("./data")
//     manager := multidb.NewDatabaseManager(inner, nil)
//     
//     // Create databases
//     manager.CreateDatabase("tenant_a")
//     manager.CreateDatabase("tenant_b")
//     
//     // Get namespaced storage for a tenant
//     tenantStorage, _ := manager.GetStorage("tenant_a")
//     
//     // Use storage (isolated to tenant_a)
//     tenantStorage.CreateNode(&storage.Node{ID: "123"})
//
type DatabaseManager struct {
    mu sync.RWMutex
    
    // Shared underlying storage
    inner storage.Engine
    
    // Database metadata (persisted in "system" namespace)
    databases map[string]*DatabaseInfo
    
    // Configuration
    config *Config
    
    // Cached namespaced engines (avoid recreating)
    engines map[string]*storage.NamespacedEngine
}

// DatabaseInfo holds metadata about a database.
type DatabaseInfo struct {
    Name        string    `json:"name"`
    CreatedAt   time.Time `json:"created_at"`
    CreatedBy   string    `json:"created_by,omitempty"`
    Status      string    `json:"status"` // "online", "offline"
    Type        string    `json:"type"`   // "standard", "system"
    IsDefault   bool      `json:"is_default"`
    NodeCount   int64     `json:"node_count,omitempty"`   // Cached, may be stale
    UpdatedAt   time.Time `json:"updated_at"`
}

// Config holds DatabaseManager configuration.
type Config struct {
    // DefaultDatabase is the database used when none is specified (default: "neo4j")
    DefaultDatabase string
    
    // SystemDatabase stores metadata (default: "system")
    SystemDatabase string
    
    // MaxDatabases limits total databases (0 = unlimited)
    MaxDatabases int
    
    // AllowDropDefault allows dropping the default database
    AllowDropDefault bool
}

// DefaultConfig returns default configuration.
func DefaultConfig() *Config {
    return &Config{
        DefaultDatabase:  "neo4j",
        SystemDatabase:   "system",
        MaxDatabases:     0, // Unlimited
        AllowDropDefault: false,
    }
}

// NewDatabaseManager creates a new database manager.
//
// Parameters:
//   - inner: The underlying storage engine (shared by all databases)
//   - config: Configuration (nil for defaults)
//
// On creation, initializes:
//   - System database (for metadata)
//   - Default database ("neo4j")
func NewDatabaseManager(inner storage.Engine, config *Config) (*DatabaseManager, error) {
    if config == nil {
        config = DefaultConfig()
    }
    
    m := &DatabaseManager{
        inner:     inner,
        databases: make(map[string]*DatabaseInfo),
        config:    config,
        engines:   make(map[string]*storage.NamespacedEngine),
    }
    
    // Load existing databases from system namespace
    if err := m.loadMetadata(); err != nil {
        return nil, fmt.Errorf("failed to load database metadata: %w", err)
    }
    
    // Ensure system and default databases exist
    if err := m.ensureSystemDatabases(); err != nil {
        return nil, err
    }
    
    return m, nil
}

// ensureSystemDatabases creates system and default databases if they don't exist.
func (m *DatabaseManager) ensureSystemDatabases() error {
    // System database
    if _, exists := m.databases[m.config.SystemDatabase]; !exists {
        m.databases[m.config.SystemDatabase] = &DatabaseInfo{
            Name:      m.config.SystemDatabase,
            CreatedAt: time.Now(),
            Status:    "online",
            Type:      "system",
            IsDefault: false,
        }
    }
    
    // Default database
    if _, exists := m.databases[m.config.DefaultDatabase]; !exists {
        m.databases[m.config.DefaultDatabase] = &DatabaseInfo{
            Name:      m.config.DefaultDatabase,
            CreatedAt: time.Now(),
            Status:    "online",
            Type:      "standard",
            IsDefault: true,
        }
    }
    
    return m.persistMetadata()
}

// CreateDatabase creates a new database.
//
// Parameters:
//   - name: Database name (must be unique, lowercase recommended)
//
// Returns ErrDatabaseExists if database already exists.
// Returns ErrMaxDatabasesReached if limit exceeded.
func (m *DatabaseManager) CreateDatabase(name string) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    // Validate name
    if name == "" {
        return ErrInvalidDatabaseName
    }
    
    // Check if exists
    if _, exists := m.databases[name]; exists {
        return ErrDatabaseExists
    }
    
    // Check limit
    if m.config.MaxDatabases > 0 && len(m.databases) >= m.config.MaxDatabases {
        return ErrMaxDatabasesReached
    }
    
    // Create metadata
    m.databases[name] = &DatabaseInfo{
        Name:      name,
        CreatedAt: time.Now(),
        Status:    "online",
        Type:      "standard",
        IsDefault: false,
        UpdatedAt: time.Now(),
    }
    
    return m.persistMetadata()
}

// DropDatabase removes a database and all its data.
//
// Parameters:
//   - name: Database name to drop
//
// Returns ErrDatabaseNotFound if database doesn't exist.
// Returns ErrCannotDropSystemDB for system/default databases.
func (m *DatabaseManager) DropDatabase(name string) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    // Check if exists
    info, exists := m.databases[name]
    if !exists {
        return ErrDatabaseNotFound
    }
    
    // Prevent dropping system database
    if info.Type == "system" {
        return ErrCannotDropSystemDB
    }
    
    // Prevent dropping default (unless allowed)
    if info.IsDefault && !m.config.AllowDropDefault {
        return ErrCannotDropDefaultDB
    }
    
    // Delete all data with this namespace prefix
    if deleter, ok := m.inner.(PrefixDeleter); ok {
        prefix := name + ":"
        if err := deleter.DeleteByPrefix(prefix); err != nil {
            return fmt.Errorf("failed to delete database data: %w", err)
        }
    }
    
    // Remove from metadata
    delete(m.databases, name)
    delete(m.engines, name) // Clear cached engine
    
    return m.persistMetadata()
}

// GetStorage returns a namespaced storage engine for the specified database.
//
// The returned engine is scoped to the database - all operations only
// affect data within that namespace.
func (m *DatabaseManager) GetStorage(name string) (storage.Engine, error) {
    m.mu.RLock()
    
    // Check cache first
    if engine, exists := m.engines[name]; exists {
        m.mu.RUnlock()
        return engine, nil
    }
    m.mu.RUnlock()
    
    m.mu.Lock()
    defer m.mu.Unlock()
    
    // Double-check after acquiring write lock
    if engine, exists := m.engines[name]; exists {
        return engine, nil
    }
    
    // Validate database exists
    info, exists := m.databases[name]
    if !exists {
        return nil, ErrDatabaseNotFound
    }
    
    if info.Status != "online" {
        return nil, ErrDatabaseOffline
    }
    
    // Create namespaced engine
    engine := storage.NewNamespacedEngine(m.inner, name)
    m.engines[name] = engine
    
    return engine, nil
}

// GetDefaultStorage returns storage for the default database.
func (m *DatabaseManager) GetDefaultStorage() (storage.Engine, error) {
    return m.GetStorage(m.config.DefaultDatabase)
}

// ListDatabases returns all database info.
func (m *DatabaseManager) ListDatabases() []*DatabaseInfo {
    m.mu.RLock()
    defer m.mu.RUnlock()
    
    result := make([]*DatabaseInfo, 0, len(m.databases))
    for _, info := range m.databases {
        // Return a copy
        infoCopy := *info
        result = append(result, &infoCopy)
    }
    return result
}

// GetDatabase returns info for a specific database.
func (m *DatabaseManager) GetDatabase(name string) (*DatabaseInfo, error) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    
    info, exists := m.databases[name]
    if !exists {
        return nil, ErrDatabaseNotFound
    }
    
    infoCopy := *info
    return &infoCopy, nil
}

// Exists checks if a database exists.
func (m *DatabaseManager) Exists(name string) bool {
    m.mu.RLock()
    defer m.mu.RUnlock()
    return m.databases[name] != nil
}

// DefaultDatabaseName returns the default database name.
func (m *DatabaseManager) DefaultDatabaseName() string {
    return m.config.DefaultDatabase
}

// SetDatabaseStatus sets a database online/offline.
func (m *DatabaseManager) SetDatabaseStatus(name, status string) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    info, exists := m.databases[name]
    if !exists {
        return ErrDatabaseNotFound
    }
    
    if status != "online" && status != "offline" {
        return fmt.Errorf("invalid status: %s (must be 'online' or 'offline')", status)
    }
    
    info.Status = status
    info.UpdatedAt = time.Now()
    
    // Clear cached engine if going offline
    if status == "offline" {
        delete(m.engines, name)
    }
    
    return m.persistMetadata()
}

// Close releases resources.
func (m *DatabaseManager) Close() error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    // Clear all cached engines
    m.engines = make(map[string]*storage.NamespacedEngine)
    
    // Close the underlying storage
    return m.inner.Close()
}

// PrefixDeleter is an optional interface for engines that support prefix deletion.
type PrefixDeleter interface {
    DeleteByPrefix(prefix string) error
}
```

### 3. `pkg/multidb/metadata.go`

**Purpose:** Persistence of database metadata in the system namespace.

```go
// pkg/multidb/metadata.go

package multidb

import (
    "encoding/json"
    "fmt"
    
    "nornicdb/pkg/storage"
)

const (
    metadataKey = "system:databases:metadata"
)

// loadMetadata loads database metadata from storage.
func (m *DatabaseManager) loadMetadata() error {
    // Use system namespace to load metadata
    systemEngine := storage.NewNamespacedEngine(m.inner, "system")
    
    node, err := systemEngine.GetNode(storage.NodeID("databases:metadata"))
    if err == storage.ErrNotFound {
        // No existing metadata - start fresh
        return nil
    }
    if err != nil {
        return err
    }
    
    // Parse metadata from properties
    if data, ok := node.Properties["data"].(string); ok {
        var databases map[string]*DatabaseInfo
        if err := json.Unmarshal([]byte(data), &databases); err != nil {
            return fmt.Errorf("failed to parse database metadata: %w", err)
        }
        m.databases = databases
    }
    
    return nil
}

// persistMetadata saves database metadata to storage.
func (m *DatabaseManager) persistMetadata() error {
    // Serialize metadata
    data, err := json.Marshal(m.databases)
    if err != nil {
        return fmt.Errorf("failed to serialize database metadata: %w", err)
    }
    
    // Use system namespace to store metadata
    systemEngine := storage.NewNamespacedEngine(m.inner, "system")
    
    node := &storage.Node{
        ID:     storage.NodeID("databases:metadata"),
        Labels: []string{"_System", "_Metadata"},
        Properties: map[string]any{
            "data": string(data),
            "type": "databases",
        },
    }
    
    // Try update first, then create
    if err := systemEngine.UpdateNode(node); err == storage.ErrNotFound {
        return systemEngine.CreateNode(node)
    }
    return err
}
```

### 4. `pkg/multidb/errors.go`

**Purpose:** Error types for multi-database operations.

```go
// pkg/multidb/errors.go

package multidb

import "errors"

var (
    // ErrDatabaseExists is returned when creating a database that already exists.
    ErrDatabaseExists = errors.New("database already exists")
    
    // ErrDatabaseNotFound is returned when accessing a non-existent database.
    ErrDatabaseNotFound = errors.New("database not found")
    
    // ErrDatabaseOffline is returned when accessing an offline database.
    ErrDatabaseOffline = errors.New("database is offline")
    
    // ErrCannotDropSystemDB is returned when trying to drop system database.
    ErrCannotDropSystemDB = errors.New("cannot drop system database")
    
    // ErrCannotDropDefaultDB is returned when trying to drop default database.
    ErrCannotDropDefaultDB = errors.New("cannot drop default database")
    
    // ErrMaxDatabasesReached is returned when database limit is reached.
    ErrMaxDatabasesReached = errors.New("maximum number of databases reached")
    
    // ErrInvalidDatabaseName is returned for invalid database names.
    ErrInvalidDatabaseName = errors.New("invalid database name")
)
```

### 5. `pkg/cypher/system_commands.go`

**Purpose:** Implements CREATE DATABASE, DROP DATABASE, SHOW DATABASES.

```go
// pkg/cypher/system_commands.go

package cypher

import (
    "context"
    "fmt"
    "regexp"
    "strings"
    
    "nornicdb/pkg/multidb"
)

var (
    createDBPattern = regexp.MustCompile(`(?i)^\s*CREATE\s+DATABASE\s+(\w+)(?:\s+IF\s+NOT\s+EXISTS)?`)
    dropDBPattern   = regexp.MustCompile(`(?i)^\s*DROP\s+DATABASE\s+(\w+)(?:\s+IF\s+EXISTS)?`)
    showDBsPattern  = regexp.MustCompile(`(?i)^\s*SHOW\s+DATABASES?\s*$`)
    showDBPattern   = regexp.MustCompile(`(?i)^\s*SHOW\s+DATABASE\s+(\w+)`)
)

// IsSystemCommand checks if a query is a database management command.
func IsSystemCommand(query string) bool {
    q := strings.TrimSpace(query)
    return createDBPattern.MatchString(q) ||
           dropDBPattern.MatchString(q) ||
           showDBsPattern.MatchString(q) ||
           showDBPattern.MatchString(q)
}

// ExecuteSystemCommand executes a database management command.
func (e *StorageExecutor) ExecuteSystemCommand(ctx context.Context, query string, dbManager *multidb.DatabaseManager) (*ExecuteResult, error) {
    q := strings.TrimSpace(query)
    
    // CREATE DATABASE
    if matches := createDBPattern.FindStringSubmatch(q); matches != nil {
        name := strings.ToLower(matches[1])
        ifNotExists := strings.Contains(strings.ToUpper(q), "IF NOT EXISTS")
        
        err := dbManager.CreateDatabase(name)
        if err == multidb.ErrDatabaseExists && ifNotExists {
            err = nil // Ignore error if IF NOT EXISTS
        }
        if err != nil {
            return nil, err
        }
        
        return &ExecuteResult{
            Columns: []string{"name", "status"},
            Rows: [][]interface{}{
                {name, "created"},
            },
        }, nil
    }
    
    // DROP DATABASE
    if matches := dropDBPattern.FindStringSubmatch(q); matches != nil {
        name := strings.ToLower(matches[1])
        ifExists := strings.Contains(strings.ToUpper(q), "IF EXISTS")
        
        err := dbManager.DropDatabase(name)
        if err == multidb.ErrDatabaseNotFound && ifExists {
            err = nil // Ignore error if IF EXISTS
        }
        if err != nil {
            return nil, err
        }
        
        return &ExecuteResult{
            Columns: []string{"name", "status"},
            Rows: [][]interface{}{
                {name, "dropped"},
            },
        }, nil
    }
    
    // SHOW DATABASES
    if showDBsPattern.MatchString(q) {
        databases := dbManager.ListDatabases()
        
        result := &ExecuteResult{
            Columns: []string{"name", "type", "status", "default", "createdAt"},
            Rows:    make([][]interface{}, 0, len(databases)),
        }
        
        for _, db := range databases {
            result.Rows = append(result.Rows, []interface{}{
                db.Name,
                db.Type,
                db.Status,
                db.IsDefault,
                db.CreatedAt.Format("2006-01-02T15:04:05Z"),
            })
        }
        
        return result, nil
    }
    
    // SHOW DATABASE <name>
    if matches := showDBPattern.FindStringSubmatch(q); matches != nil {
        name := strings.ToLower(matches[1])
        
        db, err := dbManager.GetDatabase(name)
        if err != nil {
            return nil, err
        }
        
        return &ExecuteResult{
            Columns: []string{"name", "type", "status", "default", "createdAt", "nodeCount"},
            Rows: [][]interface{}{
                {db.Name, db.Type, db.Status, db.IsDefault, db.CreatedAt.Format("2006-01-02T15:04:05Z"), db.NodeCount},
            },
        }, nil
    }
    
    return nil, fmt.Errorf("unrecognized system command: %s", query)
}
```

---

## Modified Files

### 1. `pkg/storage/types.go` - Add DeleteByPrefix

```go
// Add to Engine interface:

// Engine defines the storage engine interface for graph database operations.
type Engine interface {
    // ... existing methods ...
    
    // DeleteByPrefix removes all keys with the given prefix.
    // Used for dropping databases in multi-db mode.
    // Returns nil if no keys match.
    DeleteByPrefix(prefix string) error
}
```

### 2. `pkg/storage/badger.go` - Implement DeleteByPrefix

```go
// Add implementation:

// DeleteByPrefix removes all keys with the given prefix.
// This is used for dropping databases in multi-db mode.
func (b *BadgerEngine) DeleteByPrefix(prefix string) error {
    b.mu.Lock()
    defer b.mu.Unlock()
    
    if b.closed {
        return ErrStorageClosed
    }
    
    return b.db.Update(func(txn *badger.Txn) error {
        opts := badger.DefaultIteratorOptions
        opts.PrefetchValues = false // Keys only for efficiency
        
        it := txn.NewIterator(opts)
        defer it.Close()
        
        prefixBytes := []byte(prefix)
        keysToDelete := make([][]byte, 0, 100)
        
        // Collect keys to delete
        for it.Seek(prefixBytes); it.ValidForPrefix(prefixBytes); it.Next() {
            key := it.Item().KeyCopy(nil)
            keysToDelete = append(keysToDelete, key)
        }
        
        // Delete in batches (Badger transaction size limit)
        for _, key := range keysToDelete {
            if err := txn.Delete(key); err != nil {
                return err
            }
        }
        
        return nil
    })
}
```

### 3. `pkg/storage/memory.go` - Implement DeleteByPrefix

```go
// Add implementation:

// DeleteByPrefix removes all entries with keys starting with prefix.
func (m *MemoryEngine) DeleteByPrefix(prefix string) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    // Delete nodes
    for id := range m.nodes {
        if strings.HasPrefix(string(id), prefix) {
            delete(m.nodes, id)
        }
    }
    
    // Delete edges
    for id := range m.edges {
        if strings.HasPrefix(string(id), prefix) {
            delete(m.edges, id)
        }
    }
    
    // Clean up indexes (would need more work for production)
    // For now, just rebuild them
    m.rebuildIndexes()
    
    return nil
}
```

### 4. `pkg/bolt/server.go` - Database Routing

```go
// Modify handleHello to support database selection:

func (s *Server) handleHello(ctx context.Context, conn *Connection, msg map[string]interface{}) error {
    // ... existing auth logic ...
    
    // NEW: Handle database selection
    dbName := s.config.DefaultDatabase
    if db, ok := msg["db"].(string); ok && db != "" {
        dbName = db
    }
    
    // Validate database exists
    if !s.dbManager.Exists(dbName) {
        return fmt.Errorf("database '%s' does not exist", dbName)
    }
    
    // Get namespaced storage for this connection
    storage, err := s.dbManager.GetStorage(dbName)
    if err != nil {
        return err
    }
    
    // Create scoped executor for this connection
    executor := cypher.NewStorageExecutor(storage)
    conn.SetExecutor(executor)
    conn.SetDatabaseName(dbName)
    
    // ... rest of HELLO handling ...
}
```

### 5. `pkg/bolt/connection.go` - Per-Connection DB Context

```go
// Add database context to Connection:

type Connection struct {
    // ... existing fields ...
    
    // Database context
    databaseName string
    executor     *cypher.StorageExecutor
}

func (c *Connection) SetDatabaseName(name string) {
    c.databaseName = name
}

func (c *Connection) DatabaseName() string {
    return c.databaseName
}

func (c *Connection) SetExecutor(exec *cypher.StorageExecutor) {
    c.executor = exec
}

func (c *Connection) Executor() *cypher.StorageExecutor {
    return c.executor
}
```

---

## Data Model

### Key Format

```
{database}:{type}:{id}

Examples:
  neo4j:node:user-123          # Node in default database
  tenant_a:node:user-456       # Node in tenant_a database
  tenant_a:edge:follows-789    # Edge in tenant_a database
  system:node:databases:meta   # System metadata
```

### Storage Layout

```
BadgerDB Keys:
├── neo4j:node:*              # Default database nodes
├── neo4j:edge:*              # Default database edges
├── neo4j:idx:*               # Default database indexes
├── tenant_a:node:*           # Tenant A nodes
├── tenant_a:edge:*           # Tenant A edges
├── tenant_b:node:*           # Tenant B nodes
├── tenant_b:edge:*           # Tenant B edges
└── system:node:databases:*   # Database metadata
```

### Metadata Schema

```json
// system:node:databases:metadata
{
  "id": "databases:metadata",
  "labels": ["_System", "_Metadata"],
  "properties": {
    "data": "{\"neo4j\":{\"name\":\"neo4j\",\"status\":\"online\",...},...}",
    "type": "databases"
  }
}
```

---

## Protocol Changes

### Bolt HELLO Message Extension

```
// Current HELLO
{
  "user_agent": "neo4j-python/5.0",
  "scheme": "basic",
  "principal": "neo4j",
  "credentials": "password"
}

// Extended HELLO (Neo4j 4.x compatible)
{
  "user_agent": "neo4j-python/5.0",
  "scheme": "basic",
  "principal": "neo4j",
  "credentials": "password",
  "db": "tenant_a"           // NEW: Database selection
}
```

### Driver Connection String

```python
# Default database
driver = GraphDatabase.driver("bolt://localhost:7687")

# Specific database
driver = GraphDatabase.driver(
    "bolt://localhost:7687",
    database="tenant_a"
)

# Or per-session
session = driver.session(database="tenant_a")
```

---

## API Changes

### New Cypher Commands

```cypher
-- Create database
CREATE DATABASE tenant_name
CREATE DATABASE tenant_name IF NOT EXISTS

-- Drop database  
DROP DATABASE tenant_name
DROP DATABASE tenant_name IF EXISTS

-- List databases
SHOW DATABASES

-- Show specific database
SHOW DATABASE tenant_name

-- Switch database (in session)
:USE tenant_name
```

### REST API Extensions

```
POST /db/{database}/tx/commit
  - Execute query in specific database

GET /db/{database}/stats
  - Get statistics for specific database

POST /admin/databases
  - Create database (admin only)

DELETE /admin/databases/{name}
  - Drop database (admin only)
```

---

## Migration Strategy

### Phase 1: Zero-Downtime Deployment

1. Deploy new code with multi-db support disabled
2. All existing data is in default "neo4j" namespace
3. Verify no regressions

### Phase 2: Enable Multi-DB

1. Enable multi-db feature flag
2. Existing data transparently becomes "neo4j" database
3. New databases can be created

### Phase 3: Data Migration (Optional)

For migrating existing data to tenant-specific databases:

```go
// Migration script
func MigrateTenantData(manager *multidb.DatabaseManager, tenantID string) error {
    // 1. Create target database
    manager.CreateDatabase("tenant_" + tenantID)
    
    // 2. Get source (neo4j) and target storage
    src, _ := manager.GetStorage("neo4j")
    dst, _ := manager.GetStorage("tenant_" + tenantID)
    
    // 3. Find nodes belonging to tenant
    nodes, _ := src.AllNodes()
    for _, node := range nodes {
        if node.Properties["tenant_id"] == tenantID {
            dst.CreateNode(node)
        }
    }
    
    // 4. Copy edges
    edges, _ := src.AllEdges()
    for _, edge := range edges {
        // Check if both endpoints are in tenant
        start, _ := dst.GetNode(edge.StartNode)
        end, _ := dst.GetNode(edge.EndNode)
        if start != nil && end != nil {
            dst.CreateEdge(edge)
        }
    }
    
    return nil
}
```

---

## Testing Strategy

### Unit Tests

```go
// pkg/storage/namespaced_test.go
func TestNamespacedEngine_Isolation(t *testing.T) {
    inner := NewMemoryEngine()
    
    tenantA := NewNamespacedEngine(inner, "tenant_a")
    tenantB := NewNamespacedEngine(inner, "tenant_b")
    
    // Create node in tenant A
    tenantA.CreateNode(&Node{ID: "123", Labels: []string{"Person"}})
    
    // Should be visible in tenant A
    node, err := tenantA.GetNode("123")
    assert.NoError(t, err)
    assert.Equal(t, NodeID("123"), node.ID)
    
    // Should NOT be visible in tenant B
    _, err = tenantB.GetNode("123")
    assert.ErrorIs(t, err, ErrNotFound)
    
    // AllNodes should only return tenant's nodes
    nodesA, _ := tenantA.AllNodes()
    nodesB, _ := tenantB.AllNodes()
    assert.Len(t, nodesA, 1)
    assert.Len(t, nodesB, 0)
}

func TestNamespacedEngine_EdgeIsolation(t *testing.T) {
    // Similar tests for edges
}

func TestNamespacedEngine_BulkOperations(t *testing.T) {
    // Test bulk create/delete
}
```

### Integration Tests

```go
// pkg/multidb/manager_test.go
func TestDatabaseManager_CreateDrop(t *testing.T) {
    inner := storage.NewMemoryEngine()
    manager, _ := NewDatabaseManager(inner, nil)
    
    // Create database
    err := manager.CreateDatabase("tenant_a")
    assert.NoError(t, err)
    
    // Should exist
    assert.True(t, manager.Exists("tenant_a"))
    
    // Create duplicate should fail
    err = manager.CreateDatabase("tenant_a")
    assert.ErrorIs(t, err, ErrDatabaseExists)
    
    // Drop database
    err = manager.DropDatabase("tenant_a")
    assert.NoError(t, err)
    
    // Should not exist
    assert.False(t, manager.Exists("tenant_a"))
}
```

### E2E Tests

```go
// testing/multidb_e2e_test.go
func TestMultiDB_BoltProtocol(t *testing.T) {
    // Start server with multi-db
    server := startTestServer(t)
    defer server.Stop()
    
    // Connect to different databases
    driverA := neo4j.NewDriver("bolt://localhost:7687", database="tenant_a")
    driverB := neo4j.NewDriver("bolt://localhost:7687", database="tenant_b")
    
    // Create data in tenant A
    sessionA := driverA.NewSession()
    sessionA.Run("CREATE (n:Person {name: 'Alice'})", nil)
    
    // Should not be visible in tenant B
    sessionB := driverB.NewSession()
    result, _ := sessionB.Run("MATCH (n:Person) RETURN count(n)", nil)
    count := result.Single()[0].(int64)
    assert.Equal(t, int64(0), count)
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Days 1-3)
- [ ] `pkg/storage/namespaced.go` - Full implementation
- [ ] `pkg/storage/types.go` - Add DeleteByPrefix
- [ ] `pkg/storage/badger.go` - Implement DeleteByPrefix
- [ ] `pkg/storage/memory.go` - Implement DeleteByPrefix
- [ ] Unit tests for namespaced storage

### Phase 2: Database Manager (Days 4-5)
- [ ] `pkg/multidb/manager.go` - Full implementation
- [ ] `pkg/multidb/metadata.go` - Persistence
- [ ] `pkg/multidb/errors.go` - Error types
- [ ] Unit tests for database manager

### Phase 3: Bolt Protocol (Days 6-7)
- [ ] `pkg/bolt/connection.go` - Add DB context
- [ ] `pkg/bolt/server.go` - Database routing in HELLO
- [ ] `pkg/bolt/messages.go` - Extend HELLO parsing
- [ ] Integration tests for Bolt with databases

### Phase 4: Cypher Commands (Days 8-9)
- [ ] `pkg/cypher/system_commands.go` - CREATE/DROP/SHOW
- [ ] `pkg/cypher/executor.go` - Route system commands
- [ ] Tests for system commands

### Phase 5: Integration & Polish (Days 10-12)
- [ ] E2E tests with real drivers
- [ ] Documentation
- [ ] Migration guide
- [ ] Performance benchmarks
- [ ] Edge case handling

---

## Rollback Plan

If issues arise after deployment:

1. **Feature flag**: Disable multi-db, fall back to single-database mode
2. **Data preservation**: All data remains accessible in "neo4j" namespace
3. **Client compatibility**: Clients without database parameter continue working

```go
// Feature flag in config
type Config struct {
    MultiDBEnabled bool `env:"NORNICDB_MULTI_DB_ENABLED" default:"false"`
}

// In Bolt server
func (s *Server) handleHello(...) {
    if !s.config.MultiDBEnabled {
        // Use legacy single-database mode
        return s.handleHelloLegacy(ctx, conn, msg)
    }
    // ... multi-db handling
}
```

---

## Appendix: Compatibility Matrix

| Feature | Neo4j 4.x | NornicDB v1 | Notes |
|---------|-----------|-------------|-------|
| `CREATE DATABASE` | ✅ | ✅ | |
| `DROP DATABASE` | ✅ | ✅ | |
| `SHOW DATABASES` | ✅ | ✅ | |
| `SHOW DATABASE x` | ✅ | ✅ | |
| `:USE database` | ✅ | ✅ | |
| `database` param | ✅ | ✅ | In driver config |
| Cross-DB queries | ❌ | ❌ | Not supported in either |
| Database aliases | ✅ | ❌ | Future |
| Composite DBs | ✅ | ❌ | Enterprise |
| Per-DB limits | ✅ | ❌ | Future |

