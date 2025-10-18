# MCP Server Test in Cursor

This document contains test prompts to verify the MCP server is working correctly in Cursor.

---

## Test 1: Create a TODO Node

**Prompt for Cursor:**
```
Create a TODO using the graph_add_node tool with these properties:
- type: "todo"
- description: "Test MCP connection from Cursor"
- status: "pending"
- priority: "high"
```

**Expected Result:**
- Should return a node with an ID like `todo-1-xxxxx`
- Should show all properties
- Should include created/updated timestamps

---

## Test 2: Query All TODO Nodes

**Prompt for Cursor:**
```
Query all TODO nodes using graph_query_nodes with type "todo"
```

**Expected Result:**
- Should return a list of all TODO nodes
- Should include the one we just created

---

## Test 3: Create Multiple Nodes with Edges

**Prompt for Cursor:**
```
Create a project structure:
1. Create a project node (type: "project", name: "MCP Testing", status: "active")
2. Create a file node (type: "file", path: "test.ts", language: "typescript")
3. Create an edge connecting the project to the file (type: "contains")
```

**Expected Result:**
- Should create 2 nodes and 1 edge
- Should return IDs for all created items

---

## Test 4: Get Subgraph

**Prompt for Cursor:**
```
Get the subgraph for the project node we just created with depth 2
```

**Expected Result:**
- Should return the project node
- Should return connected file node
- Should return the edge between them

---

## Test 5: Search Nodes

**Prompt for Cursor:**
```
Search for nodes containing "MCP" using graph_search_nodes
```

**Expected Result:**
- Should return nodes matching "MCP" in their properties
- Should use full-text search

---

## Test 6: Update a Node

**Prompt for Cursor:**
```
Update the first TODO we created - change status to "in_progress"
```

**Expected Result:**
- Should successfully update the status
- Should show updated timestamp changed
- Should preserve other properties

---

## Test 7: Get Node with Neighbors

**Prompt for Cursor:**
```
Get all neighbors of the project node
```

**Expected Result:**
- Should return the file node
- Should show relationship information

---

## Test 8: Batch Operations

**Prompt for Cursor:**
```
Create 3 TODO nodes in a single batch operation:
1. "Implement feature A", priority: high, status: pending
2. "Review code", priority: medium, status: pending
3. "Write tests", priority: high, status: pending
```

**Expected Result:**
- Should create all 3 nodes in one operation
- Should return array of created nodes

---

## Test 9: Get Graph Statistics

**Prompt for Cursor:**
```
What are the current graph statistics? How many nodes and edges do we have?
```

**Note:** This might require calling graph_query_nodes without filters or checking multiple types.

---

## Test 10: Clean Up

**Prompt for Cursor:**
```
Delete all the test nodes we created
```

**Warning:** Only do this after all other tests are complete!

---

## Debugging Tips

If a tool call fails:
1. Check Docker is running: `docker-compose ps`
2. Check MCP server logs: `docker logs mcp_server -f`
3. Check Neo4j is healthy: `docker exec neo4j_db cypher-shell -u neo4j -p password "RETURN 1"`
4. Verify health endpoint: `curl http://localhost:3000/health`

---

## Expected Tools Available

Cursor should show these 17 tools:

**Single Operations:**
- graph_add_node
- graph_get_node
- graph_update_node
- graph_delete_node
- graph_add_edge
- graph_delete_edge
- graph_query_nodes
- graph_search_nodes
- graph_get_edges
- graph_get_neighbors
- graph_get_subgraph
- graph_clear

**Batch Operations:**
- graph_add_nodes
- graph_update_nodes
- graph_delete_nodes
- graph_add_edges
- graph_delete_edges

---

## Success Criteria

✅ All tool calls complete without errors
✅ Data persists across calls
✅ Relationships work correctly
✅ Search returns relevant results
✅ Batch operations work efficiently

