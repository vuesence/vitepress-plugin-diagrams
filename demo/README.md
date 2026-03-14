# VitePress Diagrams Demo

A demo site showcasing the `@file:` import feature for [vitepress-plugin-diagrams](https://github.com/altrusl/vitepress-plugin-diagrams).

## Quick Start

### Install Dependencies

```bash
pnpm install
```

### Run Development Server

```bash
pnpm demo:dev
```

Or from the demo directory:

```bash
cd demo
pnpm dev
```

Then open `http://localhost:5173` in your browser.

### Build for Production

```bash
pnpm demo:build
```

Or from the demo directory:

```bash
cd demo
pnpm build
```

## GitHub Pages Deployment

The demo is automatically deployed to GitHub Pages on every push to the `demo/vitepress-test` branch.

### Manual Deployment

1. Go to repository **Settings** > **Pages**
2. Set **Source** to "GitHub Actions"
3. Push to `demo/vitepress-test` branch
4. The workflow will build and deploy automatically

### Access the Demo

Once deployed, access the demo at:
```
https://<username>.github.io/vitepress-plugin-diagrams/
```

## Features Demonstrated

1. **Inline Diagrams** - Traditional way of writing diagrams directly in markdown
2. **File Imports** - New `@file:` syntax for importing diagrams from external files

## Directory Structure

```
demo/
├── .vitepress/
│   └── config.ts       # VitePress configuration
├── diagrams/            # Diagram source files
│   ├── process.bpmn
│   ├── flowchart.mmd
│   └── sequence.puml
├── index.md            # Home page
├── inline-diagrams.md  # Inline diagram examples
└── file-imports.md     # File import examples
```

## License

MIT
