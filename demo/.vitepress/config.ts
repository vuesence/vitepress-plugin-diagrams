import { defineConfig } from 'vitepress';
import { configureDiagramsPlugin } from 'vitepress-plugin-diagrams';

const base = process.env.GITHUB_ACTIONS ? '/vitepress-plugin-diagrams/demo/' : '/';

export default defineConfig({
  base,
  title: 'VitePress Diagrams Demo',
  description: 'Testing @file: import feature',
  
  markdown: {
    config: (md) => {
      configureDiagramsPlugin(md, {
        diagramsDir: 'public/diagrams',
        publicPath: '/diagrams',
        krokiServerUrl: 'https://kroki.io',
        enableFileImports: true,
        // Uncomment to restrict file imports to specific directories:
        // allowedImportDirs: [
        //   './diagrams',
        // ],
      });
    },
  },

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Inline Diagrams', link: '/inline-diagrams' },
      { text: 'File Imports', link: '/file-imports' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Inline Diagrams', link: '/inline-diagrams' },
          { text: 'File Imports', link: '/file-imports' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/altrusl/vitepress-plugin-diagrams' },
    ],
  },
});
