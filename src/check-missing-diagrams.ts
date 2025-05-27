import * as fs from "node:fs";
import { resolveDiagramBaseDir, getAllDiagramsHashes } from "./utils";

export function checkMissing(options: { docs?: string }) {
  const diagramsDir = resolveDiagramBaseDir();

  if (!fs.existsSync(diagramsDir)) {
    throw new Error(`No diagrams directory found: ${diagramsDir}`);
  }

  const realDiagrams = new Set(fs.readdirSync(diagramsDir).filter(f => f.endsWith('.svg')));
  const desiredDiagrams = getAllDiagramsHashes(options.docs);
  const missing: string[] = [];

  for (const hash of desiredDiagrams) {
    if (!realDiagrams.has(hash)) {
      missing.push(hash);
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
  process.exit(1);
}
