// Package server provides an HTTP REST API server for NornicDB.
package server

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"strings"
)

// UIAssets holds the embedded UI files (set by main package)
var UIAssets embed.FS

// UIEnabled indicates if UI assets are available
var UIEnabled bool

// SetUIAssets configures the embedded UI assets
func SetUIAssets(assets embed.FS) {
	UIAssets = assets
	UIEnabled = true
}

// uiHandler serves the embedded SPA UI
type uiHandler struct {
	fileServer http.Handler
	indexHTML  []byte
}

// newUIHandler creates a handler for serving embedded UI assets
func newUIHandler() (*uiHandler, error) {
	if !UIEnabled {
		return nil, nil
	}

	// List the embedded files to debug
	entries, err := fs.ReadDir(UIAssets, ".")
	if err != nil {
		return nil, fmt.Errorf("failed to read embedded root: %w", err)
	}
	
	// Find the correct path (might be just "dist" or "ui/dist")
	var distPath string
	for _, entry := range entries {
		if entry.IsDir() && entry.Name() == "ui" {
			distPath = "ui/dist"
			break
		} else if entry.IsDir() && entry.Name() == "dist" {
			distPath = "dist"
			break
		}
	}
	
	if distPath == "" {
		return nil, fmt.Errorf("UI dist directory not found in embedded assets")
	}

	// Get the dist subdirectory from embedded files
	distFS, err := fs.Sub(UIAssets, distPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get dist subdirectory: %w", err)
	}

	// Read index.html for SPA fallback
	indexHTML, err := fs.ReadFile(distFS, "index.html")
	if err != nil {
		return nil, fmt.Errorf("failed to read index.html: %w", err)
	}

	return &uiHandler{
		fileServer: http.FileServer(http.FS(distFS)),
		indexHTML:  indexHTML,
	}, nil
}

// ServeHTTP implements http.Handler for the UI
func (h *uiHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path

	// Serve static assets directly
	if strings.HasPrefix(path, "/assets/") ||
		strings.HasSuffix(path, ".js") ||
		strings.HasSuffix(path, ".css") ||
		strings.HasSuffix(path, ".svg") ||
		strings.HasSuffix(path, ".png") ||
		strings.HasSuffix(path, ".ico") ||
		strings.HasSuffix(path, ".woff") ||
		strings.HasSuffix(path, ".woff2") {
		h.fileServer.ServeHTTP(w, r)
		return
	}

	// For all other paths, serve index.html (SPA routing)
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(h.indexHTML)
}

// isUIRequest checks if request is from a browser wanting HTML
func isUIRequest(r *http.Request) bool {
	accept := r.Header.Get("Accept")
	// Browser requests typically accept text/html
	return strings.Contains(accept, "text/html")
}
