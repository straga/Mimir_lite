# APOC Plugin System

NornicDB includes a powerful APOC (Awesome Procedures On Cypher) plugin system that extends Cypher with additional functions for machine learning, text processing, data manipulation, and more.

## Overview

The plugin system provides:

- **Built-in Functions**: 60+ functions compiled into the binary (always available)
- **Dynamic Plugins**: Drop `.so` files into a folder for automatic loading
- **Configuration Control**: Enable/disable functions via config or environment variables

## Quick Start

### Using Built-in APOC Functions

All Docker images and builds include APOC functions out of the box:

```cypher
// Text functions
RETURN apoc.text.capitalize('hello world')  // "Hello world"
RETURN apoc.text.camelCase('hello world')   // "helloWorld"

// Collection functions
RETURN apoc.coll.sum([1, 2, 3, 4, 5])        // 15
RETURN apoc.coll.avg([1, 2, 3, 4, 5])        // 3.0

// Math functions
RETURN apoc.math.sqrt(16)                    // 4.0
RETURN apoc.math.round(3.7)                  // 4
```

### Using Plugin Functions

Plugin functions are automatically loaded from `.so` files:

```cypher
// ML plugin functions
RETURN apoc.ml.sigmoid(0)                    // 0.5
RETURN apoc.ml.relu(-5)                      // 0
RETURN apoc.ml.cosineSimilarity([1,0,0], [0,1,0])  // 0.0

// Text plugin functions  
RETURN apoc.text.slugify('Hello World!')     // "hello-world"
RETURN apoc.text.levenshteinDistance('kitten', 'sitting')  // 3
```

## Configuration

### Environment Variables

```bash
# Directory containing .so plugin files (default: empty = no external plugins)
NORNICDB_APOC_PLUGINS_DIR=/app/plugins

# Enable/disable entire APOC system
NORNICDB_APOC_ENABLED=true

# Enable/disable specific categories
NORNICDB_APOC_COLL_ENABLED=true
NORNICDB_APOC_TEXT_ENABLED=true
NORNICDB_APOC_MATH_ENABLED=true
NORNICDB_APOC_ML_ENABLED=true
```

### Docker Compose

```yaml
services:
  nornicdb:
    image: timothyswt/nornicdb-arm64-metal:latest
    environment:
      - NORNICDB_APOC_PLUGINS_DIR=/app/plugins
    volumes:
      - ./my-plugins:/app/plugins  # Mount custom plugins
```

## Available Functions

### Built-in Categories

| Category | Functions | Description |
|----------|-----------|-------------|
| `apoc.coll` | sum, avg, min, max, sort, reverse, flatten, contains, union, intersection | Collection operations |
| `apoc.text` | capitalize, camelCase, snakeCase, replace, split, join, distance | Text manipulation |
| `apoc.math` | sqrt, pow, floor, ceil, round, abs, sin, cos, tan | Mathematical operations |
| `apoc.date` | format, parse, currentTimestamp | Date/time handling |
| `apoc.convert` | toFloat, toInteger, toBoolean, toString | Type conversion |
| `apoc.json` | parse, stringify, validate | JSON operations |
| `apoc.agg` | median, percentile, stdev | Aggregation functions |
| `apoc.util` | md5, sha256, uuid | Utility functions |
| `apoc.map` | merge, fromLists, values, keys | Map operations |

### Plugin Categories

| Plugin | Functions | Description |
|--------|-----------|-------------|
| `apoc.ml` | sigmoid, relu, softmax, cosineSimilarity, euclideanDistance | Machine learning |
| `apoc.text` (plugin) | slugify, levenshteinDistance, jaroWinkler | Advanced text processing |

## Creating Custom Plugins

### Plugin Structure

Create a Go file that implements `PluginInterface`:

```go
// my_plugin.go
package main

// PluginInterface - must match exactly
type PluginInterface interface {
    Name() string
    Version() string
    Functions() map[string]PluginFunction
}

type PluginFunction struct {
    Handler     interface{}
    Description string
    Examples    []string
}

// Plugin is the exported symbol NornicDB will load
var Plugin PluginInterface = MyPlugin{}

type MyPlugin struct{}

func (p MyPlugin) Name() string    { return "myplugin" }
func (p MyPlugin) Version() string { return "1.0.0" }

func (p MyPlugin) Functions() map[string]PluginFunction {
    return map[string]PluginFunction{
        "hello": {
            Handler:     Hello,
            Description: "Returns a greeting",
            Examples:    []string{"apoc.myplugin.hello('World') => 'Hello, World!'"},
        },
    }
}

func Hello(name string) string {
    return "Hello, " + name + "!"
}
```

### Building Your Plugin

```bash
# Build the plugin
go build -buildmode=plugin -o apoc-myplugin.so my_plugin.go

# Copy to plugins directory
cp apoc-myplugin.so /path/to/nornicdb/plugins/
```

### Supported Function Signatures

The plugin system supports these function signatures:

```go
// Single argument
func(string) string
func(float64) float64
func([]float64) []float64

// Two arguments
func(string, string) string
func(string, string) int
func(string, string) float64
func([]float64, []float64) float64

// Collections
func([]interface{}) float64
func([]interface{}) interface{}
func([]interface{}, interface{}) bool
```

## Building Plugins with Make

```bash
# Build all plugins
make plugins

# Build individual plugins
make plugin-ml
make plugin-text

# Clean plugin artifacts
make plugins-clean

# List available plugins
make plugins-list
```

## Docker Image Plugin Locations

All official Docker images include pre-built plugins:

| Image | Plugins Location |
|-------|------------------|
| `nornicdb-arm64-metal` | `/app/plugins/` |
| `nornicdb-amd64-cuda` | `/app/plugins/` |
| `nornicdb-amd64-cpu` | `/app/plugins/` |

## Troubleshooting

### Plugin Not Loading

1. Check the plugin file exists and is readable:
   ```bash
   ls -la /app/plugins/
   ```

2. Verify the plugin was built with the same Go version:
   ```bash
   go version
   ```

3. Check NornicDB logs for plugin loading errors:
   ```bash
   docker logs nornicdb 2>&1 | grep -i plugin
   ```

### Function Not Found

1. Verify the function is registered:
   ```cypher
   CALL apoc.help('functionname')
   ```

2. Check if the category is enabled:
   ```bash
   echo $NORNICDB_APOC_ML_ENABLED
   ```

### Plugin Interface Mismatch

If you see "does not implement PluginInterface", ensure:
- The `Plugin` variable is exported (capital P)
- The `PluginInterface` type matches exactly
- The `PluginFunction` struct has all required fields

## Platform Support

| Platform | Plugin Support | Notes |
|----------|---------------|-------|
| Linux (amd64) | ✅ Full | Native Go plugin support |
| Linux (arm64) | ✅ Full | Native Go plugin support |
| macOS (arm64) | ✅ Full | Native Go plugin support |
| macOS (amd64) | ✅ Full | Native Go plugin support |
| Windows | ❌ None | Go plugins not supported on Windows |

For Windows deployments, all APOC functions are available as built-in functions compiled into the binary.

## Performance

- Plugin loading happens once at startup
- Function calls have minimal overhead (direct function pointer)
- Built-in functions and plugin functions have identical performance

## Security

- Plugins run with the same permissions as NornicDB
- Only load plugins from trusted sources
- Plugin code has full access to system resources
- Consider using Docker volume mounts for plugin isolation
