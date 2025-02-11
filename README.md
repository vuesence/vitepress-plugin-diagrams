# VitePress Diagrams Plugin

[English](README.md) | [Español](README.es.md) | [中文](README.zh.md) | [Українська](README.uk.md) | [Русский](README.ru.md)

A VitePress plugin that adds support for various diagram types using the Kroki service. The plugin automatically converts diagram code blocks into SVG images, caches them locally, and provides a clean, customizable display with optional captions.


Using an external service requires an internet connection during build, but it offers significant advantages over creating an image on the client (huge bundle and performance drop) and over creating an image on the server (complexity - mermaid requires puppeteer for this, for example).

## Features

- Supports multiple diagram types (Mermaid, PlantUML, GraphViz, and more)
- Automatic SVG generation and caching (once generated it's cached locally until the diagram code changes)
- Optional diagram captions
- Customizable output directory and public path
- Clean, semantic HTML output
- Use can use any editor to create diagrams (for example `VS Code` with `Mermaid` extension)

![Diagram](./diag-1.svg)

## Installation

```bash
pnpm add -D vitepress-plugin-diagrams
```

<details>
<summary>yarn</summary>

```bash
yarn add -D vitepress-plugin-diagrams
```
</details>

<details>
<summary>npm</summary>

```bash
npm install --save-dev vitepress-plugin-diagrams
```
</details>

## Quick Start

1. Add to VitePress config (`.vitepress/config.ts`):

```ts
import { defineConfig } from "vitepress";
import { configureDiagramsPlugin } from "vitepress-plugin-diagrams";

export default defineConfig({
  markdown: {
    config: (md) => {
      configureDiagramsPlugin(md, {
        diagramsDir: "docs/public/diagrams", // Optional: custom directory for SVG files
        publicPath: "/diagrams", // Optional: custom public path for images
      });
    },
  },
});
```

2. Create diagrams in markdown:

````
```mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[OK]
    B -->|No| D[Cancel]
```
<!-- diagram-caption: Flow diagram example -->
````

## Supported Diagrams

Mermaid, PlantUML, GraphViz, BlockDiag, BPMN, Bytefield, SeqDiag, ActDiag, NwDiag, PacketDiag, RackDiag, C4 (with PlantUML), D2, DBML, Ditaa, Erd, Excalidraw, Nomnoml, Pikchr, Structurizr, Svgbob, Symbolator, TikZ, UMlet, Vega, Vega-Lite, WaveDrom, WireViz

[View full list of supported diagrams →](https://kroki.io/#support)

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `diagramsDir` | `string` | `"docs/public/diagrams"` | Directory where SVG files will be stored |
| `publicPath` | `string` | `"/diagrams"` | Public path for accessing the SVG files |

## Output

## Output Structure

```html
<figure class="vpd-diagram vpd-diagram--[diagramType]">
  <img 
    src="[publicPath]/[diagramType]-[hash].svg" 
    alt="[diagramType] Diagram" 
    class="vpd-diagram-image"
  />
  <figcaption class="vpd-diagram-caption">
    [caption]
  </figcaption>
</figure>
```

You can customize the `CSS` classes to match your theme.

## License

MIT

## Contributing

Contributions are welcome! Before submitting a Pull Request, please open an issue first to discuss proposed changes.

## Credits

This plugin uses the [Kroki](https://kroki.io/) service for diagram generation.