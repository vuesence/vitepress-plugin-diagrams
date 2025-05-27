// scripts/build-cli.mjs
import { build } from 'esbuild';
import { resolve } from 'path';

const entry = resolve('src/cli.ts');
const outfile = resolve('bin/cli.cjs');

// Bundle with esbuild
await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    'node:fs',
    'node:path',
    'node:crypto',
    'node:process',
    'node:url',
    'node:stream',
    'node:os',
    'node:assert',
    'node:events',
    'node:string_decoder',
    'node:buffer',
    'node:zlib',
    'node:http',
    'node:https',
    'node:net',
    'node:tls',
  ],
});
