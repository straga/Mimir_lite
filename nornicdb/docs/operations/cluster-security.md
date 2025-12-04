# Cluster Security

**Configure authentication and security for NornicDB clusters.**

## Overview

NornicDB clusters use the same authentication system for both client connections and inter-node communication:

- **Bolt Protocol Authentication** - Standard Neo4j-compatible auth (port 7687)
- **JWT Bearer Tokens** - Recommended for cluster inter-node auth
- **Service Accounts** - Non-human identities for automation
- **RBAC Integration** - Full role-based access control

## Supported Auth Schemes

| Scheme | Principal | Description |
|--------|-----------|-------------|
| `basic` | username | Username/password authentication |
| `basic` | (empty) | JWT token in credentials field |
| `bearer` | (ignored) | JWT token in credentials field |
| `none` | - | Anonymous (if enabled, grants viewer role) |

## Authentication Methods

### Basic Authentication

Username/password authentication via Bolt protocol:

```go
// Go
driver, _ := neo4j.NewDriverWithContext(
    "bolt://localhost:7687",
    neo4j.BasicAuth("admin", "password", ""),
)
```

```python
# Python
driver = GraphDatabase.driver(
    "bolt://localhost:7687",
    auth=("admin", "password")
)
```

```typescript
// JavaScript/TypeScript
const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('admin', 'password')
);
```

### JWT Bearer Tokens (Recommended for Clusters)

For cluster nodes, JWT tokens provide stateless, scalable authentication:

#### Step 1: Generate a Shared JWT Secret

```bash
# Generate a 48-byte (384-bit) secret (min 32 bytes required)
openssl rand -base64 48
# Example: K7xB2mN9pQr4sT6uV8wY0zA3bC5dE7fG9hI1jK3lM5nO7pQ9rS1tU3vW5xY7zA==
```

**⚠️ Important**: This secret must be identical on ALL cluster nodes.

#### Step 2: Configure All Nodes

```bash
# .env file for ALL cluster nodes
NORNICDB_JWT_SECRET=K7xB2mN9pQr4sT6uV8wY0zA3bC5dE7fG9hI1jK3lM5nO7pQ9rS1tU3vW5xY7zA==
NORNICDB_BOLT_REQUIRE_AUTH=true
```

#### Step 3: Generate Cluster Tokens

Via API:
```bash
curl -X POST http://localhost:7474/api/v1/auth/cluster-token \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"node_id": "node-2", "role": "admin"}'
```

Via Go code:
```go
// Token never expires (default)
token, _ := authenticator.GenerateClusterToken("node-2", auth.RoleAdmin)

// Token with custom expiry
token7d, _ := authenticator.GenerateClusterTokenWithExpiry(
    "node-2", auth.RoleAdmin, 7*24*time.Hour)
```

#### Step 4: Connect Using JWT

```go
// Go - Empty username signals JWT authentication
driver, _ := neo4j.NewDriverWithContext(
    "bolt://node1.cluster.local:7687",
    neo4j.BasicAuth("", token, ""),  // Empty username = JWT
)
```

```python
# Python
driver = GraphDatabase.driver(
    "bolt://node1.cluster.local:7687",
    auth=("", token)  # Empty username = JWT
)
```

```typescript
// JavaScript/TypeScript
const driver = neo4j.driver(
    'bolt://node1.cluster.local:7687',
    neo4j.auth.basic('', token)  // Empty username = JWT
);
```

## Cluster Node Authentication

### Service Account Setup

Create service accounts for cluster nodes:

```bash
# Via HTTP API (port 7474 for HTTP, 7687 for Bolt)
curl -X POST http://localhost:7474/api/v1/service-accounts \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "cluster-node-1",
    "secret": "secure-generated-password",
    "role": "admin"
  }'
```

Via Go code:
```go
// Create service account for cluster node
authenticator.CreateUser("cluster-node-1", "secure-password", 
    []auth.Role{auth.RoleAdmin})
```

### Docker Compose with Auth

```yaml
version: '3.8'

services:
  nornicdb-node1:
    image: nornicdb:latest
    environment:
      NORNICDB_JWT_SECRET: ${SHARED_JWT_SECRET}
      NORNICDB_BOLT_REQUIRE_AUTH: "true"
      NORNICDB_BOLT_ALLOW_ANONYMOUS: "false"
    secrets:
      - jwt-secret

secrets:
  jwt-secret:
    external: true
```

## Permissions

| Query Type | Required Permission |
|------------|---------------------|
| `MATCH ... RETURN` | `read` |
| `CREATE`, `MERGE`, `SET` | `write` |
| `DELETE` | `delete` |
| `CREATE INDEX` | `schema` |

## Security Best Practices

### 1. Use Strong Secrets

```bash
# Generate secure secrets
openssl rand -base64 32  # Service account
openssl rand -base64 48  # JWT secret
```

### 2. Network Isolation

```yaml
# Isolate cluster network
networks:
  cluster-internal:
    internal: true  # No external access
```

### 3. Secret Rotation

Rotate secrets quarterly:

```go
func RotateServiceAccountSecret(auth *Authenticator, accountID string) (string, error) {
    newSecret := generateSecureSecret()
    err := auth.UpdateServiceAccountSecret(accountID, newSecret)
    return newSecret, err
}
```

## Troubleshooting

### Authentication Failures

```bash
# Check service account exists (HTTP API port 7474)
curl -X GET http://localhost:7474/api/v1/service-accounts/cluster-node-1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Permission Denied

```bash
# Check/update account role
curl -X PATCH http://localhost:7474/api/v1/service-accounts/cluster-node-1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

### Debug Logging

```bash
export NORNICDB_LOG_LEVEL=debug
export NORNICDB_AUTH_DEBUG=true
```

## See Also

- **[Clustering Guide](../user-guides/clustering.md)** - Full clustering setup
- **[RBAC](../compliance/rbac.md)** - Authentication details
- **[Scaling](scaling.md)** - Performance scaling


