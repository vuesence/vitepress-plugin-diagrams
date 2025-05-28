/**
 * List of supported diagram types for the Kroki diagram generation service
 */
export const SUPPORTED_DIAGRAM_TYPES = [
  "blockdiag",
  "bpmn",
  "bytefield",
  "seqdiag",
  "actdiag",
  "nwdiag",
  "packetdiag",
  "rackdiag",
  "c4plantuml",
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
] as const;

export type DiagramType = (typeof SUPPORTED_DIAGRAM_TYPES)[number];
