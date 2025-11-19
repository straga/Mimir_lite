# Vector Search UI Settings Guide

## Overview

The Mimir Portal now includes a **Vector Search Settings** modal that allows users to configure semantic search parameters directly from the UI. These settings control how the AI retrieves relevant context from your knowledge graph during chat conversations.

## Accessing the Settings

1. Click the **Settings** cog icon (⚙️) located in the input area, to the left of the paperclip attachment icon
2. The settings modal will open, displaying all available configuration options

## Settings Configuration

### 1. Enable Vector Search
- **Type**: Checkbox (On/Off)
- **Default**: Enabled
- **Description**: Master switch to enable or disable vector search entirely. When disabled, the AI will not search your knowledge graph for context.

### 2. Max Results
- **Type**: Number input (1-50)
- **Default**: 10
- **Description**: Maximum number of results to retrieve from the knowledge graph. Higher values provide more context but may slow down responses.
- **Recommendation**: 
  - **5-10**: For focused, specific queries
  - **15-25**: For comprehensive research queries
  - **25-50**: For deep exploration of related concepts

### 3. Min Similarity
- **Type**: Number input (0.00-1.00)
- **Default**: 0.80
- **Description**: Minimum cosine similarity threshold for results (0 = no filter, 1 = exact match). Higher values return only highly relevant results.
- **Recommendation**:
  - **0.3-0.4**: Broad, exploratory search
  - **0.5-0.6**: Balanced relevance
  - **0.7-0.9**: Strict, high-precision results (default: 0.8)

### 4. Graph Depth
- **Type**: Number input (1-3)
- **Default**: 1
- **Description**: Graph traversal depth for multi-hop search. Determines how many relationship "hops" to explore from initial matches.
- **Recommendation**:
  - **1**: Direct matches only (fastest)
  - **2**: Related concepts (balanced)
  - **3**: Deep network exploration (comprehensive, slower)

### 5. Node Types
- **Type**: Multi-select checkboxes
- **Default**: `todo`, `memory`, `file`, `file_chunk`
- **Available Types**:
  - `todo` - Individual tasks
  - `todoList` - Collections of tasks
  - `memory` - Stored memories and research
  - `file` - Indexed files
  - `file_chunk` - File content chunks
  - `function` - Code functions
  - `class` - Code classes
  - `module` - Code modules
  - `concept` - Abstract concepts
  - `person` - People/contacts
  - `project` - Projects
  - `custom` - Custom node types
- **Description**: Select which types of nodes to search. Only checked types will be included in results.

## Persistence

All settings are automatically saved to **browser localStorage** when you click "Save Settings". They will persist across sessions and be applied to all future chat requests.

## API Integration

When vector search is enabled, the settings are sent with each chat request:

```json
{
  "messages": [...],
  "model": "gpt-4.1",
  "enable_tools": true,
  "tool_parameters": {
    "vector_search_nodes": {
      "limit": 10,
      "min_similarity": 0.8,
      "depth": 1,
      "types": ["todo", "memory", "file", "file_chunk"]
    }
  }
}
```

## Best Practices

### For General Chat
```
Enabled: ✓
Max Results: 10
Min Similarity: 0.8
Depth: 1
Types: memory, file, file_chunk
```

### For Research & Exploration
```
Enabled: ✓
Max Results: 25
Min Similarity: 0.4
Depth: 2
Types: memory, file, file_chunk, concept
```

### For Code-Related Queries
```
Enabled: ✓
Max Results: 15
Min Similarity: 0.6
Depth: 1
Types: file, file_chunk, function, class, module
```

### For Task Management
```
Enabled: ✓
Max Results: 20
Min Similarity: 0.7
Depth: 2
Types: todo, todoList, project
```

### Disable for Pure LLM Responses
```
Enabled: ✗
(Other settings ignored when disabled)
```

## Reset to Defaults

Click the **"Reset to Defaults"** button in the modal to restore the default settings:
- Enabled: True
- Max Results: 10
- Min Similarity: 0.8
- Depth: 1
- Types: `todo`, `memory`, `file`, `file_chunk`

## Troubleshooting

### No Results Found
- **Lower min_similarity**: Try 0.3-0.4 for broader matching
- **Increase max results**: Try 20-30 to capture more potential matches
- **Check node types**: Ensure the types you need are selected
- **Increase depth**: Try depth 2 for related concepts

### Too Many Irrelevant Results
- **Raise min_similarity**: Try 0.7-0.8 for stricter matching
- **Decrease max results**: Limit to top 5-10 most relevant
- **Reduce depth**: Use depth 1 for direct matches only
- **Narrow node types**: Select only the specific types you need

### Slow Responses
- **Reduce max results**: Lower to 5-10
- **Decrease depth**: Use depth 1 instead of 2 or 3
- **Limit node types**: Select fewer types to search

## Technical Details

### Implementation
- **Frontend**: `frontend/src/pages/Portal.tsx`
- **State**: React useState with localStorage persistence
- **API**: Passed as `tool_parameters.vector_search_nodes` in `/v1/chat/completions` requests

### Storage Key
```javascript
localStorage.getItem('mimir-vector-search-settings')
```

### Data Structure
```typescript
interface VectorSearchSettings {
  enabled: boolean;
  limit: number;
  minSimilarity: number;
  depth: number;
  types: string[];
}
```

## Future Enhancements

Potential future additions:
- Preset profiles (e.g., "Research Mode", "Code Mode", "Task Mode")
- Per-conversation settings override
- Real-time result preview in modal
- Search statistics (avg results, avg similarity)
- Node type auto-detection based on query

## Related Documentation

- [Model Selection Guide](./MODEL_SELECTION.md)
- [Chat API Documentation](../architecture/CHAT_API.md)
- [Knowledge Graph Overview](../architecture/KNOWLEDGE_GRAPH.md)
- [Vector Search Tool](../../src/tools/vectorSearch.tools.ts)

---

**Last Updated**: 2025-11-19  
**Version**: 1.0.0
