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
