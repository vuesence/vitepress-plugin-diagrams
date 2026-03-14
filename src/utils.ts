import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";
import { SUPPORTED_DIAGRAM_TYPES } from './constants.js';
import type { DiagramType } from "./constants.js";
import type { DiagramMetadata } from "./types.js";
import MarkdownIt from 'markdown-it';

/**
 * Extract diagram metadata from markdown tokens
 * @param tokens Markdown tokens
 * @param idx Current token index
 * @returns Diagram metadata
 */
export function extractDiagramMetadata(
  tokens: any[],
  idx: number,
): DiagramMetadata {
  const nextToken = tokens[idx + 1];
  if (nextToken && nextToken.type === "html_block") {
    // Match optional id and caption
    const idMatch = nextToken.content.match(
      /<!--\s*diagram(?:\s+id="([^"]+)")?/,
    );
    const captionMatch = nextToken.content.match(/\s+caption="([^"]+)"/);
    return {
      id: idMatch?.[1]?.trim(),
      caption: captionMatch?.[1]?.trim() || "",
    };
  }
  return { caption: "", id: undefined };
}

/**
 * Generate a unique filename for a diagram
 * @param diagramType Type of diagram
 * @param diagramContent Diagram content
 * @param diagramId Optional diagram identifier
 * @param positionId Optional position-based identifier
 * @param sourceFileMtime Optional modification time of source file (for cache invalidation)
 * @returns Unique filename
 */
export function generateUniqueFilename(
  diagramType: DiagramType,
  diagramContent: string,
  diagramId?: string,
  positionId?: string,
  sourceFileMtime?: number,
): string {
  // Create a hash of the diagram content and mtime to ensure unique filenames
  // Including mtime ensures cache invalidation when source file changes
  const hashInput = sourceFileMtime !== undefined 
    ? `${diagramContent}${sourceFileMtime}` 
    : diagramContent;
  const hash = crypto.createHash("md5").update(hashInput).digest("hex");

  // Priority: diagramId > positionId > hash only
  if (diagramId) {
    return `${diagramType}-${diagramId}-${hash}.svg`;
  } else if (positionId) {
    return `${diagramType}-${positionId}-${hash}.svg`;
  } else {
    return `${diagramType}-${hash}.svg`;
  }
}

/**
 * Resolve the base directory for diagram storage
 * @param customDir Optional custom directory
 * @returns Resolved base directory path
 */
export function resolveDiagramBaseDir(customDir?: string): string {
  const baseDir =
    process?.cwd?.() || process.env.PWD || process.env.INIT_CWD || ".";

  return customDir
    ? path.resolve(baseDir, customDir)
    : path.resolve(baseDir, "docs/public/diagrams");
}

/**
 * Remove old diagram files with the same diagram type and ID
 * @param diagramsDir Directory containing diagram files
 * @param diagramType Type of diagram
 * @param diagramId Unique identifier for the diagram
 */
export function removeOldDiagramFiles(
  diagramsDir: string,
  diagramType: DiagramType,
  diagramId: string | undefined,
  filename: string,
  diagramContent?: string,
  positionId?: string,
): void {
  try {
    const allFiles = fs.readdirSync(diagramsDir);
    let oldFiles: string[] = [];

    if (diagramId) {
      // If there is a diagramId, delete old files with the same ID
      oldFiles = allFiles.filter(
        (file) =>
          file.startsWith(`${diagramType}-${diagramId}-`) && file !== filename,
      );
    } else if (positionId) {
      // If there is a positionId, delete old files at the same position (different content hash)
      oldFiles = allFiles.filter(
        (file) =>
          file.startsWith(`${diagramType}-${positionId}-`) && file !== filename,
      );
    } else if (diagramContent) {
        // If there is no diagramId or positionId, delete old files based on content hash
        const currentHash = crypto.createHash("md5").update(diagramContent).digest("hex");
        const currentFilePattern = `${diagramType}-${currentHash}.svg`;
        
        // Delete files of the same type with different hashes (old versions with changed content)
        // Filename format: diagramType-hash.svg (no ID or position ID)
        oldFiles = allFiles.filter(
          (file) => {
            if (!file.startsWith(`${diagramType}-`) || !file.endsWith('.svg')) {
              return false;
            }
            
            // Exclude the current file
            if (file === filename || file === currentFilePattern) {
              return false;
            }
            
            // Check whether it matches the format without ID and position ID: diagramType-hash.svg
            const withoutExtension = file.slice(0, -4); // 移除 .svg
            const parts = withoutExtension.split('-');
            
            // If it's in the diagramType-hash format (2 parts), then it's a file without an ID
            if (parts.length === 2 && parts[0] === diagramType) {
              return true;
            }
            
            return false;
          }
        );
      }

    // Remove old files
    oldFiles.forEach((oldFile) => {
      const oldFilePath = path.join(diagramsDir, oldFile);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log(`Removed old diagram file: ${oldFile}`);
      }
    });
  } catch (error) {
    console.warn(`Failed to remove old diagram files: ${error}`);
  }
}

/**
 * Helper to recursively find all markdown files under a directory
 * @param docsDir Directory to search documentation markdown
 * @returns Array of markdown file paths
 */
export function getMarkdownFilesFromDir(docsDir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(docsDir);
  for (const file of list) {
    if (file === 'node_modules') continue;
    const filePath = path.join(docsDir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getMarkdownFilesFromDir(filePath));
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  }
  return results;
}

/**
 * Extract all diagram metadata from markdown
 * @param filepath Markdown filepath
 * @returns Array of diagram blocks with type, content, and optional id
 */
export function extractDiagramsMetadataFromMarkdown(filepath: string): Array<{type: string, content: string, id?: string, caption?: string}> {
  const diagrams: Array<{ type: string, content: string, id?: string, caption?: string }> = [];
  const markdownString = fs.readFileSync(filepath, 'utf-8');
  const md = new MarkdownIt();
  const tokens = md.parse(markdownString, {});
  tokens.forEach((token, idx) => {
    if (token.type === 'fence' && SUPPORTED_DIAGRAM_TYPES.includes(token.info.trim() as any)) {
      const type = token.info.trim();
      const content = token.content.trim();
      const { caption, id } = extractDiagramMetadata(tokens, idx);
      diagrams.push({ type, content, id, caption });
    }
  });
  return diagrams;
}

/**
 * Get all unique diagram hashes (filenames) from markdown files in the docs root
 * @param docsRoot Root directory containing markdown files
 * @returns Set of unique diagram filenames (hashes)
 */
export function getAllDiagramsHashes(docsRoot?: string): Set<string> {
  const dir: string = docsRoot || 'docs';
  const hashes = new Set<string>();

  const mdFiles = getMarkdownFilesFromDir(dir);
  for (const mdFile of mdFiles) {
    for (const { type, content, id, caption } of extractDiagramsMetadataFromMarkdown(mdFile)) {
      const filename = generateUniqueFilename(type as any, content, id);
      hashes.add(filename);
    }
  }
  return hashes;
}

/**
 * List of dangerous file extensions that should be blocked for security
 */
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.ps1', '.vbs', '.js', '.ts',
  '.php', '.py', '.rb', '.pl', '.com', '.msi', '.jar', '.pif', '.scr',
  '.wsf', '.wsc', '.wsh', '.hta', '.cpl', '.inf', '.reg', '.lnk',
];

/**
 * Check if a file extension is considered dangerous
 * @param filePath File path to check
 * @returns true if the file has a dangerous extension
 */
export function hasDangerousExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return DANGEROUS_EXTENSIONS.includes(ext);
}

/**
 * Result of reading a file import, including content and metadata
 */
export interface FileImportResult {
  content: string;
  filePath: string;
  mtime: number;
}

/**
 * Check if content uses @file: syntax for importing diagram from file
 * @param content Code block content
 * @returns true if content starts with @file: syntax
 */
export function isFileImportSyntax(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('@file:');
}

/**
 * Parse the file path from @file: syntax
 * @param content Code block content
 * @returns File path or null if not @file: syntax
 */
export function parseFileImportPath(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith('@file:')) {
    return null;
  }
  // Extract path after @file: and trim whitespace
  // Only take the first line (path should be on the first line)
  const firstLine = trimmed.split('\n')[0];
  const importPath = firstLine.slice(6).trim();
  return importPath || null;
}

/**
 * Resolve file import path relative to the markdown file location
 * @param importPath The path from @file: syntax
 * @param markdownFilePath The path of the markdown file containing the import
 * @returns Resolved absolute path
 */
export function resolveFileImportPath(importPath: string, markdownFilePath: string): string {
  // If it's already an absolute path, return as-is
  if (importPath.startsWith('/')) {
    return importPath;
  }

  // Resolve relative to the markdown file's directory
  const markdownDir = path.dirname(markdownFilePath);
  return path.resolve(markdownDir, importPath);
}

/**
 * Validate that a file path is within allowed directories (security check)
 * Uses realpath to prevent symlink-based path traversal attacks
 * @param filePath The resolved file path to validate
 * @param allowedDirs Array of allowed base directories (empty means allow all)
 * @returns true if path is safe
 */
export function validateFileImportPath(filePath: string, allowedDirs?: string[]): boolean {
  // If no allowed dirs specified, allow all paths
  if (!allowedDirs || allowedDirs.length === 0) {
    return true;
  }

  try {
    // Resolve to real path to prevent symlink attacks
    const resolvedPath = fs.realpathSync(path.resolve(filePath));
    
    // Check if the file path is within any of the allowed directories
    for (const allowedDir of allowedDirs) {
      const resolvedAllowedDir = path.resolve(allowedDir);
      const realAllowedDir = fs.realpathSync(resolvedAllowedDir);
      
      // Ensure the file path starts with the allowed directory path
      if (resolvedPath.startsWith(realAllowedDir + path.sep) || resolvedPath === realAllowedDir) {
        return true;
      }
    }
  } catch (error) {
    // If realpath fails (e.g., file doesn't exist), fall back to path.resolve
    const resolvedPath = path.resolve(filePath);
    for (const allowedDir of allowedDirs) {
      const resolvedAllowedDir = path.resolve(allowedDir);
      if (resolvedPath.startsWith(resolvedAllowedDir + path.sep) || resolvedPath === resolvedAllowedDir) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Read content from a file import with metadata for cache invalidation
 * @param filePath Absolute path to the file
 * @returns FileImportResult with content, path, and modification time
 * @throws Error if file cannot be read or has dangerous extension
 */
export function readFileImport(filePath: string): FileImportResult {
  try {
    // Check for dangerous file extensions
    if (hasDangerousExtension(filePath)) {
      throw new Error(`File extension not allowed: ${path.extname(filePath)}`);
    }

    // Check if path exists and is a file
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    // Resolve to real path to prevent symlink attacks
    const realPath = fs.realpathSync(filePath);
    
    const content = fs.readFileSync(realPath, 'utf-8');
    return {
      content,
      filePath: realPath,
      mtime: stats.mtimeMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read file import: ${errorMessage}`);
  }
}
