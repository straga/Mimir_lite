// ============================================================================
// Unified Graph Tools - Simple and Clean
// 22 tools: 12 single operations + 5 batch operations + 4 locking operations + 1 context isolation
// ============================================================================

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const GRAPH_TOOLS: Tool[] = [
  // ============================================================================
  // SINGLE OPERATIONS (12 tools)
  // ============================================================================
  
  {
    name: "graph_add_node",
    description: "Create a node to offload conversation details into external memory. Store file paths, errors, code snippets, decisions in properties. Returns an ID—use this ID to reference the node later instead of repeating details. Think of this as saving to your persistent memory. For TODOs: include description, status, priority. For files: path, language. After creation, use graph_get_node with the returned ID to retrieve full details.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["todo", "file", "function", "class", "module", "concept", "person", "project", "custom"],
          description: "Type of node to create"
        },
        properties: {
          type: "object",
          description: "Node properties (e.g., {description: 'Fix bug', status: 'pending', priority: 'high', context: {...}}).",
          additionalProperties: true
        }
      },
      required: ["type", "properties"]
    }
  },
  
  {
    name: "graph_get_node",
    description: "Retrieve full node details by ID. Use this to restore context when resuming work instead of keeping details in conversation. This is how you recall stored memories. Returns all properties, timestamps, and metadata. Use the ID from graph_add_node responses.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Node ID to retrieve (e.g., 'todo-1-xxxxx', 'file-2-xxxxx')"
        }
      },
      required: ["id"]
    }
  },
  
  {
    name: "graph_update_node",
    description: "Update node properties (merges with existing). Use to incrementally add context, change status, append findings without restating everything. Properties merge deeply—new fields added, existing fields updated. Perfect for tracking TODO progress (pending→in_progress→completed) or adding research findings over time.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Node ID to update"
        },
        properties: {
          type: "object",
          description: "Properties to update or add (e.g., {status: 'completed', results: {...}}). Merges with existing properties.",
          additionalProperties: true
        }
      },
      required: ["id", "properties"]
    }
  },
  
  {
    name: "graph_delete_node",
    description: "Delete a node and all its relationships. Use for cleanup after task completion or removing obsolete context. All edges connected to this node are automatically deleted. Returns success status.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Node ID to delete"
        }
      },
      required: ["id"]
    }
  },
  
  {
    name: "graph_add_edge",
    description: "Link two nodes with a relationship to model dependencies, hierarchies, or associations. Use to build your context graph showing how entities relate (e.g., 'file depends_on module', 'TODO assigned_to person', 'project contains file'). Store relationship details in properties. Later use graph_get_neighbors or graph_get_subgraph to traverse these connections.",
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "Source node ID (the 'from' node)"
        },
        target: {
          type: "string",
          description: "Target node ID (the 'to' node)"
        },
        type: {
          type: "string",
          enum: ["contains", "depends_on", "relates_to", "implements", "calls", "imports", "assigned_to", "parent_of", "blocks", "references"],
          description: "Type of relationship (e.g., 'depends_on' for dependencies, 'contains' for hierarchy)"
        },
        properties: {
          type: "object",
          description: "Optional edge properties (e.g., {weight: 1, reason: 'shared interface'})",
          additionalProperties: true
        }
      },
      required: ["source", "target", "type"]
    }
  },
  
  {
    name: "graph_delete_edge",
    description: "Delete a single edge by ID",
    inputSchema: {
      type: "object",
      properties: {
        edgeId: {
          type: "string",
          description: "Edge ID to delete"
        }
      },
      required: ["edgeId"]
    }
  },
  
  {
    name: "graph_query_nodes",
    description: "Query nodes by type and properties. Use to find nodes when you don't have IDs (e.g., 'find all pending TODOs', 'find files with path containing auth'). Returns array of matching nodes. Combine with graph_get_subgraph to explore connections. Use this at conversation start to see what's in memory: graph_query_nodes({type: 'todo', filters: {status: 'in_progress'}}).",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["todo", "file", "function", "class", "module", "concept", "person", "project", "custom"],
          description: "Filter by node type (optional, omit to query all types)"
        },
        filters: {
          type: "object",
          description: "Property filters for exact matches (e.g., {status: 'pending', priority: 'high'})",
          additionalProperties: true
        }
      }
    }
  },
  
  {
    name: "graph_search_nodes",
    description: "Full-text search across all nodes. Use when you've lost track of details and need to find nodes containing keywords (e.g., search 'authentication' to find all auth-related nodes). This is how you search your stored memories. Searches all properties, case-insensitive. Returns nodes ranked by relevance. Use after long conversations to recover context.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query text (e.g., 'bug fix', 'API endpoint', 'authentication')"
        },
        options: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Max results (default: 100)" },
            offset: { type: "number", description: "Skip N results for pagination (default: 0)" },
            types: {
              type: "array",
              items: { type: "string" },
              description: "Filter by node types (e.g., ['todo', 'file'])"
            }
          }
        }
      },
      required: ["query"]
    }
  },
  
  {
    name: "graph_get_edges",
    description: "Get all edges connected to a node",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          description: "Node ID"
        },
        direction: {
          type: "string",
          enum: ["in", "out", "both"],
          description: "Edge direction (default: both)"
        }
      },
      required: ["nodeId"]
    }
  },
  
  {
    name: "graph_get_neighbors",
    description: "Find all nodes connected to a given node. Use to discover related entities (e.g., 'what files are related to this TODO?', 'what depends on this module?'). Returns array of connected nodes with relationship info. Specify depth for multi-hop traversal. Use after creating relationships to verify connections.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          description: "Starting node ID to find neighbors for"
        },
        edgeType: {
          type: "string",
          description: "Filter by edge type (e.g., 'depends_on', 'contains')"
        },
        depth: {
          type: "number",
          description: "Traversal depth: 1=direct neighbors, 2=neighbors of neighbors, etc. (default: 1)"
        }
      },
      required: ["nodeId"]
    }
  },
  
  {
    name: "graph_get_subgraph",
    description: "Extract a connected subgraph for multi-hop reasoning. Returns all nodes and edges within N hops of start node. Perfect for understanding complex relationships like 'what files depend on this TODO?' or 'show me full context around this concept'. Use depth=1 for immediate connections, depth=2 for deeper context. Essential for Graph-RAG workflows to gather comprehensive context.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          description: "Center node ID to start extraction from"
        },
        depth: {
          type: "number",
          description: "Traversal depth: how many hops to explore (1=immediate, 2=neighborhood, 3+=extended context, default: 2)"
        }
      },
      required: ["nodeId"]
    }
  },
  
  {
    name: "graph_clear",
    description: "Clear data from the graph. SAFETY: To clear all data, you MUST explicitly pass type='ALL'. To clear specific node types, pass the node type. Returns counts of deleted nodes and edges.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["ALL", "todo", "file", "function", "class", "module", "concept", "person", "project", "custom"],
          description: "Node type to clear, or 'ALL' to clear entire graph (use with extreme caution!). Required parameter."
        }
      },
      required: ["type"]
    }
  },
  
  // ============================================================================
  // BATCH OPERATIONS (5 tools)
  // ============================================================================
  
  {
    name: "graph_add_nodes",
    description: "Bulk create multiple nodes in one efficient transaction. Use for importing file structures, creating multiple TODOs, or initializing project hierarchies. Much faster than multiple graph_add_node calls. Returns array of created nodes with IDs. Perfect for file indexing workflows.",
    inputSchema: {
      type: "object",
      properties: {
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              properties: { type: "object", additionalProperties: true }
            },
            required: ["type", "properties"]
          },
          description: "Array of nodes to create (e.g., [{type: 'file', properties: {path: 'a.ts'}}, {type: 'file', properties: {path: 'b.ts'}}])"
        }
      },
      required: ["nodes"]
    }
  },
  
  {
    name: "graph_update_nodes",
    description: "Bulk update multiple nodes in one efficient transaction. Use for batch status changes, adding common properties, or updating multiple TODOs. Properties merge with existing data. Returns array of updated nodes.",
    inputSchema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              properties: { type: "object", additionalProperties: true }
            },
            required: ["id", "properties"]
          },
          description: "Array of node updates (e.g., [{id: 'todo-1-xxx', properties: {status: 'completed'}}, {...}])"
        }
      },
      required: ["updates"]
    }
  },
  
  {
    name: "graph_delete_nodes",
    description: "Bulk delete multiple nodes and their relationships in one transaction. Use for cleanup after project completion. All edges connected to these nodes are automatically deleted. Returns count of deleted nodes.",
    inputSchema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of node IDs to delete (e.g., ['todo-1-xxx', 'file-2-yyy'])"
        }
      },
      required: ["ids"]
    }
  },
  
  {
    name: "graph_add_edges",
    description: "Bulk create multiple relationships in one efficient transaction. Use to connect files to modules, TODOs to people, or build dependency graphs. Much faster than multiple graph_add_edge calls. Returns array of created edges with IDs.",
    inputSchema: {
      type: "object",
      properties: {
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              source: { type: "string" },
              target: { type: "string" },
              type: { type: "string" },
              properties: { type: "object", additionalProperties: true }
            },
            required: ["source", "target", "type"]
          },
          description: "Array of edges to create (e.g., [{source: 'file-1', target: 'module-2', type: 'imports'}, {...}])"
        }
      },
      required: ["edges"]
    }
  },
  
  {
    name: "graph_delete_edges",
    description: "Bulk delete multiple relationships in one transaction. Use for cleanup or restructuring. Returns count of deleted edges.",
    inputSchema: {
      type: "object",
      properties: {
        edgeIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of edge IDs to delete (get IDs from graph_get_edges)"
        }
      },
      required: ["edgeIds"]
    }
  },

  // ============================================================================
  // MULTI-AGENT LOCKING (4 tools)
  // ============================================================================

  {
    name: "graph_lock_node",
    description: "Acquire exclusive lock on a node (typically a TODO) for multi-agent coordination. Prevents race conditions when multiple workers claim tasks. Lock automatically expires after timeout. Returns true if lock acquired, false if already locked by another agent.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          description: "Node ID to lock"
        },
        agentId: {
          type: "string",
          description: "Agent claiming the lock (e.g., 'worker-1', 'pm-agent')"
        },
        timeoutMs: {
          type: "number",
          description: "Lock expiry in milliseconds (default: 300000 = 5 minutes)",
          default: 300000
        }
      },
      required: ["nodeId", "agentId"]
    }
  },

  {
    name: "graph_unlock_node",
    description: "Release lock on a node. Only the agent that acquired the lock can release it. Use after completing work on a locked task.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          description: "Node ID to unlock"
        },
        agentId: {
          type: "string",
          description: "Agent releasing the lock (must match lock owner)"
        }
      },
      required: ["nodeId", "agentId"]
    }
  },

  {
    name: "graph_query_available_nodes",
    description: "Query nodes filtered by lock status. Use to find available (unlocked) tasks for workers to claim. Returns only nodes that are not locked or have expired locks.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["todo", "file", "function", "class", "module", "concept", "person", "project", "custom"],
          description: "Filter by node type (optional)"
        },
        filters: {
          type: "object",
          description: "Additional property filters (e.g., {status: 'pending', priority: 'high'})",
          additionalProperties: true
        },
        availableOnly: {
          type: "boolean",
          description: "If true, only return unlocked or expired-lock nodes (default: true)",
          default: true
        }
      }
    }
  },

  {
    name: "graph_cleanup_locks",
    description: "Clean up expired locks across all nodes. Should be called periodically by PM agent or system. Returns number of locks cleaned up.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  // ============================================================================
  // CONTEXT ISOLATION (1 tool)
  // ============================================================================

  {
    name: "get_task_context",
    description: "Get filtered task context based on agent type (PM/worker/QC). Server-side context isolation for multi-agent workflows. PM agents get full context (100%), workers get minimal context (<10% - only files, dependencies, requirements), QC agents get requirements + worker output for verification. Implements 90%+ context reduction for worker agents.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Task node ID to retrieve context for"
        },
        agentType: {
          type: "string",
          enum: ["pm", "worker", "qc"],
          description: "Agent type requesting context - determines filtering level"
        }
      },
      required: ["taskId", "agentType"]
    }
  }
];
