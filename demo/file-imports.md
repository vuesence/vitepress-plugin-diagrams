# File Imports

This page demonstrates the new **`@file:` syntax** for importing diagrams from external files.

## Basic Usage

Instead of writing diagram code inline, you can reference an external file:

````markdown
```bpmn
@file:./diagrams/process.bpmn
```
````

## Examples

### BPMN from File

```bpmn
@file:./diagrams/process.bpmn
```
<!-- diagram id="file-bpmn-1" caption: "Business Process (from file)" -->

### Mermaid from File

```mermaid
@file:./diagrams/flowchart.mmd
```
<!-- diagram id="file-mermaid-1" caption: "Flow Chart (from file)" -->

### PlantUML from File

```plantuml
@file:./diagrams/sequence.puml
```
<!-- diagram id="file-plantuml-1" caption: "Sequence Diagram (from file)" -->

## Configuration

### Enable/Disable File Imports

```ts
configureDiagramsPlugin(md, {
  enableFileImports: true, // default: true
});
```

### Restrict Allowed Directories

For security, you can restrict which directories files can be imported from:

```ts
configureDiagramsPlugin(md, {
  allowedImportDirs: [
    './docs/diagrams',
    './shared/diagrams',
  ],
});
```

This prevents importing files from outside the specified directories.

## Path Resolution

Paths are resolved **relative to the markdown file** containing the import:

- `@file:./diagrams/test.bpmn` - Relative to current file
- `@file:../shared/test.mmd` - Parent directory
- `@file:/absolute/path/test.puml` - Absolute path

## Error Handling

If a file cannot be read, you'll see an error message:

```
Error loading diagram file in docs/file-imports.md: 
Failed to read file import: ENOENT: no such file or directory...
```

## Security Features

The plugin includes several security features:

1. **Dangerous Extension Blocking** - Blocks `.exe`, `.sh`, `.bat`, `.php`, etc.
2. **Symlink Protection** - Uses `realpath` to prevent symlink attacks
3. **Directory Restrictions** - Optional `allowedImportDirs` for access control

---

**Previous:** [Inline Diagrams](/inline-diagrams) - See traditional inline diagram examples
