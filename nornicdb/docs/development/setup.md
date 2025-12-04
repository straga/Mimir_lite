# Development Setup

**Get your development environment ready for NornicDB.**

## Prerequisites

- Go 1.21 or later
- Git
- Make (optional, for build shortcuts)
- Docker (optional, for containerized testing)

## Clone Repository

```bash
git clone https://github.com/orneryd/nornicdb.git
cd nornicdb
```

## Build from Source

```bash
# Build binary
make build

# Or without make:
go build -o bin/nornicdb ./cmd/nornicdb
```

## Run Tests

```bash
# All tests
go test ./...

# With coverage
go test -cover ./...

# Specific package
go test ./pkg/nornicdb/...
```

## Start Development Server

```bash
# Default settings (localhost:7474)
./bin/nornicdb serve --data-dir=./dev-data

# With auth disabled for easier development
./bin/nornicdb serve --data-dir=./dev-data --no-auth

# Custom ports
./bin/nornicdb serve --http-port=8080 --bolt-port=8687
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NORNICDB_DATA_DIR` | Data directory | `./data` |
| `NORNICDB_HTTP_PORT` | HTTP API port | `7474` |
| `NORNICDB_BOLT_PORT` | Bolt port | `7687` |
| `NORNICDB_NO_AUTH` | Disable auth | `false` |
| `NORNICDB_JWT_SECRET` | JWT secret | Required for auth |

## IDE Setup

### VS Code

Recommended extensions:
- Go (official)
- Go Test Explorer
- GitLens

```json
// .vscode/settings.json
{
  "go.lintTool": "golangci-lint",
  "go.testFlags": ["-v"],
  "editor.formatOnSave": true
}
```

### GoLand

1. Open project root
2. Set GOPATH to project directory
3. Enable "Go Modules" in Preferences

## Project Structure

```
nornicdb/
├── cmd/nornicdb/     # CLI application
├── pkg/
│   ├── nornicdb/     # Core database
│   ├── server/       # HTTP server
│   ├── storage/      # Storage engines
│   ├── auth/         # Authentication
│   ├── audit/        # Audit logging
│   └── gpu/          # GPU acceleration
├── docker/           # Docker files
└── docs/             # Documentation
```

## Next Steps

- **[Testing Guide](testing.md)** - How to write tests
- **[Code Style](code-style.md)** - Code conventions
- **[Contributing](../CONTRIBUTING.md)** - Contribution process

