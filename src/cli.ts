import { Command } from 'commander';
import { clean } from './clean-diagrams';
import { checkMissing } from './check-missing-diagrams';

const program = new Command();

program
  .name('diagrams')
  .description('CLI tool for managing diagram files')
  .version('1.0.0');

program
  .command('clean')
  .description('Clean up unused diagram SVGs')
  .option('--delete', 'Actually remove unused SVGs')
  .option('--docs <path>', 'Root directory of markdown files', 'docs')
  .action((opts) => {
    clean(opts);
  });

program
  .command('check-missing')
  .description('Find diagrams referenced in markdown but missing in filesystem')
  .option('--docs <path>', 'Root directory of markdown files', 'docs')
  .action((opts) => {
    checkMissing(opts);
  });

program.parse();
