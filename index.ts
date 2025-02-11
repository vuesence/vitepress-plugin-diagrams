import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import process from "node:process";
import request from "sync-request";
import type { MarkdownRenderer } from "vitepress";

interface DiagramPluginOptions {
  diagramsDir?: string;
  publicPath?: string;
}

const SUPPORTED_DIAGRAM_TYPES = [
  "blockdiag",
  "bpmn",
  "bytefield",
  "seqdiag",
  "actdiag",
  "nwdiag",
  "packetdiag",
  "rackdiag",
  "c4",
  "d2",
  "dbml",
  "ditaa",
  "erd",
  "excalidraw",
  "graphviz",
  "mermaid",
  "nomnoml",
  "pikchr",
  "plantuml",
  "structurizr",
  "svgbob",
  "symbolator",
  "tikz",
  "umlet",
  "vega",
  "vega-lite",
  "wavedrom",
  "wireviz",
];

function extractDiagramCaption(tokens: any[], idx: number): string | undefined {
  const nextToken = tokens[idx + 1];
  if (nextToken && nextToken.type === "html_block") {
    const match = nextToken.content.match(/<!--\s*diagram-caption:(.+)-->/);
    return match ? match[1].trim() : "";
  }
  return "";
}

function generateUniqueFilename(
  diagramType: string,
  diagramContent: string,
): string {
  // Create a hash of the diagram content to ensure unique filenames
  const hash = crypto.createHash("md5").update(diagramContent).digest("hex");

  return `${diagramType}-${hash}.svg`;
}

function diagramToSvg(
  diagram: string,
  diagramType: string,
  caption?: string,
  diagramsPluginOptions: DiagramPluginOptions = {},
): string {
  try {
    // Normalize line endings to \n
    const normalizedDiagram = diagram.replaceAll("\r\n", "\n");

    // Validate diagram type
    if (!SUPPORTED_DIAGRAM_TYPES.includes(diagramType)) {
      throw new Error(`Unsupported diagram type: ${diagramType}`);
    }

    // Use default or custom diagrams directory
    const diagramsDir = diagramsPluginOptions.diagramsDir
      ? path.resolve(process.cwd(), diagramsPluginOptions.diagramsDir)
      : path.resolve(process.cwd(), "docs/public/diagrams");

    // Ensure diagrams directory exists
    fs.mkdirSync(diagramsDir, { recursive: true });

    // Generate unique filename
    const filename = generateUniqueFilename(diagramType, normalizedDiagram);
    const filepath = path.join(diagramsDir, filename);

    // Check if file already exists and has the same content
    let svg: string;
    if (!fs.existsSync(filepath)) {
      // Use sync-request to make a synchronous HTTP request
      const response = request("POST", `https://kroki.io/${diagramType}`, {
        headers: {
          Accept: "image/svg+xml",
          "Content-Type": "text/plain",
        },
        body: normalizedDiagram,
      });

      // Check response status
      if (response.statusCode !== 200) {
        throw new Error(`HTTP error! status: ${response.statusCode}`);
      }

      svg = response.getBody("utf8");

      // Write SVG to file
      fs.writeFileSync(filepath, svg);
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

export function configureDiagramsPlugin(
  md: MarkdownRenderer,
  diagramsPluginOptions: DiagramPluginOptions = {},
) {
  const defaultFence = md.renderer.rules.fence!;

  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx];
    const diagramType = token.info.trim().toLowerCase();

    // Check if the code block is a supported diagram type
    if (SUPPORTED_DIAGRAM_TYPES.includes(diagramType)) {
      const diagram = token.content.trim();
      const caption = extractDiagramCaption(tokens, idx);
      return diagramToSvg(diagram, diagramType, caption, diagramsPluginOptions);
    }

    // For all other code blocks, use the default renderer
    return defaultFence(tokens, idx, options, env, slf);
  };
}
