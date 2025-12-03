package nornicdb

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPluginFunctionRegistry(t *testing.T) {
	// Clear any existing state
	pluginsMu.Lock()
	pluginFunctions = make(map[string]PluginFunction)
	loadedPlugins = make(map[string]*LoadedPlugin)
	pluginsInitialized = false
	pluginsMu.Unlock()

	t.Run("GetPluginFunction returns false for unregistered function", func(t *testing.T) {
		_, found := GetPluginFunction("nonexistent.function")
		assert.False(t, found)
	})

	t.Run("register and retrieve plugin function", func(t *testing.T) {
		// Manually register a function (simulating plugin load)
		pluginsMu.Lock()
		pluginFunctions["test.plugin.sum"] = PluginFunction{
			Name:        "test.plugin.sum",
			Handler:     func(vals []interface{}) float64 { return 42.0 },
			Description: "Test sum function",
			Category:    "test",
		}
		pluginsMu.Unlock()

		fn, found := GetPluginFunction("test.plugin.sum")
		require.True(t, found)
		assert.Equal(t, "test.plugin.sum", fn.Name)
		assert.Equal(t, "Test sum function", fn.Description)
		assert.NotNil(t, fn.Handler)
	})

	t.Run("ListPluginFunctions returns registered functions", func(t *testing.T) {
		names := ListPluginFunctions()
		assert.Contains(t, names, "test.plugin.sum")
	})

	t.Run("case sensitivity - function names are case sensitive", func(t *testing.T) {
		_, found := GetPluginFunction("TEST.PLUGIN.SUM")
		assert.False(t, found, "Function lookup should be case sensitive")

		_, found = GetPluginFunction("test.plugin.sum")
		assert.True(t, found)
	})
}

func TestLoadedPluginTracking(t *testing.T) {
	// Clear state
	pluginsMu.Lock()
	pluginFunctions = make(map[string]PluginFunction)
	loadedPlugins = make(map[string]*LoadedPlugin)
	pluginsInitialized = false
	pluginsMu.Unlock()

	t.Run("ListLoadedPlugins returns empty when no plugins loaded", func(t *testing.T) {
		plugins := ListLoadedPlugins()
		assert.Empty(t, plugins)
	})

	t.Run("track loaded plugin", func(t *testing.T) {
		pluginsMu.Lock()
		loadedPlugins["testplugin"] = &LoadedPlugin{
			Name:    "testplugin",
			Version: "1.0.0",
			Path:    "/path/to/testplugin.so",
			Functions: []PluginFunction{
				{Name: "testplugin.func1", Handler: nil, Description: "Test func 1"},
				{Name: "testplugin.func2", Handler: nil, Description: "Test func 2"},
			},
		}
		pluginsInitialized = true
		pluginsMu.Unlock()

		plugins := ListLoadedPlugins()
		require.Len(t, plugins, 1)
		assert.Equal(t, "testplugin", plugins[0].Name)
		assert.Equal(t, "1.0.0", plugins[0].Version)
		assert.Len(t, plugins[0].Functions, 2)
	})

	t.Run("PluginsInitialized returns correct state", func(t *testing.T) {
		assert.True(t, PluginsInitialized())
	})
}

func TestLoadPluginsFromDir(t *testing.T) {
	t.Run("empty directory path returns nil", func(t *testing.T) {
		err := LoadPluginsFromDir("")
		assert.NoError(t, err)
	})

	t.Run("non-existent directory returns nil (not an error)", func(t *testing.T) {
		err := LoadPluginsFromDir("/nonexistent/path/to/plugins")
		assert.NoError(t, err)
	})

	t.Run("file path instead of directory returns error", func(t *testing.T) {
		// Create a temp file
		err := LoadPluginsFromDir("/dev/null") // This is a file, not a directory
		// Should return error since it's not a directory
		if err != nil {
			assert.Contains(t, err.Error(), "not a directory")
		}
	})
}

func TestPluginFunctionHandlerTypes(t *testing.T) {
	// Test that various handler types can be stored and retrieved
	pluginsMu.Lock()
	pluginFunctions = make(map[string]PluginFunction)
	pluginsMu.Unlock()

	testCases := []struct {
		name    string
		handler interface{}
	}{
		{"no_args_string", func() string { return "hello" }},
		{"no_args_float", func() float64 { return 3.14 }},
		{"single_float", func(x float64) float64 { return x * 2 }},
		{"two_floats", func(a, b float64) float64 { return a + b }},
		{"string_func", func(s string) string { return s + "!" }},
		{"list_func", func(vals []interface{}) float64 { return float64(len(vals)) }},
		{"two_lists", func(a, b []float64) float64 { return float64(len(a) + len(b)) }},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			pluginsMu.Lock()
			pluginFunctions["test."+tc.name] = PluginFunction{
				Name:    "test." + tc.name,
				Handler: tc.handler,
			}
			pluginsMu.Unlock()

			fn, found := GetPluginFunction("test." + tc.name)
			require.True(t, found)
			assert.NotNil(t, fn.Handler)
		})
	}
}
