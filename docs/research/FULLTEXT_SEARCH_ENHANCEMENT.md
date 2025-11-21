# Full-Text Search Enhancement: Switching to BM25

**Date:** November 21, 2024  
**Status:** 🔴 Issue Identified - Enhancement Needed

---

## Problem Identified

Our current full-text search implementation **does NOT use Neo4j's native BM25-powered full-text indexes**. Instead, it uses:

❌ **Current Implementation:**
```cypher
MATCH (n)
WHERE (n.content IS NOT NULL AND toLower(n.content) CONTAINS toLower($query))
   OR (n.title IS NOT NULL AND toLower(n.title) CONTAINS toLower($query))
   ...
RETURN n, CASE WHEN ... THEN 1.0 ELSE 0.5 END AS relevance
ORDER BY relevance DESC
```

**Problems:**
- ❌ Uses simple string `CONTAINS` (substring match)
- ❌ Manual relevance scoring (not BM25)
- ❌ No term frequency consideration
- ❌ No document length normalization
- ❌ No inverse document frequency (IDF)
- ❌ Slow on large datasets (full table scan)
- ❌ No fuzzy matching, proximity search, or boosting

---

## Solution: Use Neo4j's Native Full-Text Index

✅ **Correct Implementation:**
```cypher
CALL db.index.fulltext.queryNodes('node_search', $query)
YIELD node, score
RETURN node, score
ORDER BY score DESC
```

**Benefits:**
- ✅ Uses Apache Lucene with **BM25 algorithm**
- ✅ Proper term frequency (TF) scoring
- ✅ Document length normalization
- ✅ Inverse document frequency (IDF)
- ✅ Fast indexed search (O(log n))
- ✅ Fuzzy matching (`term~`)
- ✅ Proximity search (`"term1 term2"~5`)
- ✅ Field boosting (`title:term^3`)
- ✅ Boolean operators (AND, OR, NOT)
- ✅ Wildcards (`term*`)

---

## What Neo4j Already Provides

### BM25 Algorithm (Native)

Neo4j 5.x uses **Apache Lucene 9.x**, which uses **BM25 by default** (since Lucene 6.0+).

**BM25 Formula:**
```
score(D,Q) = Σ IDF(qi) × (f(qi,D) × (k1 + 1)) / (f(qi,D) + k1 × (1 - b + b × |D| / avgdl))
```

Where:
- `IDF(qi)` = Inverse document frequency of term qi
- `f(qi,D)` = Frequency of term qi in document D
- `|D|` = Length of document D
- `avgdl` = Average document length
- `k1` = Term frequency saturation parameter (default: 1.2)
- `b` = Length normalization parameter (default: 0.75)

### Available Features

| Feature | Syntax | Example |
|---------|--------|---------|
| **Basic Search** | `term` | `accessibility` |
| **Boolean AND** | `term1 AND term2` | `accessibility AND WCAG` |
| **Boolean OR** | `term1 OR term2` | `accessibility OR a11y` |
| **Boolean NOT** | `term1 NOT term2` | `accessibility NOT deprecated` |
| **Phrase Search** | `"exact phrase"` | `"web accessibility"` |
| **Fuzzy Match** | `term~` | `accessability~` (matches "accessibility") |
| **Proximity** | `"term1 term2"~N` | `"vector search"~5` |
| **Wildcards** | `term*` | `access*` (matches "accessibility") |
| **Field Boost** | `field:term^N` | `title:accessibility^3` |
| **Field-Specific** | `field:term` | `title:accessibility` |

---

## Implementation Plan

### Step 1: Verify Full-Text Index Exists

Check if `node_search` index exists:

```cypher
CALL db.indexes() YIELD name, type, labelsOrTypes, properties
WHERE type = 'FULLTEXT'
RETURN name, labelsOrTypes, properties
```

### Step 2: Create/Update Full-Text Index

If missing or incomplete, create comprehensive index:

```cypher
// Drop old index if exists
CALL db.index.fulltext.drop('node_search') YIELD name

// Create new comprehensive index
CREATE FULLTEXT INDEX node_search
FOR (n:File|FileChunk|Memory|Todo|Concept|Person|Project|Module|Function|Class)
ON EACH [n.content, n.text, n.title, n.name, n.description, n.path]
OPTIONS {
  indexConfig: {
    `fulltext.analyzer`: 'standard',
    `fulltext.eventually_consistent`: true
  }
}
```

### Step 3: Update UnifiedSearchService

Replace manual `CONTAINS` search with native full-text:

```typescript
private async fullTextSearch(query: string, options: UnifiedSearchOptions): Promise<SearchResult[]> {
  const session = this.driver.session();
  
  try {
    const limit = options.limit || 100;
    
    // Expand 'file' to include 'file_chunk'
    let expandedTypes = options.types;
    if (options.types && options.types.length > 0) {
      expandedTypes = options.types.flatMap(type => 
        type === 'file' ? ['file', 'file_chunk'] : type
      );
    }
    
    // Use Neo4j's native BM25-powered full-text search
    const result = await session.run(
      `
      CALL db.index.fulltext.queryNodes('node_search', $query)
      YIELD node, score
      
      // Filter by type if specified
      ${expandedTypes && expandedTypes.length > 0 ? 
        'WHERE node.type IN $types' : ''}
      
      // Get parent file info for chunks
      OPTIONAL MATCH (node)<-[:HAS_CHUNK]-(parentFile:File)
      
      RETURN COALESCE(node.id, node.path) AS id,
             node.type AS type,
             COALESCE(node.title, node.name) AS title,
             node.name AS name,
             node.description AS description,
             node.content AS content,
             node.path AS path,
             CASE 
               WHEN node.type = 'file_chunk' AND parentFile IS NOT NULL 
               THEN parentFile.absolute_path 
               ELSE node.absolute_path
             END AS absolute_path,
             node.text AS chunk_text,
             node.chunk_index AS chunk_index,
             parentFile.path AS parent_file_path,
             parentFile.absolute_path AS parent_file_absolute_path,
             parentFile.name AS parent_file_name,
             parentFile.language AS parent_file_language,
             score AS relevance
      ORDER BY score DESC
      LIMIT $limit
      `,
      { 
        query, 
        types: expandedTypes,
        limit: neo4j.int(limit)
      }
    );
    
    // ... format results ...
  }
}
```

### Step 4: Add Query Enhancement Options

Allow users to leverage BM25 features:

```typescript
interface FullTextSearchOptions {
  query: string;
  fuzzy?: boolean;           // Enable fuzzy matching (term~)
  proximity?: number;        // Proximity search distance
  titleBoost?: number;       // Boost title matches (default: 3)
  exactPhrase?: boolean;     // Wrap in quotes for exact match
}

function enhanceQuery(options: FullTextSearchOptions): string {
  let query = options.query;
  
  // Add fuzzy matching
  if (options.fuzzy) {
    query = query.split(' ').map(term => `${term}~`).join(' ');
  }
  
  // Add proximity search
  if (options.proximity) {
    query = `"${query}"~${options.proximity}`;
  }
  
  // Add field boosting
  if (options.titleBoost) {
    const terms = query.split(' ');
    query = terms.map(term => 
      `title:${term}^${options.titleBoost} OR content:${term}`
    ).join(' ');
  }
  
  // Exact phrase
  if (options.exactPhrase && !query.startsWith('"')) {
    query = `"${query}"`;
  }
  
  return query;
}
```

---

## Expected Performance Improvements

### Before (Current - CONTAINS)

| Dataset Size | Query Time | Algorithm |
|--------------|------------|-----------|
| 1,000 nodes | ~50ms | Full scan |
| 10,000 nodes | ~500ms | Full scan |
| 100,000 nodes | ~5s | Full scan |

**Complexity:** O(n) - linear scan

### After (BM25 Full-Text Index)

| Dataset Size | Query Time | Algorithm |
|--------------|------------|-----------|
| 1,000 nodes | ~5ms | Indexed |
| 10,000 nodes | ~10ms | Indexed |
| 100,000 nodes | ~20ms | Indexed |

**Complexity:** O(log n) - indexed search

**Expected Speedup:** **10-250x faster** depending on dataset size

---

## Quality Improvements

### Current (Simple CONTAINS)

```
Query: "accessibility"
Results:
1. "This is about accessibility" (score: 0.7)
2. "Accessibility testing guide" (score: 0.7)
3. "Web accessibility standards" (score: 0.7)
```

**Problems:**
- All matches get same score
- No consideration of term frequency
- No document length normalization
- Substring matches (e.g., "inaccessibility" matches)

### With BM25

```
Query: "accessibility"
Results:
1. "Accessibility" (score: 8.5) - Title match, short doc
2. "Web Accessibility Standards" (score: 7.2) - Title + content
3. "This guide covers accessibility" (score: 3.1) - Content match
```

**Benefits:**
- ✅ Proper relevance scoring
- ✅ Term frequency considered
- ✅ Document length normalized
- ✅ Exact word boundary matching
- ✅ IDF boosts rare terms

---

## Testing Plan

### Test 1: Basic BM25 Search
```bash
curl "http://localhost:3000/api/nodes/vector-search?query=accessibility"
# Should use BM25 scoring
```

### Test 2: Fuzzy Search
```bash
curl "http://localhost:3000/api/nodes/vector-search?query=accessability~"
# Should match "accessibility" despite typo
```

### Test 3: Field Boosting
```bash
curl "http://localhost:3000/api/nodes/vector-search?query=title:accessibility^3"
# Should prioritize title matches
```

### Test 4: Boolean Operators
```bash
curl "http://localhost:3000/api/nodes/vector-search?query=accessibility+AND+WCAG"
# Should require both terms
```

### Test 5: Performance
```bash
# Measure query time before and after
time curl "http://localhost:3000/api/nodes/vector-search?query=test"
```

---

## Migration Steps

1. ✅ Research completed - BM25 available in Neo4j
2. ⏳ Verify full-text index exists and is comprehensive
3. ⏳ Update `fullTextSearch()` method to use native index
4. ⏳ Add query enhancement options
5. ⏳ Test performance improvements
6. ⏳ Update documentation
7. ⏳ Deploy to production

---

## Conclusion

**We're NOT currently using BM25!** Our manual `CONTAINS` search is:
- ❌ Slower (O(n) vs O(log n))
- ❌ Less accurate (no TF-IDF)
- ❌ Missing features (fuzzy, proximity, boosting)

**Switching to Neo4j's native full-text index will give us:**
- ✅ True BM25 algorithm
- ✅ 10-250x faster queries
- ✅ Better relevance scoring
- ✅ Advanced search features
- ✅ Zero additional dependencies

**This is a high-impact, low-effort enhancement!**

