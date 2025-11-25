import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  sanitizeTextForEmbedding, 
  EmbeddingsService,
  formatMetadataForEmbedding 
} from '../src/indexing/EmbeddingsService.js';

/**
 * Unit tests for EmbeddingsService
 * 
 * Tests cover:
 * 1. Text sanitization for embedding APIs (Unicode handling)
 * 2. Retry logic with exponential backoff
 * 3. Error handling for transient failures
 */

describe('EmbeddingsService - Text Sanitization', () => {
  describe('sanitizeTextForEmbedding', () => {
    describe('Valid Unicode - Should Pass Through Unchanged', () => {
      it('should preserve plain ASCII text', () => {
        const text = 'Hello, World! This is a test.';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should preserve text with valid emojis', () => {
        const text = 'Hello 🔧 World 📄 Test 🚀';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should preserve Chinese characters', () => {
        const text = '你好世界 Hello World';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should preserve Japanese characters (Hiragana, Katakana, Kanji)', () => {
        const text = 'こんにちは世界 カタカナ 漢字';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should preserve Arabic text', () => {
        const text = 'مرحبا بالعالم Hello';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should preserve Korean text', () => {
        const text = '안녕하세요 Hello';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should preserve extended Latin characters', () => {
        const text = 'Café résumé naïve façade';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should preserve mathematical symbols', () => {
        const text = '∑ ∏ ∫ ∂ √ ≤ ≥ ≠ ∞';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should preserve currency symbols', () => {
        const text = '$ € £ ¥ ₹ ₽ ฿';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should preserve common whitespace (tab, newline, carriage return)', () => {
        const text = 'Line 1\nLine 2\r\nLine 3\tTabbed';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should preserve form feed character', () => {
        const text = 'Page 1\fPage 2';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });
    });

    describe('Invalid Unicode - Should Be Sanitized', () => {
      it('should replace lone high surrogate with replacement character', () => {
        // \uD800 is a high surrogate that should be followed by a low surrogate
        const text = 'Hello \uD800 World';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Hello \uFFFD World');
        expect(result).not.toContain('\uD800');
      });

      it('should replace lone low surrogate with replacement character', () => {
        // \uDC00 is a low surrogate that should follow a high surrogate
        const text = 'Hello \uDC00 World';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Hello \uFFFD World');
        expect(result).not.toContain('\uDC00');
      });

      it('should preserve valid surrogate pairs (emojis)', () => {
        // 🔧 is represented as \uD83D\uDD27 (valid surrogate pair)
        const text = 'Wrench: 🔧';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe(text);
        expect(result).toContain('🔧');
      });

      it('should handle multiple lone surrogates', () => {
        const text = 'Start \uD800 middle \uDC00 end \uDBFF';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Start \uFFFD middle \uFFFD end \uFFFD');
      });

      it('should handle reversed surrogate pair (invalid)', () => {
        // Low surrogate followed by high surrogate is invalid
        const text = 'Invalid: \uDC00\uD800';
        const result = sanitizeTextForEmbedding(text);
        // Both should be replaced since they're in wrong order
        expect(result).toBe('Invalid: \uFFFD\uFFFD');
      });

      it('should handle high surrogate at end of string', () => {
        const text = 'Trailing high surrogate\uD800';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Trailing high surrogate\uFFFD');
      });

      it('should handle two consecutive high surrogates', () => {
        const text = 'Double high: \uD800\uD801';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Double high: \uFFFD\uFFFD');
      });
    });

    describe('Control Characters - Should Be Sanitized', () => {
      it('should replace null byte with space', () => {
        const text = 'Hello\0World';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Hello World');
        expect(result).not.toContain('\0');
      });

      it('should replace SOH (0x01) with space', () => {
        const text = 'Hello\x01World';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Hello World');
      });

      it('should replace bell character (0x07) with space', () => {
        const text = 'Hello\x07World';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Hello World');
      });

      it('should replace backspace (0x08) with space', () => {
        const text = 'Hello\bWorld';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Hello World');
      });

      it('should preserve tab (0x09)', () => {
        const text = 'Hello\tWorld';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should preserve newline (0x0A)', () => {
        const text = 'Hello\nWorld';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should replace vertical tab (0x0B) with space', () => {
        const text = 'Hello\vWorld';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Hello World');
      });

      it('should preserve form feed (0x0C)', () => {
        const text = 'Hello\fWorld';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should preserve carriage return (0x0D)', () => {
        const text = 'Hello\rWorld';
        expect(sanitizeTextForEmbedding(text)).toBe(text);
      });

      it('should replace control characters 0x0E-0x1F with space', () => {
        const text = 'Hello\x0E\x0F\x10\x1FWorld';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Hello    World');
      });
    });

    describe('Mixed Content', () => {
      it('should handle realistic markdown with emojis and code', () => {
        const text = `# 🔧 Configuration Guide

## Overview
This guide covers the setup process.

\`\`\`typescript
const config = {
  emoji: '📄',
  name: 'test'
};
\`\`\`

## 中文说明
配置说明文档。
`;
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe(text);
      });

      it('should sanitize corrupted file content with mixed valid/invalid', () => {
        const text = 'Valid emoji 🚀 then invalid \uD800 then more valid 你好';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Valid emoji 🚀 then invalid \uFFFD then more valid 你好');
      });

      it('should handle the specific error case from logs (\\uDD27)', () => {
        // The error was: "surrogate U+DC00..U+DFFF must follow U+D800..U+DBFF; last read: '\"\\udd27'"
        // \uDD27 is a lone low surrogate (part of 🔧)
        const text = 'Tool: \uDD27 broken';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('Tool: \uFFFD broken');
      });

      it('should handle the other error case (\\uDD04)', () => {
        // \uDD04 is also a lone low surrogate (part of 📄)
        const text = 'File: \uDD04 broken';
        const result = sanitizeTextForEmbedding(text);
        expect(result).toBe('File: \uFFFD broken');
      });
    });

    describe('Performance - Fast Path', () => {
      it('should quickly process clean short text', () => {
        const text = 'Short clean text without any issues';
        const start = performance.now();
        for (let i = 0; i < 10000; i++) {
          sanitizeTextForEmbedding(text);
        }
        const elapsed = performance.now() - start;
        // Should be very fast (< 100ms for 10k iterations)
        expect(elapsed).toBeLessThan(100);
      });

      it('should handle large clean text efficiently', () => {
        const text = 'Clean text. '.repeat(10000); // ~120KB
        const start = performance.now();
        const result = sanitizeTextForEmbedding(text);
        const elapsed = performance.now() - start;
        // Should be reasonably fast (< 50ms)
        expect(elapsed).toBeLessThan(50);
        expect(result.length).toBe(text.length);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty string', () => {
        expect(sanitizeTextForEmbedding('')).toBe('');
      });

      it('should handle single character', () => {
        expect(sanitizeTextForEmbedding('a')).toBe('a');
      });

      it('should handle single emoji', () => {
        expect(sanitizeTextForEmbedding('🚀')).toBe('🚀');
      });

      it('should handle single lone surrogate', () => {
        expect(sanitizeTextForEmbedding('\uD800')).toBe('\uFFFD');
      });

      it('should handle string of only surrogates', () => {
        // Note: \uD801\uDC00 actually forms a valid surrogate pair (𐐀)
        // Only truly lone surrogates should be replaced
        const text = '\uD800\uD801\uDC00\uDC01';
        const result = sanitizeTextForEmbedding(text);
        // D800 is lone (followed by D801 high, not low) → replaced
        // D801+DC00 form valid pair → kept as 𐐀
        // DC01 is lone low → replaced
        expect(result).toBe('\uFFFD\uD801\uDC00\uFFFD');
      });

      it('should handle very long string with issues at the end', () => {
        const text = 'A'.repeat(5000) + '\uD800'; // Issue after sample check
        const result = sanitizeTextForEmbedding(text);
        expect(result.endsWith('\uFFFD')).toBe(true);
      });
    });
  });
});

describe('EmbeddingsService - Retry Logic', () => {
  let embeddingsService: EmbeddingsService;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Reset environment
    process.env.MIMIR_EMBEDDINGS_ENABLED = 'true';
    process.env.MIMIR_EMBEDDINGS_PROVIDER = 'llama.cpp';
    process.env.MIMIR_EMBEDDINGS_MODEL = 'test-model';
    process.env.MIMIR_EMBEDDINGS_API = 'http://localhost:11434';
    process.env.MIMIR_EMBEDDINGS_MAX_RETRIES = '3';
    process.env.MIMIR_EMBEDDINGS_MODEL_LOADING_DELAY = '100'; // Fast for tests
    process.env.MIMIR_EMBEDDINGS_MAX_DELAY = '500';

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    embeddingsService = new EmbeddingsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.MIMIR_EMBEDDINGS_ENABLED;
    delete process.env.MIMIR_EMBEDDINGS_PROVIDER;
    delete process.env.MIMIR_EMBEDDINGS_MODEL;
    delete process.env.MIMIR_EMBEDDINGS_API;
    delete process.env.MIMIR_EMBEDDINGS_MAX_RETRIES;
    delete process.env.MIMIR_EMBEDDINGS_MODEL_LOADING_DELAY;
    delete process.env.MIMIR_EMBEDDINGS_MAX_DELAY;
  });

  describe('Retryable Error Detection', () => {
    it('should identify 503 model loading as retryable', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('{"error":{"message":"Loading model","type":"unavailable_error","code":503}}')
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ embedding: [0.1, 0.2, 0.3] }] })
        });

      global.fetch = mockFetch as any;

      // Force enable embeddings
      embeddingsService.enabled = true;
      (embeddingsService as any).provider = 'llama.cpp';
      (embeddingsService as any).model = 'test-model';
      (embeddingsService as any).baseUrl = 'http://localhost:11434';

      const result = await embeddingsService.generateEmbedding('test text');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('model loading')
      );
    });

    it('should identify fetch failed as retryable', async () => {
      const fetchError = new Error('fetch failed');
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(fetchError)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ embedding: [0.1, 0.2, 0.3] }] })
        });

      global.fetch = mockFetch as any;

      embeddingsService.enabled = true;
      (embeddingsService as any).provider = 'llama.cpp';
      (embeddingsService as any).model = 'test-model';

      const result = await embeddingsService.generateEmbedding('test text');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should identify EOF/ECONNRESET as retryable', async () => {
      const eofError = new Error('unexpected end of file');
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(eofError)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ embedding: [0.1, 0.2, 0.3] }] })
        });

      global.fetch = mockFetch as any;

      embeddingsService.enabled = true;
      (embeddingsService as any).provider = 'llama.cpp';
      (embeddingsService as any).model = 'test-model';

      const result = await embeddingsService.generateEmbedding('test text');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should NOT retry on non-transient errors (400 bad request)', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('{"error":"Invalid request"}')
        });

      global.fetch = mockFetch as any;

      embeddingsService.enabled = true;
      (embeddingsService as any).provider = 'llama.cpp';
      (embeddingsService as any).model = 'test-model';

      await expect(embeddingsService.generateEmbedding('test text'))
        .rejects.toThrow('OpenAI API error');
      
      // Should only call once (no retry)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Exponential Backoff', () => {
    it('should use longer delays for model loading errors', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay?: number) => {
        if (delay && delay >= 50) { // Capture meaningful delays
          delays.push(delay);
        }
        // Execute callback immediately for fast tests
        if (typeof fn === 'function') {
          fn();
        }
        return 1 as unknown as NodeJS.Timeout;
      });

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('{"error":{"message":"Loading model"}}')
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('{"error":{"message":"Loading model"}}')
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ embedding: [0.1] }] })
        });

      global.fetch = mockFetch as any;

      embeddingsService.enabled = true;
      (embeddingsService as any).provider = 'llama.cpp';
      (embeddingsService as any).model = 'test-model';

      await embeddingsService.generateEmbedding('test');

      // Should have captured retry delays
      expect(delays.length).toBeGreaterThan(0);
      // First delay should be at least the model loading base delay (100ms in test env)
      expect(delays[0]).toBeGreaterThanOrEqual(100);
    });

    it('should fail after max retries exceeded', async () => {
      process.env.MIMIR_EMBEDDINGS_MAX_RETRIES = '2';
      
      const mockFetch = vi.fn()
        .mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('{"error":{"message":"Loading model"}}')
        });

      global.fetch = mockFetch as any;

      embeddingsService.enabled = true;
      (embeddingsService as any).provider = 'llama.cpp';
      (embeddingsService as any).model = 'test-model';

      await expect(embeddingsService.generateEmbedding('test text'))
        .rejects.toThrow();
      
      // Should have tried 3 times (initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Provider Support', () => {
    it('should use retryWithBackoff for OpenAI/llama.cpp provider', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('{"error":{"message":"Loading model"}}')
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [{ embedding: [0.1, 0.2] }] })
        });

      global.fetch = mockFetch as any;

      embeddingsService.enabled = true;
      (embeddingsService as any).provider = 'openai';
      (embeddingsService as any).model = 'text-embedding-3-small';

      const result = await embeddingsService.generateEmbedding('test');
      expect(result.embedding).toEqual([0.1, 0.2]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use retryWithBackoff for Ollama provider', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3] })
        });

      global.fetch = mockFetch as any;

      embeddingsService.enabled = true;
      (embeddingsService as any).provider = 'ollama';
      (embeddingsService as any).model = 'nomic-embed-text';

      const result = await embeddingsService.generateEmbedding('test');
      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('EmbeddingsService - formatMetadataForEmbedding', () => {
  it('should format complete file metadata', () => {
    const metadata = {
      name: 'auth-api.ts',
      relativePath: 'src/api/auth-api.ts',
      language: 'typescript',
      extension: '.ts',
      directory: 'src/api',
      sizeBytes: 15360
    };

    const result = formatMetadataForEmbedding(metadata);
    
    expect(result).toContain('typescript');
    expect(result).toContain('auth-api.ts');
    expect(result).toContain('src/api/auth-api.ts');
    expect(result).toContain('src/api');
  });

  it('should handle minimal metadata', () => {
    const metadata = {
      name: 'file.txt',
      relativePath: 'file.txt',
      language: '',
      extension: '.txt'
    };

    const result = formatMetadataForEmbedding(metadata);
    
    expect(result).toContain('file.txt');
    expect(result).toContain('This is a file');
  });

  it('should skip root directory', () => {
    const metadata = {
      name: 'README.md',
      relativePath: 'README.md',
      language: 'markdown',
      extension: '.md',
      directory: '.'
    };

    const result = formatMetadataForEmbedding(metadata);
    
    expect(result).not.toContain('in the . directory');
  });
});
