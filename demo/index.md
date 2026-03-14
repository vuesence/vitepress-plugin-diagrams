---
layout: home
hero:
  name: VitePress Diagrams Demo
  text: 'Testing @file: Import Feature'
  tagline: A demo site for the vitepress-plugin-diagrams file import functionality
  actions:
    - theme: brand
      text: Get Started
      link: /inline-diagrams
    - theme: alt
      text: File Imports
      link: /file-imports
---

## Welcome! 👋

This demo site showcases the new **`@file:` syntax** for importing diagrams from external files in [vitepress-plugin-diagrams](https://github.com/altrusl/vitepress-plugin-diagrams).

### Features Demonstrated

1. **Inline Diagrams** - Traditional way of writing diagrams directly in markdown
2. **File Imports** - New `@file:` syntax for importing diagrams from external files

### Quick Example

````markdown
```bpmn
@file:./diagrams/process.bpmn
```
<!-- diagram id="1" caption: "Business Process" -->
````

### Why Use File Imports?

- 🎨 **Better Editor Support** - Use dedicated diagram editors (BPMN editors, PlantUML IDEs, etc.)
- 🔄 **Reusability** - Share diagram definitions across multiple pages
- 📁 **Cleaner Markdown** - Keep your documentation focused on content
- 🧪 **Version Control** - Track diagram changes separately

### Navigation

- [Inline Diagrams](/inline-diagrams) - See traditional inline diagram examples
- [File Imports](/file-imports) - See the new @file: import feature in action
