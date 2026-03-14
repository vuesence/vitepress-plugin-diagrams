import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isFileImportSyntax,
  parseFileImportPath,
  resolveFileImportPath,
  readFileImport,
  validateFileImportPath,
  generateUniqueFilename,
  hasDangerousExtension,
} from '../utils.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../../test-fixtures');
const DIAGRAMS_DIR = path.resolve(FIXTURES_DIR, 'diagrams');

describe('File Import Syntax Detection', () => {
  describe('isFileImportSyntax', () => {
    it('should return true for @file: syntax', () => {
      expect(isFileImportSyntax('@file:./diagram.bpmn')).toBe(true);
      expect(isFileImportSyntax('@file:../shared/diagram.mmd')).toBe(true);
      expect(isFileImportSyntax('@file:/absolute/path/diagram.puml')).toBe(true);
    });

    it('should return false for non @file: content', () => {
      expect(isFileImportSyntax('graph TD\nA --> B')).toBe(false);
      expect(isFileImportSyntax('@startuml\nA -> B\n@enduml')).toBe(false);
      expect(isFileImportSyntax('')).toBe(false);
      expect(isFileImportSyntax('file:./diagram.bpmn')).toBe(false);
      expect(isFileImportSyntax('@import:./diagram.bpmn')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isFileImportSyntax('  @file:./diagram.bpmn  ')).toBe(true);
      expect(isFileImportSyntax('\n@file:./diagram.bpmn\n')).toBe(true);
    });
  });

  describe('parseFileImportPath', () => {
    it('should extract path from @file: syntax', () => {
      expect(parseFileImportPath('@file:./diagram.bpmn')).toBe('./diagram.bpmn');
      expect(parseFileImportPath('@file:../shared/diagram.mmd')).toBe('../shared/diagram.mmd');
      expect(parseFileImportPath('@file:/absolute/path/diagram.puml')).toBe('/absolute/path/diagram.puml');
    });

    it('should handle whitespace in path', () => {
      expect(parseFileImportPath('@file:  ./diagram.bpmn  ')).toBe('./diagram.bpmn');
      expect(parseFileImportPath('@file:./path with spaces/diagram.bpmn')).toBe('./path with spaces/diagram.bpmn');
    });

    it('should return null for non @file: syntax', () => {
      expect(parseFileImportPath('graph TD')).toBe(null);
      expect(parseFileImportPath('')).toBe(null);
    });
  });
});

describe('File Import Path Resolution', () => {
  describe('resolveFileImportPath', () => {
    const markdownFilePath = path.resolve(FIXTURES_DIR, 'docs', 'guide', 'index.md');

    it('should resolve relative path from markdown file location', () => {
      const result = resolveFileImportPath('./diagrams/test.bpmn', markdownFilePath);
      expect(result).toBe(path.resolve(FIXTURES_DIR, 'docs', 'guide', 'diagrams', 'test.bpmn'));
    });

    it('should resolve parent directory relative path', () => {
      const result = resolveFileImportPath('../shared/test.mmd', markdownFilePath);
      expect(result).toBe(path.resolve(FIXTURES_DIR, 'docs', 'shared', 'test.mmd'));
    });

    it('should resolve absolute path as-is', () => {
      const absolutePath = path.resolve(FIXTURES_DIR, 'diagrams', 'test.puml');
      const result = resolveFileImportPath(absolutePath, markdownFilePath);
      expect(result).toBe(absolutePath);
    });

    it('should handle complex relative paths', () => {
      const result = resolveFileImportPath('../../assets/diagrams/test.bpmn', markdownFilePath);
      expect(result).toBe(path.resolve(FIXTURES_DIR, 'assets', 'diagrams', 'test.bpmn'));
    });
  });

  describe('validateFileImportPath', () => {
    const allowedDirs = [
      path.resolve(FIXTURES_DIR, 'diagrams'),
      path.resolve(FIXTURES_DIR, 'docs'),
    ];

    it('should allow paths within allowed directories', () => {
      const validPath = path.resolve(FIXTURES_DIR, 'diagrams', 'test.bpmn');
      expect(validateFileImportPath(validPath, allowedDirs)).toBe(true);
    });

    it('should reject paths outside allowed directories', () => {
      const invalidPath = path.resolve(FIXTURES_DIR, '..', 'secret.txt');
      expect(validateFileImportPath(invalidPath, allowedDirs)).toBe(false);
    });

    it('should reject path traversal attempts', () => {
      const traversalPath = path.resolve(FIXTURES_DIR, 'docs', '..', '..', 'etc', 'passwd');
      expect(validateFileImportPath(traversalPath, allowedDirs)).toBe(false);
    });

    it('should handle empty allowed dirs (allow all)', () => {
      const anyPath = '/any/path/file.txt';
      expect(validateFileImportPath(anyPath, [])).toBe(true);
      expect(validateFileImportPath(anyPath, undefined)).toBe(true);
    });
  });
});

describe('File Import Reading', () => {
  describe('readFileImport', () => {
    it('should read file content successfully', () => {
      const filePath = path.resolve(DIAGRAMS_DIR, 'test.bpmn');
      const result = readFileImport(filePath);
      expect(result.content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.content).toContain('<bpmn:definitions');
      expect(result.filePath).toBe(filePath);
      expect(result.mtime).toBeDefined();
      expect(typeof result.mtime).toBe('number');
    });

    it('should read mermaid file', () => {
      const filePath = path.resolve(DIAGRAMS_DIR, 'test.mmd');
      const result = readFileImport(filePath);
      expect(result.content).toContain('graph TD');
      expect(result.content).toContain('A[Start]');
    });

    it('should read plantuml file', () => {
      const filePath = path.resolve(DIAGRAMS_DIR, 'test.puml');
      const result = readFileImport(filePath);
      expect(result.content).toContain('@startuml');
      expect(result.content).toContain('@enduml');
    });

    it('should throw error for non-existent file', () => {
      const nonExistentPath = path.resolve(DIAGRAMS_DIR, 'nonexistent.bpmn');
      expect(() => readFileImport(nonExistentPath)).toThrow(/Failed to read file/);
    });

    it('should throw error for directory path', () => {
      expect(() => readFileImport(DIAGRAMS_DIR)).toThrow(/Failed to read file/);
    });
  });
});

describe('File Import Integration', () => {
  it('should detect and parse file import from code block content', () => {
    const content = '@file:./diagrams/test.bpmn';
    
    expect(isFileImportSyntax(content)).toBe(true);
    const filePath = parseFileImportPath(content);
    expect(filePath).toBe('./diagrams/test.bpmn');
  });

  it('should handle multi-line content with @file: as first line', () => {
    const content = '@file:./diagrams/test.bpmn\n\nSome other content';

    expect(isFileImportSyntax(content)).toBe(true);
    const filePath = parseFileImportPath(content);
    expect(filePath).toBe('./diagrams/test.bpmn');
  });
});

describe('Cache Invalidation with mtime', () => {
  it('should generate different filenames when mtime changes', () => {
    const content = 'graph TD\nA --> B';
    const mtime1 = 1000000000000;
    const mtime2 = 2000000000000;

    const filename1 = generateUniqueFilename('mermaid', content, 'test-id', undefined, mtime1);
    const filename2 = generateUniqueFilename('mermaid', content, 'test-id', undefined, mtime2);

    expect(filename1).not.toBe(filename2);
  });

  it('should generate same filename when mtime is the same', () => {
    const content = 'graph TD\nA --> B';
    const mtime = 1000000000000;

    const filename1 = generateUniqueFilename('mermaid', content, 'test-id', undefined, mtime);
    const filename2 = generateUniqueFilename('mermaid', content, 'test-id', undefined, mtime);

    expect(filename1).toBe(filename2);
  });

  it('should generate different filenames for different content with same mtime', () => {
    const content1 = 'graph TD\nA --> B';
    const content2 = 'graph TD\nA --> C';
    const mtime = 1000000000000;

    const filename1 = generateUniqueFilename('mermaid', content1, 'test-id', undefined, mtime);
    const filename2 = generateUniqueFilename('mermaid', content2, 'test-id', undefined, mtime);

    expect(filename1).not.toBe(filename2);
  });

  it('should work without mtime for backward compatibility', () => {
    const content = 'graph TD\nA --> B';

    const filename1 = generateUniqueFilename('mermaid', content, 'test-id');
    const filename2 = generateUniqueFilename('mermaid', content, 'test-id', undefined, undefined);

    expect(filename1).toBe(filename2);
  });
});

describe('Security: Dangerous File Extensions', () => {
  it('should detect dangerous file extensions', () => {
    expect(hasDangerousExtension('./script.sh')).toBe(true);
    expect(hasDangerousExtension('./program.exe')).toBe(true);
    expect(hasDangerousExtension('./script.bat')).toBe(true);
    expect(hasDangerousExtension('./script.php')).toBe(true);
    expect(hasDangerousExtension('./script.py')).toBe(true);
  });

  it('should allow safe file extensions', () => {
    expect(hasDangerousExtension('./diagram.bpmn')).toBe(false);
    expect(hasDangerousExtension('./diagram.mmd')).toBe(false);
    expect(hasDangerousExtension('./diagram.puml')).toBe(false);
    expect(hasDangerousExtension('./diagram.txt')).toBe(false);
    expect(hasDangerousExtension('./diagram.md')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(hasDangerousExtension('./SCRIPT.SH')).toBe(true);
    expect(hasDangerousExtension('./program.EXE')).toBe(true);
    expect(hasDangerousExtension('./Script.Bat')).toBe(true);
  });
});

describe('Security: File Import Validation', () => {
  it('should reject files with dangerous extensions', () => {
    // Create a temporary file with dangerous extension
    const tempFile = path.resolve(DIAGRAMS_DIR, 'test.sh');
    fs.writeFileSync(tempFile, '#!/bin/bash\necho "test"');

    try {
      expect(() => readFileImport(tempFile)).toThrow(/File extension not allowed/);
    } finally {
      // Cleanup
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });

  it('should reject files with dangerous extensions (case-insensitive)', () => {
    const tempFile = path.resolve(DIAGRAMS_DIR, 'test.PY');
    fs.writeFileSync(tempFile, 'print("test")');

    try {
      expect(() => readFileImport(tempFile)).toThrow(/File extension not allowed/);
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });
});
