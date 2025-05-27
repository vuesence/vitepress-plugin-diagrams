import * as fs from "node:fs";
import { resolveDiagramBaseDir, generateUniqueFilename, getMarkdownFilesFromDir, extractDiagramsFromMarkdown } from "./utils";

export function checkMissing(options: { docs?: string }) {
  const docsRoot = options.docs || 'docs';
  const diagramsDir = resolveDiagramBaseDir();

  if (!fs.existsSync(diagramsDir)) {
    console.error('No diagrams directory found:', diagramsDir);
    return;
  }

  const diagramFiles = new Set(fs.readdirSync(diagramsDir).filter(f => f.endsWith('.svg')));
  const missing: string[] = [];

  const mdFiles = getMarkdownFilesFromDir(docsRoot);
  for (const mdFile of mdFiles) {
    const md = fs.readFileSync(mdFile, 'utf-8');
    for (const { type, content, id } of extractDiagramsFromMarkdown(md)) {
      const filename = generateUniqueFilename(type as any, content, id);
      if (!diagramFiles.has(filename)) {
        missing.push(`${filename} (from ${mdFile})`);
      }
    }
  }

  if (missing.length === 0) {
    console.log('No missing diagrams detected.');
    return;
  }

  console.log('Missing diagram SVGs:');
  for (const m of missing) {
    console.log('  ' + m);
  }
  process.exit(1)
}
