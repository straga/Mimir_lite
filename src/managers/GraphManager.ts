// ============================================================================
// GraphManager - Neo4j Implementation
// Clean, simple, unified node model
// ============================================================================

import neo4j, { Driver, Session, Integer } from 'neo4j-driver';
import type {
  IGraphManager,
  Node,
  Edge,
  NodeType,
  EdgeType,
  SearchOptions,
  BatchDeleteResult,
  GraphStats,
  Subgraph,
  ClearType
} from '../types/index.js';

export class GraphManager implements IGraphManager {
  private driver: Driver;
  private nodeCounter = 0;
  private edgeCounter = 0;

  constructor(uri: string, user: string, password: string) {
    this.driver = neo4j.driver(
      uri,
      neo4j.auth.basic(user, password),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 60000,
        connectionTimeout: 30000
      }
    );
  }

  /**
   * Get the Neo4j driver instance
   */
  getDriver(): Driver {
    return this.driver;
  }

  /**
   * Initialize database: create indexes and constraints
   */
  async initialize(): Promise<void> {
    const session = this.driver.session();
    try {
      // Unique constraint on node IDs
      await session.run(`
        CREATE CONSTRAINT node_id_unique IF NOT EXISTS 
        FOR (n:Node) REQUIRE n.id IS UNIQUE
      `);

      // Full-text search index
      await session.run(`
        CREATE FULLTEXT INDEX node_search IF NOT EXISTS
        FOR (n:Node) ON EACH [n.properties]
      `);

      // Type index for fast filtering
      await session.run(`
        CREATE INDEX node_type IF NOT EXISTS
        FOR (n:Node) ON (n.type)
      `);

      // ─────────────────────────────────────────────────────────────
      // File Indexing Schema (Phase 1)
      // ─────────────────────────────────────────────────────────────
      
      // WatchConfig unique ID constraint
      await session.run(`
        CREATE CONSTRAINT watch_config_id_unique IF NOT EXISTS
        FOR (w:WatchConfig) REQUIRE w.id IS UNIQUE
      `);

      // WatchConfig path index
      await session.run(`
        CREATE INDEX watch_config_path IF NOT EXISTS
        FOR (w:WatchConfig) ON (w.path)
      `);

      // File path index (for fast lookups and updates)
      await session.run(`
        CREATE INDEX file_path IF NOT EXISTS
        FOR (f:File) ON (f.path)
      `);

      // Full-text search on file content (Phase 1 - Required)
      await session.run(`
        CREATE FULLTEXT INDEX file_content_search IF NOT EXISTS
        FOR (f:File) ON EACH [f.content, f.path, f.name]
      `);

      console.log('✅ Neo4j schema initialized (with file indexing support)');
    } catch (error: any) {
      console.error('❌ Schema initialization failed:', error.message);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    const session = this.driver.session();
    try {
      await session.run('RETURN 1');
      return true;
    } catch (error) {
      return false;
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // SINGLE OPERATIONS
  // ============================================================================

  async addNode(type: NodeType, properties: Record<string, any>): Promise<Node> {
    const session = this.driver.session();
    try {
      // Use provided ID if present, otherwise generate one
      const id = properties.id || `${type}-${++this.nodeCounter}-${Date.now()}`;
      const now = new Date().toISOString();

      // Flatten properties into the node (Neo4j doesn't support nested objects)
      const nodeProps = {
        id,
        type,
        created: now,
        updated: now,
        ...properties  // Spread properties at top level
      };

      const result = await session.run(
        'CREATE (n:Node $props) RETURN n',
        { props: nodeProps }
      );

      return this.nodeFromRecord(result.records[0].get('n'));
    } finally {
      await session.close();
    }
  }

  async getNode(id: string): Promise<Node | null> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (n:Node {id: $id}) RETURN n',
        { id }
      );

      if (result.records.length === 0) {
        return null;
      }

      return this.nodeFromRecord(result.records[0].get('n'));
    } finally {
      await session.close();
    }
  }

  async updateNode(id: string, properties: Partial<Record<string, any>>): Promise<Node> {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();

      // Build SET clauses for each property
      const setProperties = { ...properties, updated: now };

      const result = await session.run(
        `
        MATCH (n:Node {id: $id})
        SET n += $properties
        RETURN n
        `,
        { id, properties: setProperties }
      );

      if (result.records.length === 0) {
        throw new Error(`Node not found: ${id}`);
      }

      return this.nodeFromRecord(result.records[0].get('n'));
    } finally {
      await session.close();
    }
  }

  async deleteNode(id: string): Promise<boolean> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (n:Node {id: $id})
        DETACH DELETE n
        RETURN count(n) as deleted
        `,
        { id }
      );

      const deleted = result.records[0]?.get('deleted').toNumber() || 0;
      return deleted > 0;
    } finally {
      await session.close();
    }
  }

  async addEdge(
    source: string,
    target: string,
    type: EdgeType,
    properties: Record<string, any> = {}
  ): Promise<Edge> {
    const session = this.driver.session();
    try {
      const id = `edge-${++this.edgeCounter}-${Date.now()}`;
      const now = new Date().toISOString();

      // Flatten properties directly onto the edge (Neo4j doesn't support nested objects)
      const edgeProps = {
        id,
        type,
        created: now,
        ...properties  // User properties flattened at the same level
      };

      const result = await session.run(
        `
        MATCH (s:Node {id: $source})
        MATCH (t:Node {id: $target})
        CREATE (s)-[e:EDGE $edgeProps]->(t)
        RETURN e
        `,
        { source, target, edgeProps }
      );

      if (result.records.length === 0) {
        throw new Error(`Failed to create edge: source or target not found`);
      }

      return this.edgeFromRecord(result.records[0].get('e'), source, target);
    } finally {
      await session.close();
    }
  }

  async deleteEdge(edgeId: string): Promise<boolean> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH ()-[e:EDGE {id: $edgeId}]->()
        DELETE e
        RETURN count(e) as deleted
        `,
        { edgeId }
      );

      const deleted = result.records[0]?.get('deleted').toNumber() || 0;
      return deleted > 0;
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  async addNodes(nodes: Array<{ type: NodeType; properties: Record<string, any> }>): Promise<Node[]> {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      
      // Flatten properties for each node
      const nodesWithIds = nodes.map(n => ({
        id: `${n.type}-${++this.nodeCounter}-${Date.now()}`,
        type: n.type,
        created: now,
        updated: now,
        ...n.properties  // Spread properties at top level
      }));

      const result = await session.run(
        `
        UNWIND $nodes as node
        CREATE (n:Node)
        SET n = node
        RETURN n
        `,
        { nodes: nodesWithIds }
      );

      return result.records.map(r => this.nodeFromRecord(r.get('n')));
    } finally {
      await session.close();
    }
  }

  async updateNodes(updates: Array<{ id: string; properties: Partial<Record<string, any>> }>): Promise<Node[]> {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();

      // Add updated timestamp to each update
      const updatesWithTimestamp = updates.map(u => ({
        id: u.id,
        properties: { ...u.properties, updated: now }
      }));

      const result = await session.run(
        `
        UNWIND $updates as update
        MATCH (n:Node {id: update.id})
        SET n += update.properties
        RETURN n
        `,
        { updates: updatesWithTimestamp }
      );

      return result.records.map(r => this.nodeFromRecord(r.get('n')));
    } finally {
      await session.close();
    }
  }

  async deleteNodes(ids: string[]): Promise<BatchDeleteResult> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        UNWIND $ids as id
        MATCH (n:Node {id: id})
        DETACH DELETE n
        RETURN count(n) as deleted
        `,
        { ids }
      );

      const deleted = result.records[0]?.get('deleted').toNumber() || 0;

      return {
        deleted,
        errors: []  // Neo4j handles missing nodes gracefully
      };
    } finally {
      await session.close();
    }
  }

  async addEdges(edges: Array<{
    source: string;
    target: string;
    type: EdgeType;
    properties?: Record<string, any>;
  }>): Promise<Edge[]> {
    const session = this.driver.session();
    try {
      const now = new Date().toISOString();
      const edgesWithIds = edges.map(e => ({
        id: `edge-${++this.edgeCounter}-${Date.now()}`,
        source: e.source,
        target: e.target,
        type: e.type,
        properties: e.properties || {},
        created: now
      }));

      const result = await session.run(
        `
        UNWIND $edges as edge
        MATCH (s:Node {id: edge.source})
        MATCH (t:Node {id: edge.target})
        CREATE (s)-[e:EDGE {
          id: edge.id,
          type: edge.type,
          properties: edge.properties,
          created: edge.created
        }]->(t)
        RETURN e, edge.source as source, edge.target as target
        `,
        { edges: edgesWithIds }
      );

      return result.records.map(r => 
        this.edgeFromRecord(r.get('e'), r.get('source'), r.get('target'))
      );
    } finally {
      await session.close();
    }
  }

  async deleteEdges(edgeIds: string[]): Promise<BatchDeleteResult> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        UNWIND $edgeIds as edgeId
        MATCH ()-[e:EDGE {id: edgeId}]->()
        DELETE e
        RETURN count(e) as deleted
        `,
        { edgeIds }
      );

      const deleted = result.records[0]?.get('deleted').toNumber() || 0;

      return {
        deleted,
        errors: []
      };
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // SEARCH & QUERY
  // ============================================================================

  async queryNodes(type?: NodeType, filters?: Record<string, any>): Promise<Node[]> {
    const session = this.driver.session();
    try {
      let query = 'MATCH (n)';
      const params: any = {};

      if (type) {
        // Match both the label (case-insensitive) and the type property
        // This handles both unified nodes (Node label + type property) and direct labeled nodes (File, WatchConfig, etc.)
        const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
        query += ` WHERE (n.type = $type OR $capitalizedType IN labels(n))`;
        params.type = type;
        params.capitalizedType = capitalizedType;
      }

      if (filters && Object.keys(filters).length > 0) {
        const filterConditions = Object.entries(filters).map(([key, value], i) => {
          params[`filter${i}`] = value;
          return `(n.${key} = $filter${i} OR n.properties.${key} = $filter${i})`;
        });

        query += type ? ' AND ' : ' WHERE ';
        query += filterConditions.join(' AND ');
      }

      query += ' RETURN n';

      const result = await session.run(query, params);
      return result.records.map(r => this.nodeFromRecord(r.get('n')));
    } finally {
      await session.close();
    }
  }

  async searchNodes(query: string, options: SearchOptions = {}): Promise<Node[]> {
    const session = this.driver.session();
    try {
      const limit = options.limit || 100;
      const offset = options.offset || 0;

      // Search across string properties only to avoid type errors with arrays
      // This searches: path, language, content, name, description, status, priority, etc.
      const result = await session.run(
        `
        MATCH (n)
        WHERE (
          (n.path IS NOT NULL AND toLower(n.path) CONTAINS toLower($query)) OR
          (n.language IS NOT NULL AND toLower(n.language) CONTAINS toLower($query)) OR
          (n.content IS NOT NULL AND toLower(n.content) CONTAINS toLower($query)) OR
          (n.name IS NOT NULL AND toLower(n.name) CONTAINS toLower($query)) OR
          (n.description IS NOT NULL AND toLower(n.description) CONTAINS toLower($query)) OR
          (n.status IS NOT NULL AND toLower(n.status) CONTAINS toLower($query)) OR
          (n.priority IS NOT NULL AND toLower(n.priority) CONTAINS toLower($query)) OR
          (n.type IS NOT NULL AND toLower(n.type) CONTAINS toLower($query))
        )
        ${options.types && options.types.length > 0 ? `AND (n.type IN $types OR ANY(t IN $types WHERE (toUpper(left(t, 1)) + substring(t, 1)) IN labels(n)))` : ''}
        RETURN n
        SKIP $offset
        LIMIT $limit
        `,
        { 
          query, 
          types: options.types || [], 
          offset: neo4j.int(offset), 
          limit: neo4j.int(limit) 
        }
      );

      return result.records.map(r => this.nodeFromRecord(r.get('n')));
    } finally {
      await session.close();
    }
  }

  async getEdges(nodeId: string, direction: 'in' | 'out' | 'both' = 'both'): Promise<Edge[]> {
    const session = this.driver.session();
    try {
      let query = '';
      
      if (direction === 'out') {
        query = 'MATCH (n:Node {id: $nodeId})-[e:EDGE]->(t:Node) RETURN e, n.id as source, t.id as target';
      } else if (direction === 'in') {
        query = 'MATCH (s:Node)-[e:EDGE]->(n:Node {id: $nodeId}) RETURN e, s.id as source, n.id as target';
      } else {
        query = 'MATCH (n:Node {id: $nodeId})-[e:EDGE]-(o:Node) RETURN e, n.id as source, o.id as target';
      }

      const result = await session.run(query, { nodeId });
      return result.records.map(r => 
        this.edgeFromRecord(r.get('e'), r.get('source'), r.get('target'))
      );
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // GRAPH OPERATIONS
  // ============================================================================

  async getNeighbors(nodeId: string, edgeType?: EdgeType, depth: number = 1): Promise<Node[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (start:Node {id: $nodeId})-[e:EDGE*1..${depth}]-(neighbor:Node)
        ${edgeType ? 'WHERE ALL(rel IN e WHERE rel.type = $edgeType)' : ''}
        RETURN DISTINCT neighbor
        `,
        { nodeId, edgeType }
      );

      return result.records.map(r => this.nodeFromRecord(r.get('neighbor')));
    } finally {
      await session.close();
    }
  }

  async getSubgraph(nodeId: string, depth: number = 2): Promise<Subgraph> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH path = (start:Node {id: $nodeId})-[e:EDGE*0..${depth}]-(connected:Node)
        WITH nodes(path) as pathNodes, relationships(path) as pathEdges
        UNWIND pathNodes as node
        WITH collect(DISTINCT node) as allNodes, pathEdges
        UNWIND pathEdges as edge
        WITH allNodes, collect(DISTINCT edge) as allEdges
        RETURN allNodes, allEdges
        `,
        { nodeId }
      );

      if (result.records.length === 0) {
        return { nodes: [], edges: [] };
      }

      const record = result.records[0];
      const nodes = record.get('allNodes').map((n: any) => this.nodeFromRecord(n));
      const edges = record.get('allEdges').map((e: any) => 
        this.edgeFromRecord(e, e.start, e.end)
      );

      return { nodes, edges };
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  async getStats(): Promise<GraphStats> {
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (n:Node)
        RETURN count(n) as nodeCount, 
               collect(DISTINCT n.type) as types
      `);

      const edgeResult = await session.run(`
        MATCH ()-[e:EDGE]->()
        RETURN count(e) as edgeCount
      `);

      const nodeCount = result.records[0]?.get('nodeCount').toNumber() || 0;
      const edgeCount = edgeResult.records[0]?.get('edgeCount').toNumber() || 0;
      const types = result.records[0]?.get('types') || [];

      // Get count per type
      const typeCountResult = await session.run(`
        MATCH (n:Node)
        RETURN n.type as type, count(n) as count
      `);

      const typeCounts: Record<string, number> = {};
      typeCountResult.records.forEach(r => {
        typeCounts[r.get('type')] = r.get('count').toNumber();
      });

      return {
        nodeCount,
        edgeCount,
        types: typeCounts
      };
    } finally {
      await session.close();
    }
  }

  async clear(type?: ClearType): Promise<{ deletedNodes: number; deletedEdges: number }> {
    const session = this.driver.session();
    try {
      let query: string;
      let params: any = {};
      
      if (type === 'ALL') {
        // Clear ALL data - explicit "ALL" required for safety
        query = `
          MATCH (n)
          OPTIONAL MATCH (n)-[r]-()
          WITH count(DISTINCT n) as nodeCount, count(DISTINCT r) as edgeCount
          MATCH (n)
          DETACH DELETE n
          RETURN nodeCount as deletedNodes, edgeCount as deletedEdges
        `;
        const result = await session.run(query, params);
        const deletedNodes = result.records[0]?.get('deletedNodes').toNumber() || 0;
        const deletedEdges = result.records[0]?.get('deletedEdges').toNumber() || 0;
        
        // Reset counters
        this.nodeCounter = 0;
        this.edgeCounter = 0;
        
        console.log(`✅ Cleared ALL data from graph: ${deletedNodes} nodes, ${deletedEdges} edges`);
        return { deletedNodes, deletedEdges };
      } else if (type) {
        // Clear specific type (check both n.type property and Neo4j labels)
        const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
        query = `
          MATCH (n)
          WHERE (n.type = $type OR $capitalizedType IN labels(n))
          WITH n, size((n)-[]-()) as edgeCount
          DETACH DELETE n
          RETURN count(n) as deletedNodes, sum(edgeCount) as deletedEdges
        `;
        params = { type, capitalizedType };
        
        const result = await session.run(query, params);
        const deletedNodes = result.records[0]?.get('deletedNodes').toNumber() || 0;
        const deletedEdges = result.records[0]?.get('deletedEdges').toNumber() || 0;
        
        console.log(`✅ Cleared ${deletedNodes} nodes of type '${type}' and ${deletedEdges} edges`);
        return { deletedNodes, deletedEdges };
      } else {
        // No type provided - return zero (safety default)
        console.log(`⚠️  No type provided to clear(). Use clear('ALL') to clear entire graph.`);
        return { deletedNodes: 0, deletedEdges: 0 };
      }
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private nodeFromRecord(record: any): Node {
    const props = record.properties;
    
    // Extract system properties
    const { id, type, created, updated, ...userProperties } = props;
    
    return {
      id,
      type,
      properties: userProperties,  // All other properties
      created,
      updated
    };
  }

  private edgeFromRecord(record: any, source: string, target: string): Edge {
    const props = record.properties;
    
    // Extract system properties and treat the rest as user properties
    const { id, type, created, ...userProperties } = props;
    
    return {
      id,
      source,
      target,
      type,
      properties: userProperties,
      created
    };
  }

  // ========================================================================
  // MULTI-AGENT LOCKING
  // ========================================================================

  /**
   * Acquire exclusive lock on a node (typically a TODO) for multi-agent coordination
   * Uses optimistic locking with automatic expiry
   * 
   * @param nodeId - Node ID to lock
   * @param agentId - Agent claiming the lock
   * @param timeoutMs - Lock expiry in milliseconds (default 300000 = 5 min)
   * @returns true if lock acquired, false if already locked by another agent
   */
  async lockNode(nodeId: string, agentId: string, timeoutMs: number = 300000): Promise<boolean> {
    const session = this.driver.session();
    try {
      const now = new Date();
      const lockExpiresAt = new Date(now.getTime() + timeoutMs);

      // Try to acquire lock using conditional update
      const result = await session.run(
        `
        MATCH (n:Node {id: $nodeId})
        WHERE n.lockedBy IS NULL 
          OR n.lockedBy = $agentId 
          OR (n.lockExpiresAt IS NOT NULL AND n.lockExpiresAt < $now)
        SET n.lockedBy = $agentId,
            n.lockedAt = $now,
            n.lockExpiresAt = $lockExpiresAt,
            n.version = COALESCE(n.version, 0) + 1
        RETURN n
        `,
        {
          nodeId,
          agentId,
          now: now.toISOString(),
          lockExpiresAt: lockExpiresAt.toISOString()
        }
      );

      // If no records returned, lock was held by another agent
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  /**
   * Release lock on a node
   * 
   * @param nodeId - Node ID to unlock
   * @param agentId - Agent releasing the lock (must match lock owner)
   * @returns true if lock released, false if not locked or locked by different agent
   */
  async unlockNode(nodeId: string, agentId: string): Promise<boolean> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (n:Node {id: $nodeId})
        WHERE n.lockedBy = $agentId
        REMOVE n.lockedBy, n.lockedAt, n.lockExpiresAt
        RETURN n
        `,
        { nodeId, agentId }
      );

      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }

  /**
   * Query nodes filtered by lock status
   * 
   * @param type - Optional node type filter
   * @param filters - Additional property filters
   * @param includeAvailableOnly - If true, only return unlocked or expired-lock nodes
   * @returns Array of nodes
   */
  async queryNodesWithLockStatus(
    type?: NodeType,
    filters?: Record<string, any>,
    includeAvailableOnly?: boolean
  ): Promise<Node[]> {
    const session = this.driver.session();
    try {
      let cypher = 'MATCH (n:Node)';
      const params: any = {};

      // Type filter
      if (type) {
        cypher += ' WHERE n.type = $type';
        params.type = type;
      }

      // Property filters
      if (filters && Object.keys(filters).length > 0) {
        const whereClause = type ? ' AND ' : ' WHERE ';
        const conditions = Object.entries(filters).map(([key, value], index) => {
          params[`filter_${index}`] = value;
          return `n.${key} = $filter_${index}`;
        });
        cypher += whereClause + conditions.join(' AND ');
      }

      // Lock status filter
      if (includeAvailableOnly) {
        const lockClause = (type || filters) ? ' AND ' : ' WHERE ';
        cypher += lockClause + `(n.lockedBy IS NULL OR (n.lockExpiresAt IS NOT NULL AND n.lockExpiresAt < $now))`;
        params.now = new Date().toISOString();
      }

      cypher += ' RETURN n';

      const result = await session.run(cypher, params);
      return result.records.map(record => this.nodeFromRecord(record.get('n')));
    } finally {
      await session.close();
    }
  }

  /**
   * Clean up expired locks across all nodes
   * Should be called periodically by the server
   * 
   * @returns Number of locks cleaned up
   */
  async cleanupExpiredLocks(): Promise<number> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (n:Node)
        WHERE n.lockedBy IS NOT NULL 
          AND n.lockExpiresAt IS NOT NULL
          AND n.lockExpiresAt < $now
        REMOVE n.lockedBy, n.lockedAt, n.lockExpiresAt
        RETURN count(n) as cleaned
        `,
        { now: new Date().toISOString() }
      );

      const count = result.records[0]?.get('cleaned');
      return count ? count.toNumber() : 0;
    } finally {
      await session.close();
    }
  }
}
