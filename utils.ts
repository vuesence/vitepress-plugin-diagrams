import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";
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
    const metaMatch = nextToken.content.match(
      /<!--\s*diagram\s+id="([^"]+)"\s*caption:\s*"([^"]+)"\s*-->/,
    );

    if (metaMatch) {
      return {
        id: metaMatch[1].trim(),
        caption: metaMatch[2].trim(),
      };
    }
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
): void {
  if (!diagramId) {
    return;
  }

  const oldFiles = fs
    .readdirSync(diagramsDir)
    .filter((file) => file.startsWith(`${diagramType}-${diagramId}-`));

  oldFiles.forEach((oldFile) => {
    fs.unlinkSync(path.join(diagramsDir, oldFile));
  });
}
