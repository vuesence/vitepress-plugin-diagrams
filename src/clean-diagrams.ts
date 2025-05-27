import * as fs from "node:fs";
import * as path from "node:path";
import { resolveDiagramBaseDir, generateUniqueFilename, getMarkdownFilesFromDir, extractDiagramsFromMarkdown } from "./utils";

export function clean(options: { delete?: boolean; docs?: string }) {
  const shouldDelete = options.delete ?? false;
  const docsRoot = options.docs || 'docs';
  const diagramsDir = resolveDiagramBaseDir();

  if (!fs.existsSync(diagramsDir)) {
    console.log('No diagrams directory found:', diagramsDir);
    return;
  }

  const referenced = new Set<string>();
  const mdFiles = getMarkdownFilesFromDir(docsRoot);
  for (const mdFile of mdFiles) {
    const md = fs.readFileSync(mdFile, 'utf-8');
    for (const { type, content, id } of extractDiagramsFromMarkdown(md)) {
      const filename = generateUniqueFilename(type as any, content, id);
      referenced.add(filename);
    }
  }

  const allSvgs = fs.readdirSync(diagramsDir).filter(f => f.endsWith('.svg'));
  const unused = allSvgs.filter(f => !referenced.has(f));

  if (unused.length === 0) {
    console.log('No unused diagram SVGs found.');
    return;
  }

  console.log('Unused diagram SVGs:');
  for (const f of unused) {
    console.log('  ' + f);
    if (shouldDelete) {
      fs.unlinkSync(path.join(diagramsDir, f));
      console.log('    deleted');
    }
  }

  if (!shouldDelete) {
    console.log('\nRun with --delete to remove these files.');
  }
}
