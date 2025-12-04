# NornicDB Multi-Tenancy & Virtual Database Architecture

**Status:** Draft  
**Author:** AI Assistant  
**Date:** 2024-12-04

---

## Executive Summary

This document evaluates four strategies for implementing multi-tenancy in NornicDB, ranging from lightweight query-layer isolation to full Neo4j 4.x-style virtual databases. The recommended approach is **Strategy B: Key-Prefix Multi-DB** which provides strong isolation with moderate implementation effort.

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Bolt Server                             │
│  (Single connection pool, no DB awareness)                   │
├─────────────────────────────────────────────────────────────┤
│                    Cypher Executor                           │
│  (Single executor instance)                                  │
├─────────────────────────────────────────────────────────────┤
│                    Storage Engine                            │
│  (Single BadgerDB instance at ./data)                        │
├─────────────────────────────────────────────────────────────┤
│                      BadgerDB                                │
│  Key format: node:<id>, edge:<id>, etc.                      │
└─────────────────────────────────────────────────────────────┘
```

**Current limitations:**
- No database isolation
- No `USE database` command
- All data in single namespace
- No per-tenant resource limits

---

## Strategy Comparison

| Strategy | Isolation | Effort | Performance | Neo4j Compat | Recommended |
|----------|-----------|--------|-------------|--------------|-------------|
| A: Separate Storage | ⭐⭐⭐ | High | ⭐⭐ | ⭐⭐⭐ | For enterprise |
| B: Key-Prefix | ⭐⭐⭐ | Medium | ⭐⭐⭐ | ⭐⭐⭐ | **✅ Best balance** |
| C: Connection Context | ⭐⭐ | Low | ⭐⭐⭐ | ⭐⭐ | Quick win |
| D: Label Namespace | ⭐ | Very Low | ⭐⭐⭐ | ⭐ | Temporary |

---

## Strategy A: Separate Storage Instances

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Bolt Server                             │
│  Connection → DB routing based on auth/USE command           │
├─────────────────────────────────────────────────────────────┤
│                   Database Manager                           │
│  Maps: db_name → *DB instance                                │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   DB: neo4j  │  DB: tenant1 │  DB: tenant2 │   DB: system   │
│   (default)  │              │              │   (metadata)   │
├──────────────┼──────────────┼──────────────┼────────────────┤
│  BadgerDB    │  BadgerDB    │  BadgerDB    │   BadgerDB     │
│  ./data/neo4j│  ./data/t1   │  ./data/t2   │  ./data/system │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### Implementation

```go
// pkg/multidb/manager.go

// DatabaseManager manages multiple virtual databases
type DatabaseManager struct {
    mu        sync.RWMutex
    databases map[string]*nornicdb.DB
    config    *ManagerConfig
    dataDir   string
}

type ManagerConfig struct {
    MaxDatabases     int           // Limit total databases
    DefaultDB        string        // Default database name (neo4j)
    SystemDB         string        // System database for metadata
    LazyLoad         bool          // Load DBs on first access
    ResourceLimits   ResourceLimit // Per-DB limits
}

type ResourceLimit struct {
    MaxNodes       int64
    MaxMemoryMB    int64
    MaxStorageGB   int64
}

// CreateDatabase creates a new virtual database
func (m *DatabaseManager) CreateDatabase(name string, opts *CreateDBOptions) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    if _, exists := m.databases[name]; exists {
        return ErrDatabaseExists
    }
    
    if len(m.databases) >= m.config.MaxDatabases {
        return ErrMaxDatabasesReached
    }
    
    // Create isolated storage directory
    dbPath := filepath.Join(m.dataDir, name)
    
    // Initialize new DB instance
    db, err := nornicdb.Open(dbPath, &nornicdb.Config{
        // Per-tenant config
    })
    if err != nil {
        return fmt.Errorf("failed to create database %s: %w", name, err)
    }
    
    m.databases[name] = db
    
    // Record in system database
    return m.recordDatabaseMetadata(name, opts)
}

// GetDatabase returns database by name, creating if lazy-load enabled
func (m *DatabaseManager) GetDatabase(name string) (*nornicdb.DB, error) {
    m.mu.RLock()
    db, exists := m.databases[name]
    m.mu.RUnlock()
    
    if exists {
        return db, nil
    }
    
    if !m.config.LazyLoad {
        return nil, ErrDatabaseNotFound
    }
    
    // Lazy load from disk
    return m.loadDatabase(name)
}

// DropDatabase removes a database and its data
func (m *DatabaseManager) DropDatabase(name string) error {
    if name == m.config.SystemDB {
        return ErrCannotDropSystemDB
    }
    
    m.mu.Lock()
    defer m.mu.Unlock()
    
    db, exists := m.databases[name]
    if !exists {
        return ErrDatabaseNotFound
    }
    
    // Close and remove
    if err := db.Close(); err != nil {
        return err
    }
    
    delete(m.databases, name)
    
    // Remove data directory
    dbPath := filepath.Join(m.dataDir, name)
    return os.RemoveAll(dbPath)
}
```

### Bolt Protocol Extension

```go
// pkg/bolt/multidb.go

// Handle USE database command in Bolt protocol
func (s *Server) handleUseDatabase(ctx context.Context, dbName string) error {
    // Validate database exists
    db, err := s.dbManager.GetDatabase(dbName)
    if err != nil {
        return err
    }
    
    // Update connection context
    conn := getConnection(ctx)
    conn.SetDatabase(db)
    conn.SetDatabaseName(dbName)
    
    return nil
}

// Extend HELLO message to support database selection
type HelloMessage struct {
    UserAgent    string
    Auth         map[string]interface{}
    Database     string  // NEW: Initial database selection
    // ...
}

func (s *Server) handleHello(ctx context.Context, msg *HelloMessage) error {
    // ... existing auth logic ...
    
    // Handle database selection
    dbName := msg.Database
    if dbName == "" {
        dbName = s.dbManager.config.DefaultDB
    }
    
    return s.handleUseDatabase(ctx, dbName)
}
```

### Cypher Commands

```go
// pkg/cypher/database_commands.go

// System commands for database management
func (e *StorageExecutor) executeSystemCommand(ctx context.Context, cmd string) (*ExecuteResult, error) {
    switch {
    case strings.HasPrefix(cmd, "CREATE DATABASE"):
        return e.createDatabase(ctx, cmd)
    case strings.HasPrefix(cmd, "DROP DATABASE"):
        return e.dropDatabase(ctx, cmd)
    case strings.HasPrefix(cmd, "SHOW DATABASES"):
        return e.showDatabases(ctx)
    case strings.HasPrefix(cmd, "SHOW DATABASE"):
        return e.showDatabase(ctx, cmd)
    }
    return nil, ErrUnknownCommand
}

// CREATE DATABASE tenant1
func (e *StorageExecutor) createDatabase(ctx context.Context, cmd string) (*ExecuteResult, error) {
    // Parse: CREATE DATABASE <name> [IF NOT EXISTS] [OPTIONS {...}]
    name := parseDBName(cmd)
    
    err := e.dbManager.CreateDatabase(name, nil)
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

// SHOW DATABASES
func (e *StorageExecutor) showDatabases(ctx context.Context) (*ExecuteResult, error) {
    dbs := e.dbManager.ListDatabases()
    
    result := &ExecuteResult{
        Columns: []string{"name", "type", "status", "default"},
    }
    
    for _, db := range dbs {
        result.Rows = append(result.Rows, []interface{}{
            db.Name,
            db.Type,      // "standard" or "system"
            db.Status,    // "online", "offline"
            db.IsDefault,
        })
    }
    
    return result, nil
}
```

### Effort Estimate: HIGH

**Files to modify/create:**
- `pkg/multidb/manager.go` (new) - ~500 lines
- `pkg/multidb/metadata.go` (new) - ~200 lines
- `pkg/bolt/server.go` - Add database routing (~100 lines)
- `pkg/bolt/messages.go` - Extend HELLO message (~50 lines)
- `pkg/cypher/executor.go` - Add system commands (~200 lines)
- `pkg/nornicdb/db.go` - Make DB instance-aware (~100 lines)

**Total: ~1,150 new lines + 200 modified**

**Pros:**
- Complete isolation (separate files on disk)
- Easy backup/restore per tenant
- Per-tenant resource limits
- Full Neo4j 4.x compatibility

**Cons:**
- Memory overhead (N × BadgerDB instances)
- Slower startup (load all DBs)
- Complex operational model

---

## Strategy B: Key-Prefix Multi-DB (RECOMMENDED)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Bolt Server                             │
│  Connection carries db_name context                          │
├─────────────────────────────────────────────────────────────┤
│                   Database Manager                           │
│  Lightweight: just tracks db names + metadata                │
├─────────────────────────────────────────────────────────────┤
│                 Namespaced Storage Engine                    │
│  Wraps storage.Engine, prefixes all keys with db_name        │
├─────────────────────────────────────────────────────────────┤
│                   Single BadgerDB                            │
│  Key format: <db>:node:<id>, <db>:edge:<id>                  │
│  Example: tenant1:node:123, neo4j:edge:456                   │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```go
// pkg/storage/namespaced.go

// NamespacedEngine wraps a storage engine with database namespace isolation.
// All keys are automatically prefixed with the database name.
type NamespacedEngine struct {
    inner     Engine
    namespace string // Database name
}

// NewNamespacedEngine creates a namespaced view of the storage engine.
func NewNamespacedEngine(inner Engine, namespace string) *NamespacedEngine {
    return &NamespacedEngine{
        inner:     inner,
        namespace: namespace,
    }
}

// prefixKey adds namespace prefix to a key
func (n *NamespacedEngine) prefixKey(key string) string {
    return n.namespace + ":" + key
}

// unprefixKey removes namespace prefix from a key
func (n *NamespacedEngine) unprefixKey(key string) string {
    prefix := n.namespace + ":"
    if strings.HasPrefix(key, prefix) {
        return key[len(prefix):]
    }
    return key
}

// CreateNode creates a node in the namespaced database
func (n *NamespacedEngine) CreateNode(node *Node) error {
    // Create a copy with namespaced ID
    namespacedNode := &Node{
        ID:         NodeID(n.prefixKey(string(node.ID))),
        Labels:     node.Labels,
        Properties: node.Properties,
    }
    return n.inner.CreateNode(namespacedNode)
}

// GetNode retrieves a node from the namespaced database
func (n *NamespacedEngine) GetNode(id NodeID) (*Node, error) {
    namespacedID := NodeID(n.prefixKey(string(id)))
    node, err := n.inner.GetNode(namespacedID)
    if err != nil {
        return nil, err
    }
    
    // Remove namespace prefix from returned node
    node.ID = NodeID(n.unprefixKey(string(node.ID)))
    return node, nil
}

// GetAllNodes returns only nodes in this namespace
func (n *NamespacedEngine) GetAllNodes() ([]*Node, error) {
    allNodes, err := n.inner.GetAllNodes()
    if err != nil {
        return nil, err
    }
    
    prefix := n.namespace + ":"
    var filtered []*Node
    
    for _, node := range allNodes {
        if strings.HasPrefix(string(node.ID), prefix) {
            // Remove prefix from ID
            node.ID = NodeID(n.unprefixKey(string(node.ID)))
            filtered = append(filtered, node)
        }
    }
    
    return filtered, nil
}

// CreateEdge creates an edge with namespaced node references
func (n *NamespacedEngine) CreateEdge(edge *Edge) error {
    namespacedEdge := &Edge{
        ID:         EdgeID(n.prefixKey(string(edge.ID))),
        Type:       edge.Type,
        Source:     NodeID(n.prefixKey(string(edge.Source))),
        Target:     NodeID(n.prefixKey(string(edge.Target))),
        Properties: edge.Properties,
    }
    return n.inner.CreateEdge(namespacedEdge)
}

// ... implement all other Engine interface methods similarly ...

// Namespace returns the current namespace (database name)
func (n *NamespacedEngine) Namespace() string {
    return n.namespace
}
```

### Database Manager (Lightweight)

```go
// pkg/multidb/manager.go

// DatabaseManager tracks virtual databases (metadata only)
type DatabaseManager struct {
    mu       sync.RWMutex
    storage  storage.Engine // Single shared storage
    metadata map[string]*DatabaseMetadata
    config   *ManagerConfig
}

type DatabaseMetadata struct {
    Name      string
    CreatedAt time.Time
    CreatedBy string
    Status    string // "online", "offline"
    NodeCount int64  // Cached count
    Options   map[string]interface{}
}

// CreateDatabase registers a new virtual database
func (m *DatabaseManager) CreateDatabase(name string) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    if _, exists := m.metadata[name]; exists {
        return ErrDatabaseExists
    }
    
    // Just record metadata - no new storage instance
    m.metadata[name] = &DatabaseMetadata{
        Name:      name,
        CreatedAt: time.Now(),
        Status:    "online",
    }
    
    // Persist metadata
    return m.persistMetadata()
}

// GetStorageForDatabase returns a namespaced storage engine
func (m *DatabaseManager) GetStorageForDatabase(name string) (storage.Engine, error) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    
    meta, exists := m.metadata[name]
    if !exists {
        return nil, ErrDatabaseNotFound
    }
    
    if meta.Status != "online" {
        return nil, ErrDatabaseOffline
    }
    
    // Return namespaced view of shared storage
    return storage.NewNamespacedEngine(m.storage, name), nil
}

// DropDatabase removes a virtual database
func (m *DatabaseManager) DropDatabase(name string) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    if name == "system" || name == "neo4j" {
        return ErrCannotDropSystemDB
    }
    
    // Delete all keys with this namespace prefix
    prefix := name + ":"
    if err := m.storage.DeleteByPrefix(prefix); err != nil {
        return err
    }
    
    delete(m.metadata, name)
    return m.persistMetadata()
}
```

### Storage Interface Extension

```go
// pkg/storage/types.go

// Engine interface - add prefix deletion
type Engine interface {
    // ... existing methods ...
    
    // DeleteByPrefix removes all keys with given prefix (for namespace cleanup)
    DeleteByPrefix(prefix string) error
}

// pkg/storage/badger.go

// DeleteByPrefix removes all keys with the given prefix
func (b *BadgerEngine) DeleteByPrefix(prefix string) error {
    return b.db.Update(func(txn *badger.Txn) error {
        opts := badger.DefaultIteratorOptions
        opts.PrefetchValues = false // Keys only
        
        it := txn.NewIterator(opts)
        defer it.Close()
        
        prefixBytes := []byte(prefix)
        keysToDelete := make([][]byte, 0)
        
        for it.Seek(prefixBytes); it.ValidForPrefix(prefixBytes); it.Next() {
            key := it.Item().KeyCopy(nil)
            keysToDelete = append(keysToDelete, key)
        }
        
        for _, key := range keysToDelete {
            if err := txn.Delete(key); err != nil {
                return err
            }
        }
        
        return nil
    })
}
```

### Connection Context

```go
// pkg/bolt/connection.go

// Connection holds per-connection state including database context
type Connection struct {
    id            string
    storage       storage.Engine // Namespaced storage for this connection
    databaseName  string
    user          *auth.User
    txManager     *TransactionManager
}

// SetDatabase switches the connection to a different database
func (c *Connection) SetDatabase(name string, dbManager *multidb.DatabaseManager) error {
    storage, err := dbManager.GetStorageForDatabase(name)
    if err != nil {
        return err
    }
    
    c.storage = storage
    c.databaseName = name
    return nil
}

// GetStorage returns the current database's storage engine
func (c *Connection) GetStorage() storage.Engine {
    return c.storage
}
```

### Effort Estimate: MEDIUM

**Files to create:**
- `pkg/storage/namespaced.go` - ~300 lines
- `pkg/multidb/manager.go` - ~250 lines
- `pkg/multidb/metadata.go` - ~100 lines

**Files to modify:**
- `pkg/storage/types.go` - Add DeleteByPrefix (~10 lines)
- `pkg/storage/badger.go` - Implement DeleteByPrefix (~40 lines)
- `pkg/bolt/server.go` - Database context routing (~80 lines)
- `pkg/bolt/connection.go` - Add database field (~30 lines)
- `pkg/cypher/executor.go` - System commands (~150 lines)

**Total: ~650 new lines + 310 modified = ~960 lines**

**Pros:**
- Strong isolation (key prefixes)
- Single storage engine (efficient memory)
- Easy to implement
- Full Neo4j 4.x compatibility
- Fast startup (single BadgerDB)
- Easy migration path

**Cons:**
- Shared I/O bandwidth
- DROP DATABASE slower (iterate + delete)
- No per-database file-level backup (requires filtering)

---

## Strategy C: Connection-Context Isolation

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Bolt Server                             │
│  Each connection has tenant_id in context                    │
├─────────────────────────────────────────────────────────────┤
│                    Query Rewriter                            │
│  Injects WHERE tenant_id = $tenantId into all queries        │
├─────────────────────────────────────────────────────────────┤
│                   Single Storage Engine                      │
│  All data in single namespace, filtered by tenant_id prop    │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```go
// pkg/cypher/tenant_rewriter.go

// TenantRewriter automatically injects tenant filters into queries
type TenantRewriter struct {
    tenantProperty string // e.g., "tenant_id"
}

// RewriteQuery adds tenant filters to all MATCH clauses
func (r *TenantRewriter) RewriteQuery(query string, tenantID string) (string, error) {
    // Parse query into AST
    ast, err := ParseCypher(query)
    if err != nil {
        return "", err
    }
    
    // Walk AST, find all node patterns, add tenant filter
    ast.Walk(func(node ASTNode) {
        if match, ok := node.(*MatchClause); ok {
            for _, pattern := range match.Patterns {
                // Add tenant filter to each node pattern
                // MATCH (n:Person) -> MATCH (n:Person) WHERE n.tenant_id = $tenantId
                r.addTenantFilter(pattern, tenantID)
            }
        }
    })
    
    return ast.String(), nil
}

// Simpler approach: regex-based rewriting (less robust but faster)
func (r *TenantRewriter) RewriteQuerySimple(query string, tenantID string) string {
    // Find MATCH clauses and add WHERE clause
    // This is a simplified version - production would need full parser
    
    // Pattern: MATCH (var:Label) or MATCH (var)
    re := regexp.MustCompile(`MATCH\s*\((\w+)(:\w+)?\)`)
    
    return re.ReplaceAllStringFunc(query, func(match string) string {
        // Extract variable name
        varMatch := re.FindStringSubmatch(match)
        varName := varMatch[1]
        
        // Check if WHERE already exists for this MATCH
        // If so, add AND clause; otherwise add WHERE
        // ... complex logic here ...
        
        return match + fmt.Sprintf(" WHERE %s.%s = '%s'", 
            varName, r.tenantProperty, tenantID)
    })
}
```

### Connection Middleware

```go
// pkg/bolt/tenant_middleware.go

// TenantMiddleware extracts tenant from auth and rewrites queries
type TenantMiddleware struct {
    rewriter *TenantRewriter
}

func (m *TenantMiddleware) WrapExecutor(exec *cypher.StorageExecutor) ExecutorFunc {
    return func(ctx context.Context, query string, params map[string]interface{}) (*ExecuteResult, error) {
        // Get tenant from context (set during auth)
        tenantID := ctx.Value("tenant_id").(string)
        
        // Skip rewriting for system queries
        if isSystemQuery(query) {
            return exec.Execute(ctx, query, params)
        }
        
        // Rewrite query with tenant filter
        rewritten, err := m.rewriter.RewriteQuery(query, tenantID)
        if err != nil {
            return nil, fmt.Errorf("tenant filter injection failed: %w", err)
        }
        
        return exec.Execute(ctx, rewritten, params)
    }
}
```

### Effort Estimate: LOW

**Files to create:**
- `pkg/cypher/tenant_rewriter.go` - ~200 lines

**Files to modify:**
- `pkg/bolt/server.go` - Add middleware (~30 lines)
- `pkg/auth/auth.go` - Add tenant_id to JWT claims (~20 lines)

**Total: ~250 lines**

**Pros:**
- Very quick to implement
- No storage changes
- Works with existing data

**Cons:**
- Weaker isolation (bugs = data leak)
- No `USE database` syntax (not Neo4j 4.x compatible)
- Performance overhead (query rewriting)
- Complex query rewriting (edge cases)

---

## Strategy D: Label Namespace (Lightest)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  All queries include :Tenant_<id> label                      │
├─────────────────────────────────────────────────────────────┤
│                   Standard NornicDB                          │
│  No changes - just label convention                          │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```cypher
-- Application enforces label convention
CREATE (n:Person:Tenant_acme {name: 'Alice'})
CREATE (n:Person:Tenant_globex {name: 'Bob'})

-- Queries must include tenant label
MATCH (n:Person:Tenant_acme) RETURN n

-- Cross-tenant query (admin only)
MATCH (n:Person) RETURN n
```

### Effort Estimate: VERY LOW

**No NornicDB changes required.**

Just documentation and application-level conventions.

**Pros:**
- Zero code changes
- Works today
- Simple to understand

**Cons:**
- No enforcement (app bugs = data leak)
- No `USE database` syntax
- Verbose queries
- No Neo4j compatibility

---

## Recommended Approach

### **Strategy B: Key-Prefix Multi-DB**

This is the best balance of:

1. **Strong isolation** - Keys physically separated by prefix
2. **Moderate effort** - ~960 lines of code
3. **Good performance** - Single storage engine
4. **Neo4j 4.x compatibility** - Full `USE database` support
5. **Operational simplicity** - Single BadgerDB to manage

### Implementation Phases

#### Phase 1: Core Infrastructure (3-4 days)
```
□ pkg/storage/namespaced.go - Namespaced storage wrapper
□ pkg/multidb/manager.go - Database manager
□ pkg/storage/badger.go - DeleteByPrefix method
□ Unit tests for namespaced storage
```

#### Phase 2: Bolt Protocol (2-3 days)
```
□ pkg/bolt/connection.go - Add database context
□ pkg/bolt/server.go - Database routing
□ pkg/bolt/messages.go - Extend HELLO message
□ Integration tests for database switching
```

#### Phase 3: Cypher Commands (2-3 days)
```
□ pkg/cypher/system_commands.go - CREATE/DROP/SHOW DATABASE
□ pkg/cypher/executor.go - Route system commands
□ E2E tests for database management
```

#### Phase 4: Documentation & Polish (1-2 days)
```
□ Documentation
□ Migration guide
□ Performance benchmarks
□ Edge case handling
```

**Total: 8-12 days of focused development**

---

## Example Usage (After Implementation)

```cypher
-- Create databases
CREATE DATABASE tenant_acme
CREATE DATABASE tenant_globex

-- List databases
SHOW DATABASES
-- Returns: neo4j (default), system, tenant_acme, tenant_globex

-- Switch database
:USE tenant_acme

-- Create data (isolated to tenant_acme)
CREATE (n:Person {name: 'Alice'})
CREATE (n:Person {name: 'Bob'})

-- Query (only sees tenant_acme data)
MATCH (n:Person) RETURN n
-- Returns: Alice, Bob

-- Switch to different tenant
:USE tenant_globex

-- Query (empty - different namespace)
MATCH (n:Person) RETURN n
-- Returns: (empty)

-- Create data in this tenant
CREATE (n:Person {name: 'Charlie'})

-- Drop database
DROP DATABASE tenant_acme
```

### Driver Usage

```javascript
// Neo4j driver with database selection
const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('user', 'pass'),
  { database: 'tenant_acme' }  // Initial database
)

// Or switch mid-session
const session = driver.session({ database: 'tenant_globex' })
```

---

## Migration Path

### From Single-DB to Multi-DB

1. **Enable multi-db** - Deploy new version
2. **Default database** - All existing data is in `neo4j` (default)
3. **Create tenants** - `CREATE DATABASE tenant_xxx`
4. **Migrate data** - Copy nodes/edges to new namespace
5. **Update clients** - Add database selection to connection

### Data Migration Script

```go
// scripts/migrate_to_multidb.go

func MigrateTenantData(src, dst *DatabaseManager, tenantID string) error {
    srcDB, _ := src.GetStorageForDatabase("neo4j")
    dstDB, _ := dst.GetStorageForDatabase("tenant_" + tenantID)
    
    // Get all nodes for this tenant
    nodes, _ := srcDB.GetAllNodes()
    for _, node := range nodes {
        if node.Properties["tenant_id"] == tenantID {
            // Copy to new namespace
            dstDB.CreateNode(node)
        }
    }
    
    // Same for edges...
    return nil
}
```

---

## Appendix: Neo4j 4.x Compatibility Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| `CREATE DATABASE` | ✅ | Strategy B supports |
| `DROP DATABASE` | ✅ | Strategy B supports |
| `SHOW DATABASES` | ✅ | Strategy B supports |
| `SHOW DATABASE x` | ✅ | Strategy B supports |
| `:USE database` | ✅ | Strategy B supports |
| `database` in driver config | ✅ | Bolt protocol extension |
| Per-DB transactions | ✅ | Via namespaced storage |
| Cross-DB queries | ❌ | Not in Neo4j 4.x either |
| Database aliases | ⚠️ | Can add later |
| Composite databases | ❌ | Enterprise feature |

---

## Conclusion

**Strategy B (Key-Prefix Multi-DB)** provides the best path forward:

- **Quick win**: Can be implemented in 2 weeks
- **Strong isolation**: Physical key separation
- **Neo4j compatible**: Full 4.x multi-database syntax
- **Efficient**: Single storage engine
- **Extensible**: Easy to add features later

The implementation is a moderate lift that can be done incrementally, with each phase providing immediate value.

