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
