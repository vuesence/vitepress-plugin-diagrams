import * as fs from "node:fs";
import * as path from "node:path";
import { SUPPORTED_DIAGRAM_TYPES, type DiagramType } from "./constants";

import {
  extractDiagramMetadata,
  generateUniqueFilename,
  removeOldDiagramFiles,
  resolveDiagramBaseDir,
} from "./utils";
import type { DiagramPluginOptions } from "./types";
import type { MarkdownRenderer } from "vitepress";

/**
 * Convert diagram to SVG and generate HTML representation
 * @param diagram Diagram content
 * @param diagramType Diagram type
 * @param caption Optional diagram caption
 * @param diagramId Optional diagram identifier
 * @param diagramsPluginOptions Plugin configuration options
 * @returns HTML string with diagram and optional caption
 */
export function diagramToSvg(
  diagram: string,
  diagramType: string,
  caption?: string,
  diagramId?: string,
  diagramsPluginOptions: DiagramPluginOptions = {},
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

    // Generate unique filename
    const filename = generateUniqueFilename(
      diagramType as DiagramType,
      normalizedDiagram,
      diagramId,
    );
    const filepath = path.join(diagramsDir, filename);

    // Check if file already exists and has the same content
    if (!fs.existsSync(filepath)) {
      fetch(`https://kroki.io/${diagramType}`, {
        method: "POST",
        headers: {
          Accept: "image/svg+xml",
          "Content-Type": "text/plain",
        },
        body: normalizedDiagram,
      })
        .then((res) => res.text())
        .then((svg) => {
          // Remove old files with the same diagram ID
          if (diagramId) {
            removeOldDiagramFiles(
              diagramsDir,
              diagramType as DiagramType,
              diagramId,
            );
          }
          fs.writeFileSync(filepath, svg);
          return svg;
        });
    }

    const publicPath = diagramsPluginOptions.publicPath ?? "diagrams";

    // Return diagram with optional caption
    return `<figure class="vpd-diagram vpd-diagram--${diagramType}">
        <img 
          src="${publicPath}/${filename}" 
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
    if (SUPPORTED_DIAGRAM_TYPES.includes(diagramType as DiagramType)) {
      const diagram = token.content.trim();
      const { caption, id } = extractDiagramMetadata(tokens, idx);
      return diagramToSvg(
        diagram,
        diagramType,
        caption,
        id,
        diagramsPluginOptions,
      );
    }

    // For all other code blocks, use the default renderer
    return defaultFence(tokens, idx, options, env, slf);
  };
}

export { SUPPORTED_DIAGRAM_TYPES } from "./constants";
export type { DiagramMetadata, DiagramPluginOptions } from "./types";
