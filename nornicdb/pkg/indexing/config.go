// Package indexing provides content processing for NornicDB.
//
// ARCHITECTURE NOTE:
// NornicDB does NOT generate embeddings or read source files.
// Mimir is responsible for:
//   - File discovery, watching, and reading
//   - Gitignore/ignore pattern handling
//   - File type detection and filtering
//   - Security filtering (sensitive files)
//   - Embedding generation via Ollama/OpenAI
//   - Sending pre-embedded nodes to NornicDB
//
// NornicDB is responsible for:
//   - Receiving pre-embedded nodes from Mimir
//   - Storing nodes and relationships
//   - Search (vector similarity using existing embeddings + BM25 full-text)
//   - Its own persistence
package indexing

import (
	"strings"
	"unicode"
)

// SearchableProperties defines which node properties are indexed for full-text search.
// These match Mimir's Neo4j node_search fulltext index configuration.
var SearchableProperties = []string{
	"content",
	"text",
	"title",
	"name",
	"description",
	"path",
	"workerRole",
	"requirements",
}

// ExtractSearchableText extracts text from node properties for full-text indexing.
// Concatenates all searchable properties with spaces.
func ExtractSearchableText(properties map[string]interface{}) string {
	var parts []string

	for _, prop := range SearchableProperties {
		if val, ok := properties[prop]; ok {
			if str, ok := val.(string); ok && len(str) > 0 {
				parts = append(parts, str)
			}
		}
	}

	return strings.Join(parts, " ")
}

// TokenizeForBM25 tokenizes text for BM25 indexing.
// Simple whitespace + punctuation tokenizer with lowercase.
func TokenizeForBM25(text string) []string {
	text = strings.ToLower(text)

	var tokens []string
	var current strings.Builder

	for _, r := range text {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			current.WriteRune(r)
		} else {
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
		}
	}

	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}

	return tokens
}

// SanitizeText cleans text for search by removing invalid Unicode.
func SanitizeText(text string) string {
	if len(text) == 0 {
		return text
	}

	var result strings.Builder
	result.Grow(len(text))

	for _, r := range text {
		// Skip problematic control characters (keep tab, newline, CR)
		if (r >= 0x00 && r <= 0x08) || r == 0x0B || (r >= 0x0E && r <= 0x1F) {
			result.WriteRune(' ')
			continue
		}

		// Skip surrogate pairs (invalid in Go strings)
		if r >= 0xD800 && r <= 0xDFFF {
			result.WriteRune('\uFFFD')
			continue
		}

		result.WriteRune(r)
	}

	return result.String()
}
