# Graph Traversal Guide

**Path queries and pattern matching in NornicDB**

---

## Overview

NornicDB supports powerful graph traversal capabilities through Cypher queries. This guide covers path finding, pattern matching, and relationship navigation.

---

## Basic Pattern Matching

### Find Connected Nodes

```cypher
-- Find all nodes connected to a specific node
MATCH (start:Person {name: 'Alice'})-[r]->(connected)
RETURN connected, type(r) AS relationship

-- Find nodes connected by a specific relationship type
MATCH (p:Person)-[:KNOWS]->(friend:Person)
RETURN p.name, friend.name
```

### Variable-Length Paths

```cypher
-- Find nodes within 1-3 hops
MATCH (start:Person {name: 'Alice'})-[*1..3]->(end)
RETURN DISTINCT end

-- Find all paths of any length (use with caution)
MATCH path = (a:Person)-[*]->(b:Person)
WHERE a.name = 'Alice' AND b.name = 'Bob'
RETURN path
```

---

## Path Finding

### Shortest Path

```cypher
-- Find the shortest path between two nodes
MATCH path = shortestPath(
  (a:Person {name: 'Alice'})-[*]-(b:Person {name: 'Bob'})
)
RETURN path, length(path) AS hops
```

### All Shortest Paths

```cypher
-- Find all equally short paths
MATCH path = allShortestPaths(
  (a:Person {name: 'Alice'})-[*]-(b:Person {name: 'Bob'})
)
RETURN path
```

---

## Filtering Paths

### Filter by Relationship Type

```cypher
-- Only traverse specific relationship types
MATCH path = (a:Person)-[:KNOWS|:WORKS_WITH*1..5]->(b:Person)
WHERE a.name = 'Alice'
RETURN path
```

### Filter by Node Properties

```cypher
-- Only include nodes meeting criteria
MATCH path = (a:Person)-[*1..3]->(b:Person)
WHERE a.name = 'Alice'
  AND ALL(node IN nodes(path) WHERE node.active = true)
RETURN path
```

---

## Path Functions

| Function | Description | Example |
|----------|-------------|---------|
| `nodes(path)` | Get all nodes in path | `RETURN nodes(path)` |
| `relationships(path)` | Get all relationships | `RETURN relationships(path)` |
| `length(path)` | Number of relationships | `RETURN length(path)` |

---

## Common Patterns

### Friend of Friend

```cypher
MATCH (me:Person {name: 'Alice'})-[:KNOWS]->(friend)-[:KNOWS]->(foaf)
WHERE foaf <> me
  AND NOT (me)-[:KNOWS]->(foaf)
RETURN DISTINCT foaf.name AS suggestion
```

### Hierarchical Queries

```cypher
-- Find all reports (direct and indirect)
MATCH path = (manager:Employee {name: 'CEO'})-[:MANAGES*]->(report)
RETURN report.name, length(path) AS level
ORDER BY level
```

### Circular References

```cypher
-- Find cycles in the graph
MATCH path = (n)-[*2..]->(n)
RETURN path LIMIT 10
```

---

## Performance Tips

1. **Limit path length** - Always specify max depth (`-[*1..5]->` not `-[*]->`)
2. **Use relationship types** - Filter by type to reduce search space
3. **Start from selective nodes** - Begin traversal from nodes with fewer connections
4. **Use LIMIT** - Limit results for exploratory queries

---

## Related Documentation

- **[Cypher Queries](cypher-queries.md)** - Complete Cypher guide
- **[Vector Search](vector-search.md)** - Semantic search
- **[Complete Examples](complete-examples.md)** - Full working examples

---

**Need more examples?** → **[Complete Examples](complete-examples.md)**
