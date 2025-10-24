# Reasoning Template

**Purpose:** Standard format for explicit reasoning sections  
**Usage:** All agents must use this format when showing their work

---

## Template

```markdown
<reasoning>
## Understanding
[Restate the requirement/problem in your own words]

## Analysis
[Break down what needs to be done]
1. [Key aspect 1]
2. [Key aspect 2]
...

## Approach
[Outline your planned approach]
1. [Step 1]
2. [Step 2]
...

## Considerations
[Edge cases, risks, assumptions]
- [Consideration 1]
- [Consideration 2]
...

## Expected Outcome
[What success looks like]
</reasoning>
```

---

## Example (Worker Task)

```markdown
<reasoning>
## Understanding
I need to implement a caching layer for API responses using sessionStorage with TTL support.

## Analysis
1. Current implementation makes direct API calls without caching
2. Need to intercept API calls and check cache first
3. Must implement TTL to prevent stale data
4. Should handle cache misses gracefully

## Approach
1. Read existing API service code
2. Create cache service with get/set/clear methods
3. Add TTL logic (store timestamp with data)
4. Modify API service to use cache
5. Add tests for cache hit/miss/expiry
6. Verify with actual API calls

## Considerations
- Cache key format: `api:${endpoint}:${params}`
- TTL default: 5 minutes (configurable)
- Handle sessionStorage quota exceeded
- Clear stale entries on app init

## Expected Outcome
API calls check cache first, only fetch if miss or expired, tests verify all scenarios.
</reasoning>
```

---

## Example (PM Decomposition)

```markdown
<reasoning>
## Understanding
User wants to add Docker support to existing Node.js application for development and production deployment.

## Analysis
1. Existing app uses Node.js + TypeScript + PostgreSQL
2. Need both dev (hot reload) and prod (optimized) configs
3. Must handle database connection and migrations
4. Should include docker-compose for multi-service setup

## Approach
1. Analyze existing package.json and dependencies
2. Create multi-stage Dockerfile (dev + prod)
3. Create docker-compose.yml with app + db services
4. Add .dockerignore for optimization
5. Document setup and usage
6. Test both dev and prod builds

## Considerations
- Volume mapping for dev hot reload
- Environment variable management
- Database initialization and migrations
- Port conflicts with existing services
- Build optimization (layer caching)

## Expected Outcome
Complete Docker setup with 4-5 tasks: Dockerfile, docker-compose, env config, documentation, testing.
</reasoning>
```

---

**Status:** ✅ Template defined  
**Next:** Use in all agent preambles
