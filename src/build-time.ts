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
import type { BuildTimeDiagramPluginOptions, DeferredDiagramCall } from "./types.js";
import type { MarkdownRenderer } from "vitepress";

/**
 * Create a pair of plugins for build-time diagram generation.
 *
 * Unlike the default dev-time mode (which writes a placeholder SVG and fetches
 * asynchronously), this mode defers all HTTP calls and processes them during the
 * Vite build (`generateBundle`) or dev server request (`configureServer`).
 *
 * This is useful for CI/CD pipelines where diagrams must be generated reliably
 * at build time, and a build failure is expected when a diagram cannot be generated.
 *
 * @example
 * ```ts
 * import { createBuildTimeDiagramsPlugin } from "vitepress-plugin-diagrams";
 *
 * const { configureMarkdown, vitePlugin } = createBuildTimeDiagramsPlugin({
 *   diagramsDir: "docs/public/diagrams",
 *   diagramsDistDir: "diagrams",
 *   publicPath: "/diagrams",
 * });
 *
 * export default defineConfig({
 *   markdown: { config: (md) => configureMarkdown(md) },
 *   vite: { plugins: [vitePlugin()] },
 * });
 * ```
 */
export function createBuildTimeDiagramsPlugin(
  options: BuildTimeDiagramPluginOptions = {},
) {
  const pendingCalls: DeferredDiagramCall[] = [];

  /**
   * Markdown-it plugin that collects diagram generation calls.
   * Must be used together with the `vitePlugin` returned by the same factory.
   */
  function configureMarkdown(md: MarkdownRenderer): void {
    const defaultFence = md.renderer.rules.fence!;

    md.renderer.rules.fence = (tokens, idx, opts, env, slf) => {
      const token = tokens[idx];
      const diagramType = token.info.trim().toLowerCase();

      const excluded = options.excludedDiagramTypes ?? [];
      const isSupported = SUPPORTED_DIAGRAM_TYPES.includes(diagramType as DiagramType);
      const isExcluded = excluded.includes(diagramType as DiagramType);

      if (isSupported && !isExcluded) {
        let diagram = token.content.trim();
        const { caption, id } = extractDiagramMetadata(tokens, idx);

        // Handle file import syntax
        const enableFileImports = options.enableFileImports ?? true;
        let sourceFileMtime: number | undefined;

        if (enableFileImports && isFileImportSyntax(diagram)) {
          try {
            const importPath = parseFileImportPath(diagram);
            if (importPath) {
              const filePath = env?.path || '';

              if (!filePath) {
                return `<div class="diagram-error">Cannot resolve file import: markdown file path is not available</div>`;
              }

              const resolvedPath = resolveFileImportPath(importPath, filePath);
              const allowedDirs = options.allowedImportDirs;
              if (!validateFileImportPath(resolvedPath, allowedDirs)) {
                return `<div class="diagram-error">File import not allowed: ${importPath}. Path is outside allowed directories.</div>`;
              }

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

        const filePath = env?.path || 'unknown';
        const positionId = `${path.basename(filePath, '.md')}-${idx}`;

        return buildTimeDiagramToSvg(
          diagram,
          diagramType,
          caption,
          id,
          positionId,
          sourceFileMtime,
        );
      }

      return defaultFence(tokens, idx, opts, env, slf);
    };
  }

  /**
   * Register a deferred diagram call and return the HTML template.
   */
  function buildTimeDiagramToSvg(
    diagram: string,
    diagramType: string,
    caption?: string,
    diagramId?: string,
    positionId?: string,
    sourceFileMtime?: number,
  ): string {
    try {
      const normalizedDiagram = diagram.replaceAll("\r\n", "\n");

      if (!SUPPORTED_DIAGRAM_TYPES.includes(diagramType as DiagramType)) {
        throw new Error(`Unsupported diagram type: ${diagramType}`);
      }

      const diagramsDir = resolveDiagramBaseDir(options.diagramsDir);
      fs.mkdirSync(diagramsDir, { recursive: true });

      const filename = generateUniqueFilename(
        diagramType as DiagramType,
        normalizedDiagram,
        diagramId,
        positionId,
        sourceFileMtime,
      );

      const filepath = path.join(diagramsDir, filename);
      const fileExists = fs.existsSync(filepath);

      // Only schedule generation if file doesn't exist and isn't already queued
      if (!fileExists && !pendingCalls.some((c) => c.filepath === filepath)) {
        pendingCalls.push(
          createDeferredCall(
            diagramType,
            diagramsDir,
            normalizedDiagram,
            filename,
            filepath,
            diagramId,
            positionId,
          ),
        );
      }

      const publicPath = options.publicPath ?? "/diagrams";

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
   * Create a deferred call that will fetch the diagram from Kroki when executed.
   */
  function createDeferredCall(
    diagramType: string,
    diagramsDir: string,
    normalizedDiagram: string,
    filename: string,
    filepath: string,
    diagramId?: string,
    positionId?: string,
  ): DeferredDiagramCall {
    const krokiServerUrl = options.krokiServerUrl ?? "https://kroki.io";
    const diagramsDistDir = options.diagramsDistDir;

    return {
      filepath,
      getDiagram: async () => {
        const response = await fetch(`${krokiServerUrl}/${diagramType}`, {
          method: "POST",
          headers: {
            Accept: "image/svg+xml",
            "Content-Type": "text/plain",
          },
          body: normalizedDiagram,
        });

        if (!response.ok) {
          throw new Error(
            `Kroki returned ${response.status} for ${diagramType} diagram (${filepath}): ${await response.text()}`,
          );
        }

        const svg = await response.text();

        removeOldDiagramFiles(
          diagramsDir,
          diagramType as DiagramType,
          diagramId,
          filename,
          normalizedDiagram,
          positionId,
        );

        fs.writeFileSync(filepath, svg);
        console.log(`✓ Generated diagram: ${filepath}`);

        if (diagramsDistDir) {
          return {
            type: 'asset' as const,
            fileName: `${diagramsDistDir}/${filename}`,
            source: svg,
          };
        }
      },
    };
  }

  /**
   * Vite plugin that processes the deferred diagram generation calls.
   *
   * - In **dev mode**: processes pending calls on each HTTP request via middleware.
   * - In **build mode**: processes all pending calls during `generateBundle`
   *   and optionally emits SVG assets (when `diagramsDistDir` is set).
   */
  function vitePlugin() {
    return {
      name: 'vitepress-build-time-diagrams',

      // Dev mode: generate diagrams before serving the page
      configureServer(server: any) {
        server.middlewares.use(async (_req: any, _res: any, next: any) => {
          const calls = pendingCalls.splice(0);
          if (calls.length > 0) {
            await Promise.all(calls.map((c) => c.getDiagram()));
          }
          next();
        });
      },

      // Build mode: generate all diagrams and emit assets
      async generateBundle(this: any) {
        const calls = pendingCalls.splice(0);
        if (calls.length === 0) return;

        console.log(`\nGenerating ${calls.length} diagram(s) at build time...`);

        await Promise.all(
          calls.map(async (call) => {
            const result = await call.getDiagram();
            if (result) {
              this.emitFile(result);
            }
          }),
        );

        console.log(`✓ All diagrams generated successfully.\n`);
      },
    };
  }

  return {
    configureMarkdown,
    vitePlugin,
  };
}
