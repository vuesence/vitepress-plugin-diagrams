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
  positionId?: string,
): string {
  // Create a hash of the diagram content to ensure unique filenames
  const hash = crypto.createHash("md5").update(diagramContent).digest("hex");

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
      // 如果有 diagramId，删除同 ID 的旧文件
      oldFiles = allFiles.filter(
        (file) =>
          file.startsWith(`${diagramType}-${diagramId}-`) && file !== filename,
      );
    } else if (positionId) {
      // 如果有 positionId，删除同位置的旧文件（不同内容哈希）
      oldFiles = allFiles.filter(
        (file) =>
          file.startsWith(`${diagramType}-${positionId}-`) && file !== filename,
      );
    } else if (diagramContent) {
        // 如果没有 diagramId 和 positionId，根据内容哈希删除旧文件
        const currentHash = crypto.createHash("md5").update(diagramContent).digest("hex");
        const currentFilePattern = `${diagramType}-${currentHash}.svg`;
        
        // 删除同类型但不同哈希的文件（即内容已改变的旧版本）
        // 文件名格式：diagramType-hash.svg（没有ID和位置ID）
        oldFiles = allFiles.filter(
          (file) => {
            if (!file.startsWith(`${diagramType}-`) || !file.endsWith('.svg')) {
              return false;
            }
            
            // 排除当前文件
            if (file === filename || file === currentFilePattern) {
              return false;
            }
            
            // 检查是否是没有 ID 和位置 ID 的文件格式：diagramType-hash.svg
            const withoutExtension = file.slice(0, -4); // 移除 .svg
            const parts = withoutExtension.split('-');
            
            // 如果是 diagramType-hash 格式（2个部分），则是没有 ID 的文件
            if (parts.length === 2 && parts[0] === diagramType) {
              return true;
            }
            
            return false;
          }
        );
      }

    // 删除识别出的旧文件
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
