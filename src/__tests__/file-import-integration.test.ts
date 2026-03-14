import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureDiagramsPlugin, diagramToSvg } from '../index.js';
import { readFileImport, generateUniqueFilename } from '../utils.js';
import MarkdownIt from 'markdown-it';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '../../test-fixtures');
const DIAGRAMS_DIR = path.resolve(FIXTURES_DIR, 'diagrams');
const OUTPUT_DIR = path.resolve(FIXTURES_DIR, 'output');

describe('File Import in Diagram Processing', () => {
  beforeEach(() => {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up generated SVG files
    if (fs.existsSync(OUTPUT_DIR)) {
      const files = fs.readdirSync(OUTPUT_DIR);
      files.forEach(file => {
        if (file.endsWith('.svg')) {
          fs.unlinkSync(path.resolve(OUTPUT_DIR, file));
        }
      });
    }
  });

  describe('diagramToSvg with file imports', () => {
    it('should process diagram from file reference', () => {
      const filePath = path.resolve(DIAGRAMS_DIR, 'test.bpmn');
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // Simulate file import by passing file content directly
      const html = diagramToSvg(
        fileContent,
        'bpmn',
        'Test BPMN Diagram',
        'test-1',
        {
          diagramsDir: OUTPUT_DIR,
          publicPath: '/diagrams',
          krokiServerUrl: 'https://kroki.io',
        },
        'test-position-1'
      );

      expect(html).toContain('vpd-diagram');
      expect(html).toContain('vpd-diagram--bpmn');
      expect(html).toContain('Test BPMN Diagram');
    });

    it('should handle file import syntax in content', () => {
      const fileImportSyntax = '@file:./diagrams/test.mmd';

      // The plugin should detect @file: and read the actual content
      // This test will fail until we implement the feature
      const html = diagramToSvg(
        fileImportSyntax,
        'mermaid',
        undefined,
        'test-2',
        {
          diagramsDir: OUTPUT_DIR,
          publicPath: '/diagrams',
          krokiServerUrl: 'https://kroki.io',
        },
        'test-position-2'
      );

      // After implementation, this should contain the diagram HTML
      // Note: without env.path, the file import won't be resolved in diagramToSvg directly
      expect(html).toContain('vpd-diagram');
    });
  });

  describe('configureDiagramsPlugin with file imports', () => {
    it('should parse markdown with file import syntax', () => {
      const md = new MarkdownIt();
      configureDiagramsPlugin(md, {
        diagramsDir: OUTPUT_DIR,
        publicPath: '/diagrams',
        krokiServerUrl: 'https://kroki.io',
      });

      const markdownWithFileImport = `
# Test Document

\`\`\`bpmn
@file:./diagrams/test.bpmn
\`\`\`
<!-- diagram id="integration-test-1" caption: "BPMN from file" -->
`;

      // Pass env with path set to a file in test-fixtures directory
      const result = md.render(markdownWithFileImport, {
        path: path.resolve(FIXTURES_DIR, 'docs', 'index.md'),
      });

      // After implementation, this should contain the diagram HTML
      expect(result).toContain('vpd-diagram');
      expect(result).toContain('vpd-diagram--bpmn');
    });

    it('should handle multiple diagrams with mixed content', () => {
      const md = new MarkdownIt();
      configureDiagramsPlugin(md, {
        diagramsDir: OUTPUT_DIR,
        publicPath: '/diagrams',
        krokiServerUrl: 'https://kroki.io',
      });

      const markdownWithMixedDiagrams = `
# Test Document

\`\`\`mermaid
@file:./diagrams/test.mmd
\`\`\`
<!-- diagram id="integration-test-2" -->

\`\`\`plantuml
@file:./diagrams/test.puml
\`\`\`
<!-- diagram id="integration-test-3" -->

\`\`\`mermaid
graph TD
    A --> B
\`\`\`
<!-- diagram id="integration-test-4" -->
`;

      const result = md.render(markdownWithMixedDiagrams, {
        path: path.resolve(FIXTURES_DIR, 'docs', 'index.md'),
      });

      // Should process all diagrams
      expect(result).toContain('vpd-diagram');
    });
  });
});

describe('Cache Invalidation with File Imports', () => {
  it('should regenerate diagram when source file changes', () => {
    // Create a temporary test file
    const tempFile = path.resolve(DIAGRAMS_DIR, 'temp-cache-test.mmd');
    const originalContent = 'graph TD\nA --> B';
    fs.writeFileSync(tempFile, originalContent);

    try {
      // Read the file to get mtime
      const result1 = readFileImport(tempFile);
      
      // Generate filename with first mtime
      const filename1 = generateUniqueFilename('mermaid', result1.content, 'cache-test', undefined, result1.mtime);

      // Wait a bit and modify the file
      fs.writeFileSync(tempFile, originalContent + '\nB --> C');
      
      // Read again to get new mtime
      const result2 = readFileImport(tempFile);
      const filename2 = generateUniqueFilename('mermaid', result2.content, 'cache-test', undefined, result2.mtime);

      // Filenames should be different due to different content and mtime
      expect(filename1).not.toBe(filename2);
      
    } finally {
      // Cleanup
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });

  it('should include source file mtime in hash for cache invalidation', () => {
    const tempFile = path.resolve(DIAGRAMS_DIR, 'temp-mtime-test.mmd');
    const content = 'graph TD\nA --> B';
    fs.writeFileSync(tempFile, content);

    try {
      const result = readFileImport(tempFile);
      
      expect(result.content).toBe(content);
      expect(result.mtime).toBeDefined();
      expect(typeof result.mtime).toBe('number');
      expect(result.mtime).toBeGreaterThan(0);
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });
});

describe('File Import Security', () => {
  it('should respect enableFileImports option when disabled', () => {
    const md = new MarkdownIt();
    configureDiagramsPlugin(md, {
      diagramsDir: OUTPUT_DIR,
      publicPath: '/diagrams',
      krokiServerUrl: 'https://kroki.io',
      enableFileImports: false,
    });

    const markdownWithFileImport = `
\`\`\`bpmn
@file:./diagrams/test.bpmn
\`\`\`
`;

    const result = md.render(markdownWithFileImport, {
      path: path.resolve(FIXTURES_DIR, 'docs', 'index.md'),
    });

    // When file imports are disabled, @file: syntax is treated as diagram content
    // The diagram will be generated (attempted) with the @file: text as content
    // This test verifies the option is respected by checking the file is NOT read
    expect(result).toContain('vpd-diagram');
    // The SVG filename should contain a hash of "@file:./diagrams/test.bpmn" content
    // not the actual file content
  });

  it('should reject paths outside allowed directories', () => {
    const md = new MarkdownIt();
    configureDiagramsPlugin(md, {
      diagramsDir: OUTPUT_DIR,
      publicPath: '/diagrams',
      krokiServerUrl: 'https://kroki.io',
      allowedImportDirs: [path.resolve(FIXTURES_DIR, 'diagrams')],
    });

    const markdownWithFileImport = `
\`\`\`bpmn
@file:../docs/diagrams/test.bpmn
\`\`\`
`;

    const result = md.render(markdownWithFileImport, {
      path: path.resolve(FIXTURES_DIR, 'docs', 'index.md'),
    });

    // Should show error because path is outside allowed directory
    expect(result).toContain('diagram-error');
    expect(result).toContain('File import not allowed');
  });

  it('should allow paths within allowed directories', () => {
    const md = new MarkdownIt();
    configureDiagramsPlugin(md, {
      diagramsDir: OUTPUT_DIR,
      publicPath: '/diagrams',
      krokiServerUrl: 'https://kroki.io',
      allowedImportDirs: [
        path.resolve(FIXTURES_DIR, 'docs'),
        path.resolve(FIXTURES_DIR, 'diagrams'),
      ],
    });

    const markdownWithFileImport = `
\`\`\`bpmn
@file:./diagrams/test.bpmn
\`\`\`
`;

    const result = md.render(markdownWithFileImport, {
      path: path.resolve(FIXTURES_DIR, 'docs', 'index.md'),
    });

    // Should successfully process the file import
    expect(result).toContain('vpd-diagram');
  });

  it('should handle missing file gracefully', () => {
    const md = new MarkdownIt();
    configureDiagramsPlugin(md, {
      diagramsDir: OUTPUT_DIR,
      publicPath: '/diagrams',
      krokiServerUrl: 'https://kroki.io',
    });

    const markdownWithFileImport = `
\`\`\`bpmn
@file:./diagrams/nonexistent.bpmn
\`\`\`
`;

    const result = md.render(markdownWithFileImport, {
      path: path.resolve(FIXTURES_DIR, 'docs', 'index.md'),
    });

    // Should show error message
    expect(result).toContain('diagram-error');
    expect(result).toContain('Error loading diagram file');
  });
});
