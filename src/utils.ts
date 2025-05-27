import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";
import { SUPPORTED_DIAGRAM_TYPES } from './constants';
import type { DiagramType } from "./constants";
import type { DiagramMetadata } from "./types";

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
 * @returns Unique filename
 */
export function generateUniqueFilename(
  diagramType: DiagramType,
  diagramContent: string,
  diagramId?: string,
): string {
  // Create a hash of the diagram content to ensure unique filenames
  const hash = crypto.createHash("md5").update(diagramContent).digest("hex");

  // Include diagram ID in filename if provided
  return diagramId
    ? `${diagramType}-${diagramId}-${hash}.svg`
    : `${diagramType}-${hash}.svg`;
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
  diagramId: string,
  filename: string,
): void {
  if (!diagramId) {
    return;
  }

  const oldFiles = fs
    .readdirSync(diagramsDir)
    .filter(
      (file) =>
        file.startsWith(`${diagramType}-${diagramId}-`) && file !== filename,
    );

  oldFiles.forEach((oldFile) => {
    fs.unlinkSync(path.join(diagramsDir, oldFile));
  });
}

// Helper to recursively find all markdown files under a directory
export function getMarkdownFilesFromDir(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getMarkdownFilesFromDir(filePath));
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  }
  return results;
}

// Extract all diagram code blocks from markdown
export function extractDiagramsFromMarkdown(md: string): Array<{type: string, content: string, id?: string}> {
  const blocks: Array<{type: string, content: string, id?: string}> = [];
  // Regex for code blocks: ```diagramType [id=...]\n...code...\n```
  const codeBlockRegex = /```(\w+)([^\n]*)\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(md))) {
    const type = match[1].toLowerCase();
    if (!SUPPORTED_DIAGRAM_TYPES.includes(type as any)) continue;
    const meta = match[2];
    const content = match[3].replace(/\r\n/g, '\n');
    // Try to extract id from meta (e.g., id=foo)
    const idMatch = /id=([\w-]+)/.exec(meta);
    blocks.push({ type, content, id: idMatch ? idMatch[1] : undefined });
  }
  return blocks;
}
