// Shortest path Cypher syntax support for NornicDB.
// Implements shortestPath() and allShortestPaths() functions.
//
// Syntax:
//   MATCH p = shortestPath((start)-[*]-(end)) RETURN p
//   MATCH p = allShortestPaths((start)-[*]-(end)) RETURN p

package cypher

import (
	"fmt"
	"strings"

	"github.com/orneryd/nornicdb/pkg/storage"
)

// parseShortestPathQuery parses queries with shortestPath() or allShortestPaths()
func (e *StorageExecutor) parseShortestPathQuery(cypher string) (*ShortestPathQuery, error) {
	query := &ShortestPathQuery{
		maxHops:        10, // Default max depth
		originalCypher: cypher,
	}

	upper := strings.ToUpper(cypher)

	// Check which function is used
	if strings.Contains(upper, "ALLSHORTESTPATHS") {
		query.findAll = true
	} else if !strings.Contains(upper, "SHORTESTPATH") {
		return nil, fmt.Errorf("not a shortest path query")
	}

	// Extract the pattern: shortestPath((start)-[...]-(end))
	// Pattern: (variable = )?(?:all)?shortestPath\(\s*\((.*?)\)\s*\)
	matches := shortestPathFuncPattern.FindStringSubmatch(cypher)

	if matches == nil || len(matches) < 3 {
		return nil, fmt.Errorf("invalid shortestPath syntax")
	}

	pattern := matches[2]

	// Parse the pattern: (start:Label {props})-[:TYPE*..max]-(end:Label {props})
	patternMatches := pathPatternRe.FindStringSubmatch(pattern)

	if patternMatches == nil || len(patternMatches) < 4 {
		return nil, fmt.Errorf("invalid path pattern: %s", pattern)
	}

	// Parse start node pattern (may be just a variable reference like "start")
	startPattern := strings.TrimSpace(patternMatches[1])
	query.startNode = e.parseNodePatternFromString(startPattern)

	// Parse relationship
	relPat := e.parseRelationshipPattern(patternMatches[2])
	query.relTypes = relPat.Types
	query.direction = relPat.Direction
	if relPat.MaxHops > 0 {
		query.maxHops = relPat.MaxHops
	}

	// Parse end node pattern (may be just a variable reference like "end")
	endPattern := strings.TrimSpace(patternMatches[3])
	query.endNode = e.parseNodePatternFromString(endPattern)

	// Extract path variable from: p = shortestPath(...)
	if varMatches := shortestPathVarPattern.FindStringSubmatch(cypher); varMatches != nil {
		query.pathVariable = varMatches[1]
	}

	// Extract WHERE clause if present
	whereIdx := strings.Index(upper, "WHERE")
	returnIdx := strings.Index(upper, "RETURN")
	if whereIdx > 0 && whereIdx < returnIdx {
		query.whereClause = strings.TrimSpace(cypher[whereIdx+5 : returnIdx])
	}

	// Extract RETURN clause
	if returnIdx > 0 {
		query.returnClause = strings.TrimSpace(cypher[returnIdx+6:])
	}

	// Resolve variable bindings from the preceding MATCH clause
	// Look for patterns like: MATCH (start:Person {name: 'Alice'}), (end:Person {name: 'Carol'})
	e.resolveShortestPathVariables(query, startPattern, endPattern)

	return query, nil
}

// resolveShortestPathVariables resolves variable references from the MATCH clause
func (e *StorageExecutor) resolveShortestPathVariables(query *ShortestPathQuery, startVar, endVar string) {
	// Extract the first MATCH clause that defines the variables
	// Use (?is) for case-insensitive and single-line (dot matches newlines)
	matches := matchClausePattern.FindStringSubmatch(query.originalCypher)

	if matches == nil || len(matches) < 2 {
		return
	}

	matchClause := matches[1]

	// Parse node patterns from the MATCH clause
	// Pattern: (var:Label {props}), (var2:Label2 {props2})
	nodePatterns := e.splitNodePatterns(matchClause)

	varBindings := make(map[string]nodePatternInfo)
	for _, np := range nodePatterns {
		info := e.parseNodePattern(np)
		if info.variable != "" {
			varBindings[info.variable] = info
		}
	}

	// Check if startVar is a variable reference (no labels/props in shortestPath pattern)
	if len(query.startNode.labels) == 0 && len(query.startNode.properties) == 0 {
		// It's a variable reference - look it up
		if binding, ok := varBindings[startVar]; ok {
			// Find the actual node
			query.startVarBinding = e.findNodeByPattern(binding)
		}
	}

	// Check if endVar is a variable reference
	if len(query.endNode.labels) == 0 && len(query.endNode.properties) == 0 {
		// It's a variable reference - look it up
		if binding, ok := varBindings[endVar]; ok {
			// Find the actual node
			query.endVarBinding = e.findNodeByPattern(binding)
		}
	}
}

// findNodeByPattern finds a node matching the given pattern
func (e *StorageExecutor) findNodeByPattern(pattern nodePatternInfo) *storage.Node {
	var candidates []*storage.Node

	if len(pattern.labels) > 0 {
		candidates, _ = e.storage.GetNodesByLabel(pattern.labels[0])
	} else {
		candidates, _ = e.storage.AllNodes()
	}

	for _, node := range candidates {
		if e.nodeMatchesProps(node, pattern.properties) {
			return node
		}
	}

	return nil
}

// ShortestPathQuery represents a parsed shortest path query
type ShortestPathQuery struct {
	pathVariable    string
	startNode       nodePatternInfo
	endNode         nodePatternInfo
	startVarBinding *storage.Node // Resolved node from MATCH clause (if variable reference)
	endVarBinding   *storage.Node // Resolved node from MATCH clause (if variable reference)
	relTypes        []string
	direction       string
	maxHops         int
	findAll         bool // true for allShortestPaths, false for shortestPath
	whereClause     string
	returnClause    string
	originalCypher  string // Full original query for MATCH clause parsing
}

// executeShortestPathQuery executes a shortestPath or allShortestPaths query
func (e *StorageExecutor) executeShortestPathQuery(query *ShortestPathQuery) (*ExecuteResult, error) {
	result := &ExecuteResult{
		Columns: []string{},
		Rows:    [][]interface{}{},
		Stats:   &QueryStats{},
	}

	// Resolve start and end nodes from variable bindings (from MATCH clause)
	// If startNode/endNode has a variable reference but no labels/props, it references
	// a node from the preceding MATCH clause. We need to find those nodes.

	var startNodes []*storage.Node
	var endNodes []*storage.Node

	// Check if we have concrete node patterns or just variable references
	startHasPattern := len(query.startNode.labels) > 0 || len(query.startNode.properties) > 0
	endHasPattern := len(query.endNode.labels) > 0 || len(query.endNode.properties) > 0

	if !startHasPattern && query.startVarBinding != nil {
		// Variable reference - use the resolved node from MATCH clause
		startNodes = []*storage.Node{query.startVarBinding}
	} else if len(query.startNode.labels) > 0 {
		startNodes, _ = e.storage.GetNodesByLabel(query.startNode.labels[0])
		// Filter by properties
		if len(query.startNode.properties) > 0 {
			var filtered []*storage.Node
			for _, n := range startNodes {
				if e.nodeMatchesProps(n, query.startNode.properties) {
					filtered = append(filtered, n)
				}
			}
			startNodes = filtered
		}
	} else {
		startNodes, _ = e.storage.AllNodes()
	}

	if !endHasPattern && query.endVarBinding != nil {
		// Variable reference - use the resolved node from MATCH clause
		endNodes = []*storage.Node{query.endVarBinding}
	} else if len(query.endNode.labels) > 0 {
		endNodes, _ = e.storage.GetNodesByLabel(query.endNode.labels[0])
		// Filter by properties
		if len(query.endNode.properties) > 0 {
			var filtered []*storage.Node
			for _, n := range endNodes {
				if e.nodeMatchesProps(n, query.endNode.properties) {
					filtered = append(filtered, n)
				}
			}
			endNodes = filtered
		}
	} else {
		endNodes, _ = e.storage.AllNodes()
	}

	// Find paths between all start/end node pairs
	var allPaths []PathResult
	for _, start := range startNodes {
		for _, end := range endNodes {
			if start.ID == end.ID {
				continue // Skip same node
			}

			if query.findAll {
				paths := e.allShortestPaths(start, end, query.relTypes, query.direction, query.maxHops)
				allPaths = append(allPaths, paths...)
			} else {
				path := e.shortestPath(start, end, query.relTypes, query.direction, query.maxHops)
				if path != nil {
					allPaths = append(allPaths, *path)
				}
			}
		}
	}

	// Build result
	if query.returnClause != "" {
		// Parse return items
		returnItems := e.parseReturnItems(query.returnClause)

		for _, item := range returnItems {
			if item.alias != "" {
				result.Columns = append(result.Columns, item.alias)
			} else {
				result.Columns = append(result.Columns, item.expr)
			}
		}

		// Build rows from paths
		for _, path := range allPaths {
			row := make([]interface{}, len(returnItems))

			for i, item := range returnItems {
				// Handle path variable and path functions
				exprLower := strings.ToLower(item.expr)
				pathVarLower := strings.ToLower(query.pathVariable)

				// Check if expression is the path variable directly, or a path function like length(p), nodes(p), relationships(p)
				isPathExpr := item.expr == query.pathVariable ||
					strings.HasPrefix(item.expr, query.pathVariable+".") ||
					strings.Contains(exprLower, "length("+pathVarLower+")") ||
					strings.Contains(exprLower, "nodes("+pathVarLower+")") ||
					strings.Contains(exprLower, "relationships("+pathVarLower+")")

				if isPathExpr {
					row[i] = e.pathToValue(path, item.expr, query.pathVariable)
				} else {
					// Try to evaluate as expression
					row[i] = e.evaluatePathExpression(item.expr, path, query)
				}
			}

			result.Rows = append(result.Rows, row)
		}
	} else {
		// Return paths directly
		result.Columns = []string{query.pathVariable}
		for _, path := range allPaths {
			result.Rows = append(result.Rows, []interface{}{e.pathToMap(path)})
		}
	}

	return result, nil
}

// pathToValue converts a path to the requested value
func (e *StorageExecutor) pathToValue(path PathResult, expr, pathVar string) interface{} {
	if expr == pathVar {
		// Return full path
		return e.pathToMap(path)
	}

	// Handle path functions: length(p), nodes(p), relationships(p)
	lowerExpr := strings.ToLower(expr)

	if strings.HasPrefix(lowerExpr, "length(") {
		return int64(path.Length)
	}

	if strings.HasPrefix(lowerExpr, "nodes(") {
		nodes := make([]interface{}, len(path.Nodes))
		for i, n := range path.Nodes {
			nodes[i] = e.nodeToMap(n)
		}
		return nodes
	}

	if strings.HasPrefix(lowerExpr, "relationships(") {
		rels := make([]interface{}, len(path.Relationships))
		for i, r := range path.Relationships {
			rels[i] = e.edgeToMap(r)
		}
		return rels
	}

	return nil
}

// pathToMap converts a PathResult to a map representation
func (e *StorageExecutor) pathToMap(path PathResult) map[string]interface{} {
	nodes := make([]interface{}, len(path.Nodes))
	for i, n := range path.Nodes {
		nodes[i] = e.nodeToMap(n)
	}

	rels := make([]interface{}, len(path.Relationships))
	for i, r := range path.Relationships {
		rels[i] = e.edgeToMap(r)
	}

	return map[string]interface{}{
		"nodes":         nodes,
		"relationships": rels,
		"length":        path.Length,
	}
}

// evaluatePathExpression evaluates an expression in the context of a path
func (e *StorageExecutor) evaluatePathExpression(expr string, path PathResult, query *ShortestPathQuery) interface{} {
	// Build context from path
	nodes := make(map[string]*storage.Node)
	rels := make(map[string]*storage.Edge)

	if query.startNode.variable != "" && len(path.Nodes) > 0 {
		nodes[query.startNode.variable] = path.Nodes[0]
	}
	if query.endNode.variable != "" && len(path.Nodes) > 1 {
		nodes[query.endNode.variable] = path.Nodes[len(path.Nodes)-1]
	}

	return e.evaluateExpressionWithContext(expr, nodes, rels)
}

// isShortestPathQuery checks if a query uses shortestPath or allShortestPaths
func isShortestPathQuery(cypher string) bool {
	upper := strings.ToUpper(cypher)
	return strings.Contains(upper, "SHORTESTPATH") || strings.Contains(upper, "ALLSHORTESTPATHS")
}
