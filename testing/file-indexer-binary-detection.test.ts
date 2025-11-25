import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileIndexer } from '../src/indexing/FileIndexer.js';
import type { Driver } from 'neo4j-driver';

/**
 * Unit tests for FileIndexer binary content detection
 * 
 * Tests the isTextContent method's ability to correctly identify:
 * - Text files with various Unicode content (emojis, CJK, etc.)
 * - Binary files (null bytes, control characters)
 * - Edge cases with mixed content
 * 
 * The industry standard approach:
 * - Check for null bytes (definitive binary indicator)
 * - Count problematic control characters (0x00-0x08, 0x0E-0x1F)
 * - Allow valid Unicode including emojis, CJK, etc.
 * - Allow common whitespace (tab, newline, CR, form feed)
 * - Threshold: <10% control characters = text
 */

describe('FileIndexer - Binary Content Detection', () => {
  let fileIndexer: FileIndexer;
  let mockDriver: Driver;

  beforeEach(() => {
    // Create mock driver
    mockDriver = {
      session: vi.fn().mockReturnValue({
        run: vi.fn(),
        close: vi.fn()
      })
    } as unknown as Driver;

    fileIndexer = new FileIndexer(mockDriver);
  });

  // Access private method for testing
  const isTextContent = (content: string): boolean => {
    return (fileIndexer as any).isTextContent(content);
  };

  describe('Text Files - Should Be Detected as Text', () => {
    describe('Plain ASCII', () => {
      it('should detect plain ASCII text as text', () => {
        const content = 'Hello, World! This is a test file.\nWith multiple lines.\n';
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect source code as text', () => {
        const content = `
function hello() {
  console.log("Hello, World!");
  return 42;
}

export default hello;
`;
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect JSON as text', () => {
        const content = JSON.stringify({ hello: 'world', num: 42, arr: [1, 2, 3] }, null, 2);
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect HTML as text', () => {
        const content = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><h1>Hello</h1></body>
</html>`;
        expect(isTextContent(content)).toBe(true);
      });
    });

    describe('Unicode Content', () => {
      it('should detect text with emojis as text', () => {
        const content = `# 🔧 Configuration Guide

This guide covers:
- 📄 File setup
- 🚀 Deployment
- ⚙️ Settings

## Features
✅ Automatic detection
✅ Fast processing
`;
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect Chinese text as text', () => {
        const content = `# 配置指南

这是一个测试文档。

## 功能说明
- 自动检测
- 快速处理
- 高效编码
`;
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect Japanese text as text', () => {
        const content = `# 設定ガイド

これはテストドキュメントです。

## 機能
- こんにちは世界
- カタカナテスト
- 漢字テスト
`;
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect Korean text as text', () => {
        const content = `# 설정 가이드

이것은 테스트 문서입니다.

## 기능
- 안녕하세요
- 테스트
`;
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect Arabic text as text', () => {
        const content = `# دليل الإعدادات

هذا مستند اختبار.

## الميزات
- مرحبا بالعالم
`;
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect mixed CJK and emoji text as text', () => {
        const content = `# 🌍 国際化テスト

## 中文 Chinese
你好世界 🇨🇳

## 日本語 Japanese
こんにちは 🇯🇵

## 한국어 Korean
안녕하세요 🇰🇷
`;
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect extended Latin characters as text', () => {
        const content = `# Café Menu

- Résumé review
- Naïve implementation  
- Façade pattern
- Señor developer
- Über configuration
`;
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect mathematical symbols as text', () => {
        const content = `# Mathematical Notation

∑ (summation)
∏ (product)
∫ (integral)
∂ (partial derivative)
√ (square root)
∞ (infinity)
≤ ≥ ≠ ≈
`;
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect currency symbols as text', () => {
        const content = `# Pricing

- USD: $100
- EUR: €85
- GBP: £75
- JPY: ¥15000
- INR: ₹8500
`;
        expect(isTextContent(content)).toBe(true);
      });
    });

    describe('Whitespace and Formatting', () => {
      it('should detect text with tabs as text', () => {
        const content = 'Column1\tColumn2\tColumn3\nValue1\tValue2\tValue3';
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect text with Windows line endings as text', () => {
        const content = 'Line 1\r\nLine 2\r\nLine 3';
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect text with form feeds as text', () => {
        const content = 'Page 1 content\fPage 2 content\fPage 3 content';
        expect(isTextContent(content)).toBe(true);
      });

      it('should detect text with mixed whitespace as text', () => {
        const content = 'Mixed\t\n\r\n  \t  whitespace\n\ntest';
        expect(isTextContent(content)).toBe(true);
      });
    });
  });

  describe('Binary Files - Should Be Detected as Binary', () => {
    it('should detect content with null bytes as binary', () => {
      const content = 'Some text\0with null\0bytes';
      expect(isTextContent(content)).toBe(false);
    });

    it('should detect content with many control characters as binary', () => {
      // Create content with >10% control characters
      const controlChars = '\x01\x02\x03\x04\x05\x06\x07\x08';
      const content = controlChars.repeat(20) + 'Some text here';
      expect(isTextContent(content)).toBe(false);
    });

    it('should detect simulated binary file as binary', () => {
      // Simulate binary file header (like PNG)
      const binaryHeader = '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR';
      expect(isTextContent(binaryHeader)).toBe(false);
    });

    it('should detect content with lone surrogates as potentially binary', () => {
      // Many lone surrogates indicate corrupted/binary content
      const lonesurrogates = '\uD800\uD801\uD802\uDC00\uDC01\uDC02'.repeat(50);
      // This should be caught by the surrogate detection
      expect(isTextContent(lonesurrogates)).toBe(false);
    });

    it('should detect content with excessive control chars as binary', () => {
      // SOH, STX, ETX, etc. are strong binary indicators
      let content = '';
      for (let i = 0; i < 100; i++) {
        content += String.fromCharCode(1) + String.fromCharCode(2);
      }
      content += 'small text';
      expect(isTextContent(content)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(isTextContent('')).toBe(true); // Empty is technically text
    });

    it('should handle single character', () => {
      expect(isTextContent('a')).toBe(true);
    });

    it('should handle single null byte', () => {
      expect(isTextContent('\0')).toBe(false);
    });

    it('should handle single emoji', () => {
      expect(isTextContent('🚀')).toBe(true);
    });

    it('should handle very long text file', () => {
      const content = 'This is a test. '.repeat(10000); // ~170KB
      expect(isTextContent(content)).toBe(true);
    });

    it('should handle mostly text with few control chars (under threshold)', () => {
      // Less than 10% control characters should be treated as text
      const text = 'Normal text content '.repeat(100);
      const controlChars = '\x01\x02\x03'; // Just 3 control chars
      const content = text + controlChars;
      expect(isTextContent(content)).toBe(true);
    });

    it('should handle text with valid surrogate pairs (emojis)', () => {
      // All valid emojis - should not be detected as binary
      const content = '🔧📄🚀⚙️✅❌🎉💡🔥⭐';
      expect(isTextContent(content)).toBe(true);
    });

    it('should handle markdown documentation with everything', () => {
      const content = `# 🔧 Complete Documentation

## Overview 概要 概要

This file contains:
- Emojis: 🚀 ⚙️ 📄 ✅
- Chinese: 你好世界
- Japanese: こんにちは
- Korean: 안녕하세요
- Math: ∑ ∫ √ ∞
- Currency: $ € £ ¥
- Extended Latin: café résumé

## Code Example

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}! 👋\`;
}
\`\`\`

## Table

| Feature | Status |
|---------|--------|
| Emoji   | ✅     |
| Unicode | ✅     |
| Binary  | ❌     |
`;
      expect(isTextContent(content)).toBe(true);
    });
  });

  describe('Threshold Behavior', () => {
    it('should accept 5% control characters as text', () => {
      // 95 normal chars + 5 control chars = 5% control
      const normalText = 'A'.repeat(95);
      const controlChars = '\x01'.repeat(5);
      expect(isTextContent(normalText + controlChars)).toBe(true);
    });

    it('should accept 9% control characters as text', () => {
      // 91 normal chars + 9 control chars = 9% control
      const normalText = 'A'.repeat(91);
      const controlChars = '\x01'.repeat(9);
      expect(isTextContent(normalText + controlChars)).toBe(true);
    });

    it('should reject 15% control characters as binary', () => {
      // 85 normal chars + 15 control chars = 15% control
      const normalText = 'A'.repeat(85);
      const controlChars = '\x01'.repeat(15);
      expect(isTextContent(normalText + controlChars)).toBe(false);
    });

    it('should reject 20% control characters as binary', () => {
      // 80 normal chars + 20 control chars = 20% control
      const normalText = 'A'.repeat(80);
      const controlChars = '\x01'.repeat(20);
      expect(isTextContent(normalText + controlChars)).toBe(false);
    });
  });

  describe('Sample Size Behavior', () => {
    it('should sample first 8KB for large files', () => {
      // Content with control characters at the start should be detected
      const binaryStart = '\x01\x02\x03\x04\x05'.repeat(2000); // 10KB of control chars
      const textEnd = 'Normal text '.repeat(10000); // More text after
      const content = binaryStart + textEnd;
      expect(isTextContent(content)).toBe(false);
    });

    it('should detect text file even if control chars appear after 8KB', () => {
      // Normal text in first 8KB, control chars after (not null bytes)
      const textStart = 'Normal text content. '.repeat(500); // ~10.5KB of text
      const controlEnd = '\x01\x02\x03'.repeat(100); // Control chars after sample
      const content = textStart + controlEnd;
      // Should be detected as text since first 8KB is clean
      expect(isTextContent(content)).toBe(true);
    });
  });
});

describe('FileIndexer - shouldSkipFile', () => {
  let fileIndexer: FileIndexer;
  let mockDriver: Driver;

  beforeEach(() => {
    mockDriver = {
      session: vi.fn().mockReturnValue({
        run: vi.fn(),
        close: vi.fn()
      })
    } as unknown as Driver;

    fileIndexer = new FileIndexer(mockDriver);
  });

  const shouldSkipFile = (filePath: string, extension: string): boolean => {
    return (fileIndexer as any).shouldSkipFile(filePath, extension);
  };

  describe('Image Files', () => {
    it('should skip PNG files', () => {
      expect(shouldSkipFile('/path/image.png', '.png')).toBe(true);
    });

    it('should skip JPG files', () => {
      expect(shouldSkipFile('/path/photo.jpg', '.jpg')).toBe(true);
    });

    it('should skip GIF files', () => {
      expect(shouldSkipFile('/path/animation.gif', '.gif')).toBe(true);
    });
  });

  describe('Archive Files', () => {
    it('should skip ZIP files', () => {
      expect(shouldSkipFile('/path/archive.zip', '.zip')).toBe(true);
    });

    it('should skip TAR.GZ files', () => {
      expect(shouldSkipFile('/path/archive.tar.gz', '.gz')).toBe(true);
    });
  });

  describe('Sensitive Files', () => {
    it('should skip private key files', () => {
      expect(shouldSkipFile('/path/server.key', '.key')).toBe(true);
    });

    it('should skip PEM certificate files', () => {
      expect(shouldSkipFile('/path/cert.pem', '.pem')).toBe(true);
    });
  });

  describe('Text Files - Should NOT Skip', () => {
    it('should not skip TypeScript files', () => {
      expect(shouldSkipFile('/path/app.ts', '.ts')).toBe(false);
    });

    it('should not skip JavaScript files', () => {
      expect(shouldSkipFile('/path/app.js', '.js')).toBe(false);
    });

    it('should not skip Markdown files', () => {
      expect(shouldSkipFile('/path/README.md', '.md')).toBe(false);
    });

    it('should not skip JSON files', () => {
      expect(shouldSkipFile('/path/package.json', '.json')).toBe(false);
    });

    it('should not skip YAML files', () => {
      expect(shouldSkipFile('/path/config.yaml', '.yaml')).toBe(false);
    });
  });
});
