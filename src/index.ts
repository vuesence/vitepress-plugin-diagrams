import * as fs from "node:fs";
import * as path from "node:path";
import { SUPPORTED_DIAGRAM_TYPES, type DiagramType } from "./constants.js";

import {
  extractDiagramMetadata,
  generateUniqueFilename,
  removeOldDiagramFiles,
  resolveDiagramBaseDir,
  isFileImportSyntax,
  parseFileImportPath,
  resolveFileImportPath,
  validateFileImportPath,
  readFileImport,
  type FileImportResult,
} from "./utils.js";
import type { DiagramPluginOptions } from "./types.js";
import type { MarkdownRenderer } from "vitepress";

/**
 * Convert diagram to SVG and generate HTML representation
 * @param diagram Diagram content
 * @param diagramType Diagram type
 * @param caption Optional diagram caption
 * @param diagramId Optional diagram identifier
 * @param diagramsPluginOptions Plugin configuration options
 * @param positionId Optional position-based identifier
 * @param sourceFileMtime Optional modification time of source file (for cache invalidation)
 * @returns HTML string with diagram and optional caption
 */
export function diagramToSvg(
  diagram: string,
  diagramType: string,
  caption?: string,
  diagramId?: string,
  diagramsPluginOptions: DiagramPluginOptions = {},
  positionId?: string,
  sourceFileMtime?: number,
): string {
  try {
    // Normalize line endings to \n
    const normalizedDiagram = diagram.replaceAll("\r\n", "\n");

    // Validate diagram type
    if (!SUPPORTED_DIAGRAM_TYPES.includes(diagramType as DiagramType)) {
      throw new Error(`Unsupported diagram type: ${diagramType}`);
    }

    // Use default or custom diagrams directory
    const diagramsDir = resolveDiagramBaseDir(
      diagramsPluginOptions.diagramsDir,
    );

    // Ensure diagrams directory exists
    fs.mkdirSync(diagramsDir, { recursive: true });

    // Generate unique filename with position-based identifier
    const filename = generateUniqueFilename(
      diagramType as DiagramType,
      normalizedDiagram,
      diagramId,
      positionId,
      sourceFileMtime,
    );
    // console.log("filename", filename);

    const filepath = path.join(diagramsDir, filename);

    // Check if file exists and is not a placeholder
    const fileExists = fs.existsSync(filepath);

    let isPlaceholderSvg = false;
    if (fileExists) {
      const svgContent = fs.readFileSync(filepath, "utf-8");
      isPlaceholderSvg = svgContent.includes("<!-- vpd-placeholder -->");
    }
    const shouldGenerateSvg = !fileExists || isPlaceholderSvg;

    if (shouldGenerateSvg) {
      // Remove old diagram files before generating new ones
      removeOldDiagramFiles(
        diagramsDir,
        diagramType as DiagramType,
        diagramId,
        filename,
        normalizedDiagram,
        positionId,
      );

      // Create placeholder SVG while fetching the real one
      const placeholderSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="100%" height="120" xmlns="http://www.w3.org/2000/svg">
  <!-- vpd-placeholder -->
  <rect width="100%" height="120" fill="#f5f5f5"/>
  <text x="50%" y="45%" font-family="system-ui" font-size="14" fill="#666" text-anchor="middle" dominant-baseline="middle">
    Generating ${diagramType} diagram...
  </text>
  <text x="50%" y="65%" font-family="system-ui" font-size="14" fill="#666" text-anchor="middle" dominant-baseline="middle">
    Refresh the page.
  </text>
</svg>`;

      fs.writeFileSync(filepath, placeholderSvg);

      const krokiServerUrl = diagramsPluginOptions.krokiServerUrl ?? "https://kroki.io";
      
      fetch(`${krokiServerUrl}/${diagramType}`, {
        method: "POST",
        headers: {
          Accept: "image/svg+xml",
          "Content-Type": "text/plain",
        },
        body: normalizedDiagram,
      })
        .then((res) => res.text())
        .then((svg) => {
          fs.writeFileSync(filepath, svg);
          return svg;
        });
    }

    const publicPath = diagramsPluginOptions.publicPath ?? "/diagrams";

    // src="${publicPath}/${filename}"
    // Return diagram with optional caption
    return `<figure
      class="vpd-diagram vpd-diagram--${diagramType}"
      onclick="
        const figure = this;
        const isFullscreen = figure.classList.contains('vpd-diagram--fullscreen');

        document.querySelectorAll('.vpd-diagram').forEach(diagram => {
          diagram.classList.remove('vpd-diagram--fullscreen');
        });

        if (!isFullscreen) {
          figure.classList.add('vpd-diagram--fullscreen');
        }
      "
    >
        <img
          :src="\`${publicPath}/${filename}\`"
          alt="${diagramType} Diagram"
          class="vpd-diagram-image"
        />
      ${
        caption
          ? `<figcaption class="vpd-diagram-caption">
        ${caption}
      </figcaption>`
          : ""
      }
    </figure>`;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error converting ${diagramType} diagram:`, errorMessage);
    return `<div class="diagram-error">Error converting diagram: ${errorMessage}</div>`;
  }
}

/**
 * Configure VitePress markdown renderer to support diagram generation
 * @param md Markdown renderer
 * @param diagramsPluginOptions Plugin configuration options
 */
export function configureDiagramsPlugin(
  md: MarkdownRenderer,
  diagramsPluginOptions: DiagramPluginOptions = {},
) {
  const defaultFence = md.renderer.rules.fence!;

  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx];
    const diagramType = token.info.trim().toLowerCase();

    // Check if the code block is a supported diagram type
    const excluded = diagramsPluginOptions.excludedDiagramTypes ?? [];
    const isSupported = SUPPORTED_DIAGRAM_TYPES.includes(diagramType as DiagramType);
    const isExcluded = excluded.includes(diagramType as DiagramType);
    if (isSupported && !isExcluded) {
      let diagram = token.content.trim();
      const { caption, id } = extractDiagramMetadata(tokens, idx);

      // Handle file import syntax
      const enableFileImports = diagramsPluginOptions.enableFileImports ?? true;
      let sourceFileMtime: number | undefined;
      
      if (enableFileImports && isFileImportSyntax(diagram)) {
        try {
          const importPath = parseFileImportPath(diagram);
          if (importPath) {
            // Get the markdown file path from env
            const filePath = env?.path || '';
            
            if (!filePath) {
              return `<div class="diagram-error">Cannot resolve file import: markdown file path is not available</div>`;
            }

            // Resolve the import path relative to the markdown file
            const resolvedPath = resolveFileImportPath(importPath, filePath);

            // Validate the path if allowed directories are specified
            const allowedDirs = diagramsPluginOptions.allowedImportDirs;
            if (!validateFileImportPath(resolvedPath, allowedDirs)) {
              return `<div class="diagram-error">File import not allowed: ${importPath}. Path is outside allowed directories.</div>`;
            }

            // Read the file content with metadata for cache invalidation
            const fileImportResult: FileImportResult = readFileImport(resolvedPath);
            diagram = fileImportResult.content;
            sourceFileMtime = fileImportResult.mtime;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const markdownPath = env?.path || 'unknown';
          return `<div class="diagram-error">Error loading diagram file in ${markdownPath}: ${errorMessage}</div>`;
        }
      }

      // Generate position-based identifier for stable file association
      const filePath = env?.path || 'unknown';
      const positionId = `${path.basename(filePath, '.md')}-${idx}`;

      return diagramToSvg(
        diagram,
        diagramType,
        caption,
        id,
        diagramsPluginOptions,
        positionId,
        sourceFileMtime,
      );
    }

    // For all other code blocks, use the default renderer
    return defaultFence(tokens, idx, options, env, slf);
  };
}

export { SUPPORTED_DIAGRAM_TYPES } from "./constants";
export type { DiagramMetadata, DiagramPluginOptions, BuildTimeDiagramPluginOptions } from "./types";
export {
  generateUniqueFilename,
  removeOldDiagramFiles,
  isFileImportSyntax,
  parseFileImportPath,
  resolveFileImportPath,
  validateFileImportPath,
  readFileImport,
  hasDangerousExtension,
  type FileImportResult,
} from "./utils";
export { createBuildTimeDiagramsPlugin } from "./build-time";
