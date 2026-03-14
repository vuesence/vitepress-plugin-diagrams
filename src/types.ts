import { DiagramType } from "./constants";

/**
 * Options for configuring the diagrams plugin
 */
export interface DiagramPluginOptions {
  /**
   * Custom directory to store generated diagram SVGs
   * @default "docs/public/diagrams"
   */
  diagramsDir?: string;

  /**
   * Custom public path for serving diagram images
   * @default "diagrams"
   */
  publicPath?: string;

  /**
   * Custom Kroki server URL for diagram generation
   * @default "https://kroki.io"
   */
  krokiServerUrl?: string;

  /**
   * Exclude specific diagram types from being processed
   * If a code block's language matches any of these types, it will be rendered as a normal code block.
   */
  excludedDiagramTypes?: DiagramType[];

  /**
   * Enable file import syntax (@file:path/to/file)
   * When enabled, diagrams can be imported from external files
   * @default true
   */
  enableFileImports?: boolean;

  /**
   * List of allowed base directories for file imports (security feature)
   * If empty or undefined, all paths are allowed (relative to markdown file)
   * @default undefined
   */
  allowedImportDirs?: string[];
}

/**
 * Extracted diagram metadata from markdown tokens
 */
export interface DiagramMetadata {
  /**
   * Optional unique identifier for the diagram
   */
  id?: string;

  /**
   * Optional caption for the diagram
   */
  caption?: string;
}
