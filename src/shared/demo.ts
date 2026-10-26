import type { SourceFile } from './types';

const before = `import { defineTheme } from './theme';

// A quiet workspace, made for the details.
export const studio = defineTheme({
  name: 'Studio',
  appearance: 'light',

  typography: {
    interface: 'system-ui',
    editor: 'SFMono-Regular',
    fontSize: 12,
    lineHeight: 1.5,
  },

  colors: {
    background: '#ffffff',
    surface: '#f5f5f7',
    text: '#202124',
    accent: '#7856ad',
  },

  comparison: {
    layout: 'split',
    lineNumbers: true,
    wrapLongLines: false,
    highlightChanges: true,
  },

  shortcuts: {
    nextChange: 'Alt+ArrowDown',
    previousChange: 'Alt+ArrowUp',
  },

  // 每一处细节，都值得看清。
  language: 'zh-CN',
});

export function windowTitle(name: string) {
  return name + ' — Studio';
}
`;

const after = before
	.replace("appearance: 'light'", "appearance: 'system'")
	.replace('fontSize: 12', 'fontSize: 13')
	.replace('lineHeight: 1.5', 'lineHeight: 1.65')
	.replace("background: '#ffffff'", "background: '#242427'")
	.replace("surface: '#f5f5f7'", "surface: '#2c2c30'")
	.replace("text: '#202124'", "text: '#ecebf0'")
	.replace('highlightChanges: true,', 'highlightChanges: true,\n    collapseUnchanged: false,')
	.replace('  shortcuts: {', '  shortcuts: {')
	.replace("  return name + ' — Studio';", "  return name.trim() + ' — Diffolio';");

export function exampleFiles(): SourceFile[] {
	return [before, after].map((content, index) => ({
		id: `example-${index}`,
		name: 'theme.ts',
		kind: 'text',
		content,
		bytes: new TextEncoder().encode(content).length,
		bom: false,
		lineEnding: 'LF',
	}));
}
