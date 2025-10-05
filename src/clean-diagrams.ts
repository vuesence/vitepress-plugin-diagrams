import * as fs from "node:fs";
import * as path from "node:path";
import { resolveDiagramBaseDir, getAllDiagramsHashes } from "./utils.js";

export function clean(options: { delete?: boolean; docs?: string }) {
  const shouldDelete = options.delete ?? false;
  const docsRoot = options.docs || 'docs';
  const diagramsDir = resolveDiagramBaseDir();

  if (!fs.existsSync(diagramsDir)) {
    throw new Error(`No diagrams directory found: ${diagramsDir}`);
  }

  const referenced = getAllDiagramsHashes(options.docs)
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
  process.exit(1)
}
